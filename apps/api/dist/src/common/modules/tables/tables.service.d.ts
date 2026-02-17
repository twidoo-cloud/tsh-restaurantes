import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class TablesService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    getFloorPlans(tenantId: string, branchId?: string | null): Promise<unknown>;
    getTableWithOrder(tenantId: string, tableId: string): Promise<{
        table: any;
        order: any;
    }>;
    getWaiterTables(tenantId: string, userId: string): Promise<unknown>;
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
            orderNumber: string;
            servedBy: string | null;
            status: string;
            type: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountReason: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            notes: string | null;
            openedAt: Date;
            closedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            branchId: string | null;
            customerId: string | null;
            shiftId: string | null;
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
    listZones(tenantId: string, branchId?: string | null): Promise<unknown>;
    createZone(tenantId: string, dto: {
        name: string;
        color?: string;
        floorPlanId?: string;
        displayOrder?: number;
    }, branchId?: string | null): Promise<{
        id: string;
        tenantId: string;
        branchId: string | null;
        name: string;
        color: string | null;
        displayOrder: number;
        floorPlanId: string | null;
        isActive: boolean;
    }>;
    updateZone(tenantId: string, zoneId: string, dto: {
        name?: string;
        color?: string;
        displayOrder?: number;
    }): Promise<{
        id: string;
        tenantId: string;
        branchId: string | null;
        name: string;
        color: string | null;
        displayOrder: number;
        floorPlanId: string | null;
        isActive: boolean;
    }>;
    deleteZone(tenantId: string, zoneId: string): Promise<{
        success: boolean;
    }>;
    createTable(tenantId: string, dto: {
        number: number;
        zoneId: string;
        capacity?: number;
        shape?: string;
    }, branchId?: string | null): Promise<any>;
    bulkCreateTables(tenantId: string, dto: {
        zoneId: string;
        startNumber: number;
        count: number;
        capacity?: number;
        shape?: string;
    }, branchId?: string | null): Promise<{
        created: number;
        tables: any[];
    }>;
    updateTable(tenantId: string, tableId: string, dto: {
        number?: number;
        zoneId?: string;
        capacity?: number;
        shape?: string;
    }): Promise<{
        number: number;
        zoneId: string;
        capacity: number;
        shape: string;
        id: string;
        status: string;
        tenantId: string;
        branchId: string | null;
        isActive: boolean;
        positionX: number;
        positionY: number;
        width: number;
        height: number;
        currentOrderId: string | null;
        mergedWith: string | null;
    }>;
    deleteTable(tenantId: string, tableId: string): Promise<{
        success: boolean;
    }>;
}
