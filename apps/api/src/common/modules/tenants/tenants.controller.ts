import { Controller, Get, Put, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant, CurrentUser } from '../../decorators/tenant.decorator';
import { TenantsService, BrandingConfig, TenantSettings } from './tenants.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant info with merged branding' })
  async getCurrent(@CurrentTenant() tenantId: string) {
    return this.service.getCurrent(tenantId);
  }

  @Put('branding')
  @ApiOperation({ summary: 'Update tenant branding' })
  async updateBranding(@CurrentTenant() tenantId: string, @Body() branding: Partial<BrandingConfig>) {
    return this.service.updateBranding(tenantId, branding);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update tenant settings' })
  async updateSettings(@CurrentTenant() tenantId: string, @Body() settings: Partial<TenantSettings>) {
    return this.service.updateSettings(tenantId, settings);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update tenant profile' })
  async updateProfile(@CurrentTenant() tenantId: string, @Body() profile: { name?: string; phone?: string; address?: any }) {
    return this.service.updateProfile(tenantId, profile);
  }

  @Put('change-plan')
  @ApiOperation({ summary: 'Change subscription plan' })
  async changePlan(@CurrentTenant() tenantId: string, @CurrentUser() user: any, @Body() body: { plan: string; paymentMethod?: string }) {
    return this.service.changePlan(tenantId, user, body.plan, body.paymentMethod);
  }

  @Get('check-trial')
  @ApiOperation({ summary: 'Check trial status and auto-downgrade if expired' })
  async checkTrial(@CurrentTenant() tenantId: string) {
    return this.service.checkTrialExpiry(tenantId);
  }

  @Get('users')
  @ApiOperation({ summary: 'List tenant users' })
  async listUsers(@CurrentTenant() tenantId: string) {
    return this.service.listUsers(tenantId);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user' })
  async createUser(@CurrentTenant() tenantId: string, @Body() body: { email: string; firstName: string; lastName: string; password: string; roleId: string }) {
    return this.service.createUser(tenantId, body);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update a user' })
  async updateUser(@CurrentTenant() tenantId: string, @Param('id') userId: string, @Body() body: any) {
    return this.service.updateUser(tenantId, userId, body);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List tenant roles' })
  async listRoles(@CurrentTenant() tenantId: string) {
    return this.service.listRoles(tenantId);
  }

  // ═══ SUPER ADMIN: TENANT MANAGEMENT ═══

  @Get('admin/all')
  @ApiOperation({ summary: 'Super Admin: Listar todos los tenants' })
  async adminListAll(@CurrentUser() user: any) {
    return this.service.adminListAll(user);
  }

  @Post('admin/create')
  @ApiOperation({ summary: 'Super Admin: Crear nuevo tenant' })
  async adminCreate(@CurrentUser() user: any, @Body() body: {
    name: string; slug: string; verticalType?: string; countryCode?: string;
    currencyCode?: string; timezone?: string; phone?: string; taxId?: string;
    subscriptionPlan?: string; ownerEmail: string; ownerFirstName: string; ownerLastName: string; ownerPassword: string;
  }) {
    return this.service.adminCreateTenant(user, body);
  }

  @Put('admin/:id')
  @ApiOperation({ summary: 'Super Admin: Editar tenant' })
  async adminUpdate(@CurrentUser() user: any, @Param('id') tenantId: string, @Body() body: any) {
    return this.service.adminUpdateTenant(user, tenantId, body);
  }

  @Patch('admin/:id/toggle')
  @ApiOperation({ summary: 'Super Admin: Activar/desactivar tenant' })
  async adminToggle(@CurrentUser() user: any, @Param('id') tenantId: string) {
    return this.service.adminToggleTenant(user, tenantId);
  }

  @Get('admin/:id/detail')
  @ApiOperation({ summary: 'Super Admin: Detalle de tenant con usuarios y roles' })
  async adminDetail(@CurrentUser() user: any, @Param('id') tenantId: string) {
    return this.service.adminGetTenantDetail(user, tenantId);
  }

  @Get('export/data')
  @ApiOperation({ summary: 'Exportar todos los datos del tenant (backup)' })
  async exportData(@CurrentTenant() tenantId: string, @CurrentUser() user: any) {
    return this.service.exportTenantData(tenantId, user);
  }
}
