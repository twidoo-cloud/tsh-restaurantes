import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class TablesService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    getFloorPlans(tenantId: string): Promise<unknown>;
    getTableWithOrder(tenantId: string, tableId: string): Promise<{
        table: any;
        order: any;
    }>;
    updateTableStatus(tenantId: string, tableId: string, status: string, orderId?: string | null): Promise<{
        table: any;
        order: any;
    }>;
    openTable(tenantId: string, tableId: string, userId: string, guestCount?: number): Promise<{
        table: {
            table: any;
            order: any;
        };
        order: {
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
        };
    }>;
    closeTable(tenantId: string, tableId: string): Promise<{
        success: boolean;
    }>;
    transferOrder(tenantId: string, fromTableId: string, toTableId: string): Promise<{
        success: boolean;
        from: any;
        to: any;
    }>;
    mergeTables(tenantId: string, primaryTableId: string, secondaryTableIds: string[]): Promise<{
        success: boolean;
        primary: any;
        merged: number;
    }>;
    unmergeTables(tenantId: string, primaryTableId: string): Promise<{
        success: boolean;
        unmerged: number;
    }>;
    swapTables(tenantId: string, tableAId: string, tableBId: string): Promise<{
        success: boolean;
        swapped: any[];
    }>;
    private recalcOrderTotals;
    private generateOrderNumber;
}
