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
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let StaffService = class StaffService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll(tenantId) {
        const staff = await this.prisma.$queryRawUnsafe(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active,
        u.hire_date, u.hourly_rate, u.salary, u.avatar_url, u.last_login_at,
        r.name as role_name, r.slug as role_slug,
        (SELECT clock_in FROM staff_attendance sa
         WHERE sa.user_id = u.id AND sa.status = 'clocked_in'
         ORDER BY sa.clock_in DESC LIMIT 1) as current_clock_in
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.tenant_id = '${tenantId}'::uuid
      ORDER BY u.first_name, u.last_name
    `);
        return staff;
    }
    async getById(tenantId, userId) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT u.*, r.name as role_name, r.slug as role_slug
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = '${userId}'::uuid AND u.tenant_id = '${tenantId}'::uuid
    `);
        if (!rows.length)
            throw new common_1.NotFoundException('Empleado no encontrado');
        const schedule = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM staff_schedules
      WHERE user_id = '${userId}'::uuid AND tenant_id = '${tenantId}'::uuid AND is_active = true
      ORDER BY day_of_week
    `);
        const attendance = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM staff_attendance
      WHERE user_id = '${userId}'::uuid AND tenant_id = '${tenantId}'::uuid AND status = 'clocked_in'
      ORDER BY clock_in DESC LIMIT 1
    `);
        return { ...rows[0], schedule, currentAttendance: attendance[0] || null };
    }
    async updateProfile(tenantId, userId, dto) {
        const sets = [];
        if (dto.phone !== undefined)
            sets.push(`phone = ${dto.phone ? `'${dto.phone}'` : 'NULL'}`);
        if (dto.hireDate)
            sets.push(`hire_date = '${dto.hireDate}'::date`);
        if (dto.hourlyRate !== undefined)
            sets.push(`hourly_rate = ${dto.hourlyRate}`);
        if (dto.salary !== undefined)
            sets.push(`salary = ${dto.salary}`);
        if (dto.emergencyContact !== undefined)
            sets.push(`emergency_contact = ${dto.emergencyContact ? `'${dto.emergencyContact.replace(/'/g, "''")}'` : 'NULL'}`);
        if (dto.emergencyPhone !== undefined)
            sets.push(`emergency_phone = ${dto.emergencyPhone ? `'${dto.emergencyPhone}'` : 'NULL'}`);
        if (dto.taxId !== undefined)
            sets.push(`tax_id = ${dto.taxId ? `'${dto.taxId}'` : 'NULL'}`);
        if (dto.notes !== undefined)
            sets.push(`notes = ${dto.notes ? `'${dto.notes.replace(/'/g, "''")}'` : 'NULL'}`);
        if (sets.length === 0)
            return this.getById(tenantId, userId);
        await this.prisma.$queryRawUnsafe(`
      UPDATE users SET ${sets.join(', ')} WHERE id = '${userId}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        return this.getById(tenantId, userId);
    }
    async setSchedule(tenantId, dto) {
        await this.prisma.$queryRawUnsafe(`
      UPDATE staff_schedules SET is_active = false
      WHERE user_id = '${dto.userId}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        for (const s of dto.schedule) {
            await this.prisma.$queryRawUnsafe(`
        INSERT INTO staff_schedules (tenant_id, user_id, day_of_week, start_time, end_time)
        VALUES ('${tenantId}'::uuid, '${dto.userId}'::uuid, ${s.dayOfWeek}, '${s.startTime}'::time, '${s.endTime}'::time)
      `);
        }
        return this.getSchedule(tenantId, dto.userId);
    }
    async getSchedule(tenantId, userId) {
        return this.prisma.$queryRawUnsafe(`
      SELECT * FROM staff_schedules
      WHERE user_id = '${userId}'::uuid AND tenant_id = '${tenantId}'::uuid AND is_active = true
      ORDER BY day_of_week
    `);
    }
    async getWeekSchedule(tenantId) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT ss.*, u.first_name, u.last_name, r.name as role_name
      FROM staff_schedules ss
      JOIN users u ON u.id = ss.user_id
      JOIN roles r ON r.id = u.role_id
      WHERE ss.tenant_id = '${tenantId}'::uuid AND ss.is_active = true AND u.is_active = true
      ORDER BY ss.day_of_week, ss.start_time
    `);
        return rows;
    }
    async clockIn(tenantId, dto) {
        const active = await this.prisma.$queryRawUnsafe(`
      SELECT id FROM staff_attendance
      WHERE user_id = '${dto.userId}'::uuid AND tenant_id = '${tenantId}'::uuid AND status = 'clocked_in'
    `);
        if (active.length)
            throw new common_1.BadRequestException('Ya tiene registro de entrada activo');
        const dayOfWeek = new Date().getDay();
        const schedules = await this.prisma.$queryRawUnsafe(`
      SELECT start_time, end_time FROM staff_schedules
      WHERE user_id = '${dto.userId}'::uuid AND tenant_id = '${tenantId}'::uuid
        AND day_of_week = ${dayOfWeek} AND is_active = true
      LIMIT 1
    `);
        const sched = schedules.length ? schedules[0] : null;
        const rows = await this.prisma.$queryRawUnsafe(`
      INSERT INTO staff_attendance (tenant_id, user_id, clock_in, scheduled_start, scheduled_end, status, notes)
      VALUES ('${tenantId}'::uuid, '${dto.userId}'::uuid, NOW(),
        ${sched ? `'${sched.start_time}'::time` : 'NULL'},
        ${sched ? `'${sched.end_time}'::time` : 'NULL'},
        'clocked_in', ${dto.notes ? `'${dto.notes.replace(/'/g, "''")}'` : 'NULL'})
      RETURNING *
    `);
        return rows[0];
    }
    async clockOut(tenantId, attendanceId, dto) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT * FROM staff_attendance
      WHERE id = '${attendanceId}'::uuid AND tenant_id = '${tenantId}'::uuid AND status = 'clocked_in'
    `);
        if (!rows.length)
            throw new common_1.NotFoundException('Registro de asistencia no encontrado');
        const clockIn = new Date(rows[0].clock_in);
        const clockOut = new Date();
        const breakMins = dto.breakMinutes || 0;
        const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / 60000 - breakMins;
        const hoursWorked = Math.round(totalMinutes / 60 * 100) / 100;
        const overtimeHours = Math.max(0, Math.round((hoursWorked - 8) * 100) / 100);
        await this.prisma.$queryRawUnsafe(`
      UPDATE staff_attendance SET
        clock_out = NOW(), status = 'clocked_out',
        break_minutes = ${breakMins}, hours_worked = ${hoursWorked},
        overtime_hours = ${overtimeHours}
        ${dto.notes ? `, notes = '${dto.notes.replace(/'/g, "''")}'` : ''}
      WHERE id = '${attendanceId}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        const updated = await this.prisma.$queryRawUnsafe(`SELECT * FROM staff_attendance WHERE id = '${attendanceId}'::uuid`);
        return updated[0];
    }
    async getAttendance(tenantId, query) {
        const { date, fromDate, toDate, userId, page = 1, limit = 50 } = query;
        const offset = (page - 1) * limit;
        let where = `WHERE sa.tenant_id = '${tenantId}'::uuid`;
        if (date)
            where += ` AND sa.clock_in::date = '${date}'::date`;
        if (fromDate)
            where += ` AND sa.clock_in::date >= '${fromDate}'::date`;
        if (toDate)
            where += ` AND sa.clock_in::date <= '${toDate}'::date`;
        if (userId)
            where += ` AND sa.user_id = '${userId}'::uuid`;
        const data = await this.prisma.$queryRawUnsafe(`
      SELECT sa.*, u.first_name, u.last_name, r.name as role_name
      FROM staff_attendance sa
      JOIN users u ON u.id = sa.user_id
      JOIN roles r ON r.id = u.role_id
      ${where}
      ORDER BY sa.clock_in DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
        const countResult = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total FROM staff_attendance sa ${where}`);
        return { data, total: countResult[0]?.total || 0, page, limit };
    }
    async getTodaySummary(tenantId) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT
        COUNT(DISTINCT sa.user_id) FILTER (WHERE sa.status = 'clocked_in')::int as currently_in,
        COUNT(DISTINCT sa.user_id) FILTER (WHERE sa.clock_in::date = CURRENT_DATE)::int as checked_in_today,
        COALESCE(SUM(sa.hours_worked) FILTER (WHERE sa.clock_in::date = CURRENT_DATE), 0)::decimal as total_hours_today,
        COALESCE(SUM(sa.overtime_hours) FILTER (WHERE sa.clock_in::date = CURRENT_DATE), 0)::decimal as overtime_today
      FROM staff_attendance sa
      WHERE sa.tenant_id = '${tenantId}'::uuid
        AND sa.clock_in::date = CURRENT_DATE
    `);
        const totalStaff = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as total FROM users WHERE tenant_id = '${tenantId}'::uuid AND is_active = true`);
        const dayOfWeek = new Date().getDay();
        const scheduled = await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(DISTINCT user_id)::int as scheduled
      FROM staff_schedules
      WHERE tenant_id = '${tenantId}'::uuid AND day_of_week = ${dayOfWeek} AND is_active = true
    `);
        return {
            ...rows[0],
            totalStaff: totalStaff[0]?.total || 0,
            scheduledToday: scheduled[0]?.scheduled || 0,
        };
    }
    async createTimeOff(tenantId, dto) {
        const rows = await this.prisma.$queryRawUnsafe(`
      INSERT INTO staff_time_off (tenant_id, user_id, type, start_date, end_date, reason)
      VALUES ('${tenantId}'::uuid, '${dto.userId}'::uuid, '${dto.type}',
        '${dto.startDate}'::date, '${dto.endDate}'::date,
        ${dto.reason ? `'${dto.reason.replace(/'/g, "''")}'` : 'NULL'})
      RETURNING *
    `);
        return rows[0];
    }
    async getTimeOff(tenantId, query) {
        const { userId, page = 1, limit = 50 } = query;
        let where = `WHERE t.tenant_id = '${tenantId}'::uuid`;
        if (userId)
            where += ` AND t.user_id = '${userId}'::uuid`;
        const data = await this.prisma.$queryRawUnsafe(`
      SELECT t.*, u.first_name, u.last_name
      FROM staff_time_off t
      JOIN users u ON u.id = t.user_id
      ${where}
      ORDER BY t.start_date DESC
      LIMIT ${limit}
    `);
        return data;
    }
    async reviewTimeOff(tenantId, id, status, approvedBy) {
        await this.prisma.$queryRawUnsafe(`
      UPDATE staff_time_off SET status = '${status}', approved_by = '${approvedBy}'::uuid, reviewed_at = NOW()
      WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);
        const rows = await this.prisma.$queryRawUnsafe(`SELECT t.*, u.first_name, u.last_name FROM staff_time_off t JOIN users u ON u.id = t.user_id WHERE t.id = '${id}'::uuid`);
        return rows[0];
    }
    async getPayrollSummary(tenantId, fromDate, toDate) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT u.id, u.first_name, u.last_name, u.hourly_rate, u.salary,
        r.name as role_name,
        COALESCE(SUM(sa.hours_worked), 0)::decimal as total_hours,
        COALESCE(SUM(sa.overtime_hours), 0)::decimal as total_overtime,
        COUNT(DISTINCT sa.clock_in::date)::int as days_worked,
        COALESCE(SUM(sa.hours_worked) * u.hourly_rate, 0)::decimal as regular_pay,
        COALESCE(SUM(sa.overtime_hours) * u.hourly_rate * 1.5, 0)::decimal as overtime_pay
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN staff_attendance sa ON sa.user_id = u.id
        AND sa.clock_in::date >= '${fromDate}'::date
        AND sa.clock_in::date <= '${toDate}'::date
        AND sa.status = 'clocked_out'
      WHERE u.tenant_id = '${tenantId}'::uuid AND u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name, u.hourly_rate, u.salary, r.name
      ORDER BY u.first_name
    `);
        return rows;
    }
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StaffService);
//# sourceMappingURL=staff.service.js.map