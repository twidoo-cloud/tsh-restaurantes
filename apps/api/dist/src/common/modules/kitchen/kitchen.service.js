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
exports.KitchenService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
const branch_filter_1 = require("../../helpers/branch-filter");
let KitchenService = class KitchenService {
    constructor(prisma, wsGateway) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
    }
    async getKitchenOrders(tenantId, station, branchId) {
        const whereStation = station ? `AND ko.kitchen_station = '${station}'` : '';
        const bf = (0, branch_filter_1.branchConditionFor)('ko', branchId);
        const orders = await this.prisma.$queryRawUnsafe(`
      SELECT 
        ko.id, ko.order_item_id, ko.order_id, ko.kitchen_station,
        ko.status, ko.priority, ko.seat_number, ko.notes as kitchen_notes,
        ko.fired_at, ko.ready_at, ko.created_at,
        oi.quantity, oi.notes as item_notes, oi.modifiers,
        p.name as product_name, p.attributes as product_attributes,
        o.order_number, o.type as order_type, o.metadata as order_metadata,
        EXTRACT(EPOCH FROM (NOW() - ko.created_at))::int as elapsed_seconds
      FROM kitchen_orders ko
      JOIN order_items oi ON oi.id = ko.order_item_id
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = ko.order_id
      WHERE ko.tenant_id = '${tenantId}'
        AND ko.status IN ('pending', 'preparing')
        ${whereStation}
        ${bf}
      ORDER BY ko.priority DESC, ko.created_at ASC
    `);
        const grouped = new Map();
        for (const row of orders) {
            const key = row.order_id;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    orderId: row.order_id,
                    orderNumber: row.order_number,
                    orderType: row.order_type,
                    tableNumber: row.order_metadata?.table_id ? await this.getTableNumber(tenantId, row.order_metadata.table_id) : null,
                    guestCount: row.order_metadata?.guest_count || null,
                    items: [],
                    oldestItemSeconds: Infinity,
                });
            }
            const group = grouped.get(key);
            group.items.push({
                id: row.id, orderItemId: row.order_item_id,
                productName: row.product_name, quantity: parseFloat(row.quantity),
                station: row.kitchen_station, status: row.status, priority: row.priority,
                seatNumber: row.seat_number, kitchenNotes: row.kitchen_notes,
                itemNotes: row.item_notes, modifiers: row.modifiers,
                prepTime: row.product_attributes?.prep_time_minutes || null,
                elapsedSeconds: row.elapsed_seconds, firedAt: row.fired_at, createdAt: row.created_at,
            });
            if (row.elapsed_seconds < group.oldestItemSeconds)
                group.oldestItemSeconds = row.elapsed_seconds;
        }
        return Array.from(grouped.values());
    }
    async fireOrderToKitchen(tenantId, orderId) {
        const items = await this.prisma.$queryRaw `
      SELECT oi.id, oi.product_id, oi.notes, p.attributes
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ${orderId}::uuid
        AND oi.tenant_id = ${tenantId}::uuid
        AND oi.is_void = false
        AND NOT EXISTS (
          SELECT 1 FROM kitchen_orders ko WHERE ko.order_item_id = oi.id AND ko.tenant_id = ${tenantId}::uuid
        )
    `;
        if (items.length === 0)
            return { sent: 0 };
        const orderRows = await this.prisma.$queryRaw `
      SELECT branch_id FROM orders WHERE id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        const orderBranchId = orderRows[0]?.branch_id || null;
        const kitchenOrders = items.map((item) => ({
            tenantId, orderItemId: item.id, orderId,
            kitchenStation: item.attributes?.kitchen_station || 'general',
            status: 'pending', priority: 0, notes: item.notes || null, firedAt: new Date(),
            branchId: orderBranchId,
        }));
        for (const ko of kitchenOrders) {
            await this.prisma.$executeRaw `
        INSERT INTO kitchen_orders (tenant_id, branch_id, order_item_id, order_id, kitchen_station, status, priority, notes, fired_at, created_at)
        VALUES (${ko.tenantId}::uuid, ${ko.branchId}::uuid, ${ko.orderItemId}::uuid, ${ko.orderId}::uuid, ${ko.kitchenStation}, ${ko.status}, ${ko.priority}, ${ko.notes}, ${ko.firedAt}, NOW())
      `;
        }
        return { sent: kitchenOrders.length, stations: [...new Set(kitchenOrders.map(k => k.kitchenStation))] };
    }
    async fireOrderToKitchenWithNotify(tenantId, orderId) {
        const result = await this.fireOrderToKitchen(tenantId, orderId);
        if (result.sent > 0) {
            const orderInfo = await this.prisma.$queryRaw `
        SELECT order_number, metadata FROM orders WHERE id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
            const order = orderInfo[0];
            const tableNumber = order?.metadata?.table_id
                ? await this.getTableNumber(tenantId, order.metadata.table_id) : undefined;
            this.wsGateway.emitKitchenNewOrder(tenantId, {
                orderId, orderNumber: order?.order_number || '', items: [],
                tableNumber: tableNumber || undefined,
            });
        }
        return result;
    }
    async updateItemStatus(tenantId, kitchenOrderId, status) {
        const readyAt = status === 'ready' ? new Date() : null;
        const deliveredAt = status === 'delivered' ? new Date() : null;
        await this.prisma.$executeRaw `
      UPDATE kitchen_orders SET status = ${status},
        ready_at = COALESCE(${readyAt}, ready_at),
        delivered_at = COALESCE(${deliveredAt}, delivered_at)
      WHERE id = ${kitchenOrderId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        this.wsGateway.emitKitchenItemUpdated(tenantId, { kitchenOrderId, orderId: '', status });
        return { id: kitchenOrderId, status };
    }
    async bumpOrder(tenantId, orderId) {
        await this.prisma.$executeRaw `
      UPDATE kitchen_orders SET status = 'ready', ready_at = NOW()
      WHERE order_id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
        AND status IN ('pending', 'preparing')
    `;
        this.wsGateway.emitKitchenOrderBumped(tenantId, { orderId });
        return { orderId, status: 'ready' };
    }
    async getReadyOrders(tenantId, branchId) {
        const bf = (0, branch_filter_1.branchConditionFor)('ko', branchId);
        const orders = await this.prisma.$queryRawUnsafe(`
      SELECT ko.id, ko.order_id, ko.order_item_id, ko.kitchen_station,
        ko.ready_at, ko.notes as kitchen_notes,
        oi.quantity, p.name as product_name,
        o.order_number, o.metadata as order_metadata,
        EXTRACT(EPOCH FROM (NOW() - ko.ready_at))::int as waiting_seconds
      FROM kitchen_orders ko
      JOIN order_items oi ON oi.id = ko.order_item_id
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = ko.order_id
      WHERE ko.tenant_id = '${tenantId}'
        AND ko.status = 'ready'
        ${bf}
      ORDER BY ko.ready_at ASC
    `);
        const grouped = new Map();
        for (const row of orders) {
            if (!grouped.has(row.order_id)) {
                grouped.set(row.order_id, {
                    orderId: row.order_id, orderNumber: row.order_number,
                    tableNumber: row.order_metadata?.table_id ? await this.getTableNumber(tenantId, row.order_metadata.table_id) : null,
                    items: [], waitingSeconds: 0,
                });
            }
            const g = grouped.get(row.order_id);
            g.items.push({ id: row.id, productName: row.product_name, quantity: parseFloat(row.quantity), station: row.kitchen_station });
            g.waitingSeconds = Math.max(g.waitingSeconds, row.waiting_seconds || 0);
        }
        return Array.from(grouped.values());
    }
    async getStats(tenantId, branchId) {
        const bf = (0, branch_filter_1.branchConditionFor)('k', branchId);
        const stats = await this.prisma.$queryRawUnsafe(`
      SELECT kitchen_station, status, COUNT(*)::int as count
      FROM kitchen_orders k
      WHERE k.tenant_id = '${tenantId}'
        AND k.created_at > NOW() - INTERVAL '24 hours'
        ${bf}
      GROUP BY kitchen_station, status
    `);
        return stats;
    }
    async getTableNumber(tenantId, tableId) {
        try {
            const tables = await this.prisma.$queryRaw `
        SELECT number FROM tables WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
            return tables[0]?.number || null;
        }
        catch {
            return null;
        }
    }
};
exports.KitchenService = KitchenService;
exports.KitchenService = KitchenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pos_events_gateway_1.PosEventsGateway])
], KitchenService);
//# sourceMappingURL=kitchen.service.js.map