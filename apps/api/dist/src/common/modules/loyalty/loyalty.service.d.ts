import { PrismaService } from '../../prisma.service';
import { EnrollCustomerDto, EarnPointsDto, RedeemRewardDto, AdjustPointsDto, CreateRewardDto, UpdateRewardDto, UpdateLoyaltySettingsDto, LoyaltyQueryDto } from './dto/loyalty.dto';
export declare class LoyaltyService {
    private prisma;
    constructor(prisma: PrismaService);
    enrollCustomer(tenantId: string, dto: EnrollCustomerDto): Promise<any>;
    earnPoints(tenantId: string, dto: EarnPointsDto): Promise<{
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
    redeemReward(tenantId: string, dto: RedeemRewardDto): Promise<{
        reward: any;
        pointsUsed: any;
        rewardType: any;
        rewardValue: number;
        productId: any;
        balance: number;
    }>;
    adjustPoints(tenantId: string, dto: AdjustPointsDto, userId?: string): Promise<any>;
    getCustomerLoyalty(tenantId: string, customerId: string): Promise<any>;
    getLeaderboard(tenantId: string, limit?: number): Promise<unknown>;
    getTransactions(tenantId: string, query: LoyaltyQueryDto): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
    }>;
    getDashboard(tenantId: string): Promise<any>;
    getRewards(tenantId: string): Promise<unknown>;
    createReward(tenantId: string, dto: CreateRewardDto): Promise<any>;
    updateReward(tenantId: string, id: string, dto: UpdateRewardDto): Promise<any>;
    deleteReward(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    getTiers(tenantId: string): any;
    private createDefaultTiers;
    getOrCreateSettings(tenantId: string): Promise<any>;
    updateSettings(tenantId: string, dto: UpdateLoyaltySettingsDto): Promise<any>;
    private addPoints;
    private checkTierUpgrade;
}
