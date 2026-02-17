import { InventoryService } from './inventory.service';
declare class RecordMovementDto {
    productId: string;
    movementType: string;
    quantity: number;
    unitCost?: number;
    reference?: string;
    notes?: string;
    supplierId?: string;
}
declare class BulkAdjustmentItem {
    productId: string;
    newStock: number;
    notes?: string;
}
declare class BulkAdjustmentDto {
    adjustments: BulkAdjustmentItem[];
}
declare class UpdateMinStockDto {
    minStock: number;
}
export declare class InventoryController {
    private inventoryService;
    constructor(inventoryService: InventoryService);
    getStockLevels(tenantId: string, branchId: string | null, categoryId?: string, lowStockOnly?: string, search?: string): unknown;
    getAlerts(tenantId: string, branchId: string | null): unknown;
    getSummary(tenantId: string, branchId: string | null): unknown;
    getMovements(tenantId: string, branchId: string | null, productId?: string, movementType?: string, page?: string, limit?: string): unknown;
    recordMovement(tenantId: string, branchId: string | null, userId: string, dto: RecordMovementDto): unknown;
    bulkAdjustment(tenantId: string, branchId: string | null, userId: string, dto: BulkAdjustmentDto): unknown;
    updateMinStock(tenantId: string, productId: string, dto: UpdateMinStockDto): unknown;
}
export {};
