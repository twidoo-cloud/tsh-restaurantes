import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'critical';
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Log an audit event (fire-and-forget, never throws) */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.$queryRaw`
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
    } catch (e) {
      // Never fail the main operation because of audit logging
      console.error('[AuditService] Failed to log:', e);
    }
  }

  /** Bulk log multiple events */
  async logMany(entries: AuditEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.log(entry);
    }
  }

  // ── Query methods ──

  async getDashboard(tenantId: string) {
    const [summary, recentCritical, activityByHour, topUsers, topActions] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
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
      this.prisma.$queryRaw<any[]>`
        SELECT id, user_name, action, entity, description, severity, created_at
        FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid AND severity = 'critical'
        ORDER BY created_at DESC LIMIT 10
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*)::int as count
        FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid AND created_at >= CURRENT_DATE
        GROUP BY hour ORDER BY hour
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT user_name, user_role, COUNT(*)::int as event_count
        FROM audit_logs
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at >= CURRENT_DATE - INTERVAL '7 days'
          AND user_name IS NOT NULL
        GROUP BY user_name, user_role
        ORDER BY event_count DESC LIMIT 10
      `,
      this.prisma.$queryRaw<any[]>`
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

  async search(tenantId: string, filters: {
    search?: string;
    action?: string;
    entity?: string;
    userId?: string;
    severity?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const conditions: string[] = [`tenant_id = '${tenantId}'`];
    if (filters.action) conditions.push(`action = '${filters.action}'`);
    if (filters.entity) conditions.push(`entity = '${filters.entity}'`);
    if (filters.userId) conditions.push(`user_id = '${filters.userId}'`);
    if (filters.severity) conditions.push(`severity = '${filters.severity}'`);
    if (filters.dateFrom) conditions.push(`created_at >= '${filters.dateFrom}'`);
    if (filters.dateTo) conditions.push(`created_at <= '${filters.dateTo}T23:59:59'`);
    if (filters.search) {
      const s = filters.search.replace(/'/g, "''");
      conditions.push(`(description ILIKE '%${s}%' OR user_name ILIKE '%${s}%' OR entity_id ILIKE '%${s}%')`);
    }

    const where = conditions.join(' AND ');
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const [logs, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM audit_logs
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRawUnsafe<any[]>(`
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

  /** Get available filter values */
  async getFilterOptions(tenantId: string) {
    const [actions, entities, users] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT DISTINCT action FROM audit_logs WHERE tenant_id = ${tenantId}::uuid ORDER BY action
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT DISTINCT entity FROM audit_logs WHERE tenant_id = ${tenantId}::uuid ORDER BY entity
      `,
      this.prisma.$queryRaw<any[]>`
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
}
