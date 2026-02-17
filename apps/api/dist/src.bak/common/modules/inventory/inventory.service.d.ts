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
    }): Promise<unknown>;
    getStockLevelsSimple(tenantId: string, filters?: {
        categoryId?: string;
        lowStockOnly?: boolean;
        search?: string;
    }): Promise<unknown>;
    recordMovement(tenantId: string, userId: string, data: {
        productId: string;
        movementType: MovementType;
        quantity: number;
        unitCost?: number;
        reference?: string;
        notes?: string;
    }): Promise<{
        productId: string;
        productName: any;
        previousStock: number;
        newStock: number;
        quantityChange: number;
    }>;
    bulkAdjustment(tenantId: string, userId: string, adjustments: {
        productId: string;
        newStock: number;
        notes?: string;
    }[]): Promise<any[]>;
    getMovements(tenantId: string, filters?: {
        productId?: string;
        movementType?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: unknown;
        total: any;
        page: number;
        limit: number;
    }>;
    getAlerts(tenantId: string): Promise<unknown>;
    getSummary(tenantId: string): Promise<any>;
    updateMinStock(tenantId: string, productId: string, minStock: number): Promise<{
        success: boolean;
    }>;
    private getUserName;
}
