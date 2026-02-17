import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  // ── Dashboard ──
  async getDashboard(tenantId: string) {
    const [accounts, totals, recentPayments] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
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
      this.prisma.$queryRaw<any[]>`
        SELECT 
          type,
          COUNT(*)::int as count,
          COALESCE(SUM(ABS(amount)), 0)::float as total
        FROM credit_transactions 
        WHERE tenant_id = ${tenantId}::uuid 
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY type
      `,
      this.prisma.$queryRaw<any[]>`
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

  // ── List accounts ──
  async listAccounts(tenantId: string, filters: { status?: string; search?: string; overdue?: boolean }) {
    const conditions: string[] = [`ca.tenant_id = '${tenantId}'`];
    if (filters.status) conditions.push(`ca.status = '${filters.status}'`);
    if (filters.overdue) conditions.push(`ca.balance > ca.credit_limit`);
    if (filters.search) {
      const s = filters.search.replace(/'/g, "''");
      conditions.push(`(c.name ILIKE '%${s}%' OR c.phone ILIKE '%${s}%' OR c.tax_id ILIKE '%${s}%')`);
    }

    const where = conditions.join(' AND ');
    const accounts = await this.prisma.$queryRawUnsafe<any[]>(`
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

  // ── Get account detail ──
  async getAccount(tenantId: string, id: string) {
    const accounts = await this.prisma.$queryRaw<any[]>`
      SELECT ca.*, 
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        c.tax_id as customer_tax_id, c.address as customer_address
      FROM credit_accounts ca
      JOIN customers c ON ca.customer_id = c.id
      WHERE ca.id = ${id}::uuid AND ca.tenant_id = ${tenantId}::uuid
    `;
    if (!accounts.length) throw new NotFoundException('Cuenta no encontrada');

    // Get recent transactions
    const transactions = await this.prisma.$queryRaw<any[]>`
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

  // ── Get by customer ──
  async getByCustomer(tenantId: string, customerId: string) {
    const accounts = await this.prisma.$queryRaw<any[]>`
      SELECT ca.* FROM credit_accounts ca
      WHERE ca.tenant_id = ${tenantId}::uuid AND ca.customer_id = ${customerId}::uuid
    `;
    return accounts[0] || null;
  }

  // ── Create account ──
  async createAccount(tenantId: string, dto: { customerId: string; creditLimit: number; notes?: string }) {
    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    // Check if account already exists
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM credit_accounts 
      WHERE tenant_id = ${tenantId}::uuid AND customer_id = ${dto.customerId}::uuid
    `;
    if (existing.length) throw new BadRequestException('El cliente ya tiene una cuenta de crédito');

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO credit_accounts (tenant_id, customer_id, credit_limit, notes)
      VALUES (${tenantId}::uuid, ${dto.customerId}::uuid, ${dto.creditLimit}, ${dto.notes || null})
      RETURNING *
    `;

    return result[0];
  }

  // ── Update account ──
  async updateAccount(tenantId: string, id: string, dto: { creditLimit?: number; status?: string; notes?: string }) {
    const sets: string[] = [`updated_at = now()`];
    if (dto.creditLimit !== undefined) sets.push(`credit_limit = ${dto.creditLimit}`);
    if (dto.status) sets.push(`status = '${dto.status}'`);
    if (dto.notes !== undefined) sets.push(`notes = '${(dto.notes || '').replace(/'/g, "''")}'`);

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE credit_accounts SET ${sets.join(', ')}
      WHERE id = '${id}' AND tenant_id = '${tenantId}'
      RETURNING *
    `);
    if (!result.length) throw new NotFoundException('Cuenta no encontrada');
    return result[0];
  }

  // ── Record charge ──
  async recordCharge(tenantId: string, accountId: string, dto: { orderId: string; amount: number; notes?: string }, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Get current account
      const accounts = await tx.$queryRaw<any[]>`
        SELECT * FROM credit_accounts WHERE id = ${accountId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE
      `;
      if (!accounts.length) throw new NotFoundException('Cuenta no encontrada');
      const account = accounts[0];

      if (account.status !== 'active') throw new BadRequestException('La cuenta no está activa');

      const newBalance = parseFloat(account.balance) + dto.amount;
      if (newBalance > parseFloat(account.credit_limit) * 1.1) {
        throw new BadRequestException(`Excede el límite de crédito. Límite: ${account.credit_limit}, Balance actual: ${account.balance}`);
      }

      // Update balance
      await tx.$queryRaw`
        UPDATE credit_accounts SET balance = ${newBalance}, updated_at = now()
        WHERE id = ${accountId}::uuid
      `;

      // Record transaction
      const txn = await tx.$queryRaw<any[]>`
        INSERT INTO credit_transactions (tenant_id, credit_account_id, order_id, type, amount, balance_after, notes, processed_by)
        VALUES (${tenantId}::uuid, ${accountId}::uuid, ${dto.orderId}::uuid, 'charge', ${dto.amount}, ${newBalance}, ${dto.notes || null}, ${userId}::uuid)
        RETURNING *
      `;

      return { transaction: txn[0], newBalance };
    });
  }

  // ── Record payment ──
  async recordPayment(tenantId: string, accountId: string, dto: { amount: number; method?: string; reference?: string; notes?: string }, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const accounts = await tx.$queryRaw<any[]>`
        SELECT * FROM credit_accounts WHERE id = ${accountId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE
      `;
      if (!accounts.length) throw new NotFoundException('Cuenta no encontrada');
      const account = accounts[0];

      const currentBalance = parseFloat(account.balance);
      if (dto.amount > currentBalance) {
        throw new BadRequestException(`El pago ($${dto.amount}) excede el saldo pendiente ($${currentBalance})`);
      }

      const newBalance = currentBalance - dto.amount;

      await tx.$queryRaw`
        UPDATE credit_accounts SET balance = ${newBalance}, updated_at = now()
        WHERE id = ${accountId}::uuid
      `;

      const ref = dto.reference || (dto.method ? `Pago ${dto.method}` : null);
      const txn = await tx.$queryRaw<any[]>`
        INSERT INTO credit_transactions (tenant_id, credit_account_id, type, amount, balance_after, reference, notes, processed_by)
        VALUES (${tenantId}::uuid, ${accountId}::uuid, 'payment', ${-dto.amount}, ${newBalance}, ${ref}, ${dto.notes || null}, ${userId}::uuid)
        RETURNING *
      `;

      return { transaction: txn[0], newBalance };
    });
  }

  // ── Record adjustment ──
  async recordAdjustment(tenantId: string, accountId: string, dto: { amount: number; reason: string }, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const accounts = await tx.$queryRaw<any[]>`
        SELECT * FROM credit_accounts WHERE id = ${accountId}::uuid AND tenant_id = ${tenantId}::uuid FOR UPDATE
      `;
      if (!accounts.length) throw new NotFoundException('Cuenta no encontrada');

      const newBalance = parseFloat(accounts[0].balance) + dto.amount;
      if (newBalance < 0) throw new BadRequestException('El ajuste resultaría en saldo negativo');

      await tx.$queryRaw`
        UPDATE credit_accounts SET balance = ${newBalance}, updated_at = now()
        WHERE id = ${accountId}::uuid
      `;

      const type = dto.amount < 0 ? 'writeoff' : 'adjustment';
      const txn = await tx.$queryRaw<any[]>`
        INSERT INTO credit_transactions (tenant_id, credit_account_id, type, amount, balance_after, notes, processed_by)
        VALUES (${tenantId}::uuid, ${accountId}::uuid, ${type}, ${dto.amount}, ${newBalance}, ${dto.reason}, ${userId}::uuid)
        RETURNING *
      `;

      return { transaction: txn[0], newBalance };
    });
  }

  // ── Transactions ──
  async getTransactions(tenantId: string, accountId: string, pagination: { page: number; limit: number }) {
    const offset = (pagination.page - 1) * pagination.limit;
    const transactions = await this.prisma.$queryRaw<any[]>`
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
}
