import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class TablesService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    getFloorPlans(tenantId: string, branchId?: string | null): unknown;
    getTableWithOrder(tenantId: string, tableId: string): unknown;
    getWaiterTables(tenantId: string, userId: string): unknown;
    updateTableStatus(tenantId: string, tableId: string, status: string, orderId?: string | null): unknown;
    openTable(tenantId: string, tableId: string, userId: string, guestCount?: number): unknown;
    closeTable(tenantId: string, tableId: string): unknown;
    transferOrder(tenantId: string, fromTableId: string, toTableId: string): unknown;
    mergeTables(tenantId: string, primaryTableId: string, secondaryTableIds: string[]): unknown;
    unmergeTables(tenantId: string, primaryTableId: string): unknown;
    swapTables(tenantId: string, tableAId: string, tableBId: string): unknown;
    private recalcOrderTotals;
    private generateOrderNumber;
    listZones(tenantId: string, branchId?: string | null): unknown;
    createZone(tenantId: string, dto: {
        name: string;
        color?: string;
        floorPlanId?: string;
        displayOrder?: number;
    }, branchId?: string | null): unknown;
    updateZone(tenantId: string, zoneId: string, dto: {
        name?: string;
        color?: string;
        displayOrder?: number;
    }): unknown;
    deleteZone(tenantId: string, zoneId: string): unknown;
    createTable(tenantId: string, dto: {
        number: number;
        zoneId: string;
        capacity?: number;
        shape?: string;
    }, branchId?: string | null): unknown;
    bulkCreateTables(tenantId: string, dto: {
        zoneId: string;
        startNumber: number;
        count: number;
        capacity?: number;
        shape?: string;
    }, branchId?: string | null): unknown;
    updateTable(tenantId: string, tableId: string, dto: {
        number?: number;
        zoneId?: string;
        capacity?: number;
        shape?: string;
    }): unknown;
    deleteTable(tenantId: string, tableId: string): unknown;
}
