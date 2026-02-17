import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto, AddOrderItemDto, ProcessPaymentDto, OrderQueryDto } from './dto/orders.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: PosEventsGateway,
    private audit: AuditService,
    private notif: NotificationsService,
  ) {}

  async findAll(tenantId: string, query: OrderQueryDto) {
    const { status, type, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const conditions: string[] = [`o.tenant_id = '${tenantId}'`];
    if (status) conditions.push(`o.status = '${status}'`);
    if (type) conditions.push(`o.type = '${type}'`);
    const where = conditions.join(' AND ');
    const orders = await this.prisma.$queryRawUnsafe(`
      SELECT o.*, u.first_name || ' ' || u.last_name as server_name,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) as items_count,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.order_id = o.id) as total_paid
      FROM orders o LEFT JOIN users u ON u.id = o.served_by
      WHERE ${where}
      ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
    const countResult = await this.prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as total FROM orders o WHERE ${where}`);
    return { data: orders, total: countResult[0]?.total || 0, page, limit };
  }

  async findOpenOrders(tenantId: string) {
    return this.prisma.$queryRaw`
      SELECT o.*, u.first_name || ' ' || u.last_name as server_name,
        json_agg(json_build_object('id', oi.id, 'productName', oi.product_name, 'quantity', oi.quantity, 'unitPrice', oi.unit_price, 'status', oi.status)) as items
      FROM orders o
      LEFT JOIN users u ON u.id = o.served_by
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.tenant_id = ${tenantId}::uuid AND o.status IN ('open', 'preparing', 'ready')
      GROUP BY o.id, u.first_name, u.last_name
      ORDER BY o.created_at DESC
    `;
  }

  async findById(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    return order;
  }

  async create(tenantId: string, userId: string, dto: CreateOrderDto) {
    const orderNumber = await this.generateOrderNumber(tenantId);
    const activeShifts: any[] = await this.prisma.$queryRaw`
      SELECT id FROM shifts WHERE tenant_id = ${tenantId}::uuid AND status = 'open' ORDER BY opened_at DESC LIMIT 1
    `;
    const shiftId = activeShifts.length > 0 ? activeShifts[0].id : null;

    const order = await this.prisma.order.create({
      data: {
        tenantId, orderNumber, type: dto.type || 'sale', servedBy: userId,
        shiftId, customerId: dto.customerId || null, metadata: dto.metadata || {}, notes: dto.notes || null,
      },
      include: { items: true },
    });

    // Audit + Notify
    const userName = await this.getUserName(userId);
    this.audit.log({
      tenantId, userId, userName, action: 'create', entity: 'order',
      entityId: order.id, description: `Orden #${orderNumber} creada`,
      details: { type: dto.type, tableId: dto.metadata?.tableId },
    });

    return order;
  }

  async addItem(tenantId: string, orderId: string, dto: AddOrderItemDto) {
    const order = await this.findById(tenantId, orderId);
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const unitPrice = product.price;
    const subtotal = new Decimal(unitPrice.toString()).mul(dto.quantity);
    const taxRate = product.taxRate || new Decimal(0);
    const taxAmount = subtotal.mul(taxRate).div(100);

     const items: any[] = await this.prisma.$queryRaw`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal, tax_rate, tax_amount, notes)
      VALUES (${orderId}::uuid, ${dto.productId}::uuid, ${product.name}, ${dto.quantity}, ${unitPrice}, ${subtotal}, ${taxRate}, ${taxAmount}, ${dto.notes || null})
      RETURNING *
    `;

    await this.recalculateOrderTotals(orderId);

    this.wsGateway.emitKitchenNewOrder(tenantId, {
      orderId, orderNumber: order.orderNumber,
      items: [{ id: items[0].id, productName: product.name, quantity: dto.quantity, notes: dto.notes }],
    });

    return items[0];
  }

  async voidItem(tenantId: string, orderId: string, itemId: string, reason: string) {
    await this.prisma.$queryRaw`
      UPDATE order_items SET status = 'voided', notes = ${reason} WHERE id = ${itemId}::uuid
    `;
    await this.recalculateOrderTotals(orderId);

    this.audit.log({
      tenantId, action: 'void', entity: 'order_item', entityId: itemId,
      description: `Ítem anulado en orden. Razón: ${reason}`,
      severity: 'warning', details: { orderId, reason },
    });
  }

  async processPayment(tenantId: string, orderId: string, userId: string, dto: ProcessPaymentDto) {
    const order = await this.findById(tenantId, orderId);
    if (order.status === 'completed') throw new BadRequestException('La orden ya está pagada');

    const paidAmount = order.payments.reduce((sum, p) => sum.add(new Decimal(p.amount.toString())), new Decimal(0));
    const remaining = new Decimal(order.total.toString()).sub(paidAmount);
    const paymentAmount = new Decimal(dto.amount);

    if (paymentAmount.gt(remaining.add(new Decimal('0.01')))) {
      throw new BadRequestException(`Monto excede el saldo pendiente (${remaining})`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId, orderId, method: dto.method, amount: paymentAmount,
        currencyCode: dto.currencyCode || 'PEN', reference: dto.reference || null,
        processedBy: userId,
        cashReceived: dto.cashReceived ? new Decimal(dto.cashReceived) : null,
        changeGiven: dto.cashReceived
          ? new Decimal(dto.cashReceived).sub(paymentAmount).greaterThan(0) ? new Decimal(dto.cashReceived).sub(paymentAmount) : new Decimal(0)
          : null,
      },
    });

    const totalPaid = paidAmount.add(paymentAmount);
    if (totalPaid.gte(new Decimal(order.total.toString()))) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'completed', closedAt: new Date() } });
      this.wsGateway.emitOrderPaid(tenantId, {
        orderId, orderNumber: order.orderNumber,
        total: parseFloat(order.total.toString()), method: dto.method,
      });

      // Audit payment completion
      const userName = await this.getUserName(userId);
      this.audit.log({
        tenantId, userId, userName, action: 'payment', entity: 'order',
        entityId: orderId,
        description: `Pago completado: Orden #${order.orderNumber} por $${parseFloat(order.total.toString()).toFixed(2)} (${dto.method})`,
        details: { method: dto.method, amount: paymentAmount.toNumber(), orderNumber: order.orderNumber },
      });
    }

    return {
      payment,
      orderStatus: totalPaid.gte(new Decimal(order.total.toString())) ? 'completed' : 'open',
      totalPaid: totalPaid.toNumber(),
      remaining: new Decimal(order.total.toString()).sub(totalPaid).toNumber(),
    };
  }

  async cancelOrder(tenantId: string, orderId: string, userId?: string) {
    const order = await this.findById(tenantId, orderId);
    if (order.status === 'completed') throw new BadRequestException('No se puede cancelar una orden completada');

    const result = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled', closedAt: new Date() },
    });

    const userName = userId ? await this.getUserName(userId) : 'Sistema';
    this.audit.log({
      tenantId, userId, userName, action: 'cancel', entity: 'order',
      entityId: orderId, description: `Orden #${order.orderNumber} cancelada`,
      severity: 'warning', details: { orderNumber: order.orderNumber, total: order.total },
    });

    this.notif.create({
      tenantId, title: 'Orden Cancelada',
      message: `Orden #${order.orderNumber} fue cancelada por ${userName}`,
      type: 'warning', entity: 'order', entityId: orderId, actionUrl: '/pos',
    });

    return result;
  }

  // ── Private helpers ──

  private async recalculateOrderTotals(orderId: string) {
    await this.prisma.$queryRaw`
      UPDATE orders SET
        subtotal = COALESCE((SELECT SUM(subtotal) FROM order_items WHERE order_id = ${orderId}::uuid AND status != 'voided'), 0),
        tax = COALESCE((SELECT SUM(tax_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND status != 'voided'), 0),
        total = COALESCE((SELECT SUM(subtotal + tax_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND status != 'voided'), 0),
        updated_at = NOW()
      WHERE id = ${orderId}::uuid
    `;
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const result: any[] = await this.prisma.$queryRaw`
      SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_number
      FROM orders WHERE tenant_id = ${tenantId}::uuid
    `;
    return String(result[0].next_number).padStart(6, '0');
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const users: any[] = await this.prisma.$queryRaw`
        SELECT first_name || ' ' || last_name as name FROM users WHERE id = ${userId}::uuid
      `;
      return users[0]?.name || 'Desconocido';
    } catch { return 'Desconocido'; }
  }
}
