import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export interface CreateNotificationDto {
    tenantId: string;
    userId?: string;
    title: string;
    message: string;
    type?: string;
    priority?: string;
    entity?: string;
    entityId?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
}
export declare class NotificationsService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    create(dto: CreateNotificationDto): unknown;
    createForUsers(tenantId: string, userIds: string[], data: Omit<CreateNotificationDto, 'tenantId' | 'userId'>): any;
    getForUser(tenantId: string, userId: string, filters: {
        unreadOnly?: boolean;
        page?: number;
        limit?: number;
    }): unknown;
    markAsRead(tenantId: string, userId: string, notificationId: string): unknown;
    markAllAsRead(tenantId: string, userId: string): unknown;
    dismiss(tenantId: string, userId: string, notificationId: string): unknown;
    getUnreadCount(tenantId: string, userId: string): unknown;
    notifyLowStock(tenantId: string, productName: string, currentStock: number): unknown;
    notifyShiftClosed(tenantId: string, cashierName: string, status: string, difference: number): unknown;
    notifyNewOrder(tenantId: string, orderNumber: string, total: number): unknown;
    notifyCreditOverLimit(tenantId: string, customerName: string, balance: number, limit: number): unknown;
}
