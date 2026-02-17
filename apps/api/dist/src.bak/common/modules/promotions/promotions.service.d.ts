import { PrismaService } from '../../prisma.service';
import { CreatePromotionDto, UpdatePromotionDto, PromotionQueryDto } from './dto/promotions.dto';
export declare class PromotionsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, query: PromotionQueryDto): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: CreatePromotionDto): unknown;
    update(tenantId: string, id: string, dto: UpdatePromotionDto): unknown;
    toggleActive(tenantId: string, id: string): unknown;
    delete(tenantId: string, id: string): unknown;
    getApplicablePromotions(tenantId: string, orderId: string): unknown;
    applyPromotionsToOrder(tenantId: string, orderId: string): unknown;
    applyCoupon(tenantId: string, orderId: string, couponCode: string): unknown;
    removePromotion(tenantId: string, orderId: string, promotionId: string): unknown;
    getOrderPromotions(tenantId: string, orderId: string): unknown;
    private calculateDiscount;
    private recalcOrderWithDiscount;
}
