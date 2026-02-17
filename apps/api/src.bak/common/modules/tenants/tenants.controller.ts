import { Controller, Get, Put, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../decorators/tenant.decorator';
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
}
