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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const branch_filter_1 = require("../../helpers/branch-filter");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    parseDates(from, to) {
        const start = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
        const end = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();
        return { start, end };
    }
    async salesSummary(tenantId, from, to, branchId) {
        const { start, end } = this.parseDates(from, to);
        const bf = (0, branch_filter_1.branchCondition)(branchId);
        const [summary, daily, payments] = await Promise.all([
            this.prisma.$queryRawUnsafe(`
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
        WHERE tenant_id = '${tenantId}'
          AND created_at >= '${start.toISOString()}' AND created_at <= '${end.toISOString()}'
          ${bf}
      `),
            this.prisma.$queryRawUnsafe(`
        SELECT 
          DATE(created_at) as date, COUNT(*)::int as orders,
          COALESCE(SUM(total), 0)::float as sales, COALESCE(AVG(total), 0)::float as avg_ticket
        FROM orders
        WHERE tenant_id = '${tenantId}'
          AND created_at >= '${start.toISOString()}' AND created_at <= '${end.toISOString()}'
          AND status = 'completed'
          ${bf}
        GROUP BY DATE(created_at) ORDER BY date
      `),
            this.prisma.$queryRawUnsafe(`
        SELECT p.method, COUNT(*)::int as count, COALESCE(SUM(p.amount), 0)::float as total
        FROM payments p JOIN orders o ON o.id = p.order_id
        WHERE p.tenant_id = '${tenantId}'
          AND p.created_at >= '${start.toISOString()}' AND p.created_at <= '${end.toISOString()}'
          AND o.status = 'completed'
          ${bf ? bf.replace('branch_id', 'o.branch_id') : ''}
        GROUP BY p.method ORDER BY total DESC
      `),
        ]);
        return { summary: summary[0], daily, payments, period: { from: start, to: end } };
    }
    async productRanking(tenantId, from, to, sortBy = 'revenue', branchId) {
        const { start, end } = this.parseDates(from, to);
        const bf = (0, branch_filter_1.branchCondition)(branchId)?.replace('branch_id', 'o.branch_id') || '';
        const orderCol = sortBy === 'quantity' ? 'SUM(oi.quantity)' : 'SUM(oi.subtotal)';
        const rows = await this.prisma.$queryRawUnsafe(`
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
      WHERE oi.tenant_id = '${tenantId}'
        AND o.created_at >= '${start.toISOString()}' AND o.created_at <= '${end.toISOString()}'
        AND o.status = 'completed' AND oi.is_void = false
        ${bf}
      GROUP BY p.id, p.name, p.sku, p.price, pc.name
      ORDER BY ${orderCol} DESC
      LIMIT 50
    `);
        return { products: rows, period: { from: start, to: end } };
    }
    async categoryBreakdown(tenantId, from, to, branchId) {
        const { start, end } = this.parseDates(from, to);
        const bf = (0, branch_filter_1.branchCondition)(branchId)?.replace('branch_id', 'o.branch_id') || '';
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT 
        COALESCE(pc.name, 'Sin categoría') as category,
        SUM(oi.subtotal)::float as revenue, SUM(oi.quantity)::float as items_sold,
        COUNT(DISTINCT oi.order_id)::int as order_count,
        COUNT(DISTINCT oi.product_id)::int as unique_products,
        ROUND(SUM(oi.subtotal) * 100.0 / NULLIF(SUM(SUM(oi.subtotal)) OVER (), 0), 1)::float as percentage
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.tenant_id = '${tenantId}'
        AND o.created_at >= '${start.toISOString()}' AND o.created_at <= '${end.toISOString()}'
        AND o.status = 'completed' AND oi.is_void = false
        ${bf}
      GROUP BY pc.name ORDER BY revenue DESC
    `);
        return { categories: rows, period: { from: start, to: end } };
    }
    async serverPerformance(tenantId, from, to, branchId) {
        const { start, end } = this.parseDates(from, to);
        const bf = (0, branch_filter_1.branchCondition)(branchId)?.replace('branch_id', 'o.branch_id') || '';
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT 
        u.id as user_id, u.first_name || ' ' || u.last_name as name, r.name as role_name,
        COUNT(o.id)::int as orders_count, COALESCE(SUM(o.total), 0)::float as total_sales,
        COALESCE(AVG(o.total), 0)::float as avg_ticket, COALESCE(MAX(o.total), 0)::float as max_ticket,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.closed_at - o.opened_at)) / 60), 0)::float as avg_time_minutes
      FROM orders o
      JOIN users u ON u.id = o.served_by
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE o.tenant_id = '${tenantId}'
        AND o.created_at >= '${start.toISOString()}' AND o.created_at <= '${end.toISOString()}'
        AND o.status = 'completed'
        ${bf}
      GROUP BY u.id, u.first_name, u.last_name, r.name
      ORDER BY total_sales DESC
    `);
        return { servers: rows, period: { from: start, to: end } };
    }
    async hourlyPatterns(tenantId, from, to, branchId) {
        const { start, end } = this.parseDates(from, to);
        const bf = (0, branch_filter_1.branchCondition)(branchId);
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT 
        EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::float as sales, COALESCE(AVG(total), 0)::float as avg_ticket
      FROM orders
      WHERE tenant_id = '${tenantId}'
        AND created_at >= '${start.toISOString()}' AND created_at <= '${end.toISOString()}'
        AND status = 'completed'
        ${bf}
      GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY hour
    `);
        const hourly = Array.from({ length: 24 }, (_, i) => {
            const found = rows.find(r => r.hour === i);
            return { hour: i, label: `${i.toString().padStart(2, '0')}:00`, orders: found?.orders || 0, sales: found?.sales || 0, avg_ticket: found?.avg_ticket || 0 };
        });
        return { hourly, period: { from: start, to: end } };
    }
    async dayOfWeekPatterns(tenantId, from, to, branchId) {
        const { start, end } = this.parseDates(from, to);
        const bf = (0, branch_filter_1.branchCondition)(branchId);
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT 
        EXTRACT(DOW FROM created_at)::int as dow, COUNT(*)::int as orders,
        COALESCE(SUM(total), 0)::float as sales, COALESCE(AVG(total), 0)::float as avg_ticket
      FROM orders
      WHERE tenant_id = '${tenantId}'
        AND created_at >= '${start.toISOString()}' AND created_at <= '${end.toISOString()}'
        AND status = 'completed'
        ${bf}
      GROUP BY EXTRACT(DOW FROM created_at) ORDER BY dow
    `);
        const weekly = Array.from({ length: 7 }, (_, i) => {
            const found = rows.find(r => r.dow === i);
            return { dow: i, day: dayNames[i], orders: found?.orders || 0, sales: found?.sales || 0, avg_ticket: found?.avg_ticket || 0 };
        });
        return { weekly, period: { from: start, to: end } };
    }
    async orderTypeBreakdown(tenantId, from, to, branchId) {
        const { start, end } = this.parseDates(from, to);
        const bf = (0, branch_filter_1.branchCondition)(branchId);
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT type, COUNT(*)::int as orders, COALESCE(SUM(total), 0)::float as sales,
        COALESCE(AVG(total), 0)::float as avg_ticket
      FROM orders
      WHERE tenant_id = '${tenantId}'
        AND created_at >= '${start.toISOString()}' AND created_at <= '${end.toISOString()}'
        AND status = 'completed'
        ${bf}
      GROUP BY type ORDER BY sales DESC
    `);
        return { types: rows, period: { from: start, to: end } };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map