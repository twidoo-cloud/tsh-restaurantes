import { OrdersService } from './orders.service';
import { CreateOrderDto, AddOrderItemDto, ProcessPaymentDto, VoidItemDto, OrderQueryDto } from './dto/orders.dto';
export declare class OrdersController {
    private ordersService;
    constructor(ordersService: OrdersService);
    findAll(tenantId: string, branchId: string | null, query: OrderQueryDto, qBranch?: string): unknown;
    findOpen(tenantId: string, branchId: string | null, qBranch?: string): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, userId: string, dto: CreateOrderDto): unknown;
    addItem(tenantId: string, userId: string, orderId: string, dto: AddOrderItemDto): unknown;
    voidItem(tenantId: string, userId: string, orderId: string, itemId: string, dto: VoidItemDto): unknown;
    updateItemNotes(tenantId: string, orderId: string, itemId: string, body: {
        notes: string;
    }): unknown;
    applyOrderDiscount(tenantId: string, userId: string, orderId: string, body: {
        type: 'percent' | 'fixed';
        value: number;
        reason?: string;
    }): unknown;
    applyItemDiscount(tenantId: string, userId: string, orderId: string, itemId: string, body: {
        type: 'percent' | 'fixed';
        value: number;
        reason?: string;
    }): unknown;
    processPayment(tenantId: string, userId: string, orderId: string, dto: ProcessPaymentDto): unknown;
    cancel(tenantId: string, userId: string, orderId: string): unknown;
    assignCustomer(tenantId: string, orderId: string, body: {
        customerId: string | null;
    }): unknown;
}
