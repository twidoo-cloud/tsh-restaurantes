import { ShiftsService } from './shifts.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
export declare class ShiftsController {
    private shiftsService;
    private wsGateway;
    constructor(shiftsService: ShiftsService, wsGateway: PosEventsGateway);
    getCashRegisters(tenantId: string): unknown;
    getActiveShift(tenantId: string): unknown;
    openShift(tenantId: string, userId: string, firstName: string, dto: OpenShiftDto): unknown;
    closeShift(tenantId: string, userId: string, shiftId: string, dto: CloseShiftDto): unknown;
    getShifts(tenantId: string, query: ShiftQueryDto): unknown;
    getShiftDetail(tenantId: string, shiftId: string): unknown;
}
