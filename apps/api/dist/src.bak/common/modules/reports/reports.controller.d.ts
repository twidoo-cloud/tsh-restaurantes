import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly service;
    constructor(service: ReportsService);
    salesSummary(tenantId: string, from?: string, to?: string): unknown;
    productRanking(tenantId: string, from?: string, to?: string, sortBy?: string): unknown;
    categoryBreakdown(tenantId: string, from?: string, to?: string): unknown;
    serverPerformance(tenantId: string, from?: string, to?: string): unknown;
    hourlyPatterns(tenantId: string, from?: string, to?: string): unknown;
    dayOfWeekPatterns(tenantId: string, from?: string, to?: string): unknown;
    orderTypeBreakdown(tenantId: string, from?: string, to?: string): unknown;
}
