import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { branchConditionFor } from '../../helpers/branch-filter';

export type MovementType = 'purchase' | 'sale' | 'adjustment' | 'waste' | 'transfer' | 'return' | 'initial';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notif: NotificationsService,
  ) {}

  // Products are shared tenant-level — NO branch filter on products
  async getStockLevels(tenantId: string, filters?: { categoryId?: string; lowStockOnly?: boolean; search?: string }) {
    const conditions: string[] = [`p.tenant_id = '${tenantId}'`, `p.is_active = true`, `p.track_inventory = true`];
    if (filters?.categoryId) conditions.push(`p.category_id = '${filters.categoryId}'`);
    if (filters?.search) {
      const s = filters.search.replace(/'/g, "''");
      conditions.push(`(p.name ILIKE '%${s}%' OR p.sku ILIKE '%${s}%')`);
    }
    if (filters?.lowStockOnly) conditions.push(`p.current_stock <= p.min_stock`);
    const where = conditions.join(' AND ');

    return this.prisma.$queryRawUnsafe(`
      SELECT p.id, p.name, p.sku, p.unit, p.current_stock, p.min_stock,
        COALESCE(p.cost, 0)::float as cost,
        (p.current_stock * COALESCE(p.cost, 0))::float as "stockValue",
        c.name as category_name,
        CASE WHEN p.current_stock <= 0 THEN 'out_of_stock'
             WHEN p.current_stock <= p.min_stock THEN 'low_stock'
             ELSE 'in_stock' END as stock_status,
        (SELECT sm.created_at FROM stock_movements sm WHERE sm.entity_type = 'product' AND sm.entity_id = p.id ORDER BY sm.created_at DESC LIMIT 1) as last_movement_at
      FROM products p
      LEFT JOIN product_categories c ON c.id = p.category_id
      WHERE ${where}
      ORDER BY CASE WHEN p.current_stock <= 0 THEN 0 WHEN p.current_stock <= p.min_stock THEN 1 ELSE 2 END, p.name
    `);
  }

  async getStockLevelsSimple(tenantId: string, branchId?: string | null, filters?: { categoryId?: string; lowStockOnly?: boolean; search?: string }) {
    return this.getStockLevels(tenantId, filters);
  }

  async recordMovement(tenantId: string, userId: string, data: {
    productId: string; movementType: MovementType; quantity: number; unitCost?: number; reference?: string; notes?: string; supplierId?: string;
  }, branchId?: string | null) {
    const products: any[] = await this.prisma.$queryRaw`
      SELECT id, name, current_stock, min_stock FROM products WHERE id = ${data.productId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (!products.length) throw new NotFoundException('Producto no encontrado');

    const product = products[0];
    const currentStock = parseFloat(product.current_stock || '0');
    const isIncoming = ['purchase', 'return', 'initial', 'adjustment'].includes(data.movementType);
    const quantityChange = isIncoming ? Math.abs(data.quantity) : -Math.abs(data.quantity);
    const newStock = currentStock + quantityChange;

    if (newStock < 0 && data.movementType !== 'adjustment') {
      throw new BadRequestException(`Stock insuficiente. Stock actual: ${currentStock}`);
    }

    let supplierName: string | null = null;
    if (data.supplierId) {
      const suppliers: any[] = await this.prisma.$queryRaw`
        SELECT name FROM suppliers WHERE id = ${data.supplierId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      supplierName = suppliers[0]?.name || null;
    }

    const notesWithSupplier = [data.notes, supplierName ? `Proveedor: ${supplierName}` : null].filter(Boolean).join(' | ') || null;
    const refWithSupplier = data.supplierId ? `supplier:${data.supplierId}${data.reference ? '|' + data.reference : ''}` : (data.reference || null);

    // Include branch_id on stock_movements
    const bId = branchId || null;
    await this.prisma.$queryRaw`
      INSERT INTO stock_movements (tenant_id, branch_id, entity_type, entity_id, type, quantity, unit_cost, reference_type, notes, performed_by)
      VALUES (${tenantId}::uuid, ${bId}::uuid, 'product', ${data.productId}::uuid, ${data.movementType}, ${quantityChange},
        ${data.unitCost || 0}, ${refWithSupplier}, ${notesWithSupplier}, ${userId}::uuid)
    `;

    await this.prisma.$queryRaw`
      UPDATE products SET current_stock = ${newStock}, updated_at = NOW() WHERE id = ${data.productId}::uuid
    `;

    const userName = await this.getUserName(userId);
    this.audit.log({
      tenantId, userId, userName, action: data.movementType, entity: 'inventory',
      entityId: data.productId,
      description: `${data.movementType}: ${product.name} ${quantityChange > 0 ? '+' : ''}${quantityChange} (${currentStock} → ${newStock})`,
      details: { productName: product.name, movementType: data.movementType, quantity: quantityChange, previousStock: currentStock, newStock },
    });

    if (newStock <= parseFloat(product.min_stock || '0') && newStock > 0) {
      this.notif.notifyLowStock(tenantId, product.name, newStock);
    }

    if (newStock <= 0) {
      this.notif.create({
        tenantId, title: 'Sin Stock',
        message: `${product.name} se ha quedado sin stock`,
        type: 'warning', priority: 'urgent', entity: 'product',
        entityId: data.productId, actionUrl: '/inventory',
      });
    }

    return { productId: data.productId, productName: product.name, previousStock: currentStock, newStock, quantityChange };
  }

  async bulkAdjustment(tenantId: string, userId: string, adjustments: { productId: string; newStock: number; notes?: string }[], branchId?: string | null) {
    const results = [];
    for (const adj of adjustments) {
      const products: any[] = await this.prisma.$queryRaw`
        SELECT current_stock FROM products WHERE id = ${adj.productId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      if (!products.length) continue;
      const diff = adj.newStock - parseFloat(products[0].current_stock || '0');
      if (diff !== 0) {
        const result = await this.recordMovement(tenantId, userId, {
          productId: adj.productId, movementType: 'adjustment', quantity: diff, notes: adj.notes || 'Ajuste masivo',
        }, branchId);
        results.push(result);
      }
    }

    this.audit.log({
      tenantId, userId, action: 'adjustment', entity: 'inventory',
      description: `Ajuste masivo: ${results.length} productos ajustados`,
      severity: 'warning', details: { adjustedCount: results.length },
    });

    return results;
  }

  // Stock movements ARE branch-specific
  async getMovements(tenantId: string, filters?: { productId?: string; movementType?: string; page?: number; limit?: number; branchId?: string | null }) {
    const conditions: string[] = [`sm.tenant_id = '${tenantId}'`];
    if (filters?.productId) conditions.push(`sm.entity_id = '${filters.productId}'`);
    if (filters?.movementType) conditions.push(`sm.type = '${filters.movementType}'`);
    if (filters?.branchId) conditions.push(`sm.branch_id = '${filters.branchId}'`);
    conditions.push(`sm.entity_type = 'product'`);
    const where = conditions.join(' AND ');
    const page = filters?.page || 1;
    const limit = filters?.limit || 30;
    const offset = (page - 1) * limit;

    const movements = await this.prisma.$queryRawUnsafe(`
      SELECT sm.*, p.name as product_name, p.sku, u.first_name || ' ' || u.last_name as created_by_name
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.entity_id
      LEFT JOIN users u ON u.id = sm.performed_by
      WHERE ${where} ORDER BY sm.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
    const countResult = await this.prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as total FROM stock_movements sm WHERE ${where}`);
    return { data: movements, total: countResult[0]?.total || 0, page, limit };
  }

  async getAlerts(tenantId: string, branchId?: string | null) {
    // Alerts are product-level (shared) — no branch filter
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT p.id, p.name, p.sku, p.current_stock::float, p.min_stock::float, c.name as category_name,
        CASE WHEN p.current_stock <= 0 THEN 'out_of_stock' ELSE 'low_stock' END as alert_type
      FROM products p LEFT JOIN product_categories c ON c.id = p.category_id
      WHERE p.tenant_id = ${tenantId}::uuid AND p.is_active = true AND p.track_inventory = true
        AND p.current_stock <= p.min_stock
      ORDER BY p.current_stock ASC
    `;
    return {
      alerts: rows,
      criticalCount: rows.filter((r: any) => r.alert_type === 'out_of_stock').length,
      warningCount: rows.filter((r: any) => r.alert_type === 'low_stock').length,
    };
  }

  async getSummary(tenantId: string, branchId?: string | null) {
    // Summary is product-level (shared) — no branch filter
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*)::int as "totalProducts",
        COUNT(*) FILTER (WHERE current_stock <= 0)::int as "outOfStock",
        COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= min_stock)::int as "lowStock",
        COUNT(*) FILTER (WHERE current_stock > min_stock)::int as "inStock",
        COALESCE(SUM(current_stock * COALESCE(cost, 0)), 0)::float as "totalStockValue"
      FROM products WHERE tenant_id = ${tenantId}::uuid AND is_active = true AND track_inventory = true
    `;
    return result[0];
  }

  async updateMinStock(tenantId: string, productId: string, minStock: number) {
    await this.prisma.$queryRaw`
      UPDATE products SET min_stock = ${minStock}, updated_at = NOW()
      WHERE id = ${productId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    return { success: true };
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
