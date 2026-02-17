export declare class UpdateStaffProfileDto {
    phone?: string;
    hireDate?: string;
    hourlyRate?: number;
    salary?: number;
    emergencyContact?: string;
    emergencyPhone?: string;
    taxId?: string;
    notes?: string;
}
export declare class SetScheduleDto {
    userId: string;
    schedule: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
    }[];
}
export declare class ClockInDto {
    userId: string;
    notes?: string;
}
export declare class ClockOutDto {
    breakMinutes?: number;
    notes?: string;
}
export declare class CreateTimeOffDto {
    userId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
}
export declare class StaffQueryDto {
    date?: string;
    fromDate?: string;
    toDate?: string;
    userId?: string;
    page?: number;
    limit?: number;
}
