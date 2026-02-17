import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class TablesService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    getFloorPlans(tenantId: string): unknown;
    getTableWithOrder(tenantId: string, tableId: string): unknown;
    updateTableStatus(tenantId: string, tableId: string, status: string, orderId?: string | null): unknown;
    openTable(tenantId: string, tableId: string, userId: string, guestCount?: number): unknown;
    closeTable(tenantId: string, tableId: string): unknown;
    transferOrder(tenantId: string, fromTableId: string, toTableId: string): unknown;
    mergeTables(tenantId: string, primaryTableId: string, secondaryTableIds: string[]): unknown;
    unmergeTables(tenantId: string, primaryTableId: string): unknown;
    swapTables(tenantId: string, tableAId: string, tableBId: string): unknown;
    private recalcOrderTotals;
    private generateOrderNumber;
}
