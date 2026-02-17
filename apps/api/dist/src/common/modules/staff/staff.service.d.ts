import { PrismaService } from '../../prisma.service';
import { UpdateStaffProfileDto, SetScheduleDto, ClockInDto, ClockOutDto, CreateTimeOffDto, StaffQueryDto } from './dto/staff.dto';
export declare class StaffService {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(tenantId: string): Promise<any[]>;
    getById(tenantId: string, userId: string): Promise<any>;
    updateProfile(tenantId: string, userId: string, dto: UpdateStaffProfileDto): Promise<any>;
    setSchedule(tenantId: string, dto: SetScheduleDto): Promise<unknown>;
    getSchedule(tenantId: string, userId: string): Promise<unknown>;
    getWeekSchedule(tenantId: string): Promise<any[]>;
    clockIn(tenantId: string, dto: ClockInDto): Promise<any>;
    clockOut(tenantId: string, attendanceId: string, dto: ClockOutDto): Promise<any>;
    getAttendance(tenantId: string, query: StaffQueryDto): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
    }>;
    getTodaySummary(tenantId: string): Promise<any>;
    createTimeOff(tenantId: string, dto: CreateTimeOffDto): Promise<any>;
    getTimeOff(tenantId: string, query: StaffQueryDto): Promise<any[]>;
    reviewTimeOff(tenantId: string, id: string, status: 'approved' | 'rejected', approvedBy: string): Promise<any>;
    getPayrollSummary(tenantId: string, fromDate: string, toDate: string): Promise<any[]>;
}
