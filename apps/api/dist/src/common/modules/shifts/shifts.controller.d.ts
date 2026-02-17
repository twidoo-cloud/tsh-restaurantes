import { ShiftsService } from './shifts.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
declare class CreateCashRegisterDto {
    name: string;
}
declare class UpdateCashRegisterDto {
    name?: string;
    isActive?: boolean;
}
export declare class ShiftsController {
    private shiftsService;
    private wsGateway;
    constructor(shiftsService: ShiftsService, wsGateway: PosEventsGateway);
    getCashRegisters(tenantId: string, branchId: string | null): Promise<any[]>;
    createCashRegister(tenantId: string, branchId: string | null, dto: CreateCashRegisterDto): Promise<any>;
    updateCashRegister(tenantId: string, id: string, dto: UpdateCashRegisterDto): Promise<{
        success: boolean;
    }>;
    deleteCashRegister(tenantId: string, id: string): Promise<{
        success: boolean;
        deactivated: boolean;
        deleted?: undefined;
    } | {
        success: boolean;
        deleted: boolean;
        deactivated?: undefined;
    }>;
    getActiveShift(tenantId: string, branchId: string | null): Promise<{
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
    openShift(tenantId: string, branchId: string | null, userId: string, firstName: string, dto: OpenShiftDto): Promise<{
        id: any;
        cashRegisterName: any;
        openedAt: any;
        openingAmount: number;
        status: string;
    }>;
    closeShift(tenantId: string, userId: string, shiftId: string, dto: CloseShiftDto): Promise<{
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
    getShifts(tenantId: string, branchId: string | null, query: ShiftQueryDto): Promise<{
        data: unknown;
        total: any;
        page: number;
        limit: number;
    }>;
    getShiftDetail(tenantId: string, shiftId: string): Promise<any>;
}
export {};
