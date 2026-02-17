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
exports.CreditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let CreditService = class CreditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard(tenantId) {
        const [accounts, totals, recentPayments] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active')::int as active_accounts,
          COUNT(*) FILTER (WHERE status = 'suspended')::int as suspended_accounts,
          COUNT(*) FILTER (WHERE balance > 0)::int as accounts_with_balance,
          COALESCE(SUM(balance) FILTER (WHERE status = 'active'), 0)::float as total_receivable,
          COALESCE(SUM(credit_limit) FILTER (WHERE status = 'active'), 0)::float as total_credit_limit,
          COALESCE(SUM(balance) FILTER (WHERE balance > credit_limit AND status = 'active'), 0)::float as over_limit_amount,
          COUNT(*) FILTER (WHERE balance > credit_limit AND status = 'active')::int as over_limit_count
        FROM credit_accounts WHERE tenant_id = ${tenantId}::uuid
      `,
            this.prisma.$queryRaw `
        SELECT 
          type,
          COUNT(*)::int as count,
          COALESCE(SUM(ABS(amount)), 0)::float as total
        FROM credit_transactions 
        WHERE tenant_id = ${tenantId}::uuid 
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY type
      `,
            this.prisma.$queryRaw `
        SELECT ct.*, ca.customer_id,
          c.name as customer_name
        FROM credit_transactions ct
        JOIN credit_accounts ca ON ct.credit_account_id = ca.id
        JOIN customers c ON ca.customer_id = c.id
        WHERE ct.tenant_id = ${tenantId}::uuid AND ct.type = 'payment'
        ORDER BY ct.created_at DESC LIMIT 10
      `,
        ]);
        return {
            summary: accounts[0] || {},
            last30Days: totals,
            recentPayments,
        };
    }
    async listAccounts(tenantId, filters) {
        const conditions = [`ca.tenant_id = '${tenantId}'`];
        if (filters.status)
            conditions.push(`ca.status = '${filters.status}'`);
        if (filters.overdue)
            conditions.push(`ca.balance > ca.credit_limit`);
        if (filters.search) {
            const s = filters.search.replace(/'/g, "''");
            conditions.push(`(c.name ILIKE '%${s}%' OR c.phone ILIKE '%${s}%' OR c.tax_id ILIKE '%${s}%')`);
        }
        const where = conditions.join(' AND ');
        const accounts = await this.prisma.$queryRawUnsafe(`
      SELECT ca.*, 
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        c.tax_id as customer_tax_id,
        (SELECT MAX(created_at) FROM credit_transactions WHERE credit_account_id = ca.id AND type = 'payment') as last_payment_at,
        (SELECT MAX(created_at) FROM credit_transactions WHERE credit_account_id = ca.id AND type = 'charge') as last_charge_at,
        (SELECT COUNT(*)::int FROM credit_transactions WHERE credit_account_id = ca.id) as transaction_count
      FROM credit_accounts ca
      JOIN customers c ON ca.customer_id = c.id
      WHERE ${where}
      ORDER BY ca.balance DESC, c.name ASC
    `);
        return accounts;
    }
    async getAccount(tenantId, id) {
        const accounts = await this.prisma.$queryRaw `
      SELECT ca.*, 
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        c.tax_id as customer_tax_id, c.address as customer_address
      FROM credit_accounts ca
      JOIN customers c ON ca.customer_id = c.id
      WHERE ca.id = ${id}::uuid AND ca.tenant_id = ${tenantId}::uuid
    `;
        if (!accounts.length)
            throw new common_1.NotFoundException('Cuenta no encontrada');
        const transactions = await this.prisma.$queryRaw `
      SELECT ct.*, u.first_name || ' ' || u.last_name as processed_by_name,
        o.order_number
      FROM credit_transactions ct
      LEFT JOIN users u ON ct.processed_by = u.id
      LEFT JOIN orders o ON ct.order_id = o.id
      WHERE ct.credit_account_id = ${id}::uuid
      ORDER BY ct.created_at DESC
      LIMIT 50
    `;
        return { ...accounts[0], transactions };
    }
    async getByCustomer(tenantId, customerId) {
        const accounts = await this.prisma.$queryRaw `
      SELECT ca.* FROM credit_accounts ca
      WHERE ca.tenant_id = ${tenantId}::uuid AND ca.customer_id = ${customerId}::uuid
    `;
        return accounts[0] || null;
    }
    async createAccount(tenantId, dto) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: dto.customerId, tenantId },
        });
        if (!customer)
            throw new common_1.NotFoundException('Cliente no encontrado');
        const existing = await this.prisma.$queryRaw `
      SELECT id FROM credit_accounts 
      WHERE tenant_id = ${tenantId}::uuid AND customer_id = ${dto.customerId}::uuid
    `;
        if (existing.length)
            throw new common_1.BadRequestException('El cliente ya tiene una cuenta de crédito');
        const result = await this.prisma.$queryRaw `
      INSERT INTO credit_accounts (tenant_id, customer_id, credit_limit, notes)
      VALUES (${tenantId}::uuid, ${dto.customerId}::uuid, ${dto.creditLimit}, ${dto.notes || null})
      RETURNING *
    `;
        return result[0];
    }
    async updateAccount(tenantId, id, dto) {
        const sets = [`updated_at = now()`];
        if (dto.creditLimit !== undefined)
            sets.push(`credit_limit = ${dto.creditLimit}`);
        if (dto.status)
            sets.push(`status = '${dto.status}'`);
        if (dto.notes !== undefined)
            sets.push(`notes = '${(dto.notes || '').replace(/'/g, "''")}'`);
        const result = await this.prisma.$queryRawUnsafe(`
      UPDATE credit_accounts SET ${sets.join(', ')}
      WHERE id = '${id}' AND tenant_id = '${tenantId}'
      RETURNING *
    `);
        if (!result.length)
            throw new common_1.NotFoundException('Cuenta no encontrada');
        return result[0];
    }
    async recordCharge(tenantId, accountId, dto, userId) {
        return this.prisma.$transaction(async (tx) => {
            const accounts = await tx.$queryRaw `
        SELECT * FROM credit_accounts WHERE id = ${accountId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE
      `;
            if (!accounts.length)
                throw new common_1.NotFoundException('Cuenta no encontrada');
            const account = accounts[0];
            if (account.status !== 'active')
                throw new common_1.BadRequestException('La cuenta no está activa');
            const newBalance = parseFloat(account.balance) + dto.amount;
            if (newBalance > parseFloat(account.credit_limit) * 1.1) {
                throw new common_1.BadRequestException(`Excede el límite de crédito. Límite: ${account.credit_limit}, Balance actual: ${account.balance}`);
            }
            await tx.$queryRaw `
        UPDATE credit_accounts SET balance = ${newBalance}, updated_at = now()
        WHERE id = ${accountId}::uuid
      `;
            const notes = dto.notes || '';
            const ordId = String(dto.orderId);
            const accId = String(accountId);
            const tenId = String(tenantId);
            const usrId = String(userId);
            const txn = await tx.$queryRaw `
        INSERT INTO credit_transactions (tenant_id, credit_account_id, order_id, type, amount, balance_after, notes, processed_by)
        VALUES (${tenId}::uuid, ${accId}::uuid, ${ordId}::uuid, 'charge'::text, ${dto.amount}::numeric, ${newBalance}::numeric, ${notes}::text, ${usrId}::uuid)
        RETURNING *
      `;
            return { transaction: txn[0], newBalance };
        });
    }
    async recordPayment(tenantId, accountId, dto, userId) {
        return this.prisma.$transaction(async (tx) => {
            const accounts = await tx.$queryRaw `
        SELECT * FROM credit_accounts WHERE id = ${accountId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE
      `;
            if (!accounts.length)
                throw new common_1.NotFoundException('Cuenta no encontrada');
            const account = accounts[0];
            const currentBalance = parseFloat(account.balance);
            if (dto.amount > currentBalance) {
                throw new common_1.BadRequestException(`El pago ($${dto.amount}) excede el saldo pendiente ($${currentBalance})`);
            }
            const newBalance = currentBalance - dto.amount;
            await tx.$queryRaw `
        UPDATE credit_accounts SET balance = ${newBalance}, updated_at = now()
        WHERE id = ${accountId}::uuid
      `;
            const ref = dto.reference || (dto.method ? `Pago ${dto.method}` : '');
            const payNotes = dto.notes || '';
            const pTenId = String(tenantId);
            const pAccId = String(accountId);
            const pUsrId = String(userId);
            const txn = await tx.$queryRaw `
        INSERT INTO credit_transactions (tenant_id, credit_account_id, type, amount, balance_after, reference, notes, processed_by)
        VALUES (${pTenId}::uuid, ${pAccId}::uuid, 'payment'::text, ${-dto.amount}::numeric, ${newBalance}::numeric, ${ref}::text, ${payNotes}::text, ${pUsrId}::uuid)
        RETURNING *
      `;
            return { transaction: txn[0], newBalance };
        });
    }
    async recordAdjustment(tenantId, accountId, dto, userId) {
        return this.prisma.$transaction(async (tx) => {
            const accounts = await tx.$queryRaw `
        SELECT * FROM credit_accounts WHERE id = ${accountId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE
      `;
            if (!accounts.length)
                throw new common_1.NotFoundException('Cuenta no encontrada');
            const newBalance = parseFloat(accounts[0].balance) + dto.amount;
            if (newBalance < 0)
                throw new common_1.BadRequestException('El ajuste resultaría en saldo negativo');
            await tx.$queryRaw `
        UPDATE credit_accounts SET balance = ${newBalance}, updated_at = now()
        WHERE id = ${accountId}::uuid
      `;
            const type = dto.amount < 0 ? 'writeoff' : 'adjustment';
            const aTenId = String(tenantId);
            const aAccId = String(accountId);
            const aUsrId = String(userId);
            const reason = String(dto.reason);
            const txn = await tx.$queryRaw `
        INSERT INTO credit_transactions (tenant_id, credit_account_id, type, amount, balance_after, notes, processed_by)
        VALUES (${aTenId}::uuid, ${aAccId}::uuid, ${type}::text, ${dto.amount}::numeric, ${newBalance}::numeric, ${reason}::text, ${aUsrId}::uuid)
        RETURNING *
      `;
            return { transaction: txn[0], newBalance };
        });
    }
    async getTransactions(tenantId, accountId, pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        const transactions = await this.prisma.$queryRaw `
      SELECT ct.*, u.first_name || ' ' || u.last_name as processed_by_name,
        o.order_number
      FROM credit_transactions ct
      LEFT JOIN users u ON ct.processed_by = u.id
      LEFT JOIN orders o ON ct.order_id = o.id
      WHERE ct.credit_account_id = ${accountId}::uuid AND ct.tenant_id = ${tenantId}::uuid
      ORDER BY ct.created_at DESC
      LIMIT ${pagination.limit} OFFSET ${offset}
    `;
        return transactions;
    }
};
exports.CreditService = CreditService;
exports.CreditService = CreditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CreditService);
//# sourceMappingURL=credit.service.js.map