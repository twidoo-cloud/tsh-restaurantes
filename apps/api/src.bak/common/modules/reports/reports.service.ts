import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private parseDates(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();
    return { start, end };
  }

  // ─── SALES SUMMARY ───
  async salesSummary(tenantId: string, from?: string, to?: string) {
    const { start, end } = this.parseDates(from, to);

    const [summary, daily, payments]: any[] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT 
          COUNT(*)::int as total_orders,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
          COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0)::float as gross_sales,
          COALESCE(SUM(tax_amount) FILTER (WHERE status = 'completed'), 0)::float as tax_total,
          COALESCE(SUM(discount_amount) FILTER (WHERE status = 'completed'), 0)::float as discounts,
          COALESCE(SUM(total - tax_amount) FILTER (WHERE status = 'completed'), 0)::float as net_sales,
          COALESCE(AVG(total) FILTER (WHERE status = 'completed'), 0)::float as avg_ticket,
          COALESCE(MAX(total) FILTER (WHERE status = 'completed'), 0)::float as max_ticket
        FROM orders
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at >= ${start} AND created_at <= ${end}
      `,
      this.prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*)::int as orders,
          COALESCE(SUM(total), 0)::float as sales,
          COALESCE(AVG(total), 0)::float as avg_ticket
        FROM orders
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at >= ${start} AND created_at <= ${end}
          AND status = 'completed'
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      this.prisma.$queryRaw`
        SELECT 
          p.method,
          COUNT(*)::int as count,
          COALESCE(SUM(p.amount), 0)::float as total
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        WHERE p.tenant_id = ${tenantId}::uuid
          AND p.created_at >= ${start} AND p.created_at <= ${end}
          AND o.status = 'completed'
        GROUP BY p.method
        ORDER BY total DESC
      `,
    ]);

    return { summary: summary[0], daily, payments, period: { from: start, to: end } };
  }

  // ─── PRODUCTS RANKING ───
  async productRanking(tenantId: string, from?: string, to?: string, sortBy: string = 'revenue', limit: number = 50) {
    const { start, end } = this.parseDates(from, to);
    const orderCol = sortBy === 'quantity' ? 'total_quantity' : 'total_revenue';

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        p.id, p.name, p.sku, p.price::float,
        COALESCE(pc.name, 'Sin categoría') as category,
        SUM(oi.quantity)::float as total_quantity,
        SUM(oi.subtotal)::float as total_revenue,
        COUNT(DISTINCT oi.order_id)::int as order_count,
        COALESCE(AVG(oi.unit_price), 0)::float as avg_price
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.tenant_id = ${tenantId}::uuid
        AND o.created_at >= ${start} AND o.created_at <= ${end}
        AND o.status = 'completed'
        AND oi.is_void = false
      GROUP BY p.id, p.name, p.sku, p.price, pc.name
      ORDER BY 
        CASE WHEN ${sortBy} = 'quantity' THEN SUM(oi.quantity) ELSE SUM(oi.subtotal) END DESC
      LIMIT ${limit}
    `;

    return { products: rows, period: { from: start, to: end } };
  }

  // ─── CATEGORY BREAKDOWN ───
  async categoryBreakdown(tenantId: string, from?: string, to?: string) {
    const { start, end } = this.parseDates(from, to);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        COALESCE(pc.name, 'Sin categoría') as category,
        SUM(oi.subtotal)::float as revenue,
        SUM(oi.quantity)::float as items_sold,
        COUNT(DISTINCT oi.order_id)::int as order_count,
        COUNT(DISTINCT oi.product_id)::int as unique_products,
        ROUND(SUM(oi.subtotal) * 100.0 / NULLIF(SUM(SUM(oi.subtotal)) OVER (), 0), 1)::float as percentage
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.tenant_id = ${tenantId}::uuid
        AND o.created_at >= ${start} AND o.created_at <= ${end}
        AND o.status = 'completed'
        AND oi.is_void = false
      GROUP BY pc.name
      ORDER BY revenue DESC
    `;

    return { categories: rows, period: { from: start, to: end } };
  }

  // ─── SERVER/WAITER PERFORMANCE ───
  async serverPerformance(tenantId: string, from?: string, to?: string) {
    const { start, end } = this.parseDates(from, to);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as name,
        r.name as role_name,
        COUNT(o.id)::int as orders_count,
        COALESCE(SUM(o.total), 0)::float as total_sales,
        COALESCE(AVG(o.total), 0)::float as avg_ticket,
        COALESCE(MAX(o.total), 0)::float as max_ticket,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at)) / 60), 0)::float as avg_time_minutes
      FROM orders o
      JOIN users u ON u.id = o.served_by
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE o.tenant_id = ${tenantId}::uuid
        AND o.created_at >= ${start} AND o.created_at <= ${end}
        AND o.status = 'completed'
      GROUP BY u.id, u.first_name, u.last_name, r.name
      ORDER BY total_sales DESC
    `;

    return { servers: rows, period: { from: start, to: end } };
  }

  // ─── HOURLY PATTERNS ───
  async hourlyPatterns(tenantId: string, from?: string, to?: string) {
    const { start, end } = this.parseDates(from, to);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM created_at)::int as hour,
        COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::float as sales,
        COALESCE(AVG(total), 0)::float as avg_ticket
      FROM orders
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${start} AND created_at <= ${end}
        AND status = 'completed'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;

    const hourly = Array.from({ length: 24 }, (_, i) => {
      const found = rows.find(r => r.hour === i);
      return { hour: i, label: `${i.toString().padStart(2, '0')}:00`, orders: found?.orders || 0, sales: found?.sales || 0, avg_ticket: found?.avg_ticket || 0 };
    });

    return { hourly, period: { from: start, to: end } };
  }

  // ─── DAY-OF-WEEK PATTERNS ───
  async dayOfWeekPatterns(tenantId: string, from?: string, to?: string) {
    const { start, end } = this.parseDates(from, to);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM created_at)::int as dow,
        COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::float as sales,
        COALESCE(AVG(total), 0)::float as avg_ticket
      FROM orders
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${start} AND created_at <= ${end}
        AND status = 'completed'
      GROUP BY EXTRACT(DOW FROM created_at)
      ORDER BY dow
    `;

    const weekly = Array.from({ length: 7 }, (_, i) => {
      const found = rows.find(r => r.dow === i);
      return { dow: i, day: dayNames[i], orders: found?.orders || 0, sales: found?.sales || 0, avg_ticket: found?.avg_ticket || 0 };
    });

    return { weekly, period: { from: start, to: end } };
  }

  // ─── ORDER TYPE BREAKDOWN ───
  async orderTypeBreakdown(tenantId: string, from?: string, to?: string) {
    const { start, end } = this.parseDates(from, to);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        type,
        COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::float as sales,
        COALESCE(AVG(total), 0)::float as avg_ticket
      FROM orders
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${start} AND created_at <= ${end}
        AND status = 'completed'
      GROUP BY type
      ORDER BY sales DESC
    `;

    return { types: rows, period: { from: start, to: end } };
  }
}
