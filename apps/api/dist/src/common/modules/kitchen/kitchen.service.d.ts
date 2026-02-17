import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class KitchenService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    getKitchenOrders(tenantId: string, station?: string, branchId?: string | null): unknown;
    fireOrderToKitchen(tenantId: string, orderId: string): unknown;
    fireOrderToKitchenWithNotify(tenantId: string, orderId: string): unknown;
    updateItemStatus(tenantId: string, kitchenOrderId: string, status: string): unknown;
    bumpOrder(tenantId: string, orderId: string): unknown;
    getReadyOrders(tenantId: string, branchId?: string | null): unknown;
    getStats(tenantId: string, branchId?: string | null): unknown;
    private getTableNumber;
}
