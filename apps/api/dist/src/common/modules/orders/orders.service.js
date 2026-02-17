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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const client_1 = require("@prisma/client");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
const audit_service_1 = require("../audit/audit.service");
const notifications_service_1 = require("../notifications/notifications.service");
const library_1 = require("@prisma/client/runtime/library");
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, wsGateway, audit, notif) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
        this.audit = audit;
        this.notif = notif;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async findAll(tenantId, query, branchId = null) {
        const { status, type, page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;
        const conditions = [`o.tenant_id = '${tenantId}'`];
        if (branchId)
            conditions.push(`o.branch_id = '${branchId}'`);
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
    async findOpenOrders(tenantId, branchId = null) {
        const bf = branchId ? client_1.Prisma.sql `AND o.branch_id = ${branchId}::uuid` : client_1.Prisma.empty;
        return this.prisma.$queryRaw `
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
    async findById(tenantId, id) {
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
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { defaultBranchId: true } });
        const branchId = dto.branchId || user?.defaultBranchId || null;
        const order = await this.prisma.order.create({
            data: {
                tenantId, branchId, orderNumber, type: dto.type || 'sale', servedBy: userId,
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
        this.notif.notifyNewOrder(tenantId, orderNumber, 0);
        return order;
    }
    async addItem(tenantId, orderId, userId, dto) {
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
        const userName = await this.getUserName(userId);
        this.audit.log({
            tenantId, userId, userName, action: 'add_item', entity: 'order',
            entityId: orderId,
            description: `${product.name} x${dto.quantity} agregado a Orden #${order.orderNumber}`,
            details: { orderNumber: order.orderNumber, productName: product.name, quantity: dto.quantity, unitPrice: parseFloat(unitPrice.toString()) },
        });
        return { ...item, productName: product.name };
    }
    async voidItem(tenantId, orderId, itemId, userId, reason) {
        const order = await this.findById(tenantId, orderId);
        const itemRows = await this.prisma.$queryRaw `
      SELECT p.name as product_name FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.id = ${itemId}::uuid
    `;
        const productName = itemRows[0]?.product_name || 'desconocido';
        await this.prisma.$queryRaw `
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
    async updateItemNotes(tenantId, orderId, itemId, notes) {
        await this.prisma.$executeRaw `
      UPDATE order_items SET notes = ${notes || null}
      WHERE id = ${itemId}::uuid AND order_id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        await this.prisma.$executeRaw `
      UPDATE kitchen_orders SET notes = ${notes || null}
      WHERE order_item_id = ${itemId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        return { id: itemId, notes };
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
                currencyCode: dto.currencyCode || 'USD', reference: dto.reference || null,
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
            if (order.type === 'dine_in') {
                const tableId = order.metadata?.table_id || (typeof order.metadata === 'string' ? JSON.parse(order.metadata || '{}').table_id : null);
                if (tableId) {
                    await this.prisma.$executeRaw `
            UPDATE tables SET status = 'available', current_order_id = NULL
            WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid AND current_order_id = ${orderId}::uuid
          `;
                    this.wsGateway.emitTableStatusChanged(tenantId, {
                        tableId,
                        tableNumber: order.metadata?.table_number || '',
                        status: 'available',
                        orderId: null,
                    });
                }
            }
            const userName = await this.getUserName(userId);
            this.audit.log({
                tenantId, userId, userName, action: 'payment', entity: 'order',
                entityId: orderId,
                description: `Pago completado: Orden #${order.orderNumber} por $${parseFloat(order.total.toString()).toFixed(2)} (${dto.method})`,
                details: { method: dto.method, amount: paymentAmount.toNumber(), orderNumber: order.orderNumber },
            });
            await this.deductIngredientStock(tenantId, orderId);
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
        if (order.type === 'dine_in') {
            const tableId = order.metadata?.table_id || (typeof order.metadata === 'string' ? JSON.parse(order.metadata || '{}').table_id : null);
            if (tableId) {
                await this.prisma.$executeRaw `
          UPDATE tables SET status = 'available', current_order_id = NULL
          WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid AND current_order_id = ${orderId}::uuid
        `;
                this.wsGateway.emitTableStatusChanged(tenantId, {
                    tableId,
                    tableNumber: order.metadata?.table_number || '',
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
    async assignCustomer(tenantId, orderId, customerId) {
        const order = await this.findById(tenantId, orderId);
        if (order.status === 'completed' || order.status === 'cancelled') {
            throw new common_1.BadRequestException('No se puede modificar una orden cerrada');
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: { customerId },
            include: { customer: true },
        });
    }
    async recalculateOrderTotals(orderId) {
        await this.prisma.$queryRaw `
      UPDATE orders SET
        subtotal = COALESCE((SELECT SUM(subtotal - discount_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND is_void = false), 0),
        tax_amount = COALESCE((SELECT SUM(tax_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND is_void = false), 0),
        total = COALESCE((SELECT SUM(subtotal - discount_amount + tax_amount) FROM order_items WHERE order_id = ${orderId}::uuid AND is_void = false), 0) - COALESCE(discount_amount, 0),
        updated_at = NOW()
      WHERE id = ${orderId}::uuid
    `;
    }
    async applyOrderDiscount(tenantId, orderId, userId, data) {
        const order = await this.findById(tenantId, orderId);
        if (order.status === 'completed')
            throw new common_1.BadRequestException('No se puede aplicar descuento a una orden completada');
        const subtotal = parseFloat(order.subtotal?.toString() || '0') + parseFloat(order.taxAmount?.toString() || '0');
        const itemsTotal = await this.prisma.$queryRaw `
      SELECT COALESCE(SUM(subtotal - discount_amount + tax_amount), 0)::float as total
      FROM order_items WHERE order_id = ${orderId}::uuid AND is_void = false
    `;
        const baseTotal = itemsTotal[0]?.total || 0;
        let discountAmount;
        if (data.type === 'percent') {
            if (data.value < 0 || data.value > 100)
                throw new common_1.BadRequestException('Porcentaje debe ser entre 0 y 100');
            discountAmount = Math.round(baseTotal * data.value / 100 * 100) / 100;
        }
        else {
            if (data.value < 0 || data.value > baseTotal)
                throw new common_1.BadRequestException('Descuento no puede ser mayor al total');
            discountAmount = data.value;
        }
        const reason = data.reason || (data.type === 'percent' ? `${data.value}% descuento` : `Descuento fijo $${data.value}`);
        await this.prisma.$executeRaw `
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
    async applyItemDiscount(tenantId, orderId, itemId, userId, data) {
        const order = await this.findById(tenantId, orderId);
        if (order.status === 'completed')
            throw new common_1.BadRequestException('No se puede aplicar descuento a una orden completada');
        const items = await this.prisma.$queryRaw `
      SELECT oi.id, oi.subtotal, oi.tax_amount, p.name as product_name
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.id = ${itemId}::uuid AND oi.order_id = ${orderId}::uuid AND oi.is_void = false
    `;
        if (!items.length)
            throw new common_1.NotFoundException('Item no encontrado');
        const item = items[0];
        const itemSubtotal = parseFloat(item.subtotal);
        let discountAmount;
        if (data.type === 'percent') {
            if (data.value < 0 || data.value > 100)
                throw new common_1.BadRequestException('Porcentaje debe ser entre 0 y 100');
            discountAmount = Math.round(itemSubtotal * data.value / 100 * 100) / 100;
        }
        else {
            if (data.value < 0 || data.value > itemSubtotal)
                throw new common_1.BadRequestException('Descuento no puede ser mayor al subtotal del item');
            discountAmount = data.value;
        }
        const reason = data.reason || (data.type === 'percent' ? `${data.value}%` : `$${data.value}`);
        await this.prisma.$executeRaw `
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
    async deductIngredientStock(tenantId, orderId) {
        try {
            const orderItems = await this.prisma.$queryRawUnsafe(`
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        WHERE oi.order_id = '${orderId}'::uuid AND oi.is_void = false
      `);
            if (!orderItems.length)
                return;
            const productIds = orderItems.map(i => `'${i.product_id}'::uuid`).join(',');
            const recipeItems = await this.prisma.$queryRawUnsafe(`
        SELECT r.product_id, ri.ingredient_id, ri.quantity as recipe_qty
        FROM recipes r
        JOIN recipe_items ri ON ri.recipe_id = r.id
        WHERE r.tenant_id = '${tenantId}'::uuid
          AND r.product_id IN (${productIds})
      `);
            if (!recipeItems.length)
                return;
            const deductions = new Map();
            for (const oi of orderItems) {
                const recipeForProduct = recipeItems.filter(ri => ri.product_id === oi.product_id);
                for (const ri of recipeForProduct) {
                    const currentDeduction = deductions.get(ri.ingredient_id) || 0;
                    deductions.set(ri.ingredient_id, currentDeduction + (parseFloat(ri.recipe_qty) * parseFloat(oi.quantity)));
                }
            }
            for (const [ingredientId, qty] of deductions) {
                await this.prisma.$queryRawUnsafe(`
          UPDATE ingredients
          SET current_stock = GREATEST(current_stock - ${qty}, 0),
              updated_at = NOW()
          WHERE id = '${ingredientId}'::uuid AND tenant_id = '${tenantId}'::uuid
        `);
            }
            this.logger.log(`Deducted ${deductions.size} ingredients for order ${orderId}`);
        }
        catch (err) {
            this.logger.error(`Failed to deduct ingredient stock for order ${orderId}: ${err}`);
        }
    }
    async generateOrderNumber(tenantId) {
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
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pos_events_gateway_1.PosEventsGateway,
        audit_service_1.AuditService,
        notifications_service_1.NotificationsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map