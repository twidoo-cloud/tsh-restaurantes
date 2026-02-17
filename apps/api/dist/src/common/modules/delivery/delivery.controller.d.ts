import { DeliveryService } from './delivery.service';
import { CreateDeliveryOrderDto, UpdateDeliveryOrderDto, DeliveryQueryDto, CreateZoneDto, UpdateZoneDto, UpdateDeliverySettingsDto } from './dto/delivery.dto';
export declare class DeliveryController {
    private service;
    constructor(service: DeliveryService);
    findAll(tenantId: string, branchId: string | null, query: DeliveryQueryDto): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    dashboard(tenantId: string, branchId: string | null, date?: string): Promise<any>;
    findById(tenantId: string, id: string): Promise<any>;
    create(tenantId: string, branchId: string | null, dto: CreateDeliveryOrderDto): Promise<any>;
    update(tenantId: string, id: string, dto: UpdateDeliveryOrderDto): Promise<any>;
    confirm(tenantId: string, id: string): Promise<any>;
    prepare(tenantId: string, id: string): Promise<any>;
    ready(tenantId: string, id: string): Promise<any>;
    dispatch(tenantId: string, id: string, body: {
        driverName?: string;
        driverPhone?: string;
    }): Promise<any>;
    deliver(tenantId: string, id: string): Promise<any>;
    cancel(tenantId: string, id: string, body: {
        reason?: string;
    }): Promise<any>;
    getZones(tenantId: string, branchId: string | null): Promise<unknown>;
    createZone(tenantId: string, branchId: string | null, dto: CreateZoneDto): Promise<any>;
    updateZone(tenantId: string, id: string, dto: UpdateZoneDto): Promise<any>;
    deleteZone(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    getSettings(tenantId: string): Promise<any>;
    updateSettings(tenantId: string, dto: UpdateDeliverySettingsDto): Promise<any>;
}
