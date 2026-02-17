import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(tenantId: string, branchId: string | null): unknown;
    getSalesByHour(tenantId: string, branchId: string | null): unknown;
    getTopProducts(tenantId: string, branchId: string | null): unknown;
    getSalesByCategory(tenantId: string, branchId: string | null): unknown;
    getTableStats(tenantId: string, branchId: string | null): unknown;
    getRecentOrders(tenantId: string, branchId: string | null): unknown;
    getTrend(tenantId: string, branchId: string | null): unknown;
    getServerStats(tenantId: string, branchId: string | null): unknown;
    getCostAnalysis(tenantId: string, branchId: string | null): unknown;
}
