import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDeliveryOrderDto {
  // Customer
  @IsString() customerName: string;
  @IsString() customerPhone: string;
  @IsOptional() @IsString() customerEmail?: string;
  @IsOptional() @IsString() customerId?: string;

  // Address (required for delivery, optional for pickup)
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() addressReference?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;

  // Delivery
  @IsString() deliveryType: string; // delivery | pickup
  @IsOptional() @IsString() zoneId?: string;
  @IsOptional() @IsString() scheduledFor?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() externalOrderId?: string;
  @IsOptional() @IsString() notes?: string;

  // Items
  @IsArray() items: { productId: string; quantity: number; notes?: string }[];
}

export class UpdateDeliveryOrderDto {
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() addressReference?: string;
  @IsOptional() @IsString() driverName?: string;
  @IsOptional() @IsString() driverPhone?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() zoneId?: string;
}

export class DeliveryQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() type?: string; // delivery | pickup
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}

export class CreateZoneDto {
  @IsString() name: string;
  @IsNumber() deliveryFee: number;
  @IsOptional() @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsInt() estimatedMinutes?: number;
  @IsOptional() @IsString() color?: string;
}

export class UpdateZoneDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() deliveryFee?: number;
  @IsOptional() @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsInt() estimatedMinutes?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() color?: string;
}

export class UpdateDeliverySettingsDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsBoolean() acceptsDelivery?: boolean;
  @IsOptional() @IsBoolean() acceptsPickup?: boolean;
  @IsOptional() @IsNumber() defaultDeliveryFee?: number;
  @IsOptional() @IsNumber() freeDeliveryAbove?: number;
  @IsOptional() @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsInt() estimatedDeliveryMinutes?: number;
  @IsOptional() @IsInt() estimatedPickupMinutes?: number;
  @IsOptional() @IsString() deliveryHoursStart?: string;
  @IsOptional() @IsString() deliveryHoursEnd?: string;
  @IsOptional() @IsBoolean() autoAcceptOrders?: boolean;
  @IsOptional() @IsString() whatsappNumber?: string;
}
