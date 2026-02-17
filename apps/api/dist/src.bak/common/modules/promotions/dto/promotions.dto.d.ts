export declare class CreatePromotionDto {
    name: string;
    description?: string;
    promoType: string;
    discountValue: number;
    buyQuantity?: number;
    getQuantity?: number;
    scope: string;
    productIds?: string[];
    categoryIds?: string[];
    couponCode?: string;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    maxUses?: number;
    maxUsesPerOrder?: number;
    startDate?: string;
    endDate?: string;
    daysOfWeek?: number[];
    startTime?: string;
    endTime?: string;
    isAutomatic?: boolean;
    priority?: number;
    stackable?: boolean;
}
export declare class UpdatePromotionDto extends CreatePromotionDto {
    isActive?: boolean;
}
export declare class ApplyCouponDto {
    couponCode: string;
}
export declare class PromotionQueryDto {
    status?: string;
    promoType?: string;
    page?: number;
    limit?: number;
}
