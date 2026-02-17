import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new customer
   */
  async create(tenantId: string, data: {
    taxId?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) {
    // Check duplicate taxId
    if (data.taxId) {
      const existing: any[] = await this.prisma.$queryRaw`
        SELECT id FROM customers WHERE tenant_id = ${tenantId}::uuid AND tax_id = ${data.taxId}
      `;
      if (existing.length > 0) throw new ConflictException('Ya existe un cliente con ese RUC/Cédula');
    }

    const rows: any[] = await this.prisma.$queryRaw`
      INSERT INTO customers (tenant_id, tax_id, name, email, phone, address, notes)
      VALUES (${tenantId}::uuid, ${data.taxId || null}, ${data.name}, ${data.email || null},
              ${data.phone || null}, ${data.address || null}, ${data.notes || null})
      RETURNING *
    `;
    return rows[0];
  }

  /**
   * Update customer
   */
  async update(tenantId: string, customerId: string, data: {
    taxId?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) {
    const existing: any[] = await this.prisma.$queryRaw`
      SELECT id FROM customers WHERE id = ${customerId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (!existing.length) throw new NotFoundException('Cliente no encontrado');

    const rows: any[] = await this.prisma.$queryRaw`
      UPDATE customers SET
        tax_id = COALESCE(${data.taxId ?? null}, tax_id),
        name = COALESCE(${data.name ?? null}, name),
        email = COALESCE(${data.email ?? null}, email),
        phone = COALESCE(${data.phone ?? null}, phone),
        address = COALESCE(${data.address ?? null}, address),
        notes = COALESCE(${data.notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${customerId}::uuid AND tenant_id = ${tenantId}::uuid
      RETURNING *
    `;
    return rows[0];
  }

  /**
   * List customers with search and pagination
   */
  async list(tenantId: string, filters?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    const search = filters?.search ? `%${filters.search}%` : null;

    let rows: any[];
    let countResult: any[];

    if (search) {
      rows = await this.prisma.$queryRaw`
        SELECT id, tax_id, name, email, phone, address, notes,
               total_purchases::float, visit_count, created_at, updated_at
        FROM customers
        WHERE tenant_id = ${tenantId}::uuid
          AND (name ILIKE ${search} OR tax_id ILIKE ${search} OR email ILIKE ${search} OR phone ILIKE ${search})
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await this.prisma.$queryRaw`
        SELECT COUNT(*)::int as total FROM customers
        WHERE tenant_id = ${tenantId}::uuid
          AND (name ILIKE ${search} OR tax_id ILIKE ${search} OR email ILIKE ${search} OR phone ILIKE ${search})
      `;
    } else {
      rows = await this.prisma.$queryRaw`
        SELECT id, tax_id, name, email, phone, address, notes,
               total_purchases::float, visit_count, created_at, updated_at
        FROM customers
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY name ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await this.prisma.$queryRaw`
        SELECT COUNT(*)::int as total FROM customers WHERE tenant_id = ${tenantId}::uuid
      `;
    }

    return { data: rows, total: countResult[0]?.total || 0, page, limit };
  }

  /**
   * Get single customer with stats
   */
  async getById(tenantId: string, customerId: string) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT * FROM customers WHERE id = ${customerId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (!rows.length) throw new NotFoundException('Cliente no encontrado');
    return rows[0];
  }

  /**
   * Get customer purchase history
   */
  async getHistory(tenantId: string, customerId: string, limit: number = 20) {
    const orders: any[] = await this.prisma.$queryRaw`
      SELECT o.id, o.order_number, o.status, o.type,
             o.subtotal::float, o.tax_amount::float, o.total::float,
             o.created_at, o.closed_at,
             u.first_name || ' ' || u.last_name as served_by_name,
             (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id AND NOT oi.is_void) as item_count
      FROM orders o
      LEFT JOIN users u ON u.id = o.served_by
      WHERE o.tenant_id = ${tenantId}::uuid AND o.customer_id = ${customerId}::uuid
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `;

    // Also get invoices for this customer
    const invoices: any[] = await this.prisma.$queryRaw`
      SELECT i.id, i.full_number, i.document_type, i.total::float, i.status, i.issued_at
      FROM invoices i
      WHERE i.tenant_id = ${tenantId}::uuid AND i.customer_id = ${customerId}::uuid
      ORDER BY i.issued_at DESC
      LIMIT 10
    `;

    return { orders, invoices };
  }

  /**
   * Get customer stats (spending, frequency, preferences)
   */
  async getStats(tenantId: string, customerId: string) {
    const stats: any[] = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*)::int as total_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed_orders,
        COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0)::float as total_spent,
        COALESCE(AVG(total) FILTER (WHERE status = 'completed'), 0)::float as avg_ticket,
        COALESCE(MAX(total) FILTER (WHERE status = 'completed'), 0)::float as max_ticket,
        MIN(created_at) as first_visit,
        MAX(created_at) as last_visit
      FROM orders
      WHERE tenant_id = ${tenantId}::uuid AND customer_id = ${customerId}::uuid
    `;

    // Top products bought by this customer
    const topProducts: any[] = await this.prisma.$queryRaw`
      SELECT p.name, p.sku,
             SUM(oi.quantity)::float as total_quantity,
             SUM(oi.subtotal)::float as total_spent,
             COUNT(DISTINCT o.id)::int as order_count
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.tenant_id = ${tenantId}::uuid
        AND o.customer_id = ${customerId}::uuid
        AND o.status = 'completed'
        AND NOT oi.is_void
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_quantity DESC
      LIMIT 5
    `;

    // Visit frequency (orders per month in last 6 months)
    const frequency: any[] = await this.prisma.$queryRaw`
      SELECT 
        to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
        COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::float as total
      FROM orders
      WHERE tenant_id = ${tenantId}::uuid
        AND customer_id = ${customerId}::uuid
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY month DESC
    `;

    return {
      ...(stats[0] || {}),
      topProducts,
      frequency,
    };
  }

  /**
   * Search customer by taxId (for POS quick lookup)
   */
  async findByTaxId(tenantId: string, taxId: string) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT id, tax_id, name, email, phone, address, total_purchases::float, visit_count
      FROM customers
      WHERE tenant_id = ${tenantId}::uuid AND tax_id = ${taxId}
    `;
    return rows[0] || null;
  }

  /**
   * Quick search for autocomplete (name, taxId, phone)
   */
  async quickSearch(tenantId: string, query: string) {
    const search = `%${query}%`;
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT id, tax_id, name, email, phone, total_purchases::float, visit_count
      FROM customers
      WHERE tenant_id = ${tenantId}::uuid
        AND (name ILIKE ${search} OR tax_id ILIKE ${search} OR phone ILIKE ${search})
      ORDER BY visit_count DESC
      LIMIT 10
    `;
    return rows;
  }

  /**
   * Get top customers by spending
   */
  async getTopCustomers(tenantId: string, limit: number = 10) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT c.id, c.tax_id, c.name, c.email, c.phone,
             c.total_purchases::float, c.visit_count,
             c.created_at,
             MAX(o.created_at) as last_order_at,
             COALESCE(AVG(o.total) FILTER (WHERE o.status = 'completed'), 0)::float as avg_ticket
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id
      WHERE c.tenant_id = ${tenantId}::uuid
      GROUP BY c.id
      ORDER BY c.total_purchases DESC
      LIMIT ${limit}
    `;
    return rows;
  }

  /**
   * Get CRM dashboard summary
   */
  async getDashboard(tenantId: string) {
    const stats: any[] = await this.prisma.$queryRaw`
      SELECT
        COUNT(*)::int as total_customers,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int as new_last_30d,
        COALESCE(AVG(total_purchases), 0)::float as avg_lifetime_value,
        COALESCE(AVG(visit_count), 0)::float as avg_visits,
        COUNT(*) FILTER (WHERE visit_count >= 5)::int as frequent_customers,
        COUNT(*) FILTER (WHERE visit_count = 1)::int as one_time_customers
      FROM customers
      WHERE tenant_id = ${tenantId}::uuid
    `;

    return stats[0] || {};
  }

  /**
   * Link customer to existing order
   */
  async linkToOrder(tenantId: string, customerId: string, orderId: string) {
    await this.prisma.$executeRaw`
      UPDATE orders SET customer_id = ${customerId}::uuid
      WHERE id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    // Update customer stats
    await this.prisma.$executeRaw`
      UPDATE customers SET 
        visit_count = visit_count + 1,
        total_purchases = total_purchases + COALESCE(
          (SELECT total FROM orders WHERE id = ${orderId}::uuid AND status = 'completed'), 0
        )
      WHERE id = ${customerId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return { customerId, orderId, linked: true };
  }

  /**
   * Delete customer (soft - just remove data)
   */
  async delete(tenantId: string, customerId: string) {
    const existing: any[] = await this.prisma.$queryRaw`
      SELECT id FROM customers WHERE id = ${customerId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (!existing.length) throw new NotFoundException('Cliente no encontrado');

    // Check for linked orders
    const orders: any[] = await this.prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM orders WHERE customer_id = ${customerId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    if (orders[0]?.count > 0) {
      // Just anonymize
      await this.prisma.$executeRaw`
        UPDATE customers SET name = 'ELIMINADO', email = NULL, phone = NULL, address = NULL, tax_id = NULL, notes = 'Cliente eliminado'
        WHERE id = ${customerId}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      return { deleted: false, anonymized: true };
    }

    await this.prisma.$executeRaw`
      DELETE FROM customers WHERE id = ${customerId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    return { deleted: true };
  }
}
