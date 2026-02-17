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
    getStockLevels(tenantId: string, branchId: string | null, categoryId?: string, lowStockOnly?: string, search?: string): Promise<unknown>;
    getAlerts(tenantId: string, branchId: string | null): Promise<{
        alerts: any[];
        criticalCount: number;
        warningCount: number;
    }>;
    getSummary(tenantId: string, branchId: string | null): Promise<any>;
    getMovements(tenantId: string, branchId: string | null, productId?: string, movementType?: string, page?: string, limit?: string): Promise<{
        data: unknown;
        total: any;
        page: number;
        limit: number;
    }>;
    recordMovement(tenantId: string, branchId: string | null, userId: string, dto: RecordMovementDto): Promise<{
        productId: string;
        productName: any;
        previousStock: number;
        newStock: number;
        quantityChange: number;
    }>;
    bulkAdjustment(tenantId: string, branchId: string | null, userId: string, dto: BulkAdjustmentDto): Promise<any[]>;
    updateMinStock(tenantId: string, productId: string, dto: UpdateMinStockDto): Promise<{
        success: boolean;
    }>;
}
export {};
