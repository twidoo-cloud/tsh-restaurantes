import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notifService;
    constructor(notifService: NotificationsService);
    list(tenantId: string, userId: string, unreadOnly?: string, page?: string, limit?: string): unknown;
    unreadCount(tenantId: string, userId: string): unknown;
    markRead(tenantId: string, userId: string, id: string): unknown;
    markAllRead(tenantId: string, userId: string): unknown;
    dismiss(tenantId: string, userId: string, id: string): unknown;
}
