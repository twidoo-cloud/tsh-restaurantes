import { DeliveryService } from './delivery.service';
import { CreateDeliveryOrderDto, UpdateDeliveryOrderDto, DeliveryQueryDto, CreateZoneDto, UpdateZoneDto, UpdateDeliverySettingsDto } from './dto/delivery.dto';
export declare class DeliveryController {
    private service;
    constructor(service: DeliveryService);
    findAll(tenantId: string, branchId: string | null, query: DeliveryQueryDto): unknown;
    dashboard(tenantId: string, branchId: string | null, date?: string): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, branchId: string | null, dto: CreateDeliveryOrderDto): unknown;
    update(tenantId: string, id: string, dto: UpdateDeliveryOrderDto): unknown;
    confirm(tenantId: string, id: string): unknown;
    prepare(tenantId: string, id: string): unknown;
    ready(tenantId: string, id: string): unknown;
    dispatch(tenantId: string, id: string, body: {
        driverName?: string;
        driverPhone?: string;
    }): unknown;
    deliver(tenantId: string, id: string): unknown;
    cancel(tenantId: string, id: string, body: {
        reason?: string;
    }): unknown;
    getZones(tenantId: string, branchId: string | null): unknown;
    createZone(tenantId: string, branchId: string | null, dto: CreateZoneDto): unknown;
    updateZone(tenantId: string, id: string, dto: UpdateZoneDto): unknown;
    deleteZone(tenantId: string, id: string): unknown;
    getSettings(tenantId: string): unknown;
    updateSettings(tenantId: string, dto: UpdateDeliverySettingsDto): unknown;
}
