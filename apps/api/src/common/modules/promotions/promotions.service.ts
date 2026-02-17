import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreatePromotionDto, UpdatePromotionDto, PromotionQueryDto } from './dto/promotions.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════

  async findAll(tenantId: string, query: PromotionQueryDto) {
    const { status, promoType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;
    if (promoType) where.promoType = promoType;

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

  async findById(tenantId: string, id: string) {
    const promo = await this.prisma.promotion.findFirst({
      where: { id, tenantId },
      include: {
        appliedPromotions: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!promo) throw new NotFoundException('Promoción no encontrada');
    return promo;
  }

  async create(tenantId: string, dto: CreatePromotionDto) {
    // Validate coupon code uniqueness
    if (dto.couponCode) {
      const existing = await this.prisma.promotion.findFirst({
        where: { tenantId, couponCode: dto.couponCode.toUpperCase() },
      });
      if (existing) throw new BadRequestException('Ya existe una promoción con ese código de cupón');
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

  async update(tenantId: string, id: string, dto: UpdatePromotionDto) {
    await this.findById(tenantId, id);

    if (dto.couponCode) {
      const existing = await this.prisma.promotion.findFirst({
        where: { tenantId, couponCode: dto.couponCode.toUpperCase(), NOT: { id } },
      });
      if (existing) throw new BadRequestException('Ya existe otra promoción con ese código de cupón');
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

  async toggleActive(tenantId: string, id: string) {
    const promo = await this.findById(tenantId, id);
    return this.prisma.promotion.update({
      where: { id },
      data: { isActive: !promo.isActive },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.promotion.delete({ where: { id } });
    return { success: true };
  }

  // ═══════════════════════════════════════
  // DISCOUNT ENGINE
  // ═══════════════════════════════════════

  /**
   * Get all active promotions that could apply to an order.
   * Called when recalculating order totals.
   */
  async getApplicablePromotions(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          where: { isVoid: false },
          include: { product: { select: { id: true, categoryId: true, price: true } } },
        },
      },
    });
    if (!order) return [];

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

    // Filter by schedule
    return promotions.filter(p => {
      // Day of week check
      if (p.daysOfWeek.length > 0 && !p.daysOfWeek.includes(dayOfWeek)) return false;

      // Time range check (for happy hour)
      if (p.startTime && p.endTime) {
        if (currentTime < p.startTime || currentTime > p.endTime) return false;
      }

      // Max uses check
      if (p.maxUses !== null && p.currentUses >= p.maxUses) return false;

      // Min order amount check
      const orderSubtotal = parseFloat(order.subtotal.toString());
      if (parseFloat(p.minOrderAmount.toString()) > 0 && orderSubtotal < parseFloat(p.minOrderAmount.toString())) return false;

      return true;
    });
  }

  /**
   * Apply promotions to an order and return the discount breakdown.
   * This recalculates all discounts from scratch.
   */
  async applyPromotionsToOrder(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          where: { isVoid: false },
          include: { product: { select: { id: true, categoryId: true, price: true, name: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    // Clear existing applied promotions
    await this.prisma.appliedPromotion.deleteMany({ where: { orderId } });

    // Reset item discounts
    await this.prisma.orderItem.updateMany({
      where: { orderId, isVoid: false },
      data: { discountAmount: 0, discountReason: null, promotionId: null },
    });

    const applicablePromos = await this.getApplicablePromotions(tenantId, orderId);
    if (applicablePromos.length === 0) {
      await this.recalcOrderWithDiscount(orderId, new Decimal(0));
      return { discounts: [], totalDiscount: 0 };
    }

    const discounts: { promotionId: string; promoName: string; promoType: string; amount: number; itemId?: string }[] = [];
    let totalDiscount = new Decimal(0);
    let appliedNonStackable = false;

    for (const promo of applicablePromos) {
      if (appliedNonStackable && !promo.stackable) continue;

      const result = this.calculateDiscount(promo, order.items);

      if (result.totalDiscount.gt(0)) {
        // Apply max discount cap
        let finalDiscount = result.totalDiscount;
        if (promo.maxDiscountAmount) {
          const cap = new Decimal(promo.maxDiscountAmount.toString());
          if (finalDiscount.gt(cap)) finalDiscount = cap;
        }

        totalDiscount = totalDiscount.add(finalDiscount);

        // Record applied promotion
        for (const itemDiscount of result.itemDiscounts) {
          discounts.push({
            promotionId: promo.id,
            promoName: promo.name,
            promoType: promo.promoType,
            amount: itemDiscount.discount.toNumber(),
            itemId: itemDiscount.itemId,
          });

          // Update item discount
          await this.prisma.orderItem.update({
            where: { id: itemDiscount.itemId },
            data: {
              discountAmount: itemDiscount.discount,
              discountReason: promo.name,
              promotionId: promo.id,
            },
          });

          // Create applied promotion record
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

        // For order-level discounts without specific items
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

        if (!promo.stackable) appliedNonStackable = true;
      }
    }

    // Update order totals with discount
    await this.recalcOrderWithDiscount(orderId, totalDiscount);

    return {
      discounts,
      totalDiscount: totalDiscount.toNumber(),
    };
  }

  /**
   * Apply a coupon code to an order
   */
  async applyCoupon(tenantId: string, orderId: string, couponCode: string) {
    const promo = await this.prisma.promotion.findFirst({
      where: {
        tenantId,
        couponCode: couponCode.toUpperCase(),
        isActive: true,
        promoType: 'coupon',
      },
    });

    if (!promo) throw new BadRequestException('Cupón no válido o expirado');

    const now = new Date();
    if (promo.endDate && now > promo.endDate) throw new BadRequestException('Cupón expirado');
    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) throw new BadRequestException('Cupón agotado');

    // Check if already applied to this order
    const alreadyApplied = await this.prisma.appliedPromotion.findFirst({
      where: { orderId, promotionId: promo.id },
    });
    if (alreadyApplied) throw new BadRequestException('Este cupón ya fue aplicado a la orden');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: { where: { isVoid: false }, include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    // Check min order amount
    if (parseFloat(promo.minOrderAmount.toString()) > 0 &&
        parseFloat(order.subtotal.toString()) < parseFloat(promo.minOrderAmount.toString())) {
      throw new BadRequestException(`Monto mínimo: $${promo.minOrderAmount}`);
    }

    const result = this.calculateDiscount(promo, order.items);
    let finalDiscount = result.totalDiscount;
    if (promo.maxDiscountAmount) {
      const cap = new Decimal(promo.maxDiscountAmount.toString());
      if (finalDiscount.gt(cap)) finalDiscount = cap;
    }

    if (finalDiscount.lte(0)) throw new BadRequestException('El cupón no aplica a los productos de esta orden');

    // Apply item-level discounts
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

    // Record
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

    // Increment usage
    await this.prisma.promotion.update({
      where: { id: promo.id },
      data: { currentUses: { increment: 1 } },
    });

    // Recalc order
    const currentDiscount = new Decimal(order.discountAmount.toString());
    await this.recalcOrderWithDiscount(orderId, currentDiscount.add(finalDiscount));

    return {
      promoName: promo.name,
      discountAmount: finalDiscount.toNumber(),
      couponCode: promo.couponCode,
    };
  }

  /**
   * Remove a specific promotion from an order
   */
  async removePromotion(tenantId: string, orderId: string, promotionId: string) {
    const applied = await this.prisma.appliedPromotion.findFirst({
      where: { orderId, promotionId, tenantId },
    });
    if (!applied) throw new NotFoundException('Promoción no aplicada a esta orden');

    // Remove item-level discounts
    await this.prisma.orderItem.updateMany({
      where: { orderId, promotionId },
      data: { discountAmount: 0, discountReason: null, promotionId: null },
    });

    await this.prisma.appliedPromotion.deleteMany({
      where: { orderId, promotionId },
    });

    // Recalculate remaining discounts
    const remaining = await this.prisma.appliedPromotion.findMany({ where: { orderId } });
    const totalDiscount = remaining.reduce(
      (sum, r) => sum.add(new Decimal(r.discountAmount.toString())),
      new Decimal(0),
    );
    await this.recalcOrderWithDiscount(orderId, totalDiscount);

    return { success: true, removedDiscount: parseFloat(applied.discountAmount.toString()) };
  }

  /**
   * Get promotions applied to an order
   */
  async getOrderPromotions(tenantId: string, orderId: string) {
    return this.prisma.appliedPromotion.findMany({
      where: { orderId, tenantId },
      include: { promotion: { select: { id: true, name: true, promoType: true, couponCode: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ═══════════════════════════════════════
  // DISCOUNT CALCULATION ENGINE
  // ═══════════════════════════════════════

  private calculateDiscount(
    promo: any,
    items: any[],
  ): { totalDiscount: Decimal; itemDiscounts: { itemId: string; discount: Decimal }[] } {
    const itemDiscounts: { itemId: string; discount: Decimal }[] = [];
    let totalDiscount = new Decimal(0);

    // Filter items by scope
    const eligibleItems = items.filter(item => {
      if (promo.scope === 'order') return true;
      if (promo.scope === 'product' && promo.productIds.length > 0) {
        return promo.productIds.includes(item.productId);
      }
      if (promo.scope === 'category' && promo.categoryIds.length > 0) {
        return promo.categoryIds.includes(item.product?.categoryId);
      }
      return true;
    });

    if (eligibleItems.length === 0) return { totalDiscount, itemDiscounts };

    switch (promo.promoType) {
      case 'percentage':
      case 'happy_hour': {
        const pct = new Decimal(promo.discountValue.toString()).div(100);
        for (const item of eligibleItems) {
          const itemSubtotal = new Decimal(item.subtotal.toString());
          const disc = itemSubtotal.mul(pct).toDecimalPlaces(2);
          itemDiscounts.push({ itemId: item.id, discount: disc });
          totalDiscount = totalDiscount.add(disc);
        }
        break;
      }

      case 'fixed_amount': {
        const fixedAmount = new Decimal(promo.discountValue.toString());
        if (promo.scope === 'order') {
          // Distribute fixed discount proportionally across items
          const orderSubtotal = eligibleItems.reduce(
            (sum, i) => sum.add(new Decimal(i.subtotal.toString())),
            new Decimal(0),
          );
          if (orderSubtotal.lte(0)) break;

          let remaining = fixedAmount.gt(orderSubtotal) ? orderSubtotal : fixedAmount;
          for (let idx = 0; idx < eligibleItems.length; idx++) {
            const item = eligibleItems[idx];
            const itemSubtotal = new Decimal(item.subtotal.toString());
            const isLast = idx === eligibleItems.length - 1;
            const proportion = itemSubtotal.div(orderSubtotal);
            const disc = isLast ? remaining : fixedAmount.mul(proportion).toDecimalPlaces(2);
            const actualDisc = disc.gt(remaining) ? remaining : disc;
            itemDiscounts.push({ itemId: item.id, discount: actualDisc });
            totalDiscount = totalDiscount.add(actualDisc);
            remaining = remaining.sub(actualDisc);
          }
        } else {
          // Fixed amount per eligible item
          for (const item of eligibleItems) {
            const itemSubtotal = new Decimal(item.subtotal.toString());
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

        // Group by product and count quantities
        const productQuantities = new Map<string, { items: any[]; totalQty: number }>();
        for (const item of eligibleItems) {
          const key = item.productId;
          const existing = productQuantities.get(key) || { items: [], totalQty: 0 };
          existing.items.push(item);
          existing.totalQty += parseFloat(item.quantity.toString());
          productQuantities.set(key, existing);
        }

        for (const [, { items: productItems, totalQty: qty }] of productQuantities) {
          const freeCount = Math.floor(qty / totalQty) * getQty;
          if (freeCount <= 0) continue;

          // Discount the cheapest items
          const sorted = [...productItems].sort(
            (a, b) => parseFloat(a.unitPrice.toString()) - parseFloat(b.unitPrice.toString()),
          );

          let toDiscount = freeCount;
          for (const item of sorted) {
            if (toDiscount <= 0) break;
            const itemQty = parseFloat(item.quantity.toString());
            const discQty = Math.min(toDiscount, itemQty);
            const disc = new Decimal(item.unitPrice.toString()).mul(discQty).toDecimalPlaces(2);
            itemDiscounts.push({ itemId: item.id, discount: disc });
            totalDiscount = totalDiscount.add(disc);
            toDiscount -= discQty;
          }
        }
        break;
      }

      case 'coupon': {
        // Coupons behave like percentage or fixed based on discountValue
        // If discountValue <= 100 and scope suggests percentage, treat as percentage
        // Otherwise treat as fixed. We'll check: if value <= 100 treat as %
        const value = new Decimal(promo.discountValue.toString());
        if (value.lte(100)) {
          // Percentage
          const pct = value.div(100);
          for (const item of eligibleItems) {
            const itemSubtotal = new Decimal(item.subtotal.toString());
            const disc = itemSubtotal.mul(pct).toDecimalPlaces(2);
            itemDiscounts.push({ itemId: item.id, discount: disc });
            totalDiscount = totalDiscount.add(disc);
          }
        } else {
          // Fixed
          const orderSubtotal = eligibleItems.reduce(
            (sum, i) => sum.add(new Decimal(i.subtotal.toString())),
            new Decimal(0),
          );
          totalDiscount = value.gt(orderSubtotal) ? orderSubtotal : value;
        }
        break;
      }
    }

    return { totalDiscount, itemDiscounts };
  }

  // ═══════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════

  private async recalcOrderWithDiscount(orderId: string, totalDiscount: Decimal) {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId, isVoid: false },
    });

    const subtotal = items.reduce((s, i) => s.add(new Decimal(i.subtotal.toString())), new Decimal(0));
    const taxAmount = items.reduce((s, i) => s.add(new Decimal(i.taxAmount.toString())), new Decimal(0));
    const total = subtotal.add(taxAmount).sub(totalDiscount);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        taxAmount,
        discountAmount: totalDiscount,
        total: total.lt(0) ? new Decimal(0) : total,
      },
    });
  }
}
