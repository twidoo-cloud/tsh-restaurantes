import { ShiftsService } from './shifts.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class ShiftsController {
    private shiftsService;
    private wsGateway;
    constructor(shiftsService: ShiftsService, wsGateway: PosEventsGateway);
    getCashRegisters(tenantId: string): Promise<any[]>;
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
    openShift(tenantId: string, userId: string, firstName: string, dto: OpenShiftDto): Promise<{
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
    getShifts(tenantId: string, query: ShiftQueryDto): Promise<{
        data: unknown;
        total: any;
        page: number;
        limit: number;
    }>;
    getShiftDetail(tenantId: string, shiftId: string): Promise<any>;
}
