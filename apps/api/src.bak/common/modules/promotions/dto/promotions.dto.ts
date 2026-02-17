import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Happy Hour Cerveza' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '50% de descuento en cervezas de 4pm a 7pm' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'percentage', enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'happy_hour', 'coupon'] })
  @IsString()
  promoType: string;

  @ApiProperty({ example: 10, description: 'For percentage: 10=10%. For fixed: dollar amount.' })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 2, description: 'Buy X quantity (for buy_x_get_y)' })
  @IsOptional()
  @IsInt()
  buyQuantity?: number;

  @ApiPropertyOptional({ example: 1, description: 'Get Y free/discounted (for buy_x_get_y)' })
  @IsOptional()
  @IsInt()
  getQuantity?: number;

  @ApiProperty({ example: 'product', enum: ['order', 'product', 'category'] })
  @IsString()
  scope: string;

  @ApiPropertyOptional({ description: 'Product IDs (when scope=product)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Category IDs (when scope=category)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ example: 'PROMO10' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 20.00 })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 50.00, description: 'Maximum discount cap' })
  @IsOptional()
  @IsNumber()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  maxUses?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  maxUsesPerOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], description: '0=Sun..6=Sat' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: '16:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stackable?: boolean;
}

export class UpdatePromotionDto extends CreatePromotionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'PROMO10' })
  @IsString()
  couponCode: string;
}

export class PromotionQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'happy_hour', 'coupon'] })
  @IsOptional()
  @IsString()
  promoType?: string;

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
