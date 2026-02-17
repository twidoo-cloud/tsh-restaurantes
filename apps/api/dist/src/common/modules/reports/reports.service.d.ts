import { PrismaService } from '../../prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    private parseDates;
    salesSummary(tenantId: string, from?: string, to?: string, branchId?: string | null): unknown;
    productRanking(tenantId: string, from?: string, to?: string, sortBy?: string, branchId?: string | null): unknown;
    categoryBreakdown(tenantId: string, from?: string, to?: string, branchId?: string | null): unknown;
    serverPerformance(tenantId: string, from?: string, to?: string, branchId?: string | null): unknown;
    hourlyPatterns(tenantId: string, from?: string, to?: string, branchId?: string | null): unknown;
    dayOfWeekPatterns(tenantId: string, from?: string, to?: string, branchId?: string | null): unknown;
    orderTypeBreakdown(tenantId: string, from?: string, to?: string, branchId?: string | null): unknown;
}
