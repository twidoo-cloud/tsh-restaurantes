import { AuditService } from './audit.service';
export declare class AuditController {
    private auditService;
    constructor(auditService: AuditService);
    dashboard(tenantId: string): unknown;
    search(tenantId: string, search?: string, action?: string, entity?: string, userId?: string, severity?: string, dateFrom?: string, dateTo?: string, page?: string, limit?: string): unknown;
    filters(tenantId: string): unknown;
}
