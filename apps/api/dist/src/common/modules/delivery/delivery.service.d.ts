import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { CreateDeliveryOrderDto, UpdateDeliveryOrderDto, DeliveryQueryDto, CreateZoneDto, UpdateZoneDto, UpdateDeliverySettingsDto } from './dto/delivery.dto';
export declare class DeliveryService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    findAll(tenantId: string, query: DeliveryQueryDto, branchId?: string | null): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: CreateDeliveryOrderDto, userId?: string, branchId?: string | null): unknown;
    updateStatus(tenantId: string, id: string, newStatus: string, extra?: {
        reason?: string;
        driverName?: string;
        driverPhone?: string;
    }): unknown;
    update(tenantId: string, id: string, dto: UpdateDeliveryOrderDto): unknown;
    getDashboard(tenantId: string, date?: string, branchId?: string | null): unknown;
    getZones(tenantId: string, branchId?: string | null): unknown;
    createZone(tenantId: string, dto: CreateZoneDto, branchId?: string | null): unknown;
    updateZone(tenantId: string, id: string, dto: UpdateZoneDto): unknown;
    deleteZone(tenantId: string, id: string): unknown;
    getOrCreateSettings(tenantId: string): unknown;
    updateSettings(tenantId: string, dto: UpdateDeliverySettingsDto): unknown;
    private generateOrderNumber;
}
