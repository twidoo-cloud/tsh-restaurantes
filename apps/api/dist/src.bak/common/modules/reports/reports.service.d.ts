import { PrismaService } from '../../prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    private parseDates;
    salesSummary(tenantId: string, from?: string, to?: string): unknown;
    productRanking(tenantId: string, from?: string, to?: string, sortBy?: string, limit?: number): unknown;
    categoryBreakdown(tenantId: string, from?: string, to?: string): unknown;
    serverPerformance(tenantId: string, from?: string, to?: string): unknown;
    hourlyPatterns(tenantId: string, from?: string, to?: string): unknown;
    dayOfWeekPatterns(tenantId: string, from?: string, to?: string): unknown;
    orderTypeBreakdown(tenantId: string, from?: string, to?: string): unknown;
}
