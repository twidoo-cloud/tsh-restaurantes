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
exports.TablesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
let TablesService = class TablesService {
    constructor(prisma, wsGateway) {
        this.prisma = prisma;
        this.wsGateway = wsGateway;
    }
    async getFloorPlans(tenantId) {
        return this.prisma.$queryRaw `
      SELECT fp.id, fp.name, fp.display_order,
        (
          SELECT json_agg(
            json_build_object(
              'id', z.id,
              'name', z.name,
              'color', z.color,
              'display_order', z.display_order,
              'tables', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', t.id,
                    'number', t.number,
                    'capacity', t.capacity,
                    'shape', t.shape,
                    'position_x', t.position_x,
                    'position_y', t.position_y,
                    'width', t.width,
                    'height', t.height,
                    'status', t.status,
                    'current_order_id', t.current_order_id,
                    'merged_with', t.merged_with
                  ) ORDER BY t.number
                ), '[]'::json)
                FROM tables t
                WHERE t.zone_id = z.id AND t.is_active = true AND t.tenant_id = ${tenantId}::uuid
              )
            ) ORDER BY z.display_order
          )
          FROM zones z
          WHERE z.floor_plan_id = fp.id AND z.is_active = true AND z.tenant_id = ${tenantId}::uuid
        ) as zones
      FROM floor_plans fp
      WHERE fp.tenant_id = ${tenantId}::uuid AND fp.is_active = true
      ORDER BY fp.display_order
    `;
    }
    async getTableWithOrder(tenantId, tableId) {
        const tables = await this.prisma.$queryRaw `
      SELECT t.*, z.name as zone_name, z.color as zone_color
      FROM tables t
      JOIN zones z ON z.id = t.zone_id
      WHERE t.id = ${tableId}::uuid AND t.tenant_id = ${tenantId}::uuid
    `;
        if (!tables.length)
            throw new common_1.NotFoundException('Mesa no encontrada');
        const table = tables[0];
        let order = null;
        if (table.current_order_id) {
            order = await this.prisma.order.findFirst({
                where: { id: table.current_order_id, tenantId },
                include: {
                    items: {
                        where: { isVoid: false },
                        include: { product: { select: { id: true, name: true, attributes: true } } },
                    },
                    payments: true,
                },
            });
        }
        return { table, order };
    }
    async updateTableStatus(tenantId, tableId, status, orderId) {
        await this.prisma.$executeRaw `
      UPDATE tables 
      SET status = ${status}, current_order_id = ${orderId}::uuid
      WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        return this.getTableWithOrder(tenantId, tableId);
    }
    async openTable(tenantId, tableId, userId, guestCount = 2) {
        const orderNumber = await this.generateOrderNumber(tenantId);
        const activeShifts = await this.prisma.$queryRaw `
      SELECT id FROM shifts WHERE tenant_id = ${tenantId}::uuid AND status = 'open' ORDER BY opened_at DESC LIMIT 1
    `;
        const shiftId = activeShifts.length > 0 ? activeShifts[0].id : null;
        const order = await this.prisma.order.create({
            data: {
                tenantId,
                orderNumber,
                type: 'dine_in',
                servedBy: userId,
                shiftId,
                metadata: { table_id: tableId, guest_count: guestCount },
            },
        });
        await this.prisma.$executeRaw `
      UPDATE tables 
      SET status = 'occupied', current_order_id = ${order.id}::uuid
      WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        const tableInfo = await this.prisma.$queryRaw `
      SELECT number FROM tables WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        this.wsGateway.emitTableStatusChanged(tenantId, {
            tableId,
            tableNumber: tableInfo[0]?.number || '',
            status: 'occupied',
            orderId: order.id,
        });
        this.wsGateway.emitOrderCreated(tenantId, {
            orderId: order.id,
            orderNumber,
            type: 'dine_in',
            tableId,
        });
        return { table: await this.getTableWithOrder(tenantId, tableId), order };
    }
    async closeTable(tenantId, tableId) {
        const tableInfo = await this.prisma.$queryRaw `
      SELECT number FROM tables WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        await this.prisma.$executeRaw `
      UPDATE tables 
      SET status = 'available', current_order_id = NULL, merged_with = NULL
      WHERE id = ${tableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        this.wsGateway.emitTableStatusChanged(tenantId, {
            tableId,
            tableNumber: tableInfo[0]?.number || '',
            status: 'available',
        });
        return { success: true };
    }
    async transferOrder(tenantId, fromTableId, toTableId) {
        const fromTable = await this.getTableWithOrder(tenantId, fromTableId);
        if (!fromTable.table.current_order_id) {
            throw new common_1.BadRequestException('La mesa origen no tiene orden activa');
        }
        const toTable = await this.getTableWithOrder(tenantId, toTableId);
        if (toTable.table.current_order_id) {
            throw new common_1.BadRequestException('La mesa destino ya tiene una orden activa');
        }
        const orderId = fromTable.table.current_order_id;
        await this.prisma.$executeRaw `
      UPDATE tables SET status = 'available', current_order_id = NULL
      WHERE id = ${fromTableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        await this.prisma.$executeRaw `
      UPDATE tables SET status = 'occupied', current_order_id = ${orderId}::uuid
      WHERE id = ${toTableId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        await this.prisma.$queryRawUnsafe(`
      UPDATE orders SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{table_id}', '"${toTableId}"'),
        notes = COALESCE(notes, '') || ' [Transferido de mesa ${fromTable.table.number} a mesa ${toTable.table.number}]'
      WHERE id = '${orderId}'::uuid
    `);
        this.wsGateway.emitTableStatusChanged(tenantId, { tableId: fromTableId, tableNumber: fromTable.table.number, status: 'available' });
        this.wsGateway.emitTableStatusChanged(tenantId, { tableId: toTableId, tableNumber: toTable.table.number, status: 'occupied', orderId });
        return { success: true, from: fromTable.table.number, to: toTable.table.number };
    }
    async mergeTables(tenantId, primaryTableId, secondaryTableIds) {
        const primary = await this.getTableWithOrder(tenantId, primaryTableId);
        for (const secId of secondaryTableIds) {
            const sec = await this.getTableWithOrder(tenantId, secId);
            if (sec.table.current_order_id && primary.table.current_order_id) {
                await this.prisma.$queryRawUnsafe(`
          UPDATE order_items SET order_id = '${primary.table.current_order_id}'::uuid
          WHERE order_id = '${sec.table.current_order_id}'::uuid
        `);
                await this.prisma.$queryRawUnsafe(`
          UPDATE orders SET status = 'cancelled', notes = COALESCE(notes, '') || ' [Fusionada con mesa ${primary.table.number}]'
          WHERE id = '${sec.table.current_order_id}'::uuid
        `);
            }
            else if (sec.table.current_order_id && !primary.table.current_order_id) {
                await this.prisma.$executeRaw `
          UPDATE tables SET current_order_id = ${sec.table.current_order_id}::uuid, status = 'occupied'
          WHERE id = ${primaryTableId}::uuid AND tenant_id = ${tenantId}::uuid
        `;
            }
            await this.prisma.$queryRawUnsafe(`
        UPDATE tables SET status = 'merged', current_order_id = NULL,
          merged_with = '${primaryTableId}'::uuid
        WHERE id = '${secId}'::uuid AND tenant_id = '${tenantId}'::uuid
      `);
            this.wsGateway.emitTableStatusChanged(tenantId, { tableId: secId, tableNumber: sec.table.number, status: 'merged' });
        }
        if (primary.table.current_order_id) {
            await this.recalcOrderTotals(primary.table.current_order_id);
        }
        this.wsGateway.emitTableStatusChanged(tenantId, { tableId: primaryTableId, tableNumber: primary.table.number, status: 'occupied' });
        return { success: true, primary: primary.table.number, merged: secondaryTableIds.length };
    }
    async unmergeTables(tenantId, primaryTableId) {
        const merged = await this.prisma.$queryRawUnsafe(`
      SELECT id, number FROM tables
      WHERE merged_with = '${primaryTableId}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        for (const t of merged) {
            await this.prisma.$queryRawUnsafe(`
        UPDATE tables SET status = 'available', merged_with = NULL
        WHERE id = '${t.id}'::uuid AND tenant_id = '${tenantId}'::uuid
      `);
            this.wsGateway.emitTableStatusChanged(tenantId, { tableId: t.id, tableNumber: t.number, status: 'available' });
        }
        return { success: true, unmerged: merged.length };
    }
    async swapTables(tenantId, tableAId, tableBId) {
        const tableA = await this.getTableWithOrder(tenantId, tableAId);
        const tableB = await this.getTableWithOrder(tenantId, tableBId);
        const orderA = tableA.table.current_order_id;
        const orderB = tableB.table.current_order_id;
        const statusA = tableA.table.status;
        const statusB = tableB.table.status;
        await this.prisma.$executeRaw `
      UPDATE tables SET current_order_id = ${orderB}::uuid, status = ${statusB}
      WHERE id = ${tableAId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        await this.prisma.$executeRaw `
      UPDATE tables SET current_order_id = ${orderA}::uuid, status = ${statusA}
      WHERE id = ${tableBId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        this.wsGateway.emitTableStatusChanged(tenantId, { tableId: tableAId, tableNumber: tableA.table.number, status: statusB });
        this.wsGateway.emitTableStatusChanged(tenantId, { tableId: tableBId, tableNumber: tableB.table.number, status: statusA });
        return { success: true, swapped: [tableA.table.number, tableB.table.number] };
    }
    async recalcOrderTotals(orderId) {
        const totals = await this.prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(subtotal), 0) as subtotal, COALESCE(SUM(tax_amount), 0) as tax
      FROM order_items WHERE order_id = '${orderId}'::uuid AND is_void = false
    `);
        const sub = parseFloat(totals[0].subtotal);
        const tax = parseFloat(totals[0].tax);
        await this.prisma.$queryRawUnsafe(`
      UPDATE orders SET subtotal = ${sub}, tax_amount = ${tax}, total = ${sub + tax}
      WHERE id = '${orderId}'::uuid
    `);
    }
    async generateOrderNumber(tenantId) {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;
        const lastOrder = await this.prisma.order.findFirst({
            where: { tenantId, orderNumber: { startsWith: prefix } },
            orderBy: { orderNumber: 'desc' },
        });
        let nextNum = 1;
        if (lastOrder) {
            const parts = lastOrder.orderNumber.split('-');
            nextNum = parseInt(parts[2], 10) + 1;
        }
        return `${prefix}${nextNum.toString().padStart(5, '0')}`;
    }
};
exports.TablesService = TablesService;
exports.TablesService = TablesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pos_events_gateway_1.PosEventsGateway])
], TablesService);
//# sourceMappingURL=tables.service.js.map