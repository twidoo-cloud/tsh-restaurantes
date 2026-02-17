import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DeliveryService } from './delivery.service';
import {
  CreateDeliveryOrderDto, UpdateDeliveryOrderDto, DeliveryQueryDto,
  CreateZoneDto, UpdateZoneDto, UpdateDeliverySettingsDto,
} from './dto/delivery.dto';
import { CurrentTenant, CurrentBranch, CurrentUser } from '../../decorators/tenant.decorator';

@ApiTags('Delivery')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('delivery')
export class DeliveryController {
  constructor(private service: DeliveryService) {}

  // ── Orders ──
  @Get('orders')
  @ApiOperation({ summary: 'List delivery orders' })
  findAll(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Query() query: DeliveryQueryDto) {
    return this.service.findAll(tenantId, query, branchId);
  }

  @Get('orders/dashboard')
  @ApiOperation({ summary: 'Delivery dashboard stats' })
  dashboard(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Query('date') date?: string) {
    return this.service.getDashboard(tenantId, date, branchId);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get delivery order details' })
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create delivery/pickup order' })
  create(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Body() dto: CreateDeliveryOrderDto) {
    return this.service.create(tenantId, dto, undefined, branchId);
  }

  @Put('orders/:id')
  @ApiOperation({ summary: 'Update delivery order' })
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateDeliveryOrderDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Patch('orders/:id/confirm')
  confirm(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.updateStatus(tenantId, id, 'confirmed');
  }

  @Patch('orders/:id/prepare')
  prepare(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.updateStatus(tenantId, id, 'preparing');
  }

  @Patch('orders/:id/ready')
  ready(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.updateStatus(tenantId, id, 'ready');
  }

  @Patch('orders/:id/dispatch')
  dispatch(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: { driverName?: string; driverPhone?: string }) {
    return this.service.updateStatus(tenantId, id, 'out_for_delivery', body);
  }

  @Patch('orders/:id/deliver')
  deliver(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.updateStatus(tenantId, id, 'delivered');
  }

  @Patch('orders/:id/cancel')
  cancel(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.updateStatus(tenantId, id, 'cancelled', body);
  }

  // ── Zones ──
  @Get('zones')
  @ApiOperation({ summary: 'List delivery zones' })
  getZones(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.service.getZones(tenantId, branchId);
  }

  @Post('zones')
  @ApiOperation({ summary: 'Create delivery zone' })
  createZone(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Body() dto: CreateZoneDto) {
    return this.service.createZone(tenantId, dto, branchId);
  }

  @Put('zones/:id')
  updateZone(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.service.updateZone(tenantId, id, dto);
  }

  @Delete('zones/:id')
  deleteZone(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.deleteZone(tenantId, id);
  }

  // ── Settings ──
  @Get('settings')
  getSettings(@CurrentTenant() tenantId: string) {
    return this.service.getOrCreateSettings(tenantId);
  }

  @Put('settings')
  updateSettings(@CurrentTenant() tenantId: string, @Body() dto: UpdateDeliverySettingsDto) {
    return this.service.updateSettings(tenantId, dto);
  }
}
