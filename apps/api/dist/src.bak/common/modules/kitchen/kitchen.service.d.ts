import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class KitchenService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    getKitchenOrders(tenantId: string, station?: string): Promise<any[]>;
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
    getReadyOrders(tenantId: string): Promise<any[]>;
    getStats(tenantId: string): Promise<any[]>;
    private getTableNumber;
}
