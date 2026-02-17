import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { CreateReservationDto, UpdateReservationDto, ReservationQueryDto, UpdateSettingsDto, CancelReservationDto } from './dto/reservations.dto';
export declare class ReservationsService {
    private prisma;
    private wsGateway;
    constructor(prisma: PrismaService, wsGateway: PosEventsGateway);
    findAll(tenantId: string, query: ReservationQueryDto): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(tenantId: string, id: string): Promise<any>;
    create(tenantId: string, dto: CreateReservationDto, userId?: string): Promise<any>;
    update(tenantId: string, id: string, dto: UpdateReservationDto): Promise<any>;
    updateStatus(tenantId: string, id: string, status: string, reason?: string): Promise<any>;
    cancel(tenantId: string, id: string, dto: CancelReservationDto): Promise<any>;
    seat(tenantId: string, id: string): Promise<any>;
    complete(tenantId: string, id: string): Promise<any>;
    noShow(tenantId: string, id: string): Promise<any>;
    getAvailableSlots(tenantId: string, date: string, guestCount: number): Promise<{
        date: string;
        slots: {
            time: string;
            available: boolean;
            tables: {
                id: string;
                number: string;
                capacity: number;
            }[];
        }[];
        settings: {
            openingTime: any;
            closingTime: any;
            duration: any;
            interval: any;
        };
    }>;
    getDaySummary(tenantId: string, date: string): Promise<any>;
    getOrCreateSettings(tenantId: string): Promise<any>;
    updateSettings(tenantId: string, dto: UpdateSettingsDto): Promise<any>;
    private checkTableAvailability;
    private findAvailableTable;
}
