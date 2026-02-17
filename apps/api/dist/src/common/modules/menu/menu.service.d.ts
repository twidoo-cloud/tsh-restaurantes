import { PrismaService } from '../../prisma.service';
import { DeliveryService } from '../delivery/delivery.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { CreatePublicOrderDto } from './dto/public-order.dto';
export declare class MenuService {
    private prisma;
    private deliveryService;
    private wsGateway;
    constructor(prisma: PrismaService, deliveryService: DeliveryService, wsGateway: PosEventsGateway);
    getMenuBySlug(slug: string): unknown;
    getPublicOrderConfig(slug: string): unknown;
    createPublicOrder(slug: string, dto: CreatePublicOrderDto): unknown;
    getQrConfig(tenantId: string): unknown;
}
