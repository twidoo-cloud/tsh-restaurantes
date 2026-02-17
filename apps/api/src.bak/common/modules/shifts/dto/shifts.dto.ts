import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OpenShiftDto {
  @ApiProperty({ description: 'Cash register ID', example: '13000000-0000-0000-0000-000000000001' })
  @IsString()
  cashRegisterId: string;

  @ApiProperty({ description: 'Opening cash amount', example: 100.00 })
  @IsNumber()
  @Min(0)
  openingAmount: number;

  @ApiPropertyOptional({ description: 'Notes for the shift opening' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseShiftDto {
  @ApiProperty({ description: 'Actual counted cash amount at closing', example: 450.50 })
  @IsNumber()
  @Min(0)
  closingAmount: number;

  @ApiPropertyOptional({ description: 'Notes for the shift closing' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ShiftQueryDto {
  @ApiPropertyOptional({ enum: ['open', 'closed'], description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
