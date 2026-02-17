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
export declare class TablesController {
    private tablesService;
    constructor(tablesService: TablesService);
    getFloorPlans(tenantId: string): Promise<unknown>;
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
