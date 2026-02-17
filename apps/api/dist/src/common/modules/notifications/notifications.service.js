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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
let NotificationsService = class NotificationsService {
    constructor(prisma, wsGateway) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
    }
    async create(dto) {
        try {
            const result = await this.prisma.$queryRaw `
        INSERT INTO notifications (tenant_id, user_id, title, message, type, priority, entity, entity_id, action_url, metadata)
        VALUES (
          ${dto.tenantId}::uuid,
          ${dto.userId || null}::uuid,
          ${dto.title},
          ${dto.message},
          ${dto.type || 'info'},
          ${dto.priority || 'normal'},
          ${dto.entity || null},
          ${dto.entityId || null},
          ${dto.actionUrl || null},
          ${JSON.stringify(dto.metadata || {})}::jsonb
        )
        RETURNING *
      `;
            const notification = result[0];
            this.wsGateway.server?.to(dto.tenantId).emit('notification:new', notification);
            return notification;
        }
        catch (e) {
            console.error('[NotificationsService] Failed to create:', e);
        }
    }
    async createForUsers(tenantId, userIds, data) {
        for (const userId of userIds) {
            await this.create({ ...data, tenantId, userId });
        }
    }
    async getForUser(tenantId, userId, filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 30;
        const offset = (page - 1) * limit;
        const unreadCondition = filters.unreadOnly ? `AND n.is_read = false` : '';
        const [notifications, countResult, unreadCount] = await Promise.all([
            this.prisma.$queryRawUnsafe(`
        SELECT * FROM notifications n
        WHERE n.tenant_id = '${tenantId}'
          AND (n.user_id = '${userId}' OR n.user_id IS NULL)
          AND n.is_dismissed = false
          ${unreadCondition}
        ORDER BY n.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
            this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total FROM notifications n
        WHERE n.tenant_id = '${tenantId}'
          AND (n.user_id = '${userId}' OR n.user_id IS NULL)
          AND n.is_dismissed = false
          ${unreadCondition}
      `),
            this.prisma.$queryRaw `
        SELECT COUNT(*)::int as count FROM notifications
        WHERE tenant_id = ${tenantId}::uuid
          AND (user_id = ${userId}::uuid OR user_id IS NULL)
          AND is_read = false
          AND is_dismissed = false
      `,
        ]);
        return {
            data: notifications,
            total: countResult[0]?.total || 0,
            unreadCount: unreadCount[0]?.count || 0,
            page,
            limit,
        };
    }
    async markAsRead(tenantId, userId, notificationId) {
        await this.prisma.$queryRaw `
      UPDATE notifications SET is_read = true, read_at = now()
      WHERE id = ${notificationId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND (user_id = ${userId}::uuid OR user_id IS NULL)
    `;
        return { success: true };
    }
    async markAllAsRead(tenantId, userId) {
        const result = await this.prisma.$queryRaw `
      UPDATE notifications SET is_read = true, read_at = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND (user_id = ${userId}::uuid OR user_id IS NULL)
        AND is_read = false
      RETURNING id
    `;
        return { marked: result.length };
    }
    async dismiss(tenantId, userId, notificationId) {
        await this.prisma.$queryRaw `
      UPDATE notifications SET is_dismissed = true
      WHERE id = ${notificationId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND (user_id = ${userId}::uuid OR user_id IS NULL)
    `;
        return { success: true };
    }
    async getUnreadCount(tenantId, userId) {
        const result = await this.prisma.$queryRaw `
      SELECT COUNT(*)::int as count FROM notifications
      WHERE tenant_id = ${tenantId}::uuid
        AND (user_id = ${userId}::uuid OR user_id IS NULL)
        AND is_read = false
        AND is_dismissed = false
    `;
        return { count: result[0]?.count || 0 };
    }
    async notifyLowStock(tenantId, productName, currentStock) {
        return this.create({
            tenantId,
            title: 'Stock Bajo',
            message: `${productName} tiene solo ${currentStock} unidades disponibles`,
            type: 'inventory',
            priority: 'high',
            entity: 'product',
            actionUrl: '/inventory',
        });
    }
    async notifyShiftClosed(tenantId, cashierName, status, difference) {
        return this.create({
            tenantId,
            title: 'Caja Cerrada',
            message: `${cashierName} cerró caja: ${status}${difference !== 0 ? ` ($${Math.abs(difference).toFixed(2)} ${difference > 0 ? 'sobrante' : 'faltante'})` : ''}`,
            type: 'shift',
            priority: status === 'balanced' ? 'normal' : 'high',
            entity: 'shift',
            actionUrl: '/shifts',
        });
    }
    async notifyNewOrder(tenantId, orderNumber, total) {
        return this.create({
            tenantId,
            title: 'Nueva Orden',
            message: `Orden #${orderNumber} por $${total.toFixed(2)}`,
            type: 'order',
            priority: 'normal',
            entity: 'order',
            actionUrl: '/pos',
        });
    }
    async notifyCreditOverLimit(tenantId, customerName, balance, limit) {
        return this.create({
            tenantId,
            title: 'Crédito Sobre Límite',
            message: `${customerName} excedió su límite: $${balance.toFixed(2)} / $${limit.toFixed(2)}`,
            type: 'warning',
            priority: 'urgent',
            entity: 'credit',
            actionUrl: '/credit',
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pos_events_gateway_1.PosEventsGateway])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map