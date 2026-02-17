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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let AuditService = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(entry) {
        try {
            await this.prisma.$queryRaw `
        INSERT INTO audit_logs (tenant_id, user_id, user_name, user_role, action, entity_type, entity, entity_id, description, details, ip_address, user_agent, severity)
        VALUES (
  ${entry.tenantId}::uuid,
  ${entry.userId || null}::uuid,
  ${entry.userName || null},
  ${entry.userRole || null},
  ${entry.action},
  ${entry.entity},
  ${entry.entity},
  ${entry.entityId || null}::uuid,
  ${entry.description},
  ${JSON.stringify(entry.details || {})}::jsonb,
  ${entry.ipAddress || null},
  ${entry.userAgent || null},
  ${entry.severity || 'info'}
)
      `;
        }
        catch (e) {
            console.error('[AuditService] Failed to log:', e);
        }
    }
    async logMany(entries) {
        for (const entry of entries) {
            await this.log(entry);
        }
    }
    async getDashboard(tenantId) {
        const [summary, recentCritical, activityByHour, topUsers, topActions] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT
          COUNT(*)::int as total_events,
          COUNT(*) FILTER (WHERE severity = 'critical')::int as critical_count,
          COUNT(*) FILTER (WHERE severity = 'warning')::int as warning_count,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int as today_count,
          COUNT(DISTINCT user_id)::int as active_users_today
        FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      `,
            this.prisma.$queryRaw `
        SELECT id, user_name, action, entity, description, severity, created_at
        FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid AND severity = 'critical'
        ORDER BY created_at DESC LIMIT 10
      `,
            this.prisma.$queryRaw `
        SELECT
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*)::int as count
        FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid AND created_at >= CURRENT_DATE
        GROUP BY hour ORDER BY hour
      `,
            this.prisma.$queryRaw `
        SELECT user_name, user_role, COUNT(*)::int as event_count
        FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at >= CURRENT_DATE - INTERVAL '7 days'
          AND user_name IS NOT NULL
        GROUP BY user_name, user_role
        ORDER BY event_count DESC LIMIT 10
      `,
            this.prisma.$queryRaw `
        SELECT action, entity, COUNT(*)::int as count
        FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY action, entity
        ORDER BY count DESC LIMIT 15
      `,
        ]);
        return {
            summary: summary[0] || {},
            recentCritical,
            activityByHour,
            topUsers,
            topActions,
        };
    }
    async search(tenantId, filters) {
        const conditions = [`tenant_id = '${tenantId}'`];
        if (filters.action)
            conditions.push(`action = '${filters.action}'`);
        if (filters.entity)
            conditions.push(`entity = '${filters.entity}'`);
        if (filters.userId)
            conditions.push(`user_id = '${filters.userId}'`);
        if (filters.severity)
            conditions.push(`severity = '${filters.severity}'`);
        if (filters.dateFrom)
            conditions.push(`created_at >= '${filters.dateFrom}'`);
        if (filters.dateTo)
            conditions.push(`created_at <= '${filters.dateTo}T23:59:59'`);
        if (filters.search) {
            const s = filters.search.replace(/'/g, "''");
            conditions.push(`(description ILIKE '%${s}%' OR user_name ILIKE '%${s}%' OR entity_id ILIKE '%${s}%')`);
        }
        const where = conditions.join(' AND ');
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const offset = (page - 1) * limit;
        const [logs, countResult] = await Promise.all([
            this.prisma.$queryRawUnsafe(`
        SELECT * FROM audit_logs
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
            this.prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int as total FROM audit_logs WHERE ${where}
      `),
        ]);
        return {
            data: logs,
            total: countResult[0]?.total || 0,
            page,
            limit,
            totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
        };
    }
    async getFilterOptions(tenantId) {
        const [actions, entities, users] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT DISTINCT action FROM audit_logs WHERE tenant_id = ${tenantId}::uuid ORDER BY action
      `,
            this.prisma.$queryRaw `
        SELECT DISTINCT entity FROM audit_logs WHERE tenant_id = ${tenantId}::uuid ORDER BY entity
      `,
            this.prisma.$queryRaw `
        SELECT DISTINCT user_id, user_name FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid AND user_name IS NOT NULL
        ORDER BY user_name
      `,
        ]);
        return {
            actions: actions.map(a => a.action),
            entities: entities.map(e => e.entity),
            users: users,
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map