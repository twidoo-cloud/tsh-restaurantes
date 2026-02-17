import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private branchFilter(branchId: string | null) {
    return branchId
      ? Prisma.sql`AND branch_id = ${branchId}::uuid`
      : Prisma.empty;
  }

  private branchFilterAlias(alias: string, branchId: string | null) {
    return branchId
      ? Prisma.sql`AND ${Prisma.raw(alias)}.branch_id = ${branchId}::uuid`
      : Prisma.empty;
  }

  async getTodaySummary(tenantId: string, branchId: string | null = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bf = this.branchFilter(branchId);

    const [orders, payments, openOrders]: any[] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT 
          COUNT(*)::int as total_orders,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_orders,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled_orders,
          COUNT(*) FILTER (WHERE status IN ('open', 'in_progress'))::int as active_orders,
          COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0)::float as gross_sales,
          COALESCE(SUM(tax_amount) FILTER (WHERE status = 'completed'), 0)::float as tax_collected,
          COALESCE(SUM(discount_amount) FILTER (WHERE status = 'completed'), 0)::float as discounts,
          COALESCE(AVG(total) FILTER (WHERE status = 'completed'), 0)::float as avg_ticket,
          COALESCE(MAX(total) FILTER (WHERE status = 'completed'), 0)::float as max_ticket,
          COALESCE(MIN(total) FILTER (WHERE status = 'completed' AND total > 0), 0)::float as min_ticket
        FROM orders
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at >= ${today}
          ${bf}
      `,
      this.prisma.$queryRaw`
        SELECT 
          method,
          COUNT(*)::int as count,
          COALESCE(SUM(amount), 0)::float as total
        FROM payments p
        JOIN orders o ON o.id = p.order_id
        WHERE p.tenant_id = ${tenantId}::uuid
          AND p.created_at >= ${today}
          AND o.status = 'completed'
          ${branchId ? Prisma.sql`AND o.branch_id = ${branchId}::uuid` : Prisma.empty}
        GROUP BY method
        ORDER BY total DESC
      `,
      this.prisma.$queryRaw`
        SELECT COUNT(*)::int as count
        FROM orders
        WHERE tenant_id = ${tenantId}::uuid
          AND status IN ('open', 'in_progress')
          ${bf}
      `,
    ]);

    return {
      summary: orders[0],
      paymentMethods: payments,
      activeOrders: openOrders[0]?.count || 0,
    };
  }

  async getSalesByHour(tenantId: string, branchId: string | null = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bf = this.branchFilter(branchId);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM created_at)::int as hour,
        COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::float as sales
      FROM orders
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${today}
        AND status = 'completed'
        ${bf}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;

    const hourly = Array.from({ length: 24 }, (_, i) => {
      const found = rows.find(r => r.hour === i);
      return {
        hour: i,
        label: `${i.toString().padStart(2, '0')}:00`,
        orders: found?.orders || 0,
        sales: found?.sales || 0,
      };
    });

    return hourly;
  }

  async getTopProducts(tenantId: string, branchId: string | null = null, limit: number = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.price::float,
        pc.name as category_name,
        SUM(oi.quantity)::float as total_quantity,
        SUM(oi.subtotal)::float as total_revenue,
        COUNT(DISTINCT oi.order_id)::int as order_count
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.tenant_id = ${tenantId}::uuid
        AND o.created_at >= ${today}
        AND o.status = 'completed'
        AND oi.is_void = false
        ${branchId ? Prisma.sql`AND o.branch_id = ${branchId}::uuid` : Prisma.empty}
      GROUP BY p.id, p.name, p.price, pc.name
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `;

    return rows;
  }

  async getSalesByCategory(tenantId: string, branchId: string | null = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        COALESCE(pc.name, 'Sin categoría') as category,
        SUM(oi.subtotal)::float as revenue,
        SUM(oi.quantity)::float as items_sold,
        COUNT(DISTINCT oi.order_id)::int as order_count
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.tenant_id = ${tenantId}::uuid
        AND o.created_at >= ${today}
        AND o.status = 'completed'
        AND oi.is_void = false
        ${branchId ? Prisma.sql`AND o.branch_id = ${branchId}::uuid` : Prisma.empty}
      GROUP BY pc.name
      ORDER BY revenue DESC
    `;

    return rows;
  }

  async getTableStats(tenantId: string, branchId: string | null = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tbf = branchId ? Prisma.sql`AND t.branch_id = ${branchId}::uuid` : Prisma.empty;

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        t.number as table_number,
        t.capacity,
        t.status as current_status,
        COUNT(o.id)::int as orders_today,
        COALESCE(SUM(o.total), 0)::float as revenue,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at)) / 60), 0)::float as avg_duration_minutes
      FROM tables t
      LEFT JOIN orders o ON o.metadata->>'table_id' = t.id::text
        AND o.created_at >= ${today}
        AND o.status = 'completed'
      WHERE t.tenant_id = ${tenantId}::uuid
        AND t.is_active = true
        ${tbf}
      GROUP BY t.id, t.number, t.capacity, t.status
      ORDER BY revenue DESC
    `;

    return rows;
  }

  async getRecentOrders(tenantId: string, branchId: string | null = null, limit: number = 15) {
    return this.prisma.order.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        status: 'completed',
      },
      include: {
        items: {
          where: { isVoid: false },
          include: { product: { select: { name: true } } },
        },
        payments: { select: { method: true, amount: true } },
      },
      orderBy: { closedAt: 'desc' },
      take: limit,
    });
  }

  async getSalesTrend(tenantId: string, branchId: string | null = null) {
    const bf = this.branchFilter(branchId);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::float as sales,
        COALESCE(AVG(total), 0)::float as avg_ticket
      FROM orders
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= NOW() - INTERVAL '7 days'
        AND status = 'completed'
        ${bf}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    return rows;
  }

  async getServerStats(tenantId: string, branchId: string | null = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bf = this.branchFilterAlias('o', branchId);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT 
        u.first_name || ' ' || u.last_name as server_name,
        r.name as role_name,
        COUNT(o.id)::int as orders_count,
        COALESCE(SUM(o.total), 0)::float as total_sales,
        COALESCE(AVG(o.total), 0)::float as avg_ticket
      FROM orders o
      JOIN users u ON u.id = o.served_by
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE o.tenant_id = ${tenantId}::uuid
        AND o.created_at >= ${today}
        AND o.status = 'completed'
        ${bf}
      GROUP BY u.id, u.first_name, u.last_name, r.name
      ORDER BY total_sales DESC
    `;

    return rows;
  }

  async getCostAnalysis(tenantId: string, branchId: string | null = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows: any[] = await this.prisma.$queryRaw`
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.price::float as price,
        COALESCE(p.cost, 0)::float as cost,
        SUM(oi.quantity)::float as qty_sold,
        SUM(oi.subtotal)::float as revenue,
        SUM(oi.quantity * COALESCE(p.cost, 0))::float as total_cost
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.tenant_id = ${tenantId}::uuid
        AND o.created_at >= ${today}
        AND o.status = 'completed'
        AND oi.is_void = false
        ${branchId ? Prisma.sql`AND o.branch_id = ${branchId}::uuid` : Prisma.empty}
      GROUP BY p.id, p.name, p.price, p.cost
      ORDER BY revenue DESC
    `;

    const totalRevenue = rows.reduce((s, r) => s + (r.revenue || 0), 0);
    const totalCost = rows.reduce((s, r) => s + (r.total_cost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const withRecipe = rows.filter(r => r.cost > 0);
    const withoutRecipe = rows.filter(r => r.cost === 0);
    const lowMargin = withRecipe.filter(r => {
      const m = r.price > 0 ? ((r.price - r.cost) / r.price) * 100 : 0;
      return m < 30;
    });

    const bf = this.branchFilter(branchId);
    const lowStock: any[] = await this.prisma.$queryRaw`
      SELECT id, name, unit, current_stock::float, min_stock::float
      FROM ingredients
      WHERE tenant_id = ${tenantId}::uuid
        AND is_active = true
        AND current_stock <= min_stock
        ${bf}
      ORDER BY current_stock ASC
      LIMIT 10
    `;

    return {
      today: {
        revenue: Math.round(totalRevenue * 100) / 100,
        estimatedCost: Math.round(totalCost * 100) / 100,
        estimatedProfit: Math.round(totalProfit * 100) / 100,
        avgMargin: Math.round(avgMargin * 10) / 10,
        productsWithCost: withRecipe.length,
        productsWithoutCost: withoutRecipe.length,
        lowMarginProducts: lowMargin.length,
      },
      products: rows.map(r => ({
        productId: r.product_id,
        name: r.product_name,
        price: r.price,
        cost: r.cost,
        qtySold: r.qty_sold,
        revenue: Math.round((r.revenue || 0) * 100) / 100,
        totalCost: Math.round((r.total_cost || 0) * 100) / 100,
        profit: Math.round(((r.revenue || 0) - (r.total_cost || 0)) * 100) / 100,
        margin: r.price > 0 && r.cost > 0 ? Math.round(((r.price - r.cost) / r.price) * 1000) / 10 : null,
      })),
      lowStockAlerts: lowStock,
    };
  }
}
