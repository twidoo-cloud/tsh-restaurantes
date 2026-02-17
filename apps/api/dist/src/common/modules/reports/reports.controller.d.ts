import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly service;
    constructor(service: ReportsService);
    salesSummary(tenantId: string, branchId: string | null, from?: string, to?: string): unknown;
    productRanking(tenantId: string, branchId: string | null, from?: string, to?: string, sortBy?: string): unknown;
    categoryBreakdown(tenantId: string, branchId: string | null, from?: string, to?: string): unknown;
    serverPerformance(tenantId: string, branchId: string | null, from?: string, to?: string): unknown;
    hourlyPatterns(tenantId: string, branchId: string | null, from?: string, to?: string): unknown;
    dayOfWeekPatterns(tenantId: string, branchId: string | null, from?: string, to?: string): unknown;
    orderTypeBreakdown(tenantId: string, branchId: string | null, from?: string, to?: string): unknown;
}
