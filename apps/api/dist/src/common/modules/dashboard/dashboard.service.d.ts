import { PrismaService } from '../../prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    private branchFilter;
    private branchFilterAlias;
    getTodaySummary(tenantId: string, branchId?: string | null): unknown;
    getSalesByHour(tenantId: string, branchId?: string | null): unknown;
    getTopProducts(tenantId: string, branchId?: string | null, limit?: number): unknown;
    getSalesByCategory(tenantId: string, branchId?: string | null): unknown;
    getTableStats(tenantId: string, branchId?: string | null): unknown;
    getRecentOrders(tenantId: string, branchId?: string | null, limit?: number): unknown;
    getSalesTrend(tenantId: string, branchId?: string | null): unknown;
    getServerStats(tenantId: string, branchId?: string | null): unknown;
    getCostAnalysis(tenantId: string, branchId?: string | null): unknown;
}
