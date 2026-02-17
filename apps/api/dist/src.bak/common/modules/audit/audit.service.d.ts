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
    getDashboard(tenantId: string): unknown;
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
    }): unknown;
    getFilterOptions(tenantId: string): unknown;
}
