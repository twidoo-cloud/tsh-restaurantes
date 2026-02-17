import { StaffService } from './staff.service';
import { UpdateStaffProfileDto, SetScheduleDto, ClockInDto, ClockOutDto, CreateTimeOffDto, StaffQueryDto } from './dto/staff.dto';
export declare class StaffController {
    private service;
    constructor(service: StaffService);
    getAll(tenantId: string): Promise<any[]>;
    summary(tenantId: string): Promise<any>;
    weekSchedule(tenantId: string): Promise<any[]>;
    attendance(tenantId: string, query: StaffQueryDto): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
    }>;
    timeOff(tenantId: string, query: StaffQueryDto): Promise<any[]>;
    payroll(tenantId: string, from: string, to: string): Promise<any[]>;
    getById(tenantId: string, id: string): Promise<any>;
    updateProfile(tenantId: string, id: string, dto: UpdateStaffProfileDto): Promise<any>;
    setSchedule(tenantId: string, id: string, dto: SetScheduleDto): Promise<unknown>;
    clockIn(tenantId: string, dto: ClockInDto): Promise<any>;
    clockOut(tenantId: string, id: string, dto: ClockOutDto): Promise<any>;
    createTimeOff(tenantId: string, dto: CreateTimeOffDto): Promise<any>;
    reviewTimeOff(tenantId: string, id: string, action: 'approved' | 'rejected'): Promise<any>;
}
