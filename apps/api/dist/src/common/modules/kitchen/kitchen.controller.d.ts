import { KitchenService } from './kitchen.service';
export declare class KitchenController {
    private kitchenService;
    constructor(kitchenService: KitchenService);
    getOrders(tenantId: string, branchId: string | null, station?: string): Promise<any[]>;
    getReady(tenantId: string, branchId: string | null): Promise<any[]>;
    getStats(tenantId: string, branchId: string | null): Promise<any[]>;
    fireOrder(tenantId: string, orderId: string): Promise<{
        sent: number;
        stations?: undefined;
    } | {
        sent: number;
        stations: any[];
    }>;
    startPreparing(tenantId: string, id: string): Promise<{
        id: string;
        status: string;
    }>;
    markReady(tenantId: string, id: string): Promise<{
        id: string;
        status: string;
    }>;
    markDelivered(tenantId: string, id: string): Promise<{
        id: string;
        status: string;
    }>;
    bumpOrder(tenantId: string, orderId: string): Promise<{
        orderId: string;
        status: string;
    }>;
}
