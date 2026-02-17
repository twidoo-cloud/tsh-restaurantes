import { IsString, IsOptional, IsArray, IsNumber, Min, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class PublicOrderItemDto {
  @IsString() productId: string;
  @IsNumber() @Min(1) quantity: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePublicOrderDto {
  // Customer info
  @IsString() customerName: string;
  @IsString() customerPhone: string;
  @IsOptional() @IsString() customerEmail?: string;

  // Order type
  @IsString() deliveryType: string; // 'delivery' | 'pickup'

  // Address (required for delivery)
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() addressReference?: string;
  @IsOptional() @IsString() city?: string;

  // Delivery zone
  @IsOptional() @IsString() zoneId?: string;

  // Payment
  @IsOptional() @IsString() paymentMethod?: string;

  // Notes
  @IsOptional() @IsString() notes?: string;

  // Items
  @IsArray()
  @ArrayMinSize(1)
  items: PublicOrderItemDto[];
}
