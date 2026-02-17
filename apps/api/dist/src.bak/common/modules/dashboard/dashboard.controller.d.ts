import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(tenantId: string): unknown;
    getSalesByHour(tenantId: string): unknown;
    getTopProducts(tenantId: string): unknown;
    getSalesByCategory(tenantId: string): unknown;
    getTableStats(tenantId: string): unknown;
    getRecentOrders(tenantId: string): unknown;
    getTrend(tenantId: string): unknown;
    getServerStats(tenantId: string): unknown;
}
