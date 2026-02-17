import { PrismaService } from '../../prisma.service';
import { EnrollCustomerDto, EarnPointsDto, RedeemRewardDto, AdjustPointsDto, CreateRewardDto, UpdateRewardDto, UpdateLoyaltySettingsDto, LoyaltyQueryDto } from './dto/loyalty.dto';
export declare class LoyaltyService {
    private prisma;
    constructor(prisma: PrismaService);
    enrollCustomer(tenantId: string, dto: EnrollCustomerDto): unknown;
    earnPoints(tenantId: string, dto: EarnPointsDto): unknown;
    redeemReward(tenantId: string, dto: RedeemRewardDto): unknown;
    adjustPoints(tenantId: string, dto: AdjustPointsDto, userId?: string): unknown;
    getCustomerLoyalty(tenantId: string, customerId: string): unknown;
    getLeaderboard(tenantId: string, limit?: number): unknown;
    getTransactions(tenantId: string, query: LoyaltyQueryDto): unknown;
    getDashboard(tenantId: string): unknown;
    getRewards(tenantId: string): unknown;
    createReward(tenantId: string, dto: CreateRewardDto): unknown;
    updateReward(tenantId: string, id: string, dto: UpdateRewardDto): unknown;
    deleteReward(tenantId: string, id: string): unknown;
    getTiers(tenantId: string): any;
    private createDefaultTiers;
    getOrCreateSettings(tenantId: string): unknown;
    updateSettings(tenantId: string, dto: UpdateLoyaltySettingsDto): unknown;
    private addPoints;
    private checkTierUpgrade;
}
