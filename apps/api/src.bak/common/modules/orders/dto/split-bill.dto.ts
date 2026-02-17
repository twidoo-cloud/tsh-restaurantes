import { IsString, IsNumber, IsOptional, IsUUID, IsArray, IsEnum, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SplitType {
  EQUAL = 'equal',
  BY_ITEMS = 'by_items',
  CUSTOM = 'custom_amount',
}

// ── Create split: divide equally ──
export class CreateEqualSplitDto {
  @ApiProperty({ example: 3, description: 'Number of people to split between' })
  @IsNumber()
  @Min(2)
  numberOfGuests: number;

  @ApiPropertyOptional({ example: ['Carlos', 'María', 'Juan'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guestNames?: string[];
}

// ── Create split: by items ──
export class SplitItemAssignment {
  @ApiProperty({ description: 'Guest index (0-based)' })
  @IsNumber()
  guestIndex: number;

  @ApiProperty({ description: 'Order item IDs assigned to this guest' })
  @IsArray()
  @IsString({ each: true })
  itemIds: string[];
}

export class CreateItemSplitDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(2)
  numberOfGuests: number;

  @ApiPropertyOptional({ example: ['Carlos', 'María', 'Juan'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guestNames?: string[];

  @ApiProperty({ type: [SplitItemAssignment], description: 'Item assignments per guest' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitItemAssignment)
  assignments: SplitItemAssignment[];
}

// ── Create split: custom amounts ──
export class CustomSplitGuest {
  @ApiPropertyOptional({ example: 'Carlos' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 15.50 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class CreateCustomSplitDto {
  @ApiProperty({ type: [CustomSplitGuest] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CustomSplitGuest)
  guests: CustomSplitGuest[];
}

// ── Process payment for a specific split ──
export class ProcessSplitPaymentDto {
  @ApiProperty({ example: 'cash', enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'wallet'] })
  @IsString()
  method: string;

  @ApiProperty({ example: 16.52 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 20.00 })
  @IsOptional()
  @IsNumber()
  cashReceived?: number;
}
