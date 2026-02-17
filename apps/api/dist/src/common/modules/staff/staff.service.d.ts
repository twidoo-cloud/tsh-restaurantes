import { PrismaService } from '../../prisma.service';
import { UpdateStaffProfileDto, SetScheduleDto, ClockInDto, ClockOutDto, CreateTimeOffDto, StaffQueryDto } from './dto/staff.dto';
export declare class StaffService {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(tenantId: string): unknown;
    getById(tenantId: string, userId: string): unknown;
    updateProfile(tenantId: string, userId: string, dto: UpdateStaffProfileDto): unknown;
    setSchedule(tenantId: string, dto: SetScheduleDto): unknown;
    getSchedule(tenantId: string, userId: string): unknown;
    getWeekSchedule(tenantId: string): unknown;
    clockIn(tenantId: string, dto: ClockInDto): unknown;
    clockOut(tenantId: string, attendanceId: string, dto: ClockOutDto): unknown;
    getAttendance(tenantId: string, query: StaffQueryDto): unknown;
    getTodaySummary(tenantId: string): unknown;
    createTimeOff(tenantId: string, dto: CreateTimeOffDto): unknown;
    getTimeOff(tenantId: string, query: StaffQueryDto): unknown;
    reviewTimeOff(tenantId: string, id: string, status: 'approved' | 'rejected', approvedBy: string): unknown;
    getPayrollSummary(tenantId: string, fromDate: string, toDate: string): unknown;
}
