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
    getCashRegisters(tenantId: string, branchId: string | null): unknown;
    createCashRegister(tenantId: string, branchId: string | null, dto: CreateCashRegisterDto): unknown;
    updateCashRegister(tenantId: string, id: string, dto: UpdateCashRegisterDto): unknown;
    deleteCashRegister(tenantId: string, id: string): unknown;
    getActiveShift(tenantId: string, branchId: string | null): unknown;
    openShift(tenantId: string, branchId: string | null, userId: string, firstName: string, dto: OpenShiftDto): unknown;
    closeShift(tenantId: string, userId: string, shiftId: string, dto: CloseShiftDto): unknown;
    getShifts(tenantId: string, branchId: string | null, query: ShiftQueryDto): unknown;
    getShiftDetail(tenantId: string, shiftId: string): unknown;
}
export {};
