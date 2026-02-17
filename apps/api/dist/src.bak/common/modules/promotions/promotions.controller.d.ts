import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto, ApplyCouponDto, PromotionQueryDto } from './dto/promotions.dto';
export declare class PromotionsController {
    private promotionsService;
    constructor(promotionsService: PromotionsService);
    findAll(tenantId: string, query: PromotionQueryDto): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: CreatePromotionDto): unknown;
    update(tenantId: string, id: string, dto: UpdatePromotionDto): unknown;
    toggleActive(tenantId: string, id: string): unknown;
    delete(tenantId: string, id: string): unknown;
    applyToOrder(tenantId: string, orderId: string): unknown;
    applyCoupon(tenantId: string, orderId: string, dto: ApplyCouponDto): unknown;
    removeFromOrder(tenantId: string, orderId: string, promotionId: string): unknown;
    getOrderPromotions(tenantId: string, orderId: string): unknown;
}
