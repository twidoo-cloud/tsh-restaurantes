import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto, AddOrderItemDto, ProcessPaymentDto, OrderQueryDto } from './dto/orders.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private wsGateway: PosEventsGateway,
    private audit: AuditService,
    private notif: NotificationsService,
  ) {}

  async findAll(tenantId: string, query: OrderQueryDto, branchId: string | null = null) {
    const { status, type, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const conditions: string[] = [`o.tenant_id = '${tenantId}'`];
    if (branchId) conditions.push(`o.branch_id = '${branchId}'`);
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

  async findOpenOrders(tenantId: string, branchId: string | null = null) {
    const bf = branchId ? Prisma.sql`AND o.branch_id = ${branchId}::uuid` : Prisma.empty;
    return this.prisma.$queryRaw`
      SELECT o.*, u.first_name || ' ' || u.last_name as server_name,
        json_agg(json_build_object('id', oi.id, 'productName', p.name, 'quantity', oi.quantity, 'unitPrice', oi.unit_price, 'status', CASE WHEN oi.is_void THEN 'voided' ELSE 'active' END)) as items
      FROM orders o
      LEFT JOIN users u ON u.id = o.served_by
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.tenant_id = ${tenantId}::uuid AND o.status IN ('open', 'preparing', 'ready')
        ${bf}
      GROUP BY o.id, u.first_name, u.last_name
      ORDER BY o.created_at DESC
    `;
  }

  async findById(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: { product: { select: { name: true, sku: true, attributes: true } } },
        },
        payments: { orderBy: { createdAt: 'asc' } },
        customer: { select: { id: true, name: true, taxId: true, taxIdType: true, email: true, phone: true } },
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

    // Get user's default branchId
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { defaultBranchId: true } });
    const branchId = dto.branchId || user?.defaultBranchId || null;

    const order = await this.prisma.order.create({
      data: {
        tenantId, branchId, orderNumber, type: dto.type || 'sale', servedBy: userId,
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

    this.notif.notifyNewOrder(tenantId, orderNumber, 0);

    return order;
  }

  async addItem(tenantId: string, orderId: string, userId: string, dto: AddOrderItemDto) {
    const order = await this.findById(tenantId, orderId);
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const unitPrice = product.price;
    const subtotal = new Decimal(unitPrice.toString()).mul(dto.quantity);
    const taxRate = product.taxRate || new Decimal(0);
    const taxAmount = subtotal.mul(taxRate).div(100);

    const item = await this.prisma.orderItem.create({
      data: {
        tenantId, orderId, productId: dto.productId, quantity: dto.quantity,
        unitPrice, subtotal, taxAmount, notes: dto.notes || null,
      },
      include: { product: { select: { name: true } } },
    });

    await this.recalculateOrderTotals(orderId);

    this.wsGateway.emitKitchenNewOrder(tenantId, {
      orderId, orderNumber: order.orderNumber,
      items: [{ id: item.id, productName: product.name, quantity: dto.quantity, notes: dto.notes }],
    });

    // Audit
    const userName = await this.getUserName(userId);
    this.audit.log({
      tenantId, userId, userName, action: 'add_item', entity: 'order',
      entityId: orderId,
      description: `${product.name} x${dto.quantity} agregado a Orden #${order.orderNumber}`,
      details: { orderNumber: order.orderNumber, productName: product.name, quantity: dto.quantity, unitPrice: parseFloat(unitPrice.toString()) },
    });

    return { ...item, productName: product.name };
  }

  async voidItem(tenantId: string, orderId: string, itemId: string, userId: string, reason: string) {
    const order = await this.findById(tenantId, orderId);

    // Get item product name via product relation
    const itemRows: any[] = await this.prisma.$queryRaw`
      SELECT p.name as product_name FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.id = ${itemId}::uuid
    `;
    const productName = itemRows[0]?.product_name || 'desconocido';

    await this.prisma.$queryRaw`
      UPDATE order_items SET is_void = true, void_reason = ${reason} WHERE id = ${itemId}::uuid
    `;
    await this.recalculateOrderTotals(orderId);

    const userName = await this.getUserName(userId);
    this.audit.log({
      tenantId, userId, userName, action: 'void_item', entity: 'order',
      entityId: orderId,
      description: `Ítem "${productName}" anulado en Orden #${order.orderNumber}. Razón: ${reason}`,
      severity: 'warning',
      details: { orderId, orderNumber: order.orderNumber, itemId, productName, reason },
    });
  }

  async updateItemNotes(tenantId: string, orderId: string, itemId: string, notes: string) {
    await this.prisma.$executeRaw`
      UPDATE order_items SET notes = ${notes || null}
      WHERE id = ${itemId}::uuid AND order_id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    // Also update kitchen_orders notes if exists
    await this.prisma.$executeRaw`
      UPDATE kitchen_orders SET notes = ${notes || null}
      WHERE order_item_id = ${itemId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    return { id: itemId, notes };
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
        currencyCode: dto.currencyCode || 'USD', reference: dto.reference || null,
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

      // Auto-release table if dine_in
      if (order.type === 'dine_in') {
        const tableId = (order.metadata as any)?.table_id || (typeof order.metadata === 'string' ? JSON.parse(order.metadata as string || '{}').table_id : null);
        if (tableId) {
          await this.prisma.$executeRaw`
            UPDATE tables SET status = 'available', current_order_id = NULL
            WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid AND current_order_id = ${orderId}::uuid
          `;
          this.wsGateway.emitTableStatusChanged(tenantId, {
            tableId,
            tableNumber: (order.metadata as any)?.table_number || '',
            status: 'available',
            orderId: null,
          });
        }
      }

      // Audit payment completion
      const userName = await this.getUserName(userId);
      this.audit.log({
        tenantId, userId, userName, action: 'payment', entity: 'order',
        entityId: orderId,
        description: `Pago completado: Orden #${order.orderNumber} por $${parseFloat(order.total.toString()).toFixed(2)} (${dto.method})`,
        details: { method: dto.method, amount: paymentAmount.toNumber(), orderNumber: order.orderNumber },
      });

      // Deduct ingredient stock based on recipes
      await this.deductIngredientStock(tenantId, orderId);
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

    // Auto-release table if dine_in
    if (order.type === 'dine_in') {
      const tableId = (order.metadata as any)?.table_id || (typeof order.metadata === 'string' ? JSON.parse(order.metadata as string || '{}').table_id : null);
      if (tableId) {
        await this.prisma.$executeRaw`
          UPDATE tables SET status = 'available', current_order_id = NULL
          WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid AND current_order_id = ${orderId}::uuid
        `;
        this.wsGateway.emitTableStatusChanged(tenantId, {
          tableId,
          tableNumber: (order.metadata as any)?.table_number || '',
          status: 'available',
          orderId: null,
        });
      }
    }

    this.wsGateway.emitOrderCancelled(tenantId, { orderId, orderNumber: order.orderNumber });

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

  async assignCustomer(tenantId: string, orderId: string, customerId: string | null) {
    const order = await this.findById(tenantId, orderId);
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new BadRequestException('No se puede modificar una orden cerrada');
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { customerId },
      include: { customer: true },
    });
  }

  // ── Private helpers ──

  private async recalculateOrderTotals(orderId: string) {
    await this.prisma.$queryRaw`
      UPDATE orders SET
        subtotal = COALESCE((SELECT SUM(subtotal - discount_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND is_void = false), 0),
        tax_amount = COALESCE((SELECT SUM(tax_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND is_void = false), 0),
        total = COALESCE((SELECT SUM(subtotal - discount_amount + tax_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND is_void = false), 0) - COALESCE(discount_amount, 0),
        updated_at = NOW()
      WHERE id = ${orderId}::uuid
    `;
  }

  async applyOrderDiscount(tenantId: string, orderId: string, userId: string, data: { type: 'percent' | 'fixed'; value: number; reason?: string }) {
    const order = await this.findById(tenantId, orderId);
    if (order.status === 'completed') throw new BadRequestException('No se puede aplicar descuento a una orden completada');

    const subtotal = parseFloat(order.subtotal?.toString() || '0') + parseFloat(order.taxAmount?.toString() || '0');
    // Recalculate from items without order-level discount first
    const itemsTotal: any[] = await this.prisma.$queryRaw`
      SELECT COALESCE(SUM(subtotal - discount_amount + tax_amount), 0)::float as total
      FROM order_items WHERE order_id = ${orderId}::uuid AND is_void = false
    `;
    const baseTotal = itemsTotal[0]?.total || 0;

    let discountAmount: number;
    if (data.type === 'percent') {
      if (data.value < 0 || data.value > 100) throw new BadRequestException('Porcentaje debe ser entre 0 y 100');
      discountAmount = Math.round(baseTotal * data.value / 100 * 100) / 100;
    } else {
      if (data.value < 0 || data.value > baseTotal) throw new BadRequestException('Descuento no puede ser mayor al total');
      discountAmount = data.value;
    }

    const reason = data.reason || (data.type === 'percent' ? `${data.value}% descuento` : `Descuento fijo $${data.value}`);

    await this.prisma.$executeRaw`
      UPDATE orders SET discount_amount = ${discountAmount}, discount_reason = ${reason},
        total = ${Math.max(0, baseTotal - discountAmount)},
        updated_at = NOW()
      WHERE id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    const userName = await this.getUserName(userId);
    this.audit.log({
      tenantId, userId, userName, action: 'apply_discount', entity: 'order',
      entityId: orderId, severity: 'warning',
      description: `Descuento ${reason} ($${discountAmount}) en Orden #${order.orderNumber}`,
      details: { orderNumber: order.orderNumber, discountType: data.type, discountValue: data.value, discountAmount, reason },
    });

    return this.findById(tenantId, orderId);
  }

  async applyItemDiscount(tenantId: string, orderId: string, itemId: string, userId: string, data: { type: 'percent' | 'fixed'; value: number; reason?: string }) {
    const order = await this.findById(tenantId, orderId);
    if (order.status === 'completed') throw new BadRequestException('No se puede aplicar descuento a una orden completada');

    const items: any[] = await this.prisma.$queryRaw`
      SELECT oi.id, oi.subtotal, oi.tax_amount, p.name as product_name
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.id = ${itemId}::uuid AND oi.order_id = ${orderId}::uuid AND oi.is_void = false
    `;
    if (!items.length) throw new NotFoundException('Item no encontrado');
    const item = items[0];
    const itemSubtotal = parseFloat(item.subtotal);

    let discountAmount: number;
    if (data.type === 'percent') {
      if (data.value < 0 || data.value > 100) throw new BadRequestException('Porcentaje debe ser entre 0 y 100');
      discountAmount = Math.round(itemSubtotal * data.value / 100 * 100) / 100;
    } else {
      if (data.value < 0 || data.value > itemSubtotal) throw new BadRequestException('Descuento no puede ser mayor al subtotal del item');
      discountAmount = data.value;
    }

    const reason = data.reason || (data.type === 'percent' ? `${data.value}%` : `$${data.value}`);

    await this.prisma.$executeRaw`
      UPDATE order_items SET discount_amount = ${discountAmount}, discount_reason = ${reason}
      WHERE id = ${itemId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    await this.recalculateOrderTotals(orderId);

    const userName = await this.getUserName(userId);
    this.audit.log({
      tenantId, userId, userName, action: 'apply_item_discount', entity: 'order',
      entityId: orderId, severity: 'warning',
      description: `Descuento ${reason} ($${discountAmount}) en "${item.product_name}" — Orden #${order.orderNumber}`,
      details: { orderNumber: order.orderNumber, itemId, productName: item.product_name, discountType: data.type, discountValue: data.value, discountAmount },
    });

    return this.findById(tenantId, orderId);
  }

  /**
   * Deduct ingredient stock based on product recipes when an order is completed.
   * For each order item, finds the associated recipe and decrements ingredient stock.
   */
  private async deductIngredientStock(tenantId: string, orderId: string) {
    try {
      // Get all non-voided items from this order
      const orderItems: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = '${orderId}'::uuid AND oi.is_void = false
      `);

      if (!orderItems.length) return;

      // Get recipes for these products in one query
      const productIds = orderItems.map(i => `'${i.product_id}'::uuid`).join(',');
      const recipeItems: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT r.product_id, ri.ingredient_id, ri.quantity as recipe_qty
        FROM recipes r
        JOIN recipe_items ri ON ri.recipe_id = r.id
        WHERE r.tenant_id = '${tenantId}'::uuid
          AND r.product_id IN (${productIds})
      `);

      if (!recipeItems.length) return;

      // Build a map: ingredient_id -> total quantity to deduct
      const deductions = new Map<string, number>();
      for (const oi of orderItems) {
        const recipeForProduct = recipeItems.filter(ri => ri.product_id === oi.product_id);
        for (const ri of recipeForProduct) {
          const currentDeduction = deductions.get(ri.ingredient_id) || 0;
          deductions.set(ri.ingredient_id, currentDeduction + (parseFloat(ri.recipe_qty) * parseFloat(oi.quantity)));
        }
      }

      // Batch deduct all ingredients
      for (const [ingredientId, qty] of deductions) {
        await this.prisma.$queryRawUnsafe(`
          UPDATE ingredients
          SET current_stock = GREATEST(current_stock - ${qty}, 0),
              updated_at = NOW()
          WHERE id = '${ingredientId}'::uuid AND tenant_id = '${tenantId}'::uuid
        `);
      }

      this.logger.log(`Deducted ${deductions.size} ingredients for order ${orderId}`);
    } catch (err) {
      // Don't fail the payment if stock deduction fails
      this.logger.error(`Failed to deduct ingredient stock for order ${orderId}: ${err}`);
    }
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;
    const lastOrder = await this.prisma.order.findFirst({
      where: { tenantId, orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
    });
    let nextNum = 1;
    if (lastOrder) {
      const parts = lastOrder.orderNumber.split('-');
      nextNum = parseInt(parts[2], 10) + 1;
    }
    return `${prefix}${nextNum.toString().padStart(5, '0')}`;
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
