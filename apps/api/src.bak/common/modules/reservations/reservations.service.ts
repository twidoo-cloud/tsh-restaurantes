import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PosEventsGateway } from '../../ws/pos-events.gateway';
import { CreateReservationDto, UpdateReservationDto, ReservationQueryDto, UpdateSettingsDto, CancelReservationDto } from './dto/reservations.dto';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: PosEventsGateway,
  ) {}

  // ═══════════════════════════════════════
  // RESERVATIONS CRUD
  // ═══════════════════════════════════════

  async findAll(tenantId: string, query: ReservationQueryDto) {
    const { date, fromDate, toDate, status, search, page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE r.tenant_id = '${tenantId}'::uuid`;
    if (date) whereClause += ` AND r.reservation_date = '${date}'::date`;
    if (fromDate) whereClause += ` AND r.reservation_date >= '${fromDate}'::date`;
    if (toDate) whereClause += ` AND r.reservation_date <= '${toDate}'::date`;
    if (status) whereClause += ` AND r.status = '${status}'`;
    if (search) whereClause += ` AND (r.guest_name ILIKE '%${search}%' OR r.guest_phone ILIKE '%${search}%')`;

    const countResult: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as total FROM reservations r ${whereClause}`
    );
    const total = countResult[0]?.total || 0;

    const data: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT r.*,
        c.name as customer_name, c.phone as customer_phone,
        t.number as table_number, t.capacity as table_capacity,
        z.name as zone_name
      FROM reservations r
      LEFT JOIN customers c ON c.id = r.customer_id
      LEFT JOIN tables t ON t.id = r.table_id
      LEFT JOIN zones z ON z.id = t.zone_id
      ${whereClause}
      ORDER BY r.reservation_date ASC, r.start_time ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string, id: string) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT r.*,
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        t.number as table_number, t.capacity as table_capacity,
        z.name as zone_name
      FROM reservations r
      LEFT JOIN customers c ON c.id = r.customer_id
      LEFT JOIN tables t ON t.id = r.table_id
      LEFT JOIN zones z ON z.id = t.zone_id
      WHERE r.id = '${id}'::uuid AND r.tenant_id = '${tenantId}'::uuid
    `);
    if (!rows.length) throw new NotFoundException('Reservación no encontrada');
    return rows[0];
  }

  async create(tenantId: string, dto: CreateReservationDto, userId?: string) {
    const settings = await this.getOrCreateSettings(tenantId);

    // Validate guest count
    if (dto.guestCount > settings.max_party_size) {
      throw new BadRequestException(`Máximo ${settings.max_party_size} personas por reservación`);
    }

    // Validate date is in the future
    const resDate = new Date(`${dto.reservationDate}T${dto.startTime}:00`);
    const now = new Date();
    const hoursAhead = (resDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursAhead < settings.min_advance_hours) {
      throw new BadRequestException(`Reservaciones requieren al menos ${settings.min_advance_hours} hora(s) de anticipación`);
    }

    // Validate not too far ahead
    const daysAhead = hoursAhead / 24;
    if (daysAhead > settings.max_advance_days) {
      throw new BadRequestException(`Reservaciones máximo ${settings.max_advance_days} días de anticipación`);
    }

    // Validate time within operating hours
    if (dto.startTime < settings.opening_time || dto.startTime >= settings.closing_time) {
      throw new BadRequestException(`Horario de reservaciones: ${settings.opening_time} - ${settings.closing_time}`);
    }

    // Check table availability if specified
    if (dto.tableId) {
      await this.checkTableAvailability(tenantId, dto.tableId, dto.reservationDate, dto.startTime, dto.durationMinutes || settings.default_duration_minutes);
    }

    // Auto-assign table if not specified
    let tableId = dto.tableId || null;
    if (!tableId) {
      tableId = await this.findAvailableTable(tenantId, dto.reservationDate, dto.startTime, dto.guestCount, dto.durationMinutes || settings.default_duration_minutes);
    }

    const duration = dto.durationMinutes || settings.default_duration_minutes;
    const [hours, mins] = dto.startTime.split(':').map(Number);
    const endMins = hours * 60 + mins + duration;
    const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    const rows: any[] = await this.prisma.$queryRawUnsafe(`
      INSERT INTO reservations (tenant_id, customer_id, table_id, guest_name, guest_phone, guest_email,
        guest_count, reservation_date, start_time, end_time, duration_minutes, status, notes,
        special_requests, source, confirmed_at, created_by)
      VALUES ('${tenantId}'::uuid, ${dto.customerId ? `'${dto.customerId}'::uuid` : 'NULL'},
        ${tableId ? `'${tableId}'::uuid` : 'NULL'},
        '${dto.guestName.replace(/'/g, "''")}', ${dto.guestPhone ? `'${dto.guestPhone}'` : 'NULL'},
        ${dto.guestEmail ? `'${dto.guestEmail}'` : 'NULL'},
        ${dto.guestCount}, '${dto.reservationDate}'::date, '${dto.startTime}'::time,
        '${endTime}'::time, ${duration}, 'confirmed',
        ${dto.notes ? `'${dto.notes.replace(/'/g, "''")}'` : 'NULL'},
        ${dto.specialRequests ? `'${dto.specialRequests.replace(/'/g, "''")}'` : 'NULL'},
        '${dto.source || 'phone'}', NOW(), ${userId ? `'${userId}'::uuid` : 'NULL'})
      RETURNING *
    `);

    // Emit WS event
    this.wsGateway.server?.to(`tenant:${tenantId}`).emit('reservation:created', rows[0]);

    return rows[0];
  }

  async update(tenantId: string, id: string, dto: UpdateReservationDto) {
    const existing = await this.findById(tenantId, id);
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new BadRequestException('No se puede modificar una reservación completada o cancelada');
    }

    // Check table availability if changing table or time
    if (dto.tableId || dto.startTime || dto.reservationDate) {
      const settings = await this.getOrCreateSettings(tenantId);
      const tableId = dto.tableId || existing.table_id;
      const date = dto.reservationDate || existing.reservation_date;
      const time = dto.startTime || existing.start_time;
      const duration = dto.durationMinutes || existing.duration_minutes;
      if (tableId) {
        await this.checkTableAvailability(tenantId, tableId, typeof date === 'object' ? (date as Date).toISOString().slice(0, 10) : date, typeof time === 'object' ? time.toString().slice(0, 5) : time, duration, id);
      }
    }

    const sets: string[] = [];
    if (dto.guestName) sets.push(`guest_name = '${dto.guestName.replace(/'/g, "''")}'`);
    if (dto.guestPhone !== undefined) sets.push(`guest_phone = ${dto.guestPhone ? `'${dto.guestPhone}'` : 'NULL'}`);
    if (dto.guestEmail !== undefined) sets.push(`guest_email = ${dto.guestEmail ? `'${dto.guestEmail}'` : 'NULL'}`);
    if (dto.guestCount) sets.push(`guest_count = ${dto.guestCount}`);
    if (dto.reservationDate) sets.push(`reservation_date = '${dto.reservationDate}'::date`);
    if (dto.startTime) sets.push(`start_time = '${dto.startTime}'::time`);
    if (dto.durationMinutes) sets.push(`duration_minutes = ${dto.durationMinutes}`);
    if (dto.tableId !== undefined) sets.push(`table_id = ${dto.tableId ? `'${dto.tableId}'::uuid` : 'NULL'}`);
    if (dto.notes !== undefined) sets.push(`notes = ${dto.notes ? `'${dto.notes.replace(/'/g, "''")}'` : 'NULL'}`);
    if (dto.specialRequests !== undefined) sets.push(`special_requests = ${dto.specialRequests ? `'${dto.specialRequests.replace(/'/g, "''")}'` : 'NULL'}`);
    sets.push(`updated_at = NOW()`);

    await this.prisma.$queryRawUnsafe(`
      UPDATE reservations SET ${sets.join(', ')} WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);

    return this.findById(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, status: string, reason?: string) {
    const reservation = await this.findById(tenantId, id);

    const validTransitions: Record<string, string[]> = {
      confirmed: ['seated', 'cancelled', 'no_show'],
      seated: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
      no_show: ['confirmed'],
    };

    if (!validTransitions[reservation.status]?.includes(status)) {
      throw new BadRequestException(`No se puede cambiar de ${reservation.status} a ${status}`);
    }

    const sets = [`status = '${status}'`, `updated_at = NOW()`];
    if (status === 'seated') sets.push(`seated_at = NOW()`);
    if (status === 'completed') sets.push(`completed_at = NOW()`);
    if (status === 'cancelled') {
      sets.push(`cancelled_at = NOW()`);
      if (reason) sets.push(`cancellation_reason = '${reason.replace(/'/g, "''")}'`);
    }

    await this.prisma.$queryRawUnsafe(`
      UPDATE reservations SET ${sets.join(', ')} WHERE id = '${id}'::uuid AND tenant_id = '${tenantId}'::uuid
    `);

    const updated = await this.findById(tenantId, id);
    this.wsGateway.server?.to(`tenant:${tenantId}`).emit('reservation:updated', updated);
    return updated;
  }

  async cancel(tenantId: string, id: string, dto: CancelReservationDto) {
    return this.updateStatus(tenantId, id, 'cancelled', dto.reason);
  }

  async seat(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'seated');
  }

  async complete(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'completed');
  }

  async noShow(tenantId: string, id: string) {
    return this.updateStatus(tenantId, id, 'no_show');
  }

  // ═══════════════════════════════════════
  // AVAILABILITY
  // ═══════════════════════════════════════

  async getAvailableSlots(tenantId: string, date: string, guestCount: number) {
    const settings = await this.getOrCreateSettings(tenantId);
    const interval = settings.slot_interval_minutes;
    const duration = settings.default_duration_minutes;

    // Get all reservations for this date
    const reservations: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT r.start_time, r.end_time, r.table_id, r.guest_count, r.status
      FROM reservations r
      WHERE r.tenant_id = '${tenantId}'::uuid
        AND r.reservation_date = '${date}'::date
        AND r.status IN ('confirmed', 'seated')
    `);

    // Get all tables with capacity >= guestCount
    const tables: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT t.id, t.number, t.capacity, z.name as zone_name
      FROM tables t JOIN zones z ON z.id = t.zone_id
      WHERE t.tenant_id = '${tenantId}'::uuid AND t.is_active = true AND t.capacity >= ${guestCount}
      ORDER BY t.capacity ASC
    `);

    // Generate time slots
    const [openH, openM] = settings.opening_time.split(':').map(Number);
    const [closeH, closeM] = settings.closing_time.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    const slots: { time: string; available: boolean; tables: { id: string; number: string; capacity: number }[] }[] = [];

    for (let mins = openMins; mins <= closeMins - duration; mins += interval) {
      const slotTime = `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
      const slotEndMins = mins + duration;

      // Check which tables are available at this time
      const availableTables = tables.filter(table => {
        return !reservations.some(r => {
          if (r.table_id !== table.id) return false;
          const [rStartH, rStartM] = r.start_time.toString().slice(0, 5).split(':').map(Number);
          const [rEndH, rEndM] = r.end_time.toString().slice(0, 5).split(':').map(Number);
          const rStart = rStartH * 60 + rStartM;
          const rEnd = rEndH * 60 + rEndM;
          return mins < rEnd && slotEndMins > rStart; // overlap check
        });
      });

      // Filter by current time if today
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      if (date === today) {
        const currentMins = now.getHours() * 60 + now.getMinutes();
        if (mins <= currentMins) continue;
      }

      slots.push({
        time: slotTime,
        available: availableTables.length > 0,
        tables: availableTables.map(t => ({ id: t.id, number: t.number, capacity: t.capacity })),
      });
    }

    return { date, slots, settings: { openingTime: settings.opening_time, closingTime: settings.closing_time, duration, interval } };
  }

  async getDaySummary(tenantId: string, date: string) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed,
        COUNT(*) FILTER (WHERE status = 'seated')::int as seated,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
        COUNT(*) FILTER (WHERE status = 'no_show')::int as no_show,
        SUM(guest_count) FILTER (WHERE status IN ('confirmed', 'seated'))::int as expected_guests,
        COUNT(*)::int as total
      FROM reservations
      WHERE tenant_id = '${tenantId}'::uuid AND reservation_date = '${date}'::date
    `);
    return rows[0] || { confirmed: 0, seated: 0, completed: 0, cancelled: 0, no_show: 0, expected_guests: 0, total: 0 };
  }

  // ═══════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════

  async getOrCreateSettings(tenantId: string) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM reservation_settings WHERE tenant_id = '${tenantId}'::uuid`
    );
    if (rows.length > 0) return rows[0];

    // Create defaults
    const created: any[] = await this.prisma.$queryRawUnsafe(`
      INSERT INTO reservation_settings (tenant_id) VALUES ('${tenantId}'::uuid) RETURNING *
    `);
    return created[0];
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto) {
    await this.getOrCreateSettings(tenantId); // ensure exists

    const sets: string[] = [];
    if (dto.isEnabled !== undefined) sets.push(`is_enabled = ${dto.isEnabled}`);
    if (dto.defaultDurationMinutes) sets.push(`default_duration_minutes = ${dto.defaultDurationMinutes}`);
    if (dto.minAdvanceHours !== undefined) sets.push(`min_advance_hours = ${dto.minAdvanceHours}`);
    if (dto.maxAdvanceDays) sets.push(`max_advance_days = ${dto.maxAdvanceDays}`);
    if (dto.slotIntervalMinutes) sets.push(`slot_interval_minutes = ${dto.slotIntervalMinutes}`);
    if (dto.openingTime) sets.push(`opening_time = '${dto.openingTime}'::time`);
    if (dto.closingTime) sets.push(`closing_time = '${dto.closingTime}'::time`);
    if (dto.maxPartySize) sets.push(`max_party_size = ${dto.maxPartySize}`);
    if (dto.autoCancelMinutes !== undefined) sets.push(`auto_cancel_minutes = ${dto.autoCancelMinutes}`);
    if (dto.confirmationRequired !== undefined) sets.push(`confirmation_required = ${dto.confirmationRequired}`);
    if (dto.allowOnlineBooking !== undefined) sets.push(`allow_online_booking = ${dto.allowOnlineBooking}`);
    sets.push(`updated_at = NOW()`);

    await this.prisma.$queryRawUnsafe(`
      UPDATE reservation_settings SET ${sets.join(', ')} WHERE tenant_id = '${tenantId}'::uuid
    `);
    return this.getOrCreateSettings(tenantId);
  }

  // ═══════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════

  private async checkTableAvailability(tenantId: string, tableId: string, date: string, startTime: string, duration: number, excludeId?: string) {
    const [h, m] = startTime.split(':').map(Number);
    const endMins = h * 60 + m + duration;
    const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    let excludeClause = '';
    if (excludeId) excludeClause = ` AND id != '${excludeId}'::uuid`;

    const conflicts: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT id, guest_name, start_time, end_time
      FROM reservations
      WHERE tenant_id = '${tenantId}'::uuid
        AND table_id = '${tableId}'::uuid
        AND reservation_date = '${date}'::date
        AND status IN ('confirmed', 'seated')
        AND start_time < '${endTime}'::time
        AND end_time > '${startTime}'::time
        ${excludeClause}
    `);

    if (conflicts.length > 0) {
      throw new BadRequestException(`Mesa ocupada en ese horario (reservación de ${conflicts[0].guest_name})`);
    }
  }

  private async findAvailableTable(tenantId: string, date: string, startTime: string, guestCount: number, duration: number): Promise<string | null> {
    const [h, m] = startTime.split(':').map(Number);
    const endMins = h * 60 + m + duration;
    const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    const tables: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT t.id, t.number, t.capacity
      FROM tables t
      WHERE t.tenant_id = '${tenantId}'::uuid
        AND t.is_active = true
        AND t.capacity >= ${guestCount}
        AND t.id NOT IN (
          SELECT r.table_id FROM reservations r
          WHERE r.tenant_id = '${tenantId}'::uuid
            AND r.reservation_date = '${date}'::date
            AND r.status IN ('confirmed', 'seated')
            AND r.table_id IS NOT NULL
            AND r.start_time < '${endTime}'::time
            AND r.end_time > '${startTime}'::time
        )
      ORDER BY t.capacity ASC
      LIMIT 1
    `);

    return tables.length > 0 ? tables[0].id : null;
  }
}
