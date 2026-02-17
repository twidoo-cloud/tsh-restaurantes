"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const library_1 = require("@prisma/client/runtime/library");
let OrdersService = class OrdersService {
    constructor(prisma, wsGateway, audit, notif) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
        this.audit = audit;
        this.notif = notif;
    }
    async findAll(tenantId, query) {
        const { status, type, page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;
        const conditions = [`o.tenant_id = '${tenantId}'`];
        if (status)
            conditions.push(`o.status = '${status}'`);
        if (type)
            conditions.push(`o.type = '${type}'`);
        const where = conditions.join(' AND ');
        const orders = await this.prisma.$queryRawUnsafe(`
      SELECT o.*, u.first_name || ' ' || u.last_name as server_name,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) as items_count,
        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.order_id = o.id) as total_paid
      FROM orders o LEFT JOIN users u ON u.id = o.served_by
      WHERE ${where}
      ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
        const countResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total FROM orders o WHERE ${where}`);
        return { data: orders, total: countResult[0]?.total || 0, page, limit };
    }
    async findOpenOrders(tenantId) {
        return this.prisma.$queryRaw `
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
    async findById(tenantId, id) {
        const order = await this.prisma.order.findFirst({
            where: { id, tenantId },
            include: {
                items: { orderBy: { createdAt: 'asc' } },
                payments: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Orden no encontrada');
        return order;
    }
    async create(tenantId, userId, dto) {
        const orderNumber = await this.generateOrderNumber(tenantId);
        const activeShifts = await this.prisma.$queryRaw `
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
        const userName = await this.getUserName(userId);
        this.audit.log({
            tenantId, userId, userName, action: 'create', entity: 'order',
            entityId: order.id, description: `Orden #${orderNumber} creada`,
            details: { type: dto.type, tableId: dto.metadata?.tableId },
        });
        return order;
    }
    async addItem(tenantId, orderId, dto) {
        const order = await this.findById(tenantId, orderId);
        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, tenantId },
        });
        if (!product)
            throw new common_1.NotFoundException('Producto no encontrado');
        const unitPrice = product.price;
        const subtotal = new library_1.Decimal(unitPrice.toString()).mul(dto.quantity);
        const taxRate = product.taxRate || new library_1.Decimal(0);
        const taxAmount = subtotal.mul(taxRate).div(100);
        const items = await this.prisma.$queryRaw `
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
    async voidItem(tenantId, orderId, itemId, reason) {
        await this.prisma.$queryRaw `
      UPDATE order_items SET status = 'voided', notes = ${reason} WHERE id = ${itemId}::uuid
    `;
        await this.recalculateOrderTotals(orderId);
        this.audit.log({
            tenantId, action: 'void', entity: 'order_item', entityId: itemId,
            description: `Ítem anulado en orden. Razón: ${reason}`,
            severity: 'warning', details: { orderId, reason },
        });
    }
    async processPayment(tenantId, orderId, userId, dto) {
        const order = await this.findById(tenantId, orderId);
        if (order.status === 'completed')
            throw new common_1.BadRequestException('La orden ya está pagada');
        const paidAmount = order.payments.reduce((sum, p) => sum.add(new library_1.Decimal(p.amount.toString())), new library_1.Decimal(0));
        const remaining = new library_1.Decimal(order.total.toString()).sub(paidAmount);
        const paymentAmount = new library_1.Decimal(dto.amount);
        if (paymentAmount.gt(remaining.add(new library_1.Decimal('0.01')))) {
            throw new common_1.BadRequestException(`Monto excede el saldo pendiente (${remaining})`);
        }
        const payment = await this.prisma.payment.create({
            data: {
                tenantId, orderId, method: dto.method, amount: paymentAmount,
                currencyCode: dto.currencyCode || 'PEN', reference: dto.reference || null,
                processedBy: userId,
                cashReceived: dto.cashReceived ? new library_1.Decimal(dto.cashReceived) : null,
                changeGiven: dto.cashReceived
                    ? new library_1.Decimal(dto.cashReceived).sub(paymentAmount).greaterThan(0) ? new library_1.Decimal(dto.cashReceived).sub(paymentAmount) : new library_1.Decimal(0)
                    : null,
            },
        });
        const totalPaid = paidAmount.add(paymentAmount);
        if (totalPaid.gte(new library_1.Decimal(order.total.toString()))) {
            await this.prisma.order.update({ where: { id: orderId }, data: { status: 'completed', closedAt: new Date() } });
            this.wsGateway.emitOrderPaid(tenantId, {
                orderId, orderNumber: order.orderNumber,
                total: parseFloat(order.total.toString()), method: dto.method,
            });
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
            orderStatus: totalPaid.gte(new library_1.Decimal(order.total.toString())) ? 'completed' : 'open',
            totalPaid: totalPaid.toNumber(),
            remaining: new library_1.Decimal(order.total.toString()).sub(totalPaid).toNumber(),
        };
    }
    async cancelOrder(tenantId, orderId, userId) {
        const order = await this.findById(tenantId, orderId);
        if (order.status === 'completed')
            throw new common_1.BadRequestException('No se puede cancelar una orden completada');
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
    async recalculateOrderTotals(orderId) {
        await this.prisma.$queryRaw `
      UPDATE orders SET
        subtotal = COALESCE((SELECT SUM(subtotal) FROM order_items WHERE order_id = ${orderId}::uuid AND status != 'voided'), 0),
        tax = COALESCE((SELECT SUM(tax_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND status != 'voided'), 0),
        total = COALESCE((SELECT SUM(subtotal + tax_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND status != 'voided'), 0),
        updated_at = NOW()
      WHERE id = ${orderId}::uuid
    `;
    }
    async generateOrderNumber(tenantId) {
        const result = await this.prisma.$queryRaw `
      SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_number
      FROM orders WHERE tenant_id = ${tenantId}::uuid
    `;
        return String(result[0].next_number).padStart(6, '0');
    }
    async getUserName(userId) {
        try {
            const users = await this.prisma.$queryRaw `
        SELECT first_name || ' ' || last_name as name FROM users WHERE id = ${userId}::uuid
      `;
            return users[0]?.name || 'Desconocido';
        }
        catch {
            return 'Desconocido';
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pos_events_gateway_1.PosEventsGateway,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map