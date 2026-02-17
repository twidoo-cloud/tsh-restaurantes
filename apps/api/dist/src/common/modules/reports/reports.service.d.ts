import { PrismaService } from '../../prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    private parseDates;
    salesSummary(tenantId: string, from?: string, to?: string, branchId?: string | null): Promise<{
        summary: any;
        daily: any;
        payments: any;
        period: {
            from: Date;
            to: Date;
        };
    }>;
    productRanking(tenantId: string, from?: string, to?: string, sortBy?: string, branchId?: string | null): Promise<{
        products: any[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
    categoryBreakdown(tenantId: string, from?: string, to?: string, branchId?: string | null): Promise<{
        categories: any[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
    serverPerformance(tenantId: string, from?: string, to?: string, branchId?: string | null): Promise<{
        servers: any[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
    hourlyPatterns(tenantId: string, from?: string, to?: string, branchId?: string | null): Promise<{
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
    dayOfWeekPatterns(tenantId: string, from?: string, to?: string, branchId?: string | null): Promise<{
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
    orderTypeBreakdown(tenantId: string, from?: string, to?: string, branchId?: string | null): Promise<{
        types: any[];
        period: {
            from: Date;
            to: Date;
        };
    }>;
}
