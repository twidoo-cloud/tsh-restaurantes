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
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway, audit: AuditService, notif: NotificationsService);
    findAll(tenantId: string, query: OrderQueryDto): unknown;
    findOpenOrders(tenantId: string): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, userId: string, dto: CreateOrderDto): unknown;
    addItem(tenantId: string, orderId: string, dto: AddOrderItemDto): unknown;
    voidItem(tenantId: string, orderId: string, itemId: string, reason: string): any;
    processPayment(tenantId: string, orderId: string, userId: string, dto: ProcessPaymentDto): unknown;
    cancelOrder(tenantId: string, orderId: string, userId?: string): unknown;
    private recalculateOrderTotals;
    private generateOrderNumber;
    private getUserName;
}
