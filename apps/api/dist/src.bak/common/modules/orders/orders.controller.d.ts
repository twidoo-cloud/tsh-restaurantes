import { OrdersService } from './orders.service';
import { CreateOrderDto, AddOrderItemDto, ProcessPaymentDto, VoidItemDto, OrderQueryDto } from './dto/orders.dto';
export declare class OrdersController {
    private ordersService;
    constructor(ordersService: OrdersService);
    findAll(tenantId: string, query: OrderQueryDto): unknown;
    findOpen(tenantId: string): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, userId: string, dto: CreateOrderDto): unknown;
    addItem(tenantId: string, orderId: string, dto: AddOrderItemDto): unknown;
    voidItem(tenantId: string, orderId: string, itemId: string, dto: VoidItemDto): unknown;
    processPayment(tenantId: string, userId: string, orderId: string, dto: ProcessPaymentDto): unknown;
    cancel(tenantId: string, orderId: string): unknown;
}
