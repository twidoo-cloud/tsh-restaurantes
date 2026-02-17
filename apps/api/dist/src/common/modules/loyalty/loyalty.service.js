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
exports.LoyaltyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let LoyaltyService = class LoyaltyService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enrollCustomer(tenantId, dto) {
        const settings = await this.getOrCreateSettings(tenantId);
        const customer = await this.prisma.customer.findFirst({
            where: { id: dto.customerId, tenantId },
        });
        if (!customer)
            throw new common_1.NotFoundException('Cliente no encontrado');
        const updates = { enrolled_at: new Date() };
        if (dto.birthday)
            updates.birthday = dto.birthday;
        await this.prisma.$queryRawUnsafe(`
      UPDATE customers SET enrolled_at = NOW()
        ${dto.birthday ? `, birthday = '${dto.birthday}'::date` : ''}
      WHERE id = '${dto.customerId}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        if (settings.welcome_bonus > 0) {
            await this.addPoints(tenantId, dto.customerId, settings.welcome_bonus, 'bonus', 'Bono de bienvenida');
        }
        return this.getCustomerLoyalty(tenantId, dto.customerId);
    }
    async earnPoints(tenantId, dto) {
        const settings = await this.getOrCreateSettings(tenantId);
        if (!settings.is_enabled)
            throw new common_1.BadRequestException('Programa de fidelidad no activo');
        if (dto.orderTotal < parseFloat(settings.min_purchase_for_points || '0')) {
            return { pointsEarned: 0, message: 'Compra mínima no alcanzada' };
        }
        const customer = await this.prisma.$queryRawUnsafe(`SELECT loyalty_tier, loyalty_points FROM customers WHERE id = '${dto.customerId}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        if (!customer.length)
            throw new common_1.NotFoundException('Cliente no encontrado');
        const tiers = await this.prisma.$queryRawUnsafe(`SELECT points_multiplier FROM loyalty_tiers WHERE tenant_id = '${tenantId}'::uuid AND slug = '${customer[0].loyalty_tier}' LIMIT 1`);
        const multiplier = tiers.length ? parseFloat(tiers[0].points_multiplier) : 1;
        const basePoints = Math.floor(dto.orderTotal * parseFloat(settings.points_per_dollar));
        const totalPoints = Math.floor(basePoints * multiplier);
        if (totalPoints > 0) {
            await this.addPoints(tenantId, dto.customerId, totalPoints, 'earn', `Compra #${dto.orderId.slice(-8)}`, dto.orderId);
            await this.prisma.$queryRawUnsafe(`
        UPDATE customers SET
          lifetime_spending = COALESCE(lifetime_spending, 0) + ${dto.orderTotal},
          visit_count = COALESCE(visit_count, 0) + 1,
          last_visit_at = NOW()
        WHERE id = '${dto.customerId}'::uuid AND tenant_id = '${tenantId}'::uuid
      `);
            await this.checkTierUpgrade(tenantId, dto.customerId);
        }
        return { pointsEarned: totalPoints, multiplier, balance: customer[0].loyalty_points + totalPoints };
    }
    async redeemReward(tenantId, dto) {
        const settings = await this.getOrCreateSettings(tenantId);
        if (!settings.is_enabled)
            throw new common_1.BadRequestException('Programa de fidelidad no activo');
        const rewards = await this.prisma.$queryRawUnsafe(`SELECT * FROM loyalty_rewards WHERE id = '${dto.rewardId}'::uuid AND tenant_id = '${tenantId}'::uuid AND is_active = true`);
        if (!rewards.length)
            throw new common_1.NotFoundException('Recompensa no encontrada');
        const reward = rewards[0];
        if (reward.max_redemptions && reward.current_redemptions >= reward.max_redemptions) {
            throw new common_1.BadRequestException('Recompensa agotada');
        }
        const customers = await this.prisma.$queryRawUnsafe(`SELECT loyalty_points, loyalty_tier FROM customers WHERE id = '${dto.customerId}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        if (!customers.length)
            throw new common_1.NotFoundException('Cliente no encontrado');
        const customer = customers[0];
        const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        if (reward.min_tier && tierOrder.indexOf(customer.loyalty_tier) < tierOrder.indexOf(reward.min_tier)) {
            throw new common_1.BadRequestException(`Requiere nivel ${reward.min_tier}`);
        }
        if (customer.loyalty_points < reward.points_cost) {
            throw new common_1.BadRequestException(`Necesitas ${reward.points_cost} puntos (tienes ${customer.loyalty_points})`);
        }
        await this.addPoints(tenantId, dto.customerId, -reward.points_cost, 'redeem', `Canje: ${reward.name}`, dto.orderId);
        await this.prisma.$queryRawUnsafe(`
      UPDATE loyalty_rewards SET current_redemptions = current_redemptions + 1 WHERE id = '${dto.rewardId}'::uuid
    `);
        return {
            reward: reward.name,
            pointsUsed: reward.points_cost,
            rewardType: reward.reward_type,
            rewardValue: parseFloat(reward.reward_value) || 0,
            productId: reward.product_id,
            balance: customer.loyalty_points - reward.points_cost,
        };
    }
    async adjustPoints(tenantId, dto, userId) {
        const type = dto.points > 0 ? 'bonus' : 'adjustment';
        await this.addPoints(tenantId, dto.customerId, dto.points, type, dto.description);
        return this.getCustomerLoyalty(tenantId, dto.customerId);
    }
    async getCustomerLoyalty(tenantId, customerId) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT id, name, phone, email, loyalty_points, loyalty_tier,
        total_points_earned, total_points_redeemed, lifetime_spending,
        visit_count, last_visit_at, birthday, enrolled_at
      FROM customers WHERE id = '${customerId}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        if (!rows.length)
            throw new common_1.NotFoundException('Cliente no encontrado');
        const tiers = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM loyalty_tiers WHERE tenant_id = '${tenantId}'::uuid ORDER BY min_points ASC
    `);
        const currentTierIdx = tiers.findIndex(t => t.slug === rows[0].loyalty_tier);
        const nextTier = currentTierIdx < tiers.length - 1 ? tiers[currentTierIdx + 1] : null;
        const txns = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM loyalty_transactions
      WHERE customer_id = '${customerId}'::uuid AND tenant_id = '${tenantId}'::uuid
      ORDER BY created_at DESC LIMIT 10
    `);
        return {
            ...rows[0],
            currentTier: tiers[currentTierIdx] || null,
            nextTier,
            pointsToNextTier: nextTier ? nextTier.min_points - (rows[0].total_points_earned || 0) : 0,
            recentTransactions: txns,
        };
    }
    async getLeaderboard(tenantId, limit = 20) {
        return this.prisma.$queryRawUnsafe(`
      SELECT id, name, phone, loyalty_points, loyalty_tier, total_points_earned,
        visit_count, lifetime_spending
      FROM customers
      WHERE tenant_id = '${tenantId}'::uuid AND enrolled_at IS NOT NULL
      ORDER BY total_points_earned DESC
      LIMIT ${limit}
    `);
    }
    async getTransactions(tenantId, query) {
        const { customerId, type, page = 1, limit = 50 } = query;
        const offset = (page - 1) * limit;
        let where = `WHERE lt.tenant_id = '${tenantId}'::uuid`;
        if (customerId)
            where += ` AND lt.customer_id = '${customerId}'::uuid`;
        if (type)
            where += ` AND lt.type = '${type}'`;
        const data = await this.prisma.$queryRawUnsafe(`
      SELECT lt.*, c.name as customer_name
      FROM loyalty_transactions lt
      JOIN customers c ON c.id = lt.customer_id
      ${where}
      ORDER BY lt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
        const countResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total FROM loyalty_transactions lt ${where}`);
        return { data, total: countResult[0]?.total || 0, page, limit };
    }
    async getDashboard(tenantId) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE enrolled_at IS NOT NULL)::int as enrolled_customers,
        COALESCE(SUM(loyalty_points), 0)::int as total_active_points,
        COALESCE(SUM(total_points_earned), 0)::int as total_points_issued,
        COALESCE(SUM(total_points_redeemed), 0)::int as total_points_redeemed,
        COALESCE(AVG(visit_count) FILTER (WHERE enrolled_at IS NOT NULL), 0)::int as avg_visits,
        COUNT(*) FILTER (WHERE last_visit_at >= NOW() - INTERVAL '30 days')::int as active_30d
      FROM customers WHERE tenant_id = '${tenantId}'::uuid
    `);
        const tierDist = await this.prisma.$queryRawUnsafe(`
      SELECT loyalty_tier, COUNT(*)::int as count
      FROM customers WHERE tenant_id = '${tenantId}'::uuid AND enrolled_at IS NOT NULL
      GROUP BY loyalty_tier
    `);
        return { ...rows[0], tierDistribution: tierDist };
    }
    async getRewards(tenantId) {
        return this.prisma.$queryRawUnsafe(`SELECT r.*, p.name as product_name FROM loyalty_rewards r LEFT JOIN products p ON p.id = r.product_id
       WHERE r.tenant_id = '${tenantId}'::uuid ORDER BY r.display_order, r.points_cost`);
    }
    async createReward(tenantId, dto) {
        const rows = await this.prisma.$queryRawUnsafe(`
      INSERT INTO loyalty_rewards (tenant_id, name, description, points_cost, reward_type, reward_value, product_id, min_tier, max_redemptions)
      VALUES ('${tenantId}'::uuid, '${dto.name.replace(/'/g, "''")}',
        ${dto.description ? `'${dto.description.replace(/'/g, "''")}'` : 'NULL'},
        ${dto.pointsCost}, '${dto.rewardType}', ${dto.rewardValue || 0},
        ${dto.productId ? `'${dto.productId}'::uuid` : 'NULL'},
        '${dto.minTier || 'bronze'}', ${dto.maxRedemptions || 'NULL'})
      RETURNING *
    `);
        return rows[0];
    }
    async updateReward(tenantId, id, dto) {
        const sets = [];
        if (dto.name)
            sets.push(`name = '${dto.name.replace(/'/g, "''")}'`);
        if (dto.description !== undefined)
            sets.push(`description = ${dto.description ? `'${dto.description.replace(/'/g, "''")}'` : 'NULL'}`);
        if (dto.pointsCost)
            sets.push(`points_cost = ${dto.pointsCost}`);
        if (dto.rewardType)
            sets.push(`reward_type = '${dto.rewardType}'`);
        if (dto.rewardValue !== undefined)
            sets.push(`reward_value = ${dto.rewardValue}`);
        if (dto.productId !== undefined)
            sets.push(`product_id = ${dto.productId ? `'${dto.productId}'::uuid` : 'NULL'}`);
        if (dto.minTier)
            sets.push(`min_tier = '${dto.minTier}'`);
        if (dto.maxRedemptions !== undefined)
            sets.push(`max_redemptions = ${dto.maxRedemptions || 'NULL'}`);
        if (dto.isActive !== undefined)
            sets.push(`is_active = ${dto.isActive}`);
        sets.push(`updated_at = NOW()`);
        await this.prisma.$queryRawUnsafe(`
      UPDATE loyalty_rewards SET ${sets.join(', ')} WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM loyalty_rewards WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        return rows[0];
    }
    async deleteReward(tenantId, id) {
        await this.prisma.$queryRawUnsafe(`DELETE FROM loyalty_rewards WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        return { success: true };
    }
    async getTiers(tenantId) {
        const tiers = await this.prisma.$queryRawUnsafe(`SELECT * FROM loyalty_tiers WHERE tenant_id = '${tenantId}'::uuid ORDER BY min_points ASC`);
        if (!tiers.length)
            return this.createDefaultTiers(tenantId);
        return tiers;
    }
    async createDefaultTiers(tenantId) {
        const defaults = [
            { name: 'Bronce', slug: 'bronze', min_points: 0, multiplier: 1.0, color: '#CD7F32' },
            { name: 'Plata', slug: 'silver', min_points: 500, multiplier: 1.25, color: '#C0C0C0' },
            { name: 'Oro', slug: 'gold', min_points: 2000, multiplier: 1.5, color: '#FFD700' },
            { name: 'Platino', slug: 'platinum', min_points: 5000, multiplier: 2.0, color: '#E5E4E2' },
        ];
        for (let i = 0; i < defaults.length; i++) {
            const d = defaults[i];
            await this.prisma.$queryRawUnsafe(`
        INSERT INTO loyalty_tiers (tenant_id, name, slug, min_points, points_multiplier, color, display_order)
        VALUES ('${tenantId}'::uuid, '${d.name}', '${d.slug}', ${d.min_points}, ${d.multiplier}, '${d.color}', ${i})
      `);
        }
        return this.getTiers(tenantId);
    }
    async getOrCreateSettings(tenantId) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM loyalty_settings WHERE tenant_id = '${tenantId}'::uuid`);
        if (rows.length)
            return rows[0];
        const created = await this.prisma.$queryRawUnsafe(`INSERT INTO loyalty_settings (tenant_id) VALUES ('${tenantId}'::uuid) RETURNING *`);
        return created[0];
    }
    async updateSettings(tenantId, dto) {
        await this.getOrCreateSettings(tenantId);
        const sets = [];
        if (dto.isEnabled !== undefined)
            sets.push(`is_enabled = ${dto.isEnabled}`);
        if (dto.pointsPerDollar !== undefined)
            sets.push(`points_per_dollar = ${dto.pointsPerDollar}`);
        if (dto.minPurchaseForPoints !== undefined)
            sets.push(`min_purchase_for_points = ${dto.minPurchaseForPoints}`);
        if (dto.pointsExpiryDays !== undefined)
            sets.push(`points_expiry_days = ${dto.pointsExpiryDays}`);
        if (dto.welcomeBonus !== undefined)
            sets.push(`welcome_bonus = ${dto.welcomeBonus}`);
        if (dto.birthdayBonus !== undefined)
            sets.push(`birthday_bonus = ${dto.birthdayBonus}`);
        if (dto.referralBonus !== undefined)
            sets.push(`referral_bonus = ${dto.referralBonus}`);
        if (dto.allowPartialRedemption !== undefined)
            sets.push(`allow_partial_redemption = ${dto.allowPartialRedemption}`);
        if (dto.minPointsToRedeem !== undefined)
            sets.push(`min_points_to_redeem = ${dto.minPointsToRedeem}`);
        sets.push(`updated_at = NOW()`);
        await this.prisma.$queryRawUnsafe(`UPDATE loyalty_settings SET ${sets.join(', ')} WHERE tenant_id = '${tenantId}'::uuid`);
        return this.getOrCreateSettings(tenantId);
    }
    async addPoints(tenantId, customerId, points, type, description, orderId) {
        await this.prisma.$queryRawUnsafe(`
      UPDATE customers SET
        loyalty_points = GREATEST(loyalty_points + ${points}, 0),
        total_points_earned = total_points_earned + ${points > 0 ? points : 0},
        total_points_redeemed = total_points_redeemed + ${points < 0 ? Math.abs(points) : 0}
      WHERE id = '${customerId}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        const bal = await this.prisma.$queryRawUnsafe(`SELECT loyalty_points FROM customers WHERE id = '${customerId}'::uuid`);
        await this.prisma.$queryRawUnsafe(`
      INSERT INTO loyalty_transactions (tenant_id, customer_id, order_id, type, points, balance_after, description)
      VALUES ('${tenantId}'::uuid, '${customerId}'::uuid, ${orderId ? `'${orderId}'::uuid` : 'NULL'},
        '${type}', ${points}, ${bal[0]?.loyalty_points || 0}, '${description.replace(/'/g, "''")}')
    `);
    }
    async checkTierUpgrade(tenantId, customerId) {
        const customer = await this.prisma.$queryRawUnsafe(`SELECT total_points_earned, loyalty_tier FROM customers WHERE id = '${customerId}'::uuid AND tenant_id = '${tenantId}'::uuid`);
        if (!customer.length)
            return;
        const tiers = await this.prisma.$queryRawUnsafe(`SELECT * FROM loyalty_tiers WHERE tenant_id = '${tenantId}'::uuid ORDER BY min_points DESC`);
        const totalEarned = customer[0].total_points_earned || 0;
        for (const tier of tiers) {
            if (totalEarned >= tier.min_points) {
                if (tier.slug !== customer[0].loyalty_tier) {
                    await this.prisma.$queryRawUnsafe(`UPDATE customers SET loyalty_tier = '${tier.slug}' WHERE id = '${customerId}'::uuid AND tenant_id = '${tenantId}'::uuid`);
                }
                break;
            }
        }
    }
};
exports.LoyaltyService = LoyaltyService;
exports.LoyaltyService = LoyaltyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LoyaltyService);
//# sourceMappingURL=loyalty.service.js.map