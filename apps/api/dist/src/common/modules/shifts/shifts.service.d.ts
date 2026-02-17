import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
export declare class ShiftsService {
    private prisma;
    private audit;
    private notif;
    constructor(prisma: PrismaService, audit: AuditService, notif: NotificationsService);
    getCashRegisters(tenantId: string, branchId?: string | null): unknown;
    createCashRegister(tenantId: string, name: string, branchId?: string | null): unknown;
    updateCashRegister(tenantId: string, registerId: string, data: {
        name?: string;
        isActive?: boolean;
    }): unknown;
    deleteCashRegister(tenantId: string, registerId: string): unknown;
    openShift(tenantId: string, userId: string, dto: OpenShiftDto, branchId?: string | null): unknown;
    getActiveShift(tenantId: string, branchId?: string | null): unknown;
    closeShift(tenantId: string, shiftId: string, userId: string, dto: CloseShiftDto): unknown;
    getShifts(tenantId: string, query: ShiftQueryDto, branchId?: string | null): unknown;
    getShiftDetail(tenantId: string, shiftId: string): unknown;
    private getUserName;
}
