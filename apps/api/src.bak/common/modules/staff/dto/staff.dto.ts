import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStaffProfileDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() hireDate?: string;
  @IsOptional() @IsNumber() hourlyRate?: number;
  @IsOptional() @IsNumber() salary?: number;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() emergencyPhone?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class SetScheduleDto {
  @IsString() userId: string;
  @IsArray() schedule: { dayOfWeek: number; startTime: string; endTime: string }[];
}

export class ClockInDto {
  @IsString() userId: string;
  @IsOptional() @IsString() notes?: string;
}

export class ClockOutDto {
  @IsOptional() @IsInt() breakMinutes?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateTimeOffDto {
  @IsString() userId: string;
  @IsString() type: string;
  @IsString() startDate: string;
  @IsString() endDate: string;
  @IsOptional() @IsString() reason?: string;
}

export class StaffQueryDto {
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() fromDate?: string;
  @IsOptional() @IsString() toDate?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}
