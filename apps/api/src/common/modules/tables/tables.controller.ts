import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TablesService } from './tables.service';
import { CurrentTenant, CurrentBranch, CurrentUser } from '../../decorators/tenant.decorator';
import { IsNumber, IsOptional, IsString, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class OpenTableDto {
  @ApiPropertyOptional({ example: 4 }) @IsOptional() @IsNumber() guestCount?: number;
}
class UpdateStatusDto { @IsString() status: string; @IsOptional() @IsString() orderId?: string; }
class TransferDto { @IsString() toTableId: string; }
class MergeDto { @IsArray() secondaryTableIds: string[]; }
class SwapDto { @IsString() tableBId: string; }
class CreateZoneDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() floorPlanId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) displayOrder?: number;
}
class UpdateZoneDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) displayOrder?: number;
}
class CreateTableDto {
  @ApiProperty() @IsNumber() @Type(() => Number) number: number;
  @ApiProperty() @IsString() zoneId: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(50) @Type(() => Number) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shape?: string;
}
class UpdateTableDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) number?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() zoneId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(50) @Type(() => Number) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shape?: string;
}
class BulkCreateTablesDto {
  @ApiProperty() @IsString() zoneId: string;
  @ApiProperty() @IsNumber() @Type(() => Number) startNumber: number;
  @ApiProperty() @IsNumber() @Min(1) @Max(50) @Type(() => Number) count: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(50) @Type(() => Number) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shape?: string;
}

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get('floor-plans')
  @ApiOperation({ summary: 'Obtener planos con zonas y mesas' })
  async getFloorPlans(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.tablesService.getFloorPlans(tenantId, branchId);
  }

  @Get('my-tables')
  @ApiOperation({ summary: 'Mesas del mesero con órdenes activas' })
  async getMyTables(@CurrentTenant() tenantId: string, @CurrentUser('sub') userId: string) {
    return this.tablesService.getWaiterTables(tenantId, userId);
  }

  // ═══ ZONE CRUD ═══

  @Get('zones')
  @ApiOperation({ summary: 'Listar zonas' })
  async listZones(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.tablesService.listZones(tenantId, branchId);
  }

  @Post('zones')
  @ApiOperation({ summary: 'Crear zona' })
  async createZone(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Body() dto: CreateZoneDto) {
    return this.tablesService.createZone(tenantId, dto, branchId);
  }

  @Put('zones/:id')
  @ApiOperation({ summary: 'Editar zona' })
  async updateZone(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.tablesService.updateZone(tenantId, id, dto);
  }

  @Delete('zones/:id')
  @ApiOperation({ summary: 'Eliminar zona (soft delete)' })
  async deleteZone(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tablesService.deleteZone(tenantId, id);
  }

  // ═══ TABLE CRUD ═══

  @Post('manage')
  @ApiOperation({ summary: 'Crear mesa' })
  async createTable(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Body() dto: CreateTableDto) {
    return this.tablesService.createTable(tenantId, dto, branchId);
  }

  @Post('manage/bulk')
  @ApiOperation({ summary: 'Crear múltiples mesas' })
  async bulkCreateTables(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Body() dto: BulkCreateTablesDto) {
    return this.tablesService.bulkCreateTables(tenantId, dto, branchId);
  }

  @Put('manage/:id')
  @ApiOperation({ summary: 'Editar mesa' })
  async updateTable(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.tablesService.updateTable(tenantId, id, dto);
  }

  @Delete('manage/:id')
  @ApiOperation({ summary: 'Eliminar mesa (soft delete)' })
  async deleteTable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tablesService.deleteTable(tenantId, id);
  }

  // ═══ EXISTING OPERATIONS ═══

  @Get(':id')
  @ApiOperation({ summary: 'Obtener mesa con orden activa' })
  async getTable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tablesService.getTableWithOrder(tenantId, id);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Abrir mesa (crear orden)' })
  async openTable(@CurrentTenant() tenantId: string, @CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: OpenTableDto) {
    return this.tablesService.openTable(tenantId, id, userId, dto.guestCount || 2);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Cerrar mesa (liberar)' })
  async closeTable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tablesService.closeTable(tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de la mesa' })
  async updateStatus(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.tablesService.updateTableStatus(tenantId, id, dto.status, dto.orderId);
  }

  @Post(':id/transfer')
  async transfer(@CurrentTenant() tenantId: string, @Param('id') fromId: string, @Body() dto: TransferDto) {
    return this.tablesService.transferOrder(tenantId, fromId, dto.toTableId);
  }

  @Post(':id/merge')
  async merge(@CurrentTenant() tenantId: string, @Param('id') primaryId: string, @Body() dto: MergeDto) {
    return this.tablesService.mergeTables(tenantId, primaryId, dto.secondaryTableIds);
  }

  @Post(':id/unmerge')
  async unmerge(@CurrentTenant() tenantId: string, @Param('id') primaryId: string) {
    return this.tablesService.unmergeTables(tenantId, primaryId);
  }

  @Post(':id/swap')
  async swap(@CurrentTenant() tenantId: string, @Param('id') tableAId: string, @Body() dto: SwapDto) {
    return this.tablesService.swapTables(tenantId, tableAId, dto.tableBId);
  }
}
