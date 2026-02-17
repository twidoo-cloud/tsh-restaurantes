import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
export declare class ShiftsService {
    private prisma;
    private audit;
    private notif;
    constructor(prisma: PrismaService, audit: AuditService, notif: NotificationsService);
    getCashRegisters(tenantId: string): Promise<any[]>;
    openShift(tenantId: string, userId: string, dto: OpenShiftDto): Promise<{
        id: any;
        cashRegisterName: any;
        openedAt: any;
        openingAmount: number;
        status: string;
    }>;
    getActiveShift(tenantId: string): Promise<{
        id: any;
        cashRegisterId: any;
        cashRegisterName: any;
        openedAt: any;
        openedByName: any;
        openingAmount: number;
        ordersCount: any;
        totalSales: number;
        paymentBreakdown: any;
        estimatedCash: any;
    }>;
    closeShift(tenantId: string, shiftId: string, userId: string, dto: CloseShiftDto): Promise<{
        shiftId: string;
        cashRegisterName: any;
        openedAt: any;
        closedAt: Date;
        openingAmount: number;
        closingAmount: number;
        expectedAmount: number;
        difference: number;
        totalSales: number;
        ordersCount: any;
        payments: {
            method: any;
            count: any;
            total: number;
        }[];
        status: string;
    }>;
    getShifts(tenantId: string, query: ShiftQueryDto): Promise<{
        data: unknown;
        total: any;
        page: number;
        limit: number;
    }>;
    getShiftDetail(tenantId: string, shiftId: string): Promise<any>;
    private getUserName;
}
