import { StaffService } from './staff.service';
import { UpdateStaffProfileDto, SetScheduleDto, ClockInDto, ClockOutDto, CreateTimeOffDto, StaffQueryDto } from './dto/staff.dto';
export declare class StaffController {
    private service;
    constructor(service: StaffService);
    getAll(tenantId: string): unknown;
    summary(tenantId: string): unknown;
    weekSchedule(tenantId: string): unknown;
    attendance(tenantId: string, query: StaffQueryDto): unknown;
    timeOff(tenantId: string, query: StaffQueryDto): unknown;
    payroll(tenantId: string, from: string, to: string): unknown;
    getById(tenantId: string, id: string): unknown;
    updateProfile(tenantId: string, id: string, dto: UpdateStaffProfileDto): unknown;
    setSchedule(tenantId: string, id: string, dto: SetScheduleDto): unknown;
    clockIn(tenantId: string, dto: ClockInDto): unknown;
    clockOut(tenantId: string, id: string, dto: ClockOutDto): unknown;
    createTimeOff(tenantId: string, dto: CreateTimeOffDto): unknown;
    reviewTimeOff(tenantId: string, id: string, action: 'approved' | 'rejected'): unknown;
}
