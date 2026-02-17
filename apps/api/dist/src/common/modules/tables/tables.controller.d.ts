import { TablesService } from './tables.service';
declare class OpenTableDto {
    guestCount?: number;
}
declare class UpdateStatusDto {
    status: string;
    orderId?: string;
}
declare class TransferDto {
    toTableId: string;
}
declare class MergeDto {
    secondaryTableIds: string[];
}
declare class SwapDto {
    tableBId: string;
}
declare class CreateZoneDto {
    name: string;
    color?: string;
    floorPlanId?: string;
    displayOrder?: number;
}
declare class UpdateZoneDto {
    name?: string;
    color?: string;
    displayOrder?: number;
}
declare class CreateTableDto {
    number: number;
    zoneId: string;
    capacity?: number;
    shape?: string;
}
declare class UpdateTableDto {
    number?: number;
    zoneId?: string;
    capacity?: number;
    shape?: string;
}
declare class BulkCreateTablesDto {
    zoneId: string;
    startNumber: number;
    count: number;
    capacity?: number;
    shape?: string;
}
export declare class TablesController {
    private tablesService;
    constructor(tablesService: TablesService);
    getFloorPlans(tenantId: string, branchId: string | null): Promise<unknown>;
    getMyTables(tenantId: string, userId: string): Promise<unknown>;
    listZones(tenantId: string, branchId: string | null): Promise<unknown>;
    createZone(tenantId: string, branchId: string | null, dto: CreateZoneDto): Promise<{
        id: string;
        tenantId: string;
        branchId: string | null;
        name: string;
        color: string | null;
        displayOrder: number;
        floorPlanId: string | null;
        isActive: boolean;
    }>;
    updateZone(tenantId: string, id: string, dto: UpdateZoneDto): Promise<{
        id: string;
        tenantId: string;
        branchId: string | null;
        name: string;
        color: string | null;
        displayOrder: number;
        floorPlanId: string | null;
        isActive: boolean;
    }>;
    deleteZone(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    createTable(tenantId: string, branchId: string | null, dto: CreateTableDto): Promise<any>;
    bulkCreateTables(tenantId: string, branchId: string | null, dto: BulkCreateTablesDto): Promise<{
        created: number;
        tables: any[];
    }>;
    updateTable(tenantId: string, id: string, dto: UpdateTableDto): Promise<{
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
    deleteTable(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    getTable(tenantId: string, id: string): Promise<{
        table: any;
        order: any;
    }>;
    openTable(tenantId: string, userId: string, id: string, dto: OpenTableDto): Promise<{
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
    closeTable(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    updateStatus(tenantId: string, id: string, dto: UpdateStatusDto): Promise<{
        table: any;
        order: any;
    }>;
    transfer(tenantId: string, fromId: string, dto: TransferDto): Promise<{
        success: boolean;
        from: any;
        to: any;
    }>;
    merge(tenantId: string, primaryId: string, dto: MergeDto): Promise<{
        success: boolean;
        primary: any;
        merged: number;
    }>;
    unmerge(tenantId: string, primaryId: string): Promise<{
        success: boolean;
        unmerged: number;
    }>;
    swap(tenantId: string, tableAId: string, dto: SwapDto): Promise<{
        success: boolean;
        swapped: any[];
    }>;
}
export {};
