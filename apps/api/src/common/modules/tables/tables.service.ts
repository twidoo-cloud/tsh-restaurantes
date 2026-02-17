import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { branchConditionFor } from '../../helpers/branch-filter';

@Injectable()
export class TablesService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: PosEventsGateway,
  ) {}

  async getFloorPlans(tenantId: string, branchId?: string | null) {
    const bf = branchConditionFor('z', branchId);
    const bfT = branchConditionFor('t', branchId);
    return this.prisma.$queryRawUnsafe(`
      SELECT fp.id, fp.name, fp.display_order,
        (
          SELECT json_agg(
            json_build_object(
              'id', z.id, 'name', z.name, 'color', z.color,
              'display_order', z.display_order,
              'tables', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', t.id, 'number', t.number, 'capacity', t.capacity,
                    'shape', t.shape, 'position_x', t.position_x, 'position_y', t.position_y,
                    'width', t.width, 'height', t.height, 'status', t.status,
                    'current_order_id', t.current_order_id, 'merged_with', t.merged_with
                  ) ORDER BY t.number
                ), '[]'::json)
                FROM tables t
                WHERE t.zone_id = z.id AND t.is_active = true AND t.tenant_id = '${tenantId}'
                  ${bfT}
              )
            ) ORDER BY z.display_order
          )
          FROM zones z
          WHERE z.floor_plan_id = fp.id AND z.is_active = true AND z.tenant_id = '${tenantId}'
            ${bf}
        ) as zones
      FROM floor_plans fp
      WHERE fp.tenant_id = '${tenantId}' AND fp.is_active = true
      ORDER BY fp.display_order
    `);
  }

  async getTableWithOrder(tenantId: string, tableId: string) {
    const tables: any[] = await this.prisma.$queryRaw`
      SELECT t.*, z.name as zone_name, z.color as zone_color
      FROM tables t JOIN zones z ON z.id = t.zone_id
      WHERE t.id = ${tableId}::uuid AND t.tenant_id = ${tenantId}::uuid
    `;
    if (!tables.length) throw new NotFoundException('Mesa no encontrada');
    const table = tables[0];

    let order: any = null;
    if (table.current_order_id) {
      order = await this.prisma.order.findFirst({
        where: { id: table.current_order_id, tenantId },
        include: {
          items: { where: { isVoid: false }, include: { product: { select: { id: true, name: true, attributes: true } } } },
          payments: true,
        },
      });
    }
    return { table, order };
  }

  async getWaiterTables(tenantId: string, userId: string) {
    return this.prisma.$queryRaw`
      SELECT 
        t.id as table_id, t.number as table_number, t.capacity, t.shape, t.status,
        o.id as order_id, o.order_number, o.status as order_status, o.total, o.created_at, o.metadata,
        (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND oi.is_void = false) as items_count,
        (SELECT json_agg(json_build_object(
          'id', oi.id, 'productName', p.name, 'quantity', oi.quantity,
          'unitPrice', oi.unit_price, 'subtotal', oi.subtotal, 'notes', oi.notes,
          'isVoid', oi.is_void, 'createdAt', oi.created_at,
          'kitchenStatus', (SELECT ko.status FROM kitchen_orders ko WHERE ko.order_item_id = oi.id LIMIT 1)
        ) ORDER BY oi.created_at) FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id AND oi.is_void = false) as items,
        z.name as zone_name, z.color as zone_color
      FROM tables t
      JOIN orders o ON o.id = t.current_order_id
      LEFT JOIN zones z ON z.id = t.zone_id
      WHERE t.tenant_id = ${tenantId}::uuid
        AND t.status = 'occupied'
        AND o.served_by = ${userId}::uuid
        AND o.status IN ('open', 'preparing', 'ready')
      ORDER BY o.created_at DESC
    `;
  }

  async updateTableStatus(tenantId: string, tableId: string, status: string, orderId?: string | null) {
    await this.prisma.$executeRaw`
      UPDATE tables SET status = ${status}, current_order_id = ${orderId}::uuid
      WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    return this.getTableWithOrder(tenantId, tableId);
  }

  async openTable(tenantId: string, tableId: string, userId: string, guestCount: number = 2) {
    const orderNumber = await this.generateOrderNumber(tenantId);

    const activeShifts: any[] = await this.prisma.$queryRaw`
      SELECT id FROM shifts WHERE tenant_id = ${tenantId}::uuid AND status = 'open' ORDER BY opened_at DESC LIMIT 1
    `;
    const shiftId = activeShifts.length > 0 ? activeShifts[0].id : null;

    const tableInfo: any[] = await this.prisma.$queryRaw`
      SELECT number, branch_id FROM tables WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    const tableNumber = tableInfo[0]?.number || '';
    const tableBranchId = tableInfo[0]?.branch_id || null;

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        branchId: tableBranchId,
        orderNumber,
        type: 'dine_in',
        servedBy: userId,
        shiftId,
        metadata: { table_id: tableId, guest_count: guestCount, table_number: tableNumber },
      },
    });

    await this.prisma.$executeRaw`
      UPDATE tables SET status = 'occupied', current_order_id = ${order.id}::uuid
      WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    this.wsGateway.emitTableStatusChanged(tenantId, { tableId, tableNumber, status: 'occupied', orderId: order.id });
    this.wsGateway.emitOrderCreated(tenantId, { orderId: order.id, orderNumber, type: 'dine_in', tableId });

    return { table: await this.getTableWithOrder(tenantId, tableId), order };
  }

  async closeTable(tenantId: string, tableId: string) {
    const tableInfo: any[] = await this.prisma.$queryRaw`
      SELECT number FROM tables WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    await this.prisma.$executeRaw`
      UPDATE tables SET status = 'available', current_order_id = NULL, merged_with = NULL
      WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    this.wsGateway.emitTableStatusChanged(tenantId, { tableId, tableNumber: tableInfo[0]?.number || '', status: 'available' });
    return { success: true };
  }

  async transferOrder(tenantId: string, fromTableId: string, toTableId: string) {
    const fromTable = await this.getTableWithOrder(tenantId, fromTableId);
    if (!fromTable.table.current_order_id) throw new BadRequestException('La mesa origen no tiene orden activa');
    const toTable = await this.getTableWithOrder(tenantId, toTableId);
    if (toTable.table.current_order_id) throw new BadRequestException('La mesa destino ya tiene una orden activa');

    const orderId = fromTable.table.current_order_id;
    await this.prisma.$executeRaw`UPDATE tables SET status = 'available', current_order_id = NULL WHERE id = ${fromTableId}::uuid AND tenant_id = ${tenantId}::uuid`;
    await this.prisma.$executeRaw`UPDATE tables SET status = 'occupied', current_order_id = ${orderId}::uuid WHERE id = ${toTableId}::uuid AND tenant_id = ${tenantId}::uuid`;

    await this.prisma.$queryRawUnsafe(`
      UPDATE orders SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{table_id}', '"${toTableId}"'),
        notes = COALESCE(notes, '') || ' [Transferido de mesa ${fromTable.table.number} a mesa ${toTable.table.number}]'
      WHERE id = '${orderId}'::uuid
    `);

    this.wsGateway.emitTableStatusChanged(tenantId, { tableId: fromTableId, tableNumber: fromTable.table.number, status: 'available' });
    this.wsGateway.emitTableStatusChanged(tenantId, { tableId: toTableId, tableNumber: toTable.table.number, status: 'occupied', orderId });
    return { success: true, from: fromTable.table.number, to: toTable.table.number };
  }

  async mergeTables(tenantId: string, primaryTableId: string, secondaryTableIds: string[]) {
    const primary = await this.getTableWithOrder(tenantId, primaryTableId);
    for (const secId of secondaryTableIds) {
      const sec = await this.getTableWithOrder(tenantId, secId);
      if (sec.table.current_order_id && primary.table.current_order_id) {
        await this.prisma.$queryRawUnsafe(`UPDATE order_items SET order_id = '${primary.table.current_order_id}'::uuid WHERE order_id = '${sec.table.current_order_id}'::uuid`);
        await this.prisma.$queryRawUnsafe(`UPDATE orders SET status = 'cancelled', notes = COALESCE(notes, '') || ' [Fusionada con mesa ${primary.table.number}]' WHERE id = '${sec.table.current_order_id}'::uuid`);
      } else if (sec.table.current_order_id && !primary.table.current_order_id) {
        await this.prisma.$executeRaw`UPDATE tables SET current_order_id = ${sec.table.current_order_id}::uuid, status = 'occupied' WHERE id = ${primaryTableId}::uuid AND tenant_id = ${tenantId}::uuid`;
      }
      await this.prisma.$queryRawUnsafe(`UPDATE tables SET status = 'merged', current_order_id = NULL, merged_with = '${primaryTableId}'::uuid WHERE id = '${secId}'::uuid AND tenant_id = '${tenantId}'::uuid`);
      this.wsGateway.emitTableStatusChanged(tenantId, { tableId: secId, tableNumber: sec.table.number, status: 'merged' });
    }
    if (primary.table.current_order_id) await this.recalcOrderTotals(primary.table.current_order_id);
    this.wsGateway.emitTableStatusChanged(tenantId, { tableId: primaryTableId, tableNumber: primary.table.number, status: 'occupied' });
    return { success: true, primary: primary.table.number, merged: secondaryTableIds.length };
  }

  async unmergeTables(tenantId: string, primaryTableId: string) {
    const merged: any[] = await this.prisma.$queryRawUnsafe(`SELECT id, number FROM tables WHERE merged_with = '${primaryTableId}'::uuid AND tenant_id = '${tenantId}'::uuid`);
    for (const t of merged) {
      await this.prisma.$queryRawUnsafe(`UPDATE tables SET status = 'available', merged_with = NULL WHERE id = '${t.id}'::uuid AND tenant_id = '${tenantId}'::uuid`);
      this.wsGateway.emitTableStatusChanged(tenantId, { tableId: t.id, tableNumber: t.number, status: 'available' });
    }
    return { success: true, unmerged: merged.length };
  }

  async swapTables(tenantId: string, tableAId: string, tableBId: string) {
    const tableA = await this.getTableWithOrder(tenantId, tableAId);
    const tableB = await this.getTableWithOrder(tenantId, tableBId);
    const orderA = tableA.table.current_order_id;
    const orderB = tableB.table.current_order_id;
    const statusA = tableA.table.status;
    const statusB = tableB.table.status;
    await this.prisma.$executeRaw`UPDATE tables SET current_order_id = ${orderB}::uuid, status = ${statusB} WHERE id = ${tableAId}::uuid AND tenant_id = ${tenantId}::uuid`;
    await this.prisma.$executeRaw`UPDATE tables SET current_order_id = ${orderA}::uuid, status = ${statusA} WHERE id = ${tableBId}::uuid AND tenant_id = ${tenantId}::uuid`;
    this.wsGateway.emitTableStatusChanged(tenantId, { tableId: tableAId, tableNumber: tableA.table.number, status: statusB });
    this.wsGateway.emitTableStatusChanged(tenantId, { tableId: tableBId, tableNumber: tableB.table.number, status: statusA });
    return { success: true, swapped: [tableA.table.number, tableB.table.number] };
  }

  // ═══ HELPERS ═══

  private async recalcOrderTotals(orderId: string) {
    const totals: any[] = await this.prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(subtotal), 0) as subtotal, COALESCE(SUM(tax_amount), 0) as tax FROM order_items WHERE order_id = '${orderId}'::uuid AND is_void = false`);
    const sub = parseFloat(totals[0].subtotal);
    const tax = parseFloat(totals[0].tax);
    await this.prisma.$queryRawUnsafe(`UPDATE orders SET subtotal = ${sub}, tax_amount = ${tax}, total = ${sub + tax} WHERE id = '${orderId}'::uuid`);
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;
    const lastOrder = await this.prisma.order.findFirst({ where: { tenantId, orderNumber: { startsWith: prefix } }, orderBy: { orderNumber: 'desc' } });
    let nextNum = 1;
    if (lastOrder) { const parts = lastOrder.orderNumber.split('-'); nextNum = parseInt(parts[2], 10) + 1; }
    return `${prefix}${nextNum.toString().padStart(5, '0')}`;
  }

  // ═══ ZONE CRUD ═══

  async listZones(tenantId: string, branchId?: string | null) {
    const bf = branchConditionFor('z', branchId);
    return this.prisma.$queryRawUnsafe(`
      SELECT z.id, z.name, z.color, z.display_order, z.floor_plan_id,
        (SELECT COUNT(*)::int FROM tables t WHERE t.zone_id = z.id AND t.is_active = true) as table_count
      FROM zones z
      WHERE z.tenant_id = '${tenantId}' AND z.is_active = true
        ${bf}
      ORDER BY z.display_order, z.name
    `);
  }

  async createZone(tenantId: string, dto: { name: string; color?: string; floorPlanId?: string; displayOrder?: number }, branchId?: string | null) {
    const name = String(dto.name);
    const color = String(dto.color || '#3B82F6');
    const displayOrder = dto.displayOrder || 0;

    let floorPlanId = dto.floorPlanId;
    if (!floorPlanId) {
      const fps: any[] = await this.prisma.$queryRaw`SELECT id FROM floor_plans WHERE tenant_id = ${tenantId}::uuid AND is_active = true ORDER BY display_order LIMIT 1`;
      floorPlanId = fps[0]?.id;
    }

    const result = await this.prisma.zone.create({
      data: { tenantId, branchId: branchId || undefined, name, color, displayOrder, floorPlanId: floorPlanId || null },
    });
    return result;
  }

  async updateZone(tenantId: string, zoneId: string, dto: { name?: string; color?: string; displayOrder?: number }) {
    const zone = await this.prisma.zone.findFirst({ where: { id: zoneId, tenantId, isActive: true } });
    if (!zone) throw new NotFoundException('Zona no encontrada');
    return this.prisma.zone.update({
      where: { id: zoneId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
      },
    });
  }

  async deleteZone(tenantId: string, zoneId: string) {
    const zone = await this.prisma.zone.findFirst({ where: { id: zoneId, tenantId, isActive: true } });
    if (!zone) throw new NotFoundException('Zona no encontrada');
    const occupiedTables: any[] = await this.prisma.$queryRaw`SELECT id FROM tables WHERE zone_id = ${zoneId}::uuid AND tenant_id = ${tenantId}::uuid AND is_active = true AND status = 'occupied'`;
    if (occupiedTables.length > 0) throw new BadRequestException('No se puede eliminar una zona con mesas ocupadas');
    await this.prisma.$executeRaw`UPDATE tables SET is_active = false WHERE zone_id = ${zoneId}::uuid AND tenant_id = ${tenantId}::uuid`;
    await this.prisma.zone.update({ where: { id: zoneId }, data: { isActive: false } });
    return { success: true };
  }

  // ═══ TABLE CRUD ═══

  async createTable(tenantId: string, dto: { number: number; zoneId: string; capacity?: number; shape?: string }, branchId?: string | null) {
    const num = Number(dto.number);
    const existing: any[] = await this.prisma.$queryRaw`SELECT id FROM tables WHERE tenant_id = ${tenantId}::uuid AND number = ${num} AND is_active = true`;
    if (existing.length > 0) throw new BadRequestException(`Ya existe la mesa #${num}`);
    const zone = await this.prisma.zone.findFirst({ where: { id: dto.zoneId, tenantId, isActive: true } });
    if (!zone) throw new NotFoundException('Zona no encontrada');

    const capacity = Number(dto.capacity) || 4;
    const shape = String(dto.shape || 'square');
    const zoneId = String(dto.zoneId);
    const bId = branchId || null;

    const result: any[] = await this.prisma.$queryRaw`
      INSERT INTO tables (id, tenant_id, branch_id, zone_id, number, capacity, shape, status, is_active, position_x, position_y, width, height)
      VALUES (uuid_generate_v7(), ${tenantId}::uuid, ${bId}::uuid, ${zoneId}::uuid, ${num}, ${capacity}, ${shape}, 'available', true, 0, 0, 80, 80)
      RETURNING *
    `;
    return result[0];
  }

  async bulkCreateTables(tenantId: string, dto: { zoneId: string; startNumber: number; count: number; capacity?: number; shape?: string }, branchId?: string | null) {
    const zone = await this.prisma.zone.findFirst({ where: { id: dto.zoneId, tenantId, isActive: true } });
    if (!zone) throw new NotFoundException('Zona no encontrada');
    const capacity = Number(dto.capacity) || 4;
    const shape = String(dto.shape || 'square');
    const zoneId = String(dto.zoneId);
    const bId = branchId || null;
    const created: any[] = [];
    for (let i = 0; i < dto.count; i++) {
      const num = Number(dto.startNumber) + i;
      const existing: any[] = await this.prisma.$queryRaw`SELECT id FROM tables WHERE tenant_id = ${tenantId}::uuid AND number = ${num} AND is_active = true`;
      if (existing.length > 0) continue;
      const result: any[] = await this.prisma.$queryRaw`
        INSERT INTO tables (id, tenant_id, branch_id, zone_id, number, capacity, shape, status, is_active, position_x, position_y, width, height)
        VALUES (uuid_generate_v7(), ${tenantId}::uuid, ${bId}::uuid, ${zoneId}::uuid, ${num}, ${capacity}, ${shape}, 'available', true, 0, 0, 80, 80)
        RETURNING *
      `;
      created.push(result[0]);
    }
    return { created: created.length, tables: created };
  }

  async updateTable(tenantId: string, tableId: string, dto: { number?: number; zoneId?: string; capacity?: number; shape?: string }) {
    const table = await this.prisma.restaurantTable.findFirst({ where: { id: tableId, tenantId, isActive: true } });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    const newNumber = dto.number !== undefined ? Number(dto.number) : table.number;
    if (newNumber !== table.number) {
      const existing: any[] = await this.prisma.$queryRaw`SELECT id FROM tables WHERE tenant_id = ${tenantId}::uuid AND number = ${newNumber} AND is_active = true AND id != ${tableId}::uuid`;
      if (existing.length > 0) throw new BadRequestException(`Ya existe la mesa #${newNumber}`);
    }
    const newZoneId = dto.zoneId ? String(dto.zoneId) : table.zoneId;
    if (newZoneId !== table.zoneId) {
      const zone = await this.prisma.zone.findFirst({ where: { id: newZoneId, tenantId, isActive: true } });
      if (!zone) throw new NotFoundException('Zona no encontrada');
    }
    const newCapacity = dto.capacity !== undefined ? Number(dto.capacity) : table.capacity;
    const newShape = dto.shape ? String(dto.shape) : table.shape;
    await this.prisma.$executeRaw`UPDATE tables SET number = ${newNumber}, zone_id = ${newZoneId}::uuid, capacity = ${newCapacity}, shape = ${newShape} WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid`;
    return { ...table, number: newNumber, zoneId: newZoneId, capacity: newCapacity, shape: newShape };
  }

  async deleteTable(tenantId: string, tableId: string) {
    const table = await this.prisma.restaurantTable.findFirst({ where: { id: tableId, tenantId, isActive: true } });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    if (table.status === 'occupied') throw new BadRequestException('No se puede eliminar una mesa ocupada');
    await this.prisma.$executeRaw`UPDATE tables SET is_active = false WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid`;
    return { success: true };
  }
}
