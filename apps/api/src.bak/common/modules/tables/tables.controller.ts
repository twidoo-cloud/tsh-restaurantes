import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TablesService } from './tables.service';
import { CurrentTenant, CurrentUser } from '../../decorators/tenant.decorator';
import { IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class OpenTableDto {
  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsNumber()
  guestCount?: number;
}

class UpdateStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}

class TransferDto {
  @IsString() toTableId: string;
}

class MergeDto {
  @IsArray() secondaryTableIds: string[];
}

class SwapDto {
  @IsString() tableBId: string;
}

@ApiTags('Tables')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get('floor-plans')
  @ApiOperation({ summary: 'Obtener planos con zonas y mesas' })
  async getFloorPlans(@CurrentTenant() tenantId: string) {
    return this.tablesService.getFloorPlans(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener mesa con orden activa' })
  async getTable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tablesService.getTableWithOrder(tenantId, id);
  }

  @Post(':id/open')
  @ApiOperation({ summary: 'Abrir mesa (crear orden)' })
  async openTable(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: OpenTableDto,
  ) {
    return this.tablesService.openTable(tenantId, id, userId, dto.guestCount || 2);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Cerrar mesa (liberar)' })
  async closeTable(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.tablesService.closeTable(tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de la mesa' })
  async updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.tablesService.updateTableStatus(tenantId, id, dto.status, dto.orderId);
  }

  // ── Advanced ──

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transfer order to another table' })
  async transfer(
    @CurrentTenant() tenantId: string,
    @Param('id') fromId: string,
    @Body() dto: TransferDto,
  ) {
    return this.tablesService.transferOrder(tenantId, fromId, dto.toTableId);
  }

  @Post(':id/merge')
  @ApiOperation({ summary: 'Merge tables into primary' })
  async merge(
    @CurrentTenant() tenantId: string,
    @Param('id') primaryId: string,
    @Body() dto: MergeDto,
  ) {
    return this.tablesService.mergeTables(tenantId, primaryId, dto.secondaryTableIds);
  }

  @Post(':id/unmerge')
  @ApiOperation({ summary: 'Unmerge all tables from primary' })
  async unmerge(@CurrentTenant() tenantId: string, @Param('id') primaryId: string) {
    return this.tablesService.unmergeTables(tenantId, primaryId);
  }

  @Post(':id/swap')
  @ApiOperation({ summary: 'Swap two tables' })
  async swap(
    @CurrentTenant() tenantId: string,
    @Param('id') tableAId: string,
    @Body() dto: SwapDto,
  ) {
    return this.tablesService.swapTables(tenantId, tableAId, dto.tableBId);
  }
}
