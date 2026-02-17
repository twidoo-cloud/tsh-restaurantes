import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class KitchenService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    getKitchenOrders(tenantId: string, station?: string, branchId?: string | null): Promise<any[]>;
    fireOrderToKitchen(tenantId: string, orderId: string): Promise<{
        sent: number;
        stations?: undefined;
    } | {
        sent: number;
        stations: any[];
    }>;
    fireOrderToKitchenWithNotify(tenantId: string, orderId: string): Promise<{
        sent: number;
        stations?: undefined;
    } | {
        sent: number;
        stations: any[];
    }>;
    updateItemStatus(tenantId: string, kitchenOrderId: string, status: string): Promise<{
        id: string;
        status: string;
    }>;
    bumpOrder(tenantId: string, orderId: string): Promise<{
        orderId: string;
        status: string;
    }>;
    getReadyOrders(tenantId: string, branchId?: string | null): Promise<any[]>;
    getStats(tenantId: string, branchId?: string | null): Promise<any[]>;
    private getTableNumber;
}
