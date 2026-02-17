import { AuditService } from './audit.service';
export declare class AuditController {
    private auditService;
    constructor(auditService: AuditService);
    dashboard(tenantId: string): Promise<{
        summary: any;
        recentCritical: any[];
        activityByHour: any[];
        topUsers: any[];
        topActions: any[];
    }>;
    search(tenantId: string, search?: string, action?: string, entity?: string, userId?: string, severity?: string, dateFrom?: string, dateTo?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    filters(tenantId: string): Promise<{
        actions: any[];
        entities: any[];
        users: any[];
    }>;
}
