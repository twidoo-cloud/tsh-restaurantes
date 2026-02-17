import { PrismaService } from '../../prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getTodaySummary(tenantId: string): unknown;
    getSalesByHour(tenantId: string): unknown;
    getTopProducts(tenantId: string, limit?: number): unknown;
    getSalesByCategory(tenantId: string): unknown;
    getTableStats(tenantId: string): unknown;
    getRecentOrders(tenantId: string, limit?: number): unknown;
    getSalesTrend(tenantId: string): unknown;
    getServerStats(tenantId: string): unknown;
    getCostAnalysis(tenantId: string): unknown;
}
