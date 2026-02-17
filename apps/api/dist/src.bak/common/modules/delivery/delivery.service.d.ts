import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { CreateDeliveryOrderDto, UpdateDeliveryOrderDto, DeliveryQueryDto, CreateZoneDto, UpdateZoneDto, UpdateDeliverySettingsDto } from './dto/delivery.dto';
export declare class DeliveryService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    findAll(tenantId: string, query: DeliveryQueryDto): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(tenantId: string, id: string): Promise<any>;
    create(tenantId: string, dto: CreateDeliveryOrderDto, userId?: string): Promise<any>;
    updateStatus(tenantId: string, id: string, newStatus: string, extra?: {
        reason?: string;
        driverName?: string;
        driverPhone?: string;
    }): Promise<any>;
    update(tenantId: string, id: string, dto: UpdateDeliveryOrderDto): Promise<any>;
    getDashboard(tenantId: string, date?: string): Promise<any>;
    getZones(tenantId: string): Promise<unknown>;
    createZone(tenantId: string, dto: CreateZoneDto): Promise<any>;
    updateZone(tenantId: string, id: string, dto: UpdateZoneDto): Promise<any>;
    deleteZone(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    getOrCreateSettings(tenantId: string): Promise<any>;
    updateSettings(tenantId: string, dto: UpdateDeliverySettingsDto): Promise<any>;
    private generateOrderNumber;
}
