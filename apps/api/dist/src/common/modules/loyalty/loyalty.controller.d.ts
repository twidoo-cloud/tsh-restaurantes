import { LoyaltyService } from './loyalty.service';
import { EnrollCustomerDto, EarnPointsDto, RedeemRewardDto, AdjustPointsDto, CreateRewardDto, UpdateRewardDto, UpdateLoyaltySettingsDto, LoyaltyQueryDto } from './dto/loyalty.dto';
export declare class LoyaltyController {
    private service;
    constructor(service: LoyaltyService);
    enroll(tenantId: string, dto: EnrollCustomerDto): unknown;
    earn(tenantId: string, dto: EarnPointsDto): unknown;
    redeem(tenantId: string, dto: RedeemRewardDto): unknown;
    adjust(tenantId: string, dto: AdjustPointsDto): unknown;
    getCustomer(tenantId: string, customerId: string): unknown;
    leaderboard(tenantId: string): unknown;
    transactions(tenantId: string, query: LoyaltyQueryDto): unknown;
    dashboard(tenantId: string): unknown;
    getRewards(tenantId: string): unknown;
    createReward(tenantId: string, dto: CreateRewardDto): unknown;
    updateReward(tenantId: string, id: string, dto: UpdateRewardDto): unknown;
    deleteReward(tenantId: string, id: string): unknown;
    getTiers(tenantId: string): any;
    getSettings(tenantId: string): unknown;
    updateSettings(tenantId: string, dto: UpdateLoyaltySettingsDto): unknown;
}
