import { IsString, IsNumber, IsOptional, IsUUID, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 'dine_in', enum: ['sale', 'dine_in', 'takeout', 'delivery'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: { table_id: '12000000-0000-0000-0000-000000000001', guest_count: 4 } })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddOrderItemDto {
  @ApiProperty({ example: 'f0000000-0000-0000-0000-000000000003' })
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  quantity?: number;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  @IsArray()
  modifiers?: any[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  modifiersTotal?: number;

  @ApiPropertyOptional({ example: 'Sin cebolla' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: any;
}

export class ProcessPaymentDto {
  @ApiProperty({ example: 'cash', enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'wallet'] })
  @IsString()
  method: string;

  @ApiProperty({ example: 49.56 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'PEN' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 50.00 })
  @IsOptional()
  @IsNumber()
  cashReceived?: number;
}

export class VoidItemDto {
  @ApiProperty({ example: 'Cliente cambió de opinión' })
  @IsString()
  reason: string;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ enum: ['open', 'in_progress', 'completed', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['sale', 'dine_in', 'takeout', 'delivery'] })
  @IsOptional()
  @IsString()
  type?: string;

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
