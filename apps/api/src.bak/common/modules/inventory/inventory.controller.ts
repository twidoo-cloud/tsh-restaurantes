import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { CurrentTenant, CurrentUser } from '../../decorators/tenant.decorator';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class RecordMovementDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ enum: ['purchase', 'sale', 'adjustment', 'waste', 'transfer', 'return', 'initial'] })
  @IsString()
  movementType: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 15.50 })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class BulkAdjustmentItem {
  @IsString()
  productId: string;

  @IsNumber()
  newStock: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class BulkAdjustmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAdjustmentItem)
  adjustments: BulkAdjustmentItem[];
}

class UpdateMinStockDto {
  @IsNumber()
  @Min(0)
  minStock: number;
}

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('stock')
  @ApiOperation({ summary: 'Niveles de stock actuales' })
  async getStockLevels(
    @CurrentTenant() tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStockOnly') lowStockOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getStockLevelsSimple(tenantId, {
      categoryId: categoryId || undefined,
      lowStockOnly: lowStockOnly === 'true',
      search: search || undefined,
    });
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Alertas de stock bajo y agotado' })
  async getAlerts(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getAlerts(tenantId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen general de inventario' })
  async getSummary(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getSummary(tenantId);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Historial de movimientos de stock' })
  async getMovements(
    @CurrentTenant() tenantId: string,
    @Query('productId') productId?: string,
    @Query('movementType') movementType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getMovements(tenantId, {
      productId: productId || undefined,
      movementType: movementType || undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post('movement')
  @ApiOperation({ summary: 'Registrar movimiento de stock' })
  async recordMovement(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: RecordMovementDto,
  ) {
    return this.inventoryService.recordMovement(tenantId, userId, dto as any);
  }

  @Post('bulk-adjustment')
  @ApiOperation({ summary: 'Ajuste masivo de inventario (conteo físico)' })
  async bulkAdjustment(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: BulkAdjustmentDto,
  ) {
    return this.inventoryService.bulkAdjustment(tenantId, userId, dto.adjustments);
  }

  @Patch(':productId/min-stock')
  @ApiOperation({ summary: 'Actualizar stock mínimo de un producto' })
  async updateMinStock(
    @CurrentTenant() tenantId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateMinStockDto,
  ) {
    return this.inventoryService.updateMinStock(tenantId, productId, dto.minStock);
  }
}
