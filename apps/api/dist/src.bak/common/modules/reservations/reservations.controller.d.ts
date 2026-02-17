import { ReservationsService } from './reservations.service';
import { CreateReservationDto, UpdateReservationDto, ReservationQueryDto, UpdateSettingsDto, CancelReservationDto } from './dto/reservations.dto';
export declare class ReservationsController {
    private service;
    constructor(service: ReservationsService);
    findAll(tenantId: string, query: ReservationQueryDto): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getSettings(tenantId: string): Promise<any>;
    updateSettings(tenantId: string, dto: UpdateSettingsDto): Promise<any>;
    getAvailability(tenantId: string, date: string, guests: string): Promise<{
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
    findById(tenantId: string, id: string): Promise<any>;
    create(tenantId: string, dto: CreateReservationDto): Promise<any>;
    update(tenantId: string, id: string, dto: UpdateReservationDto): Promise<any>;
    seat(tenantId: string, id: string): Promise<any>;
    complete(tenantId: string, id: string): Promise<any>;
    noShow(tenantId: string, id: string): Promise<any>;
    cancel(tenantId: string, id: string, dto: CancelReservationDto): Promise<any>;
}
