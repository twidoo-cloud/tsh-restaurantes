import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly service;
    constructor(service: ReportsService);
    salesSummary(tenantId: string, branchId: string | null, from?: string, to?: string): Promise<{
        summary: any;
        daily: any;
        payments: any;
        period: {
            from: Date;
            to: Date;
        };
    }>;
    productRanking(tenantId: string, branchId: string | null, from?: string, to?: string, sortBy?: string): Promise<{
        products: any[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
    categoryBreakdown(tenantId: string, branchId: string | null, from?: string, to?: string): Promise<{
        categories: any[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
    serverPerformance(tenantId: string, branchId: string | null, from?: string, to?: string): Promise<{
        servers: any[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
    hourlyPatterns(tenantId: string, branchId: string | null, from?: string, to?: string): Promise<{
        hourly: {
            hour: number;
            label: string;
            orders: any;
            sales: any;
            avg_ticket: any;
        }[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
    dayOfWeekPatterns(tenantId: string, branchId: string | null, from?: string, to?: string): Promise<{
        weekly: {
            dow: number;
            day: string;
            orders: any;
            sales: any;
            avg_ticket: any;
        }[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
    orderTypeBreakdown(tenantId: string, branchId: string | null, from?: string, to?: string): Promise<{
        types: any[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
}
