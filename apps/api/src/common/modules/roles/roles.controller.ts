import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesService } from './roles.service';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { IsString, IsOptional, IsArray, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateRoleDto {
  @ApiProperty() @IsString() @MinLength(2)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  color?: string;

  @ApiProperty() @IsArray()
  permissions: string[];
}

class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  color?: string;

  @ApiPropertyOptional() @IsOptional() @IsArray()
  permissions?: string[];
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar roles del tenant' })
  async list(@CurrentTenant() tenantId: string) {
    return this.rolesService.list(tenantId);
  }

  @Get('permissions-catalog')
  @ApiOperation({ summary: 'Catálogo de permisos disponibles' })
  async permissionsCatalog() {
    return this.rolesService.getPermissionsCatalog();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de rol con usuarios asignados' })
  async getOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.rolesService.getById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear rol personalizado' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar rol' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar rol personalizado' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.rolesService.delete(tenantId, id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar rol' })
  async duplicate(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.rolesService.duplicate(tenantId, id);
  }
}
