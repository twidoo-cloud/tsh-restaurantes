"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const library_1 = require("@prisma/client/runtime/library");
let PromotionsService = class PromotionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, query) {
        const { status, promoType, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const where = { tenantId };
        if (status === 'active')
            where.isActive = true;
        else if (status === 'inactive')
            where.isActive = false;
        if (promoType)
            where.promoType = promoType;
        const [data, total] = await Promise.all([
            this.prisma.promotion.findMany({
                where,
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.promotion.count({ where }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findById(tenantId, id) {
        const promo = await this.prisma.promotion.findFirst({
            where: { id, tenantId },
            include: {
                appliedPromotions: { take: 10, orderBy: { createdAt: 'desc' } },
            },
        });
        if (!promo)
            throw new common_1.NotFoundException('Promoción no encontrada');
        return promo;
    }
    async create(tenantId, dto) {
        if (dto.couponCode) {
            const existing = await this.prisma.promotion.findFirst({
                where: { tenantId, couponCode: dto.couponCode.toUpperCase() },
            });
            if (existing)
                throw new common_1.BadRequestException('Ya existe una promoción con ese código de cupón');
        }
        return this.prisma.promotion.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
                promoType: dto.promoType,
                discountValue: dto.discountValue,
                buyQuantity: dto.buyQuantity,
                getQuantity: dto.getQuantity,
                scope: dto.scope,
                productIds: dto.productIds || [],
                categoryIds: dto.categoryIds || [],
                couponCode: dto.couponCode?.toUpperCase() || null,
                minOrderAmount: dto.minOrderAmount || 0,
                maxDiscountAmount: dto.maxDiscountAmount || null,
                maxUses: dto.maxUses || null,
                maxUsesPerOrder: dto.maxUsesPerOrder || 1,
                startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                daysOfWeek: dto.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
                startTime: dto.startTime || null,
                endTime: dto.endTime || null,
                isAutomatic: dto.isAutomatic ?? true,
                priority: dto.priority || 0,
                stackable: dto.stackable || false,
            },
        });
    }
    async update(tenantId, id, dto) {
        await this.findById(tenantId, id);
        if (dto.couponCode) {
            const existing = await this.prisma.promotion.findFirst({
                where: { tenantId, couponCode: dto.couponCode.toUpperCase(), NOT: { id } },
            });
            if (existing)
                throw new common_1.BadRequestException('Ya existe otra promoción con ese código de cupón');
        }
        return this.prisma.promotion.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                promoType: dto.promoType,
                discountValue: dto.discountValue,
                buyQuantity: dto.buyQuantity,
                getQuantity: dto.getQuantity,
                scope: dto.scope,
                productIds: dto.productIds || [],
                categoryIds: dto.categoryIds || [],
                couponCode: dto.couponCode?.toUpperCase() || null,
                minOrderAmount: dto.minOrderAmount || 0,
                maxDiscountAmount: dto.maxDiscountAmount,
                maxUses: dto.maxUses,
                maxUsesPerOrder: dto.maxUsesPerOrder,
                startDate: dto.startDate ? new Date(dto.startDate) : undefined,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                daysOfWeek: dto.daysOfWeek,
                startTime: dto.startTime,
                endTime: dto.endTime,
                isActive: dto.isActive,
                isAutomatic: dto.isAutomatic,
                priority: dto.priority,
                stackable: dto.stackable,
            },
        });
    }
    async toggleActive(tenantId, id) {
        const promo = await this.findById(tenantId, id);
        return this.prisma.promotion.update({
            where: { id },
            data: { isActive: !promo.isActive },
        });
    }
    async delete(tenantId, id) {
        await this.findById(tenantId, id);
        await this.prisma.promotion.delete({ where: { id } });
        return { success: true };
    }
    async getApplicablePromotions(tenantId, orderId) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: {
                items: {
                    where: { isVoid: false },
                    include: { product: { select: { id: true, categoryId: true, price: true } } },
                },
            },
        });
        if (!order)
            return [];
        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const promotions = await this.prisma.promotion.findMany({
            where: {
                tenantId,
                isActive: true,
                isAutomatic: true,
                startDate: { lte: now },
                OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
            orderBy: { priority: 'desc' },
        });
        return promotions.filter(p => {
            if (p.daysOfWeek.length > 0 && !p.daysOfWeek.includes(dayOfWeek))
                return false;
            if (p.startTime && p.endTime) {
                if (currentTime < p.startTime || currentTime > p.endTime)
                    return false;
            }
            if (p.maxUses !== null && p.currentUses >= p.maxUses)
                return false;
            const orderSubtotal = parseFloat(order.subtotal.toString());
            if (parseFloat(p.minOrderAmount.toString()) > 0 && orderSubtotal < parseFloat(p.minOrderAmount.toString()))
                return false;
            return true;
        });
    }
    async applyPromotionsToOrder(tenantId, orderId) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: {
                items: {
                    where: { isVoid: false },
                    include: { product: { select: { id: true, categoryId: true, price: true, name: true } } },
                },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Orden no encontrada');
        await this.prisma.appliedPromotion.deleteMany({ where: { orderId } });
        await this.prisma.orderItem.updateMany({
            where: { orderId, isVoid: false },
            data: { discountAmount: 0, discountReason: null, promotionId: null },
        });
        const applicablePromos = await this.getApplicablePromotions(tenantId, orderId);
        if (applicablePromos.length === 0) {
            await this.recalcOrderWithDiscount(orderId, new library_1.Decimal(0));
            return { discounts: [], totalDiscount: 0 };
        }
        const discounts = [];
        let totalDiscount = new library_1.Decimal(0);
        let appliedNonStackable = false;
        for (const promo of applicablePromos) {
            if (appliedNonStackable && !promo.stackable)
                continue;
            const result = this.calculateDiscount(promo, order.items);
            if (result.totalDiscount.gt(0)) {
                let finalDiscount = result.totalDiscount;
                if (promo.maxDiscountAmount) {
                    const cap = new library_1.Decimal(promo.maxDiscountAmount.toString());
                    if (finalDiscount.gt(cap))
                        finalDiscount = cap;
                }
                totalDiscount = totalDiscount.add(finalDiscount);
                for (const itemDiscount of result.itemDiscounts) {
                    discounts.push({
                        promotionId: promo.id,
                        promoName: promo.name,
                        promoType: promo.promoType,
                        amount: itemDiscount.discount.toNumber(),
                        itemId: itemDiscount.itemId,
                    });
                    await this.prisma.orderItem.update({
                        where: { id: itemDiscount.itemId },
                        data: {
                            discountAmount: itemDiscount.discount,
                            discountReason: promo.name,
                            promotionId: promo.id,
                        },
                    });
                    await this.prisma.appliedPromotion.create({
                        data: {
                            tenantId,
                            orderId,
                            orderItemId: itemDiscount.itemId,
                            promotionId: promo.id,
                            promoName: promo.name,
                            promoType: promo.promoType,
                            discountAmount: itemDiscount.discount,
                        },
                    });
                }
                if (result.itemDiscounts.length === 0 && result.totalDiscount.gt(0)) {
                    discounts.push({
                        promotionId: promo.id,
                        promoName: promo.name,
                        promoType: promo.promoType,
                        amount: finalDiscount.toNumber(),
                    });
                    await this.prisma.appliedPromotion.create({
                        data: {
                            tenantId,
                            orderId,
                            promotionId: promo.id,
                            promoName: promo.name,
                            promoType: promo.promoType,
                            discountAmount: finalDiscount,
                        },
                    });
                }
                if (!promo.stackable)
                    appliedNonStackable = true;
            }
        }
        await this.recalcOrderWithDiscount(orderId, totalDiscount);
        return {
            discounts,
            totalDiscount: totalDiscount.toNumber(),
        };
    }
    async applyCoupon(tenantId, orderId, couponCode) {
        const promo = await this.prisma.promotion.findFirst({
            where: {
                tenantId,
                couponCode: couponCode.toUpperCase(),
                isActive: true,
                promoType: 'coupon',
            },
        });
        if (!promo)
            throw new common_1.BadRequestException('Cupón no válido o expirado');
        const now = new Date();
        if (promo.endDate && now > promo.endDate)
            throw new common_1.BadRequestException('Cupón expirado');
        if (promo.maxUses !== null && promo.currentUses >= promo.maxUses)
            throw new common_1.BadRequestException('Cupón agotado');
        const alreadyApplied = await this.prisma.appliedPromotion.findFirst({
            where: { orderId, promotionId: promo.id },
        });
        if (alreadyApplied)
            throw new common_1.BadRequestException('Este cupón ya fue aplicado a la orden');
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: { items: { where: { isVoid: false }, include: { product: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Orden no encontrada');
        if (parseFloat(promo.minOrderAmount.toString()) > 0 &&
            parseFloat(order.subtotal.toString()) < parseFloat(promo.minOrderAmount.toString())) {
            throw new common_1.BadRequestException(`Monto mínimo: $${promo.minOrderAmount}`);
        }
        const result = this.calculateDiscount(promo, order.items);
        let finalDiscount = result.totalDiscount;
        if (promo.maxDiscountAmount) {
            const cap = new library_1.Decimal(promo.maxDiscountAmount.toString());
            if (finalDiscount.gt(cap))
                finalDiscount = cap;
        }
        if (finalDiscount.lte(0))
            throw new common_1.BadRequestException('El cupón no aplica a los productos de esta orden');
        for (const itemDiscount of result.itemDiscounts) {
            await this.prisma.orderItem.update({
                where: { id: itemDiscount.itemId },
                data: {
                    discountAmount: itemDiscount.discount,
                    discountReason: promo.name,
                    promotionId: promo.id,
                },
            });
        }
        await this.prisma.appliedPromotion.create({
            data: {
                tenantId,
                orderId,
                promotionId: promo.id,
                promoName: promo.name,
                promoType: promo.promoType,
                discountAmount: finalDiscount,
            },
        });
        await this.prisma.promotion.update({
            where: { id: promo.id },
            data: { currentUses: { increment: 1 } },
        });
        const currentDiscount = new library_1.Decimal(order.discountAmount.toString());
        await this.recalcOrderWithDiscount(orderId, currentDiscount.add(finalDiscount));
        return {
            promoName: promo.name,
            discountAmount: finalDiscount.toNumber(),
            couponCode: promo.couponCode,
        };
    }
    async removePromotion(tenantId, orderId, promotionId) {
        const applied = await this.prisma.appliedPromotion.findFirst({
            where: { orderId, promotionId, tenantId },
        });
        if (!applied)
            throw new common_1.NotFoundException('Promoción no aplicada a esta orden');
        await this.prisma.orderItem.updateMany({
            where: { orderId, promotionId },
            data: { discountAmount: 0, discountReason: null, promotionId: null },
        });
        await this.prisma.appliedPromotion.deleteMany({
            where: { orderId, promotionId },
        });
        const remaining = await this.prisma.appliedPromotion.findMany({ where: { orderId } });
        const totalDiscount = remaining.reduce((sum, r) => sum.add(new library_1.Decimal(r.discountAmount.toString())), new library_1.Decimal(0));
        await this.recalcOrderWithDiscount(orderId, totalDiscount);
        return { success: true, removedDiscount: parseFloat(applied.discountAmount.toString()) };
    }
    async getOrderPromotions(tenantId, orderId) {
        return this.prisma.appliedPromotion.findMany({
            where: { orderId, tenantId },
            include: { promotion: { select: { id: true, name: true, promoType: true, couponCode: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }
    calculateDiscount(promo, items) {
        const itemDiscounts = [];
        let totalDiscount = new library_1.Decimal(0);
        const eligibleItems = items.filter(item => {
            if (promo.scope === 'order')
                return true;
            if (promo.scope === 'product' && promo.productIds.length > 0) {
                return promo.productIds.includes(item.productId);
            }
            if (promo.scope === 'category' && promo.categoryIds.length > 0) {
                return promo.categoryIds.includes(item.product?.categoryId);
            }
            return true;
        });
        if (eligibleItems.length === 0)
            return { totalDiscount, itemDiscounts };
        switch (promo.promoType) {
            case 'percentage':
            case 'happy_hour': {
                const pct = new library_1.Decimal(promo.discountValue.toString()).div(100);
                for (const item of eligibleItems) {
                    const itemSubtotal = new library_1.Decimal(item.subtotal.toString());
                    const disc = itemSubtotal.mul(pct).toDecimalPlaces(2);
                    itemDiscounts.push({ itemId: item.id, discount: disc });
                    totalDiscount = totalDiscount.add(disc);
                }
                break;
            }
            case 'fixed_amount': {
                const fixedAmount = new library_1.Decimal(promo.discountValue.toString());
                if (promo.scope === 'order') {
                    const orderSubtotal = eligibleItems.reduce((sum, i) => sum.add(new library_1.Decimal(i.subtotal.toString())), new library_1.Decimal(0));
                    if (orderSubtotal.lte(0))
                        break;
                    let remaining = fixedAmount.gt(orderSubtotal) ? orderSubtotal : fixedAmount;
                    for (let idx = 0; idx < eligibleItems.length; idx++) {
                        const item = eligibleItems[idx];
                        const itemSubtotal = new library_1.Decimal(item.subtotal.toString());
                        const isLast = idx === eligibleItems.length - 1;
                        const proportion = itemSubtotal.div(orderSubtotal);
                        const disc = isLast ? remaining : fixedAmount.mul(proportion).toDecimalPlaces(2);
                        const actualDisc = disc.gt(remaining) ? remaining : disc;
                        itemDiscounts.push({ itemId: item.id, discount: actualDisc });
                        totalDiscount = totalDiscount.add(actualDisc);
                        remaining = remaining.sub(actualDisc);
                    }
                }
                else {
                    for (const item of eligibleItems) {
                        const itemSubtotal = new library_1.Decimal(item.subtotal.toString());
                        const disc = fixedAmount.gt(itemSubtotal) ? itemSubtotal : fixedAmount;
                        itemDiscounts.push({ itemId: item.id, discount: disc });
                        totalDiscount = totalDiscount.add(disc);
                    }
                }
                break;
            }
            case 'buy_x_get_y': {
                const buyQty = promo.buyQuantity || 2;
                const getQty = promo.getQuantity || 1;
                const totalQty = buyQty + getQty;
                const productQuantities = new Map();
                for (const item of eligibleItems) {
                    const key = item.productId;
                    const existing = productQuantities.get(key) || { items: [], totalQty: 0 };
                    existing.items.push(item);
                    existing.totalQty += parseFloat(item.quantity.toString());
                    productQuantities.set(key, existing);
                }
                for (const [, { items: productItems, totalQty: qty }] of productQuantities) {
                    const freeCount = Math.floor(qty / totalQty) * getQty;
                    if (freeCount <= 0)
                        continue;
                    const sorted = [...productItems].sort((a, b) => parseFloat(a.unitPrice.toString()) - parseFloat(b.unitPrice.toString()));
                    let toDiscount = freeCount;
                    for (const item of sorted) {
                        if (toDiscount <= 0)
                            break;
                        const itemQty = parseFloat(item.quantity.toString());
                        const discQty = Math.min(toDiscount, itemQty);
                        const disc = new library_1.Decimal(item.unitPrice.toString()).mul(discQty).toDecimalPlaces(2);
                        itemDiscounts.push({ itemId: item.id, discount: disc });
                        totalDiscount = totalDiscount.add(disc);
                        toDiscount -= discQty;
                    }
                }
                break;
            }
            case 'coupon': {
                const value = new library_1.Decimal(promo.discountValue.toString());
                if (value.lte(100)) {
                    const pct = value.div(100);
                    for (const item of eligibleItems) {
                        const itemSubtotal = new library_1.Decimal(item.subtotal.toString());
                        const disc = itemSubtotal.mul(pct).toDecimalPlaces(2);
                        itemDiscounts.push({ itemId: item.id, discount: disc });
                        totalDiscount = totalDiscount.add(disc);
                    }
                }
                else {
                    const orderSubtotal = eligibleItems.reduce((sum, i) => sum.add(new library_1.Decimal(i.subtotal.toString())), new library_1.Decimal(0));
                    totalDiscount = value.gt(orderSubtotal) ? orderSubtotal : value;
                }
                break;
            }
        }
        return { totalDiscount, itemDiscounts };
    }
    async recalcOrderWithDiscount(orderId, totalDiscount) {
        const items = await this.prisma.orderItem.findMany({
            where: { orderId, isVoid: false },
        });
        const subtotal = items.reduce((s, i) => s.add(new library_1.Decimal(i.subtotal.toString())), new library_1.Decimal(0));
        const taxAmount = items.reduce((s, i) => s.add(new library_1.Decimal(i.taxAmount.toString())), new library_1.Decimal(0));
        const total = subtotal.add(taxAmount).sub(totalDiscount);
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                subtotal,
                taxAmount,
                discountAmount: totalDiscount,
                total: total.lt(0) ? new library_1.Decimal(0) : total,
            },
        });
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map