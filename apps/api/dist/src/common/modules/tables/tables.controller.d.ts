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
    getFloorPlans(tenantId: string, branchId: string | null): unknown;
    getMyTables(tenantId: string, userId: string): unknown;
    listZones(tenantId: string, branchId: string | null): unknown;
    createZone(tenantId: string, branchId: string | null, dto: CreateZoneDto): unknown;
    updateZone(tenantId: string, id: string, dto: UpdateZoneDto): unknown;
    deleteZone(tenantId: string, id: string): unknown;
    createTable(tenantId: string, branchId: string | null, dto: CreateTableDto): unknown;
    bulkCreateTables(tenantId: string, branchId: string | null, dto: BulkCreateTablesDto): unknown;
    updateTable(tenantId: string, id: string, dto: UpdateTableDto): unknown;
    deleteTable(tenantId: string, id: string): unknown;
    getTable(tenantId: string, id: string): unknown;
    openTable(tenantId: string, userId: string, id: string, dto: OpenTableDto): unknown;
    closeTable(tenantId: string, id: string): unknown;
    updateStatus(tenantId: string, id: string, dto: UpdateStatusDto): unknown;
    transfer(tenantId: string, fromId: string, dto: TransferDto): unknown;
    merge(tenantId: string, primaryId: string, dto: MergeDto): unknown;
    unmerge(tenantId: string, primaryId: string): unknown;
    swap(tenantId: string, tableAId: string, dto: SwapDto): unknown;
}
export {};
