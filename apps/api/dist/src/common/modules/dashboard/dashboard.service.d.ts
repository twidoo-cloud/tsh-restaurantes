import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    private branchFilter;
    private branchFilterAlias;
    getTodaySummary(tenantId: string, branchId?: string | null): Promise<{
        summary: any;
        paymentMethods: any;
        activeOrders: any;
    }>;
    getSalesByHour(tenantId: string, branchId?: string | null): Promise<{
        hour: number;
        label: string;
        orders: any;
        sales: any;
    }[]>;
    getTopProducts(tenantId: string, branchId?: string | null, limit?: number): Promise<any[]>;
    getSalesByCategory(tenantId: string, branchId?: string | null): Promise<any[]>;
    getTableStats(tenantId: string, branchId?: string | null): Promise<any[]>;
    getRecentOrders(tenantId: string, branchId?: string | null, limit?: number): Promise<({
        items: ({
            product: {
                name: string;
            };
        } & {
            id: string;
            tenantId: string;
            createdAt: Date;
            productId: string;
            metadata: Prisma.JsonValue;
            notes: string | null;
            productVariantId: string | null;
            quantity: Prisma.Decimal;
            modifiers: Prisma.JsonValue;
            modifiersTotal: Prisma.Decimal;
            subtotal: Prisma.Decimal;
            taxAmount: Prisma.Decimal;
            discountAmount: Prisma.Decimal;
            discountReason: string | null;
            orderId: string;
            unitPrice: Prisma.Decimal;
            isVoid: boolean;
            voidReason: string | null;
            promotionId: string | null;
        })[];
        payments: {
            method: string;
            amount: Prisma.Decimal;
        }[];
    } & {
        id: string;
        tenantId: string;
        branchId: string | null;
        createdAt: Date;
        type: string;
        updatedAt: Date;
        total: Prisma.Decimal;
        metadata: Prisma.JsonValue;
        customerId: string | null;
        notes: string | null;
        status: string;
        orderNumber: string;
        servedBy: string | null;
        shiftId: string | null;
        subtotal: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        discountReason: string | null;
        openedAt: Date;
        closedAt: Date | null;
    })[]>;
    getSalesTrend(tenantId: string, branchId?: string | null): Promise<any[]>;
    getServerStats(tenantId: string, branchId?: string | null): Promise<any[]>;
    getCostAnalysis(tenantId: string, branchId?: string | null): Promise<{
        today: {
            revenue: number;
            estimatedCost: number;
            estimatedProfit: number;
            avgMargin: number;
            productsWithCost: number;
            productsWithoutCost: number;
            lowMarginProducts: number;
        };
        products: {
            productId: any;
            name: any;
            price: any;
            cost: any;
            qtySold: any;
            revenue: number;
            totalCost: number;
            profit: number;
            margin: number;
        }[];
        lowStockAlerts: any[];
    }>;
}
