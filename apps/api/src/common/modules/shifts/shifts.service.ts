import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { branchConditionFor } from '../../helpers/branch-filter';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notif: NotificationsService,
  ) {}

  // ═══ CASH REGISTER CRUD ═══

  async getCashRegisters(tenantId: string, branchId?: string | null) {
    const bf = branchConditionFor('cr', branchId);
    const registers: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT 
        cr.id, cr.name, cr.is_active, cr.branch_id,
        (SELECT COUNT(*)::int FROM shifts s WHERE s.cash_register_id = cr.id AND s.status = 'open') as has_open_shift,
        (SELECT s.id FROM shifts s WHERE s.cash_register_id = cr.id AND s.status = 'open' ORDER BY s.opened_at DESC LIMIT 1) as open_shift_id,
        (SELECT u.first_name || ' ' || u.last_name FROM shifts s JOIN users u ON u.id = s.opened_by WHERE s.cash_register_id = cr.id AND s.status = 'open' ORDER BY s.opened_at DESC LIMIT 1) as opened_by_name,
        (SELECT s.opened_at FROM shifts s WHERE s.cash_register_id = cr.id AND s.status = 'open' ORDER BY s.opened_at DESC LIMIT 1) as opened_at,
        (SELECT s.opening_amount FROM shifts s WHERE s.cash_register_id = cr.id AND s.status = 'open' ORDER BY s.opened_at DESC LIMIT 1) as opening_amount
      FROM cash_registers cr
      WHERE cr.tenant_id = '${tenantId}'
        ${bf}
      ORDER BY cr.name
    `);
    return registers;
  }

  async createCashRegister(tenantId: string, name: string, branchId?: string | null) {
    const bId = branchId || null;
    const result: any[] = await this.prisma.$queryRaw`
      INSERT INTO cash_registers (tenant_id, branch_id, name, is_active)
      VALUES (${tenantId}::uuid, ${bId}::uuid, ${name}, true)
      RETURNING id, name, is_active, branch_id
    `;
    return result[0];
  }

  async updateCashRegister(tenantId: string, registerId: string, data: { name?: string; isActive?: boolean }) {
    const existing: any[] = await this.prisma.$queryRaw`
      SELECT id FROM cash_registers WHERE id = ${registerId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (!existing.length) throw new NotFoundException('Caja no encontrada');

    if (data.name !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE cash_registers SET name = ${data.name}, updated_at = NOW()
        WHERE id = ${registerId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    }
    if (data.isActive !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE cash_registers SET is_active = ${data.isActive}, updated_at = NOW()
        WHERE id = ${registerId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    }
    return { success: true };
  }

  async deleteCashRegister(tenantId: string, registerId: string) {
    const existing: any[] = await this.prisma.$queryRaw`
      SELECT id, (SELECT COUNT(*)::int FROM shifts s WHERE s.cash_register_id = cr.id) as shift_count
      FROM cash_registers cr WHERE cr.id = ${registerId}::uuid AND cr.tenant_id = ${tenantId}::uuid
    `;
    if (!existing.length) throw new NotFoundException('Caja no encontrada');
    if (existing[0].shift_count > 0) {
      // Soft delete — just deactivate
      await this.prisma.$executeRaw`
        UPDATE cash_registers SET is_active = false, updated_at = NOW()
        WHERE id = ${registerId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      return { success: true, deactivated: true };
    }
    await this.prisma.$executeRaw`
      DELETE FROM cash_registers WHERE id = ${registerId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    return { success: true, deleted: true };
  }

  // ═══ SHIFTS ═══

  async openShift(tenantId: string, userId: string, dto: OpenShiftDto, branchId?: string | null) {
    const registers: any[] = await this.prisma.$queryRaw`
      SELECT id, name FROM cash_registers WHERE id = ${dto.cashRegisterId}::uuid AND tenant_id = ${tenantId}::uuid AND is_active = true
    `;
    if (!registers.length) throw new NotFoundException('Caja registradora no encontrada');

    const openShifts: any[] = await this.prisma.$queryRaw`
      SELECT id FROM shifts WHERE cash_register_id = ${dto.cashRegisterId}::uuid AND tenant_id = ${tenantId}::uuid AND status = 'open'
    `;
    if (openShifts.length > 0) throw new BadRequestException('Ya existe un turno abierto para esta caja. Ciérrelo primero.');

    const branchVal = branchId || null;
    const shiftId: any[] = await this.prisma.$queryRaw`
      INSERT INTO shifts (tenant_id, branch_id, cash_register_id, opened_by, opening_amount, status, notes, opened_at)
      VALUES (${tenantId}::uuid, ${branchVal}::uuid, ${dto.cashRegisterId}::uuid, ${userId}::uuid, ${dto.openingAmount}, 'open', ${dto.notes || null}, NOW())
      RETURNING id, opened_at
    `;

    const userName = await this.getUserName(userId);
    this.audit.log({
      tenantId, userId, userName, action: 'open', entity: 'shift',
      entityId: shiftId[0].id,
      description: `Caja "${registers[0].name}" abierta con $${dto.openingAmount.toFixed(2)}`,
      details: { cashRegister: registers[0].name, openingAmount: dto.openingAmount },
    });

    this.notif.create({
      tenantId, title: 'Caja Abierta',
      message: `${userName} abrió la caja "${registers[0].name}" con $${dto.openingAmount.toFixed(2)}`,
      type: 'shift', priority: 'normal', entity: 'shift', entityId: shiftId[0].id, actionUrl: '/shifts',
    });

    return {
      id: shiftId[0].id, cashRegisterName: registers[0].name,
      openedAt: shiftId[0].opened_at, openingAmount: dto.openingAmount, status: 'open',
    };
  }

  async getActiveShift(tenantId: string, branchId?: string | null) {
    const bf = branchConditionFor('s', branchId);
    const shifts: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT s.*, cr.name as cash_register_name,
        u.first_name || ' ' || u.last_name as opened_by_name,
        (SELECT COUNT(*)::int FROM orders o WHERE o.shift_id = s.id AND o.status = 'completed') as orders_count,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.shift_id = s.id AND o.status = 'completed') as total_sales,
        (SELECT json_agg(json_build_object('method', p.method, 'count', cnt, 'total', tot))
         FROM (SELECT p.method, COUNT(*)::int as cnt, SUM(p.amount)::float as tot
               FROM payments p JOIN orders o ON o.id = p.order_id
               WHERE o.shift_id = s.id GROUP BY p.method) p
        ) as payments
      FROM shifts s
      JOIN cash_registers cr ON cr.id = s.cash_register_id
      JOIN users u ON u.id = s.opened_by
      WHERE s.tenant_id = '${tenantId}' AND s.status = 'open'
        ${bf}
      ORDER BY s.opened_at DESC LIMIT 1
    `);

    if (!shifts.length) return null;

    const shift = shifts[0];
    const openingAmount = parseFloat(shift.opening_amount || '0');
    const totalSales = parseFloat(shift.total_sales || '0');
    const payments = shift.payments || [];
    const cashPayments = payments.find((p: any) => p.method === 'cash')?.total || 0;

    return {
      id: shift.id,
      cash_register_id: shift.cash_register_id,
      cash_register_name: shift.cash_register_name,
      opened_at: shift.opened_at,
      opened_by_name: shift.opened_by_name,
      opening_amount: openingAmount,
      total_sales: totalSales,
      orders_count: shift.orders_count,
      expected_cash: openingAmount + cashPayments,
      payments,
      ordersSummary: payments,
    };
  }

  async closeShift(tenantId: string, shiftId: string, userId: string, dto: CloseShiftDto) {
    const shifts: any[] = await this.prisma.$queryRaw`
      SELECT s.*, cr.name as cash_register_name FROM shifts s
      JOIN cash_registers cr ON cr.id = s.cash_register_id
      WHERE s.id = ${shiftId}::uuid AND s.tenant_id = ${tenantId}::uuid AND s.status = 'open'
    `;
    if (!shifts.length) throw new NotFoundException('Turno no encontrado o ya está cerrado');
    const shift = shifts[0];

    const totals: any[] = await this.prisma.$queryRaw`
      SELECT COUNT(*)::int as orders_count, COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as total_sales
      FROM orders WHERE tenant_id = ${tenantId}::uuid AND shift_id = ${shiftId}::uuid
    `;

    const cashPayments: any[] = await this.prisma.$queryRaw`
      SELECT COALESCE(SUM(p.amount), 0) as cash_total FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE o.tenant_id = ${tenantId}::uuid AND o.shift_id = ${shiftId}::uuid AND p.method = 'cash'
    `;

    const totalSales = parseFloat(totals[0]?.total_sales || '0');
    const ordersCount = totals[0]?.orders_count || 0;
    const cashTotal = parseFloat(cashPayments[0]?.cash_total || '0');
    const expectedAmount = parseFloat(shift.opening_amount) + cashTotal;
    const difference = dto.closingAmount - expectedAmount;

    await this.prisma.$executeRaw`
      UPDATE shifts SET closed_by = ${userId}::uuid, closing_amount = ${dto.closingAmount},
        expected_amount = ${expectedAmount}, difference = ${difference}, total_sales = ${totalSales},
        orders_count = ${ordersCount}, status = 'closed', notes = COALESCE(${dto.notes || null}, notes), closed_at = NOW()
      WHERE id = ${shiftId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    const payments: any[] = await this.prisma.$queryRaw`
      SELECT p.method, COUNT(*)::int as count, COALESCE(SUM(p.amount), 0) as total
      FROM payments p JOIN orders o ON o.id = p.order_id
      WHERE o.tenant_id = ${tenantId}::uuid AND o.shift_id = ${shiftId}::uuid GROUP BY p.method
    `;

    const status = difference === 0 ? 'balanced' : difference > 0 ? 'surplus' : 'deficit';
    const userName = await this.getUserName(userId);

    this.audit.log({
      tenantId, userId, userName, action: 'close', entity: 'shift',
      entityId: shiftId,
      description: `Caja "${shift.cash_register_name}" cerrada — ${status === 'balanced' ? 'Cuadrada' : `Diferencia: $${Math.abs(difference).toFixed(2)} ${status === 'surplus' ? 'sobrante' : 'faltante'}`}`,
      severity: status === 'balanced' ? 'info' : 'warning',
      details: { cashRegister: shift.cash_register_name, totalSales, ordersCount, closingAmount: dto.closingAmount, expectedAmount, difference, status },
    });

    this.notif.notifyShiftClosed(tenantId, userName, status, difference);

    return {
      shiftId, cashRegisterName: shift.cash_register_name,
      openedAt: shift.opened_at, closedAt: new Date(),
      openingAmount: parseFloat(shift.opening_amount), closingAmount: dto.closingAmount,
      expectedAmount, difference, totalSales, ordersCount,
      payments: payments.map(p => ({ method: p.method, count: p.count, total: parseFloat(p.total) })),
      status,
    };
  }

  async getShifts(tenantId: string, query: ShiftQueryDto, branchId?: string | null) {
    const { status, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const conditions: string[] = [`s.tenant_id = '${tenantId}'`];
    if (status) conditions.push(`s.status = '${status}'`);
    if (branchId) conditions.push(`s.branch_id = '${branchId}'`);
    const where = conditions.join(' AND ');

    const shifts = await this.prisma.$queryRawUnsafe(`
      SELECT s.*, cr.name as cash_register_name,
        opener.first_name || ' ' || opener.last_name as opened_by_name,
        closer.first_name || ' ' || closer.last_name as closed_by_name
      FROM shifts s
      JOIN cash_registers cr ON cr.id = s.cash_register_id
      LEFT JOIN users opener ON opener.id = s.opened_by
      LEFT JOIN users closer ON closer.id = s.closed_by
      WHERE ${where} ORDER BY s.opened_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
    const countResult = await this.prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as total FROM shifts s WHERE ${where}`);
    return { data: shifts, total: countResult[0]?.total || 0, page, limit };
  }

  async getShiftDetail(tenantId: string, shiftId: string) {
    const shifts: any[] = await this.prisma.$queryRaw`
      SELECT s.*, cr.name as cash_register_name,
        opener.first_name || ' ' || opener.last_name as opened_by_name,
        closer.first_name || ' ' || closer.last_name as closed_by_name
      FROM shifts s JOIN cash_registers cr ON cr.id = s.cash_register_id
      LEFT JOIN users opener ON opener.id = s.opened_by
      LEFT JOIN users closer ON closer.id = s.closed_by
      WHERE s.id = ${shiftId}::uuid AND s.tenant_id = ${tenantId}::uuid
    `;
    if (!shifts.length) throw new NotFoundException('Turno no encontrado');

    const shift = shifts[0];

    const payments: any[] = await this.prisma.$queryRaw`
      SELECT p.method, COUNT(*)::int as count, COALESCE(SUM(p.amount), 0)::float as total
      FROM payments p JOIN orders o ON o.id = p.order_id
      WHERE o.tenant_id = ${tenantId}::uuid AND o.shift_id = ${shiftId}::uuid
      GROUP BY p.method
    `;

    const topProducts: any[] = await this.prisma.$queryRaw`
      SELECT p.name as name, SUM(oi.quantity)::int as quantity, SUM(oi.subtotal)::float as amount
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.tenant_id = ${tenantId}::uuid AND o.shift_id = ${shiftId}::uuid AND o.status = 'completed' AND oi.is_void = false
      GROUP BY p.name ORDER BY amount DESC LIMIT 10
    `;

    return {
      ...shift,
      opening_amount: parseFloat(shift.opening_amount || '0'),
      closing_amount: shift.closing_amount ? parseFloat(shift.closing_amount) : null,
      expected_amount: shift.expected_amount ? parseFloat(shift.expected_amount) : null,
      total_sales: shift.total_sales ? parseFloat(shift.total_sales) : 0,
      difference: shift.difference ? parseFloat(shift.difference) : null,
      payments, topProducts,
    };
  }

  private async getUserName(userId: string): Promise<string> {
    try {
      const users: any[] = await this.prisma.$queryRaw`
        SELECT first_name || ' ' || last_name as name FROM users WHERE id = ${userId}::uuid
      `;
      return users[0]?.name || 'Desconocido';
    } catch { return 'Desconocido'; }
  }
}
