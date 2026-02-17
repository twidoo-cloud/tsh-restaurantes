import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { CreateReservationDto, UpdateReservationDto, ReservationQueryDto, UpdateSettingsDto, CancelReservationDto } from './dto/reservations.dto';
export declare class ReservationsService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    findAll(tenantId: string, query: ReservationQueryDto): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: CreateReservationDto, userId?: string): unknown;
    update(tenantId: string, id: string, dto: UpdateReservationDto): unknown;
    updateStatus(tenantId: string, id: string, status: string, reason?: string): unknown;
    cancel(tenantId: string, id: string, dto: CancelReservationDto): unknown;
    seat(tenantId: string, id: string): unknown;
    complete(tenantId: string, id: string): unknown;
    noShow(tenantId: string, id: string): unknown;
    getAvailableSlots(tenantId: string, date: string, guestCount: number): unknown;
    getDaySummary(tenantId: string, date: string): unknown;
    getOrCreateSettings(tenantId: string): unknown;
    updateSettings(tenantId: string, dto: UpdateSettingsDto): unknown;
    private checkTableAvailability;
    private findAvailableTable;
}
