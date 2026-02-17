import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(tenantId: string): Promise<{
        summary: any;
        paymentMethods: any;
        activeOrders: any;
    }>;
    getSalesByHour(tenantId: string): Promise<{
        hour: number;
        label: string;
        orders: any;
        sales: any;
    }[]>;
    getTopProducts(tenantId: string): Promise<any[]>;
    getSalesByCategory(tenantId: string): Promise<any[]>;
    getTableStats(tenantId: string): Promise<any[]>;
    getRecentOrders(tenantId: string): Promise<({
        items: ({
            product: {
                name: string;
            };
        } & {
            id: string;
            tenantId: string;
            createdAt: Date;
            productId: string;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            notes: string | null;
            productVariantId: string | null;
            quantity: import("@prisma/client/runtime/library").Decimal;
            modifiers: import("@prisma/client/runtime/library").JsonValue;
            modifiersTotal: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountReason: string | null;
            orderId: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            isVoid: boolean;
            voidReason: string | null;
            promotionId: string | null;
        })[];
        payments: {
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
        id: string;
        tenantId: string;
        branchId: string | null;
        createdAt: Date;
        type: string;
        updatedAt: Date;
        total: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        customerId: string | null;
        notes: string | null;
        status: string;
        orderNumber: string;
        servedBy: string | null;
        shiftId: string | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountReason: string | null;
        openedAt: Date;
        closedAt: Date | null;
    })[]>;
    getTrend(tenantId: string): Promise<any[]>;
    getServerStats(tenantId: string): Promise<any[]>;
}
