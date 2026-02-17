import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
export declare class ShiftsService {
    private prisma;
    private audit;
    private notif;
    constructor(prisma: PrismaService, audit: AuditService, notif: NotificationsService);
    getCashRegisters(tenantId: string): unknown;
    openShift(tenantId: string, userId: string, dto: OpenShiftDto): unknown;
    getActiveShift(tenantId: string): unknown;
    closeShift(tenantId: string, shiftId: string, userId: string, dto: CloseShiftDto): unknown;
    getShifts(tenantId: string, query: ShiftQueryDto): unknown;
    getShiftDetail(tenantId: string, shiftId: string): unknown;
    private getUserName;
}
