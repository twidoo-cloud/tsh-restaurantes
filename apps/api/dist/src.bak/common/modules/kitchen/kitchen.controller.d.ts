import { KitchenService } from './kitchen.service';
export declare class KitchenController {
    private kitchenService;
    constructor(kitchenService: KitchenService);
    getOrders(tenantId: string, station?: string): unknown;
    getReady(tenantId: string): unknown;
    getStats(tenantId: string): unknown;
    fireOrder(tenantId: string, orderId: string): unknown;
    startPreparing(tenantId: string, id: string): unknown;
    markReady(tenantId: string, id: string): unknown;
    markDelivered(tenantId: string, id: string): unknown;
    bumpOrder(tenantId: string, orderId: string): unknown;
}
