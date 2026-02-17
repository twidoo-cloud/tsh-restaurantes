import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateCustomerDto {
  @ApiProperty() @IsString() @MinLength(2)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  taxId?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

class UpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  taxId?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

class LinkOrderDto {
  @ApiProperty() @IsString()
  orderId: string;
}

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes con búsqueda y paginación' })
  async list(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.list(tenantId, {
      search, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard CRM' })
  async dashboard(@CurrentTenant() tenantId: string) {
    return this.customersService.getDashboard(tenantId);
  }

  @Get('top')
  @ApiOperation({ summary: 'Top clientes por gasto' })
  async top(@CurrentTenant() tenantId: string, @Query('limit') limit?: string) {
    return this.customersService.getTopCustomers(tenantId, limit ? parseInt(limit) : 10);
  }

  @Get('search')
  @ApiOperation({ summary: 'Búsqueda rápida para autocomplete' })
  async quickSearch(@CurrentTenant() tenantId: string, @Query('q') q: string) {
    return this.customersService.quickSearch(tenantId, q || '');
  }

  @Get('by-tax-id/:taxId')
  @ApiOperation({ summary: 'Buscar por RUC/Cédula' })
  async findByTaxId(@CurrentTenant() tenantId: string, @Param('taxId') taxId: string) {
    return this.customersService.findByTaxId(tenantId, taxId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cliente' })
  async getOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.customersService.getById(tenantId, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Historial de compras del cliente' })
  async history(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.customersService.getHistory(tenantId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Estadísticas del cliente' })
  async stats(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.customersService.getStats(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cliente' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(tenantId, id, dto);
  }

  @Post(':id/link-order')
  @ApiOperation({ summary: 'Vincular cliente a orden' })
  async linkOrder(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: LinkOrderDto) {
    return this.customersService.linkToOrder(tenantId, id, dto.orderId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar/anonimizar cliente' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.customersService.delete(tenantId, id);
  }
}
