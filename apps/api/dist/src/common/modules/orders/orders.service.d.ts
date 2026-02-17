import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto, AddOrderItemDto, ProcessPaymentDto, OrderQueryDto } from './dto/orders.dto';
export declare class OrdersService {
    private prisma;
    private wsGateway;
    private audit;
    private notif;
    private readonly logger;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway, audit: AuditService, notif: NotificationsService);
    findAll(tenantId: string, query: OrderQueryDto, branchId?: string | null): unknown;
    findOpenOrders(tenantId: string, branchId?: string | null): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, userId: string, dto: CreateOrderDto): unknown;
    addItem(tenantId: string, orderId: string, userId: string, dto: AddOrderItemDto): unknown;
    voidItem(tenantId: string, orderId: string, itemId: string, userId: string, reason: string): any;
    updateItemNotes(tenantId: string, orderId: string, itemId: string, notes: string): unknown;
    processPayment(tenantId: string, orderId: string, userId: string, dto: ProcessPaymentDto): unknown;
    cancelOrder(tenantId: string, orderId: string, userId?: string): unknown;
    assignCustomer(tenantId: string, orderId: string, customerId: string | null): unknown;
    private recalculateOrderTotals;
    applyOrderDiscount(tenantId: string, orderId: string, userId: string, data: {
        type: 'percent' | 'fixed';
        value: number;
        reason?: string;
    }): unknown;
    applyItemDiscount(tenantId: string, orderId: string, itemId: string, userId: string, data: {
        type: 'percent' | 'fixed';
        value: number;
        reason?: string;
    }): unknown;
    private deductIngredientStock;
    private generateOrderNumber;
    private getUserName;
}
