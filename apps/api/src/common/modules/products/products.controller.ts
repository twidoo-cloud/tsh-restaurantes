import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/products.dto';
import { CurrentTenant } from '../../decorators/tenant.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos (con filtros y paginación)' })
  async findAll(@CurrentTenant() tenantId: string, @Query() query: ProductQueryDto) {
    return this.productsService.findAll(tenantId, query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías de productos' })
  async findCategories(@CurrentTenant() tenantId: string) {
    return this.productsService.findCategories(tenantId);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Buscar producto por código de barras' })
  async findByBarcode(@CurrentTenant() tenantId: string, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(tenantId, barcode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  async findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear producto' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(tenantId, id, dto);
  }

  @Patch(':id/toggle-availability')
  @ApiOperation({ summary: 'Activar/desactivar disponibilidad (86)' })
  async toggleAvailability(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.toggleAvailability(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar producto (soft delete)' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.delete(tenantId, id);
  }

  // ── Category CRUD ──
  @Post('categories')
  @ApiOperation({ summary: 'Crear categoría' })
  async createCategory(@CurrentTenant() tenantId: string, @Body() body: { name: string; description?: string; displayOrder?: number; imageUrl?: string }) {
    return this.productsService.createCategory(tenantId, body);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Actualizar categoría' })
  async updateCategory(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: { name?: string; description?: string; displayOrder?: number; imageUrl?: string }) {
    return this.productsService.updateCategory(tenantId, id, body);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Eliminar categoría (soft delete)' })
  async deleteCategory(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.deleteCategory(tenantId, id);
  }
}
