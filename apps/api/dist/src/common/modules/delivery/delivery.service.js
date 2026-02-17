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
exports.DeliveryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
let DeliveryService = class DeliveryService {
    constructor(prisma, wsGateway) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
    }
    async findAll(tenantId, query, branchId) {
        const { status, type, date, search, page = 1, limit = 50 } = query;
        const offset = (page - 1) * limit;
        let where = `WHERE d.tenant_id = '${tenantId}'::uuid`;
        if (branchId)
            where += ` AND d.branch_id = '${branchId}'::uuid`;
        if (status)
            where += ` AND d.delivery_status = '${status}'`;
        if (type)
            where += ` AND d.delivery_type = '${type}'`;
        if (date)
            where += ` AND d.created_at::date = '${date}'::date`;
        if (search)
            where += ` AND (d.customer_name ILIKE '%${search}%' OR d.customer_phone ILIKE '%${search}%' OR d.address_line1 ILIKE '%${search}%')`;
        const countResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total FROM delivery_orders d ${where}`);
        const total = countResult[0]?.total || 0;
        const data = await this.prisma.$queryRawUnsafe(`
      SELECT d.*, o.order_number, o.subtotal, o.tax_amount, o.total as order_total, o.status as order_status,
        dz.name as zone_name
      FROM delivery_orders d
      JOIN orders o ON o.id = d.order_id
      LEFT JOIN delivery_zones dz ON dz.id = d.zone_id
      ${where}
      ORDER BY
        CASE d.delivery_status
          WHEN 'pending' THEN 1 WHEN 'confirmed' THEN 2 WHEN 'preparing' THEN 3
          WHEN 'ready' THEN 4 WHEN 'out_for_delivery' THEN 5
          ELSE 6 END,
        d.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findById(tenantId, id) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT d.*, o.order_number, o.subtotal, o.tax_amount, o.total as order_total, o.status as order_status,
        dz.name as zone_name
      FROM delivery_orders d
      JOIN orders o ON o.id = d.order_id
      LEFT JOIN delivery_zones dz ON dz.id = d.zone_id
      WHERE d.id = '${id}'::uuid AND d.tenant_id = '${tenantId}'::uuid
    `);
        if (!rows.length)
            throw new common_1.NotFoundException('Pedido no encontrado');
        const items = await this.prisma.$queryRawUnsafe(`
      SELECT oi.*, p.name as product_name, p.price as unit_price
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = '${rows[0].order_id}'::uuid AND oi.is_void = false
    `);
        return { ...rows[0], items };
    }
    async create(tenantId, dto, userId, branchId) {
        const settings = await this.getOrCreateSettings(tenantId);
        if (dto.deliveryType === 'delivery' && !settings.accepts_delivery)
            throw new common_1.BadRequestException('Delivery no disponible');
        if (dto.deliveryType === 'pickup' && !settings.accepts_pickup)
            throw new common_1.BadRequestException('Pickup no disponible');
        if (dto.deliveryType === 'delivery' && !dto.addressLine1)
            throw new common_1.BadRequestException('Dirección requerida para delivery');
        let deliveryFee = 0;
        let estimatedMinutes = settings.estimated_pickup_minutes || 20;
        if (dto.deliveryType === 'delivery') {
            estimatedMinutes = settings.estimated_delivery_minutes || 45;
            if (dto.zoneId) {
                const zones = await this.prisma.$queryRawUnsafe(`SELECT * FROM delivery_zones WHERE id = '${dto.zoneId}'::uuid AND tenant_id = '${tenantId}'::uuid`);
                if (zones.length) {
                    deliveryFee = parseFloat(zones[0].delivery_fee) || 0;
                    estimatedMinutes = zones[0].estimated_minutes || estimatedMinutes;
                }
            }
            else {
                deliveryFee = parseFloat(settings.default_delivery_fee) || 0;
            }
        }
        const orderNumber = await this.generateOrderNumber(tenantId);
        const activeShifts = await this.prisma.$queryRawUnsafe(`SELECT id FROM shifts WHERE tenant_id = '${tenantId}'::uuid AND status = 'open' ORDER BY opened_at DESC LIMIT 1`);
        const shiftId = activeShifts.length > 0 ? activeShifts[0].id : null;
        const order = await this.prisma.order.create({
            data: {
                tenantId,
                branchId: branchId || undefined,
                orderNumber,
                type: dto.deliveryType === 'pickup' ? 'pickup' : 'delivery',
                customerId: dto.customerId || undefined,
                servedBy: userId || undefined,
                shiftId,
                notes: dto.notes || undefined,
                metadata: {
                    delivery_type: dto.deliveryType,
                    customer_phone: dto.customerPhone,
                    source: dto.source || 'phone',
                },
            },
        });
        for (const item of dto.items) {
            const products = await this.prisma.$queryRawUnsafe(`SELECT price, tax_rate FROM products WHERE id = '${item.productId}'::uuid AND tenant_id = '${tenantId}'::uuid`);
            if (!products.length)
                continue;
            const price = parseFloat(products[0].price);
            const taxRate = parseFloat(products[0].tax_rate) || 0;
            const lineTotal = price * item.quantity;
            const lineTax = lineTotal * taxRate;
            await this.prisma.$queryRawUnsafe(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal, tax_amount, discount_amount, notes, tenant_id)
        VALUES (uuid_generate_v7(), '${order.id}'::uuid, '${item.productId}'::uuid,
  ${item.quantity}, ${price}, ${lineTotal}, ${lineTax}, 0,
          ${item.notes ? `'${item.notes.replace(/'/g, "''")}'` : 'NULL'}, '${tenantId}'::uuid)
      `);
        }
        const totals = await this.prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(subtotal), 0) as subtotal, COALESCE(SUM(tax_amount), 0) as tax
      FROM order_items WHERE order_id = '${order.id}'::uuid AND is_void = false
    `);
        const subtotal = parseFloat(totals[0].subtotal);
        const tax = parseFloat(totals[0].tax);
        if (dto.deliveryType === 'delivery' && settings.free_delivery_above && subtotal >= parseFloat(settings.free_delivery_above)) {
            deliveryFee = 0;
        }
        if (settings.min_order_amount && subtotal < parseFloat(settings.min_order_amount)) {
            throw new common_1.BadRequestException(`Pedido mínimo: $${parseFloat(settings.min_order_amount).toFixed(2)}`);
        }
        const total = subtotal + tax + deliveryFee;
        await this.prisma.$queryRawUnsafe(`UPDATE orders SET subtotal = ${subtotal}, tax_amount = ${tax}, total = ${total} WHERE id = '${order.id}'::uuid`);
        const initialStatus = settings.auto_accept_orders ? 'confirmed' : 'pending';
        const bId = branchId || null;
        const deliveryRows = await this.prisma.$queryRawUnsafe(`
      INSERT INTO delivery_orders (tenant_id, branch_id, order_id, customer_name, customer_phone, customer_email,
        address_line1, address_line2, address_reference, city, latitude, longitude,
        delivery_type, delivery_fee, zone_id, estimated_minutes, scheduled_for,
        delivery_status, payment_method, source, external_order_id, notes,
        ${initialStatus === 'confirmed' ? 'confirmed_at,' : ''} metadata)
      VALUES ('${tenantId}'::uuid, ${bId ? `'${bId}'::uuid` : 'NULL'}, '${order.id}'::uuid,
        '${dto.customerName.replace(/'/g, "''")}', '${dto.customerPhone}',
        ${dto.customerEmail ? `'${dto.customerEmail}'` : 'NULL'},
        ${dto.addressLine1 ? `'${dto.addressLine1.replace(/'/g, "''")}'` : 'NULL'},
        ${dto.addressLine2 ? `'${dto.addressLine2.replace(/'/g, "''")}'` : 'NULL'},
        ${dto.addressReference ? `'${dto.addressReference.replace(/'/g, "''")}'` : 'NULL'},
        ${dto.city ? `'${dto.city}'` : 'NULL'},
        ${dto.latitude || 'NULL'}, ${dto.longitude || 'NULL'},
        '${dto.deliveryType}', ${deliveryFee},
        ${dto.zoneId ? `'${dto.zoneId}'::uuid` : 'NULL'},
        ${estimatedMinutes},
        ${dto.scheduledFor ? `'${dto.scheduledFor}'::timestamptz` : 'NULL'},
        '${initialStatus}',
        '${dto.paymentMethod || 'cash'}',
        '${dto.source || 'phone'}',
        ${dto.externalOrderId ? `'${dto.externalOrderId}'` : 'NULL'},
        ${dto.notes ? `'${dto.notes.replace(/'/g, "''")}'` : 'NULL'},
        ${initialStatus === 'confirmed' ? 'NOW(),' : ''}
        '{}')
      RETURNING *
    `);
        const result = { ...deliveryRows[0], order_number: orderNumber, order_total: total };
        this.wsGateway.server?.to(`tenant:${tenantId}`).emit('delivery:created', result);
        return result;
    }
    async updateStatus(tenantId, id, newStatus, extra) {
        const delivery = await this.findById(tenantId, id);
        const validTransitions = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['preparing', 'cancelled'],
            preparing: ['ready', 'cancelled'],
            ready: ['out_for_delivery', 'delivered', 'cancelled'],
            out_for_delivery: ['delivered', 'cancelled'],
            delivered: [],
            cancelled: [],
        };
        if (!validTransitions[delivery.delivery_status]?.includes(newStatus)) {
            throw new common_1.BadRequestException(`No se puede cambiar de ${delivery.delivery_status} a ${newStatus}`);
        }
        const sets = [`delivery_status = '${newStatus}'`, `updated_at = NOW()`];
        if (newStatus === 'confirmed')
            sets.push(`confirmed_at = NOW()`);
        if (newStatus === 'preparing')
            sets.push(`preparing_at = NOW()`);
        if (newStatus === 'ready')
            sets.push(`ready_at = NOW()`);
        if (newStatus === 'out_for_delivery')
            sets.push(`dispatched_at = NOW()`);
        if (newStatus === 'delivered')
            sets.push(`delivered_at = NOW()`, `is_paid = true`);
        if (newStatus === 'cancelled') {
            sets.push(`cancelled_at = NOW()`);
            if (extra?.reason)
                sets.push(`cancellation_reason = '${extra.reason.replace(/'/g, "''")}'`);
        }
        if (extra?.driverName)
            sets.push(`driver_name = '${extra.driverName.replace(/'/g, "''")}'`);
        if (extra?.driverPhone)
            sets.push(`driver_phone = '${extra.driverPhone}'`);
        await this.prisma.$queryRawUnsafe(`UPDATE delivery_orders SET ${sets.join(', ')} WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        if (newStatus === 'delivered')
            await this.prisma.$queryRawUnsafe(`UPDATE orders SET status = 'completed', closed_at = NOW() WHERE id = '${delivery.order_id}'::uuid`);
        if (newStatus === 'cancelled')
            await this.prisma.$queryRawUnsafe(`UPDATE orders SET status = 'cancelled', closed_at = NOW() WHERE id = '${delivery.order_id}'::uuid`);
        if (newStatus === 'preparing') {
            this.wsGateway.server?.to(`tenant:${tenantId}`).emit('kitchen:newOrder', {
                orderId: delivery.order_id, orderNumber: delivery.order_number, type: delivery.delivery_type,
            });
        }
        const updated = await this.findById(tenantId, id);
        this.wsGateway.server?.to(`tenant:${tenantId}`).emit('delivery:statusChanged', updated);
        return updated;
    }
    async update(tenantId, id, dto) {
        const delivery = await this.findById(tenantId, id);
        if (['delivered', 'cancelled'].includes(delivery.delivery_status)) {
            throw new common_1.BadRequestException('No se puede modificar un pedido completado o cancelado');
        }
        const sets = [];
        if (dto.customerName)
            sets.push(`customer_name = '${dto.customerName.replace(/'/g, "''")}'`);
        if (dto.customerPhone)
            sets.push(`customer_phone = '${dto.customerPhone}'`);
        if (dto.addressLine1)
            sets.push(`address_line1 = '${dto.addressLine1.replace(/'/g, "''")}'`);
        if (dto.addressLine2 !== undefined)
            sets.push(`address_line2 = ${dto.addressLine2 ? `'${dto.addressLine2.replace(/'/g, "''")}'` : 'NULL'}`);
        if (dto.addressReference !== undefined)
            sets.push(`address_reference = ${dto.addressReference ? `'${dto.addressReference.replace(/'/g, "''")}'` : 'NULL'}`);
        if (dto.driverName !== undefined)
            sets.push(`driver_name = ${dto.driverName ? `'${dto.driverName.replace(/'/g, "''")}'` : 'NULL'}`);
        if (dto.driverPhone !== undefined)
            sets.push(`driver_phone = ${dto.driverPhone ? `'${dto.driverPhone}'` : 'NULL'}`);
        if (dto.notes !== undefined)
            sets.push(`notes = ${dto.notes ? `'${dto.notes.replace(/'/g, "''")}'` : 'NULL'}`);
        sets.push(`updated_at = NOW()`);
        await this.prisma.$queryRawUnsafe(`UPDATE delivery_orders SET ${sets.join(', ')} WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        return this.findById(tenantId, id);
    }
    async getDashboard(tenantId, date, branchId) {
        const dateFilter = date ? `AND d.created_at::date = '${date}'::date` : `AND d.created_at::date = CURRENT_DATE`;
        const bf = branchId ? `AND d.branch_id = '${branchId}'::uuid` : '';
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE d.delivery_status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE d.delivery_status = 'confirmed')::int as confirmed,
        COUNT(*) FILTER (WHERE d.delivery_status = 'preparing')::int as preparing,
        COUNT(*) FILTER (WHERE d.delivery_status = 'ready')::int as ready,
        COUNT(*) FILTER (WHERE d.delivery_status = 'out_for_delivery')::int as out_for_delivery,
        COUNT(*) FILTER (WHERE d.delivery_status = 'delivered')::int as delivered,
        COUNT(*) FILTER (WHERE d.delivery_status = 'cancelled')::int as cancelled,
        COUNT(*)::int as total,
        COALESCE(SUM(o.total) FILTER (WHERE d.delivery_status = 'delivered'), 0)::decimal as revenue,
        COALESCE(SUM(d.delivery_fee) FILTER (WHERE d.delivery_status = 'delivered'), 0)::decimal as delivery_fees,
        COALESCE(AVG(EXTRACT(EPOCH FROM (d.delivered_at - d.created_at)) / 60) FILTER (WHERE d.delivery_status = 'delivered'), 0)::int as avg_delivery_minutes
      FROM delivery_orders d
      JOIN orders o ON o.id = d.order_id
      WHERE d.tenant_id = '${tenantId}'::uuid ${dateFilter} ${bf}
    `);
        return rows[0];
    }
    async getZones(tenantId, branchId) {
        const bf = branchId ? `AND branch_id = '${branchId}'::uuid` : '';
        return this.prisma.$queryRawUnsafe(`SELECT * FROM delivery_zones WHERE tenant_id = '${tenantId}'::uuid ${bf} ORDER BY display_order, name`);
    }
    async createZone(tenantId, dto, branchId) {
        const bId = branchId ? `'${branchId}'::uuid` : 'NULL';
        const rows = await this.prisma.$queryRawUnsafe(`
      INSERT INTO delivery_zones (tenant_id, branch_id, name, delivery_fee, min_order_amount, estimated_minutes, color)
      VALUES ('${tenantId}'::uuid, ${bId}, '${dto.name.replace(/'/g, "''")}', ${dto.deliveryFee},
        ${dto.minOrderAmount || 0}, ${dto.estimatedMinutes || 30}, '${dto.color || '#3B82F6'}')
      RETURNING *
    `);
        return rows[0];
    }
    async updateZone(tenantId, id, dto) {
        const sets = [];
        if (dto.name)
            sets.push(`name = '${dto.name.replace(/'/g, "''")}'`);
        if (dto.deliveryFee !== undefined)
            sets.push(`delivery_fee = ${dto.deliveryFee}`);
        if (dto.minOrderAmount !== undefined)
            sets.push(`min_order_amount = ${dto.minOrderAmount}`);
        if (dto.estimatedMinutes)
            sets.push(`estimated_minutes = ${dto.estimatedMinutes}`);
        if (dto.isActive !== undefined)
            sets.push(`is_active = ${dto.isActive}`);
        if (dto.color)
            sets.push(`color = '${dto.color}'`);
        sets.push(`updated_at = NOW()`);
        await this.prisma.$queryRawUnsafe(`UPDATE delivery_zones SET ${sets.join(', ')} WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM delivery_zones WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        return rows[0];
    }
    async deleteZone(tenantId, id) {
        await this.prisma.$queryRawUnsafe(`DELETE FROM delivery_zones WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        return { success: true };
    }
    async getOrCreateSettings(tenantId) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM delivery_settings WHERE tenant_id = '${tenantId}'::uuid`);
        if (rows.length)
            return rows[0];
        const created = await this.prisma.$queryRawUnsafe(`INSERT INTO delivery_settings (tenant_id) VALUES ('${tenantId}'::uuid) RETURNING *`);
        return created[0];
    }
    async updateSettings(tenantId, dto) {
        await this.getOrCreateSettings(tenantId);
        const sets = [];
        if (dto.isEnabled !== undefined)
            sets.push(`is_enabled = ${dto.isEnabled}`);
        if (dto.acceptsDelivery !== undefined)
            sets.push(`accepts_delivery = ${dto.acceptsDelivery}`);
        if (dto.acceptsPickup !== undefined)
            sets.push(`accepts_pickup = ${dto.acceptsPickup}`);
        if (dto.defaultDeliveryFee !== undefined)
            sets.push(`default_delivery_fee = ${dto.defaultDeliveryFee}`);
        if (dto.freeDeliveryAbove !== undefined)
            sets.push(`free_delivery_above = ${dto.freeDeliveryAbove}`);
        if (dto.minOrderAmount !== undefined)
            sets.push(`min_order_amount = ${dto.minOrderAmount}`);
        if (dto.estimatedDeliveryMinutes)
            sets.push(`estimated_delivery_minutes = ${dto.estimatedDeliveryMinutes}`);
        if (dto.estimatedPickupMinutes)
            sets.push(`estimated_pickup_minutes = ${dto.estimatedPickupMinutes}`);
        if (dto.deliveryHoursStart)
            sets.push(`delivery_hours_start = '${dto.deliveryHoursStart}'::time`);
        if (dto.deliveryHoursEnd)
            sets.push(`delivery_hours_end = '${dto.deliveryHoursEnd}'::time`);
        if (dto.autoAcceptOrders !== undefined)
            sets.push(`auto_accept_orders = ${dto.autoAcceptOrders}`);
        if (dto.whatsappNumber !== undefined)
            sets.push(`whatsapp_number = ${dto.whatsappNumber ? `'${dto.whatsappNumber}'` : 'NULL'}`);
        sets.push(`updated_at = NOW()`);
        await this.prisma.$queryRawUnsafe(`UPDATE delivery_settings SET ${sets.join(', ')} WHERE tenant_id = '${tenantId}'::uuid`);
        return this.getOrCreateSettings(tenantId);
    }
    async generateOrderNumber(tenantId) {
        const year = new Date().getFullYear();
        const prefix = `DEL-${year}-`;
        const lastOrder = await this.prisma.order.findFirst({ where: { tenantId, orderNumber: { startsWith: prefix } }, orderBy: { orderNumber: 'desc' } });
        let nextNum = 1;
        if (lastOrder) {
            const parts = lastOrder.orderNumber.split('-');
            nextNum = parseInt(parts[2], 10) + 1;
        }
        return `${prefix}${nextNum.toString().padStart(5, '0')}`;
    }
};
exports.DeliveryService = DeliveryService;
exports.DeliveryService = DeliveryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pos_events_gateway_1.PosEventsGateway])
], DeliveryService);
//# sourceMappingURL=delivery.service.js.map