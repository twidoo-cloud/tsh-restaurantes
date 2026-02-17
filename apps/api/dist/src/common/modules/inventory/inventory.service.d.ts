import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
export type MovementType = 'purchase' | 'sale' | 'adjustment' | 'waste' | 'transfer' | 'return' | 'initial';
export declare class InventoryService {
    private prisma;
    private audit;
    private notif;
    constructor(prisma: PrismaService, audit: AuditService, notif: NotificationsService);
    getStockLevels(tenantId: string, filters?: {
        categoryId?: string;
        lowStockOnly?: boolean;
        search?: string;
    }): unknown;
    getStockLevelsSimple(tenantId: string, branchId?: string | null, filters?: {
        categoryId?: string;
        lowStockOnly?: boolean;
        search?: string;
    }): unknown;
    recordMovement(tenantId: string, userId: string, data: {
        productId: string;
        movementType: MovementType;
        quantity: number;
        unitCost?: number;
        reference?: string;
        notes?: string;
        supplierId?: string;
    }, branchId?: string | null): unknown;
    bulkAdjustment(tenantId: string, userId: string, adjustments: {
        productId: string;
        newStock: number;
        notes?: string;
    }[], branchId?: string | null): unknown;
    getMovements(tenantId: string, filters?: {
        productId?: string;
        movementType?: string;
        page?: number;
        limit?: number;
        branchId?: string | null;
    }): unknown;
    getAlerts(tenantId: string, branchId?: string | null): unknown;
    getSummary(tenantId: string, branchId?: string | null): unknown;
    updateMinStock(tenantId: string, productId: string, minStock: number): unknown;
    private getUserName;
}
