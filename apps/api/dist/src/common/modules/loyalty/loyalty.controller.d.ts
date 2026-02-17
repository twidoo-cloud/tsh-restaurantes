import { LoyaltyService } from './loyalty.service';
import { EnrollCustomerDto, EarnPointsDto, RedeemRewardDto, AdjustPointsDto, CreateRewardDto, UpdateRewardDto, UpdateLoyaltySettingsDto, LoyaltyQueryDto } from './dto/loyalty.dto';
export declare class LoyaltyController {
    private service;
    constructor(service: LoyaltyService);
    enroll(tenantId: string, dto: EnrollCustomerDto): Promise<any>;
    earn(tenantId: string, dto: EarnPointsDto): Promise<{
        pointsEarned: number;
        message: string;
        multiplier?: undefined;
        balance?: undefined;
    } | {
        pointsEarned: number;
        multiplier: number;
        balance: any;
        message?: undefined;
    }>;
    redeem(tenantId: string, dto: RedeemRewardDto): Promise<{
        reward: any;
        pointsUsed: any;
        rewardType: any;
        rewardValue: number;
        productId: any;
        balance: number;
    }>;
    adjust(tenantId: string, dto: AdjustPointsDto): Promise<any>;
    getCustomer(tenantId: string, customerId: string): Promise<any>;
    leaderboard(tenantId: string): Promise<unknown>;
    transactions(tenantId: string, query: LoyaltyQueryDto): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
    }>;
    dashboard(tenantId: string): Promise<any>;
    getRewards(tenantId: string): Promise<unknown>;
    createReward(tenantId: string, dto: CreateRewardDto): Promise<any>;
    updateReward(tenantId: string, id: string, dto: UpdateRewardDto): Promise<any>;
    deleteReward(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    getTiers(tenantId: string): any;
    getSettings(tenantId: string): Promise<any>;
    updateSettings(tenantId: string, dto: UpdateLoyaltySettingsDto): Promise<any>;
}
