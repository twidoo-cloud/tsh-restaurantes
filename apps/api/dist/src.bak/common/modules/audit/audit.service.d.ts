import { PrismaService } from '../../prisma.service';
export interface AuditEntry {
    tenantId: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    action: string;
    entity: string;
    entityId?: string;
    description: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    severity?: 'info' | 'warning' | 'critical';
}
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    log(entry: AuditEntry): Promise<void>;
    logMany(entries: AuditEntry[]): Promise<void>;
    getDashboard(tenantId: string): Promise<{
        summary: any;
        recentCritical: any[];
        activityByHour: any[];
        topUsers: any[];
        topActions: any[];
    }>;
    search(tenantId: string, filters: {
        search?: string;
        action?: string;
        entity?: string;
        userId?: string;
        severity?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getFilterOptions(tenantId: string): Promise<{
        actions: any[];
        entities: any[];
        users: any[];
    }>;
}
