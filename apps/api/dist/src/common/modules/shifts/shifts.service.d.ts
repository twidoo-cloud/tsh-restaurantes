import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
export declare class ShiftsService {
    private prisma;
    private audit;
    private notif;
    constructor(prisma: PrismaService, audit: AuditService, notif: NotificationsService);
    getCashRegisters(tenantId: string, branchId?: string | null): Promise<any[]>;
    createCashRegister(tenantId: string, name: string, branchId?: string | null): Promise<any>;
    updateCashRegister(tenantId: string, registerId: string, data: {
        name?: string;
        isActive?: boolean;
    }): Promise<{
        success: boolean;
    }>;
    deleteCashRegister(tenantId: string, registerId: string): Promise<{
        success: boolean;
        deactivated: boolean;
        deleted?: undefined;
    } | {
        success: boolean;
        deleted: boolean;
        deactivated?: undefined;
    }>;
    openShift(tenantId: string, userId: string, dto: OpenShiftDto, branchId?: string | null): Promise<{
        id: any;
        cashRegisterName: any;
        openedAt: any;
        openingAmount: number;
        status: string;
    }>;
    getActiveShift(tenantId: string, branchId?: string | null): Promise<{
        id: any;
        cash_register_id: any;
        cash_register_name: any;
        opened_at: any;
        opened_by_name: any;
        opening_amount: number;
        total_sales: number;
        orders_count: any;
        expected_cash: any;
        payments: any;
        ordersSummary: any;
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
    getShifts(tenantId: string, query: ShiftQueryDto, branchId?: string | null): Promise<{
        data: unknown;
        total: any;
        page: number;
        limit: number;
    }>;
    getShiftDetail(tenantId: string, shiftId: string): Promise<any>;
    private getUserName;
}
