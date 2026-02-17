import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class EnrollCustomerDto {
  @IsString() customerId: string;
  @IsOptional() @IsString() birthday?: string;
}

export class EarnPointsDto {
  @IsString() customerId: string;
  @IsString() orderId: string;
  @IsNumber() orderTotal: number;
}

export class RedeemRewardDto {
  @IsString() customerId: string;
  @IsString() rewardId: string;
  @IsOptional() @IsString() orderId?: string;
}

export class AdjustPointsDto {
  @IsString() customerId: string;
  @IsInt() points: number; // positive to add, negative to subtract
  @IsString() description: string;
}

export class CreateRewardDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(1) pointsCost: number;
  @IsString() rewardType: string; // discount, free_item, percentage, custom
  @IsOptional() @IsNumber() rewardValue?: number;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() minTier?: string;
  @IsOptional() @IsInt() maxRedemptions?: number;
}

export class UpdateRewardDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() pointsCost?: number;
  @IsOptional() @IsString() rewardType?: string;
  @IsOptional() @IsNumber() rewardValue?: number;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() minTier?: string;
  @IsOptional() @IsInt() maxRedemptions?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateLoyaltySettingsDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsNumber() pointsPerDollar?: number;
  @IsOptional() @IsNumber() minPurchaseForPoints?: number;
  @IsOptional() @IsInt() pointsExpiryDays?: number;
  @IsOptional() @IsInt() welcomeBonus?: number;
  @IsOptional() @IsInt() birthdayBonus?: number;
  @IsOptional() @IsInt() referralBonus?: number;
  @IsOptional() @IsBoolean() allowPartialRedemption?: boolean;
  @IsOptional() @IsInt() minPointsToRedeem?: number;
}

export class LoyaltyQueryDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}
