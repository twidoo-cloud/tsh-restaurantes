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
    create(dto: CreateNotificationDto): Promise<any>;
    createForUsers(tenantId: string, userIds: string[], data: Omit<CreateNotificationDto, 'tenantId' | 'userId'>): Promise<void>;
    getForUser(tenantId: string, userId: string, filters: {
        unreadOnly?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        data: any[];
        total: any;
        unreadCount: any;
        page: number;
        limit: number;
    }>;
    markAsRead(tenantId: string, userId: string, notificationId: string): Promise<{
        success: boolean;
    }>;
    markAllAsRead(tenantId: string, userId: string): Promise<{
        marked: number;
    }>;
    dismiss(tenantId: string, userId: string, notificationId: string): Promise<{
        success: boolean;
    }>;
    getUnreadCount(tenantId: string, userId: string): Promise<{
        count: any;
    }>;
    notifyLowStock(tenantId: string, productName: string, currentStock: number): Promise<any>;
    notifyShiftClosed(tenantId: string, cashierName: string, status: string, difference: number): Promise<any>;
    notifyNewOrder(tenantId: string, orderNumber: string, total: number): Promise<any>;
    notifyCreditOverLimit(tenantId: string, customerName: string, balance: number, limit: number): Promise<any>;
}
