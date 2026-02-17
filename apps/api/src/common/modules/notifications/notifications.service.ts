import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';

export interface CreateNotificationDto {
  tenantId: string;
  userId?: string; // null = all users in tenant
  title: string;
  message: string;
  type?: string;
  priority?: string;
  entity?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: PosEventsGateway,
  ) {}

  /** Create and broadcast a notification */
  async create(dto: CreateNotificationDto) {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
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

      // Broadcast via WebSocket
      this.wsGateway.server?.to(dto.tenantId).emit('notification:new', notification);

      return notification;
    } catch (e) {
      console.error('[NotificationsService] Failed to create:', e);
    }
  }

  /** Create notifications for multiple users */
  async createForUsers(tenantId: string, userIds: string[], data: Omit<CreateNotificationDto, 'tenantId' | 'userId'>) {
    for (const userId of userIds) {
      await this.create({ ...data, tenantId, userId });
    }
  }

  /** Get notifications for a user */
  async getForUser(tenantId: string, userId: string, filters: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 30;
    const offset = (page - 1) * limit;

    const unreadCondition = filters.unreadOnly ? `AND n.is_read = false` : '';

    const [notifications, countResult, unreadCount] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM notifications n
        WHERE n.tenant_id = '${tenantId}'
          AND (n.user_id = '${userId}' OR n.user_id IS NULL)
          AND n.is_dismissed = false
          ${unreadCondition}
        ORDER BY n.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*)::int as total FROM notifications n
        WHERE n.tenant_id = '${tenantId}'
          AND (n.user_id = '${userId}' OR n.user_id IS NULL)
          AND n.is_dismissed = false
          ${unreadCondition}
      `),
      this.prisma.$queryRaw<any[]>`
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

  /** Mark notification as read */
  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    await this.prisma.$queryRaw`
      UPDATE notifications SET is_read = true, read_at = now()
      WHERE id = ${notificationId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND (user_id = ${userId}::uuid OR user_id IS NULL)
    `;
    return { success: true };
  }

  /** Mark all as read */
  async markAllAsRead(tenantId: string, userId: string) {
    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE notifications SET is_read = true, read_at = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND (user_id = ${userId}::uuid OR user_id IS NULL)
        AND is_read = false
      RETURNING id
    `;
    return { marked: result.length };
  }

  /** Dismiss a notification */
  async dismiss(tenantId: string, userId: string, notificationId: string) {
    await this.prisma.$queryRaw`
      UPDATE notifications SET is_dismissed = true
      WHERE id = ${notificationId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND (user_id = ${userId}::uuid OR user_id IS NULL)
    `;
    return { success: true };
  }

  /** Get unread count for badge */
  async getUnreadCount(tenantId: string, userId: string) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int as count FROM notifications
      WHERE tenant_id = ${tenantId}::uuid
        AND (user_id = ${userId}::uuid OR user_id IS NULL)
        AND is_read = false
        AND is_dismissed = false
    `;
    return { count: result[0]?.count || 0 };
  }

  // ── Convenience methods for common notifications ──

  async notifyLowStock(tenantId: string, productName: string, currentStock: number) {
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

  async notifyShiftClosed(tenantId: string, cashierName: string, status: string, difference: number) {
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

  async notifyNewOrder(tenantId: string, orderNumber: string, total: number) {
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

  async notifyCreditOverLimit(tenantId: string, customerName: string, balance: number, limit: number) {
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
}
