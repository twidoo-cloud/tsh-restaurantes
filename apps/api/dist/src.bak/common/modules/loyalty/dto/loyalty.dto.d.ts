export declare class EnrollCustomerDto {
    customerId: string;
    birthday?: string;
}
export declare class EarnPointsDto {
    customerId: string;
    orderId: string;
    orderTotal: number;
}
export declare class RedeemRewardDto {
    customerId: string;
    rewardId: string;
    orderId?: string;
}
export declare class AdjustPointsDto {
    customerId: string;
    points: number;
    description: string;
}
export declare class CreateRewardDto {
    name: string;
    description?: string;
    pointsCost: number;
    rewardType: string;
    rewardValue?: number;
    productId?: string;
    minTier?: string;
    maxRedemptions?: number;
}
export declare class UpdateRewardDto {
    name?: string;
    description?: string;
    pointsCost?: number;
    rewardType?: string;
    rewardValue?: number;
    productId?: string;
    minTier?: string;
    maxRedemptions?: number;
    isActive?: boolean;
}
export declare class UpdateLoyaltySettingsDto {
    isEnabled?: boolean;
    pointsPerDollar?: number;
    minPurchaseForPoints?: number;
    pointsExpiryDays?: number;
    welcomeBonus?: number;
    birthdayBonus?: number;
    referralBonus?: number;
    allowPartialRedemption?: boolean;
    minPointsToRedeem?: number;
}
export declare class LoyaltyQueryDto {
    customerId?: string;
    type?: string;
    page?: number;
    limit?: number;
}
