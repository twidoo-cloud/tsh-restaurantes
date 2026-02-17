import { ReservationsService } from './reservations.service';
import { CreateReservationDto, UpdateReservationDto, ReservationQueryDto, UpdateSettingsDto, CancelReservationDto } from './dto/reservations.dto';
export declare class ReservationsController {
    private service;
    constructor(service: ReservationsService);
    findAll(tenantId: string, query: ReservationQueryDto): unknown;
    getSettings(tenantId: string): unknown;
    updateSettings(tenantId: string, dto: UpdateSettingsDto): unknown;
    getAvailability(tenantId: string, date: string, guests: string): unknown;
    getDaySummary(tenantId: string, date: string): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: CreateReservationDto): unknown;
    update(tenantId: string, id: string, dto: UpdateReservationDto): unknown;
    seat(tenantId: string, id: string): unknown;
    complete(tenantId: string, id: string): unknown;
    noShow(tenantId: string, id: string): unknown;
    cancel(tenantId: string, id: string, dto: CancelReservationDto): unknown;
}
