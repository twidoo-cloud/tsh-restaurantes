import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateReservationDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  guestName: string;

  @ApiPropertyOptional({ example: '0991234567' })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiPropertyOptional({ example: 'juan@email.com' })
  @IsOptional()
  @IsString()
  guestEmail?: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(50)
  guestCount: number;

  @ApiProperty({ example: '2026-02-15' })
  @IsString()
  reservationDate: string;

  @ApiProperty({ example: '19:00' })
  @IsString()
  startTime: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tableId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({ enum: ['phone', 'walk_in', 'online', 'app'] })
  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateReservationDto {
  @IsOptional() @IsString() guestName?: string;
  @IsOptional() @IsString() guestPhone?: string;
  @IsOptional() @IsString() guestEmail?: string;
  @IsOptional() @IsInt() guestCount?: number;
  @IsOptional() @IsString() reservationDate?: string;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsInt() durationMinutes?: number;
  @IsOptional() @IsString() tableId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() specialRequests?: string;
}

export class ReservationQueryDto {
  @ApiPropertyOptional({ example: '2026-02-15' })
  @IsOptional() @IsString() date?: string;

  @ApiPropertyOptional({ example: '2026-02-15' })
  @IsOptional() @IsString() fromDate?: string;

  @ApiPropertyOptional({ example: '2026-02-20' })
  @IsOptional() @IsString() toDate?: string;

  @ApiPropertyOptional({ enum: ['confirmed', 'seated', 'completed', 'cancelled', 'no_show'] })
  @IsOptional() @IsString() status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}

export class UpdateSettingsDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsInt() defaultDurationMinutes?: number;
  @IsOptional() @IsInt() minAdvanceHours?: number;
  @IsOptional() @IsInt() maxAdvanceDays?: number;
  @IsOptional() @IsInt() slotIntervalMinutes?: number;
  @IsOptional() @IsString() openingTime?: string;
  @IsOptional() @IsString() closingTime?: string;
  @IsOptional() @IsInt() maxPartySize?: number;
  @IsOptional() @IsInt() autoCancelMinutes?: number;
  @IsOptional() @IsBoolean() confirmationRequired?: boolean;
  @IsOptional() @IsBoolean() allowOnlineBooking?: boolean;
}

export class CancelReservationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() reason?: string;
}
