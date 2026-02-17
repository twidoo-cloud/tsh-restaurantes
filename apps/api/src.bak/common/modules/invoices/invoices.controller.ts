import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InvoicesService } from './invoices.service';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class GenerateInvoiceDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

class VoidInvoiceDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

@ApiTags('Invoices (SRI Ecuador)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar facturas electrónicas' })
  async list(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoicesService.listInvoices(tenantId, {
      status: status || undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de facturación' })
  async summary(@CurrentTenant() tenantId: string) {
    return this.invoicesService.getSummary(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de factura con XML' })
  async getOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.invoicesService.getInvoice(tenantId, id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generar factura electrónica desde orden' })
  async generate(@CurrentTenant() tenantId: string, @Body() dto: GenerateInvoiceDto) {
    return this.invoicesService.generateFromOrder(tenantId, dto.orderId, {
      taxId: dto.taxId,
      name: dto.name,
      email: dto.email,
      address: dto.address,
    });
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Enviar factura al SRI (simulación)' })
  async send(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.invoicesService.sendToSri(tenantId, id);
  }

  @Post(':id/check')
  @ApiOperation({ summary: 'Consultar autorización en SRI (simulación)' })
  async check(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.invoicesService.checkAuthorization(tenantId, id);
  }

  @Patch(':id/void')
  @ApiOperation({ summary: 'Anular factura' })
  async voidInvoice(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: VoidInvoiceDto) {
    return this.invoicesService.voidInvoice(tenantId, id, dto.reason);
  }
}
