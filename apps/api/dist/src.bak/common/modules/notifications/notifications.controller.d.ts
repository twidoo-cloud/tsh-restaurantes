import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notifService;
    constructor(notifService: NotificationsService);
    list(tenantId: string, userId: string, unreadOnly?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: any;
        unreadCount: any;
        page: number;
        limit: number;
    }>;
    unreadCount(tenantId: string, userId: string): Promise<{
        count: any;
    }>;
    markRead(tenantId: string, userId: string, id: string): Promise<{
        success: boolean;
    }>;
    markAllRead(tenantId: string, userId: string): Promise<{
        marked: number;
    }>;
    dismiss(tenantId: string, userId: string, id: string): Promise<{
        success: boolean;
    }>;
}
