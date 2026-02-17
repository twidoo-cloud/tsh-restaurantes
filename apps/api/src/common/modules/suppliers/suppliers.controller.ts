import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/suppliers.dto';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'List all suppliers' })
  async getSuppliers(@CurrentTenant() tenantId: string) {
    return this.suppliersService.getSuppliers(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier detail with linked ingredients' })
  async getSupplier(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.suppliersService.getSupplier(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create supplier' })
  async createSupplier(@CurrentTenant() tenantId: string, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.createSupplier(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier' })
  async updateSupplier(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.updateSupplier(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate supplier' })
  async deleteSupplier(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.suppliersService.deleteSupplier(tenantId, id);
  }

  @Post(':id/link/:ingredientId')
  @ApiOperation({ summary: 'Link ingredient to supplier' })
  async linkIngredient(@CurrentTenant() tenantId: string, @Param('id') id: string, @Param('ingredientId') ingredientId: string) {
    return this.suppliersService.linkIngredient(tenantId, id, ingredientId);
  }

  @Delete(':id/link/:ingredientId')
  @ApiOperation({ summary: 'Unlink ingredient from supplier' })
  async unlinkIngredient(@CurrentTenant() tenantId: string, @Param('ingredientId') ingredientId: string) {
    return this.suppliersService.unlinkIngredient(tenantId, ingredientId);
  }
}
