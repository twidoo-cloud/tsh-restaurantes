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
    getFloorPlans(tenantId: string): unknown;
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
