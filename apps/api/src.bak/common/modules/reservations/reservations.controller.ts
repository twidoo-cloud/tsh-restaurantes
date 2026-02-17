import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto, UpdateReservationDto, ReservationQueryDto,
  UpdateSettingsDto, CancelReservationDto,
} from './dto/reservations.dto';
import { CurrentTenant } from '../../decorators/tenant.decorator';


@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reservations')
export class ReservationsController {
  constructor(private service: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'List reservations' })
  findAll(@CurrentTenant() tenantId: string, @Query() query: ReservationQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get reservation settings' })
  getSettings(@CurrentTenant() tenantId: string) {
    return this.service.getOrCreateSettings(tenantId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update reservation settings' })
  updateSettings(@CurrentTenant() tenantId: string, @Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(tenantId, dto);
  }

  @Get('availability/:date')
  @ApiOperation({ summary: 'Get available time slots for a date' })
  getAvailability(
    @CurrentTenant() tenantId: string,
    @Param('date') date: string,
    @Query('guests') guests: string,
  ) {
    return this.service.getAvailableSlots(tenantId, date, parseInt(guests) || 2);
  }

  @Get('summary/:date')
  @ApiOperation({ summary: 'Get day summary' })
  getDaySummary(@CurrentTenant() tenantId: string, @Param('date') date: string) {
    return this.service.getDaySummary(tenantId, date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation by ID' })
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create reservation' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateReservationDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update reservation' })
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Patch(':id/seat')
  @ApiOperation({ summary: 'Mark as seated' })
  seat(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.seat(tenantId, id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark as completed' })
  complete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.complete(tenantId, id);
  }

  @Patch(':id/no-show')
  @ApiOperation({ summary: 'Mark as no-show' })
  noShow(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.noShow(tenantId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel reservation' })
  cancel(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CancelReservationDto) {
    return this.service.cancel(tenantId, id, dto);
  }
}
