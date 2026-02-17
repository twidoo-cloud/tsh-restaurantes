import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreditService } from './credit.service';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { CurrentUser } from '../../decorators/tenant.decorator';
import { IsString, IsOptional, IsNumber, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class CreateCreditAccountDto {
  @ApiProperty() @IsString()
  customerId: string;

  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number)
  creditLimit: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

class UpdateCreditAccountDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  creditLimit?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  status?: string; // active, suspended, closed

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

class RecordChargeDto {
  @ApiProperty() @IsString()
  orderId: string;

  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number)
  amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

class RecordPaymentDto {
  @ApiProperty() @IsNumber() @Min(0.01) @Type(() => Number)
  amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  method?: string; // cash, transfer, credit_card

  @ApiPropertyOptional() @IsOptional() @IsString()
  reference?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

class RecordAdjustmentDto {
  @ApiProperty() @IsNumber() @Type(() => Number)
  amount: number; // positive = increase debt, negative = reduce

  @ApiProperty() @IsString() @MinLength(3)
  reason: string;
}

@ApiTags('Credit / Cuentas por Cobrar')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('credit')
export class CreditController {
  constructor(private creditService: CreditService) {}

  // ── Dashboard ──
  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard de cuentas por cobrar' })
  async dashboard(@CurrentTenant() tenantId: string) {
    return this.creditService.getDashboard(tenantId);
  }

  // ── List accounts ──
  @Get('accounts')
  @ApiOperation({ summary: 'Listar cuentas de crédito' })
  async listAccounts(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.creditService.listAccounts(tenantId, { status, search, overdue: overdue === 'true' });
  }

  // ── Get account detail ──
  @Get('accounts/:id')
  @ApiOperation({ summary: 'Detalle de cuenta de crédito' })
  async getAccount(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.creditService.getAccount(tenantId, id);
  }

  // ── Get account by customer ──
  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Cuenta de crédito por cliente' })
  async getByCustomer(@CurrentTenant() tenantId: string, @Param('customerId') customerId: string) {
    return this.creditService.getByCustomer(tenantId, customerId);
  }

  // ── Create account ──
  @Post('accounts')
  @ApiOperation({ summary: 'Crear cuenta de crédito para cliente' })
  async createAccount(@CurrentTenant() tenantId: string, @Body() dto: CreateCreditAccountDto) {
    return this.creditService.createAccount(tenantId, dto);
  }

  // ── Update account ──
  @Put('accounts/:id')
  @ApiOperation({ summary: 'Actualizar cuenta de crédito' })
  async updateAccount(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCreditAccountDto,
  ) {
    return this.creditService.updateAccount(tenantId, id, dto);
  }

  // ── Record a charge (venta a crédito) ──
  @Post('accounts/:id/charge')
  @ApiOperation({ summary: 'Registrar venta a crédito (cargo)' })
  async recordCharge(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RecordChargeDto,
    @CurrentUser() user: any,
  ) {
    return this.creditService.recordCharge(tenantId, id, dto, user?.sub || user?.id || user);
  }

  // ── Record a payment (abono) ──
  @Post('accounts/:id/payment')
  @ApiOperation({ summary: 'Registrar abono/pago' })
  async recordPayment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.creditService.recordPayment(tenantId, id, dto, user?.sub || user?.id || user);
  }

  // ── Record adjustment ──
  @Post('accounts/:id/adjustment')
  @ApiOperation({ summary: 'Registrar ajuste' })
  async recordAdjustment(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RecordAdjustmentDto,
    @CurrentUser() user: any,
  ) {
    return this.creditService.recordAdjustment(tenantId, id, dto, user?.sub || user?.id || user);
  }

  // ── Transaction history for an account ──
  @Get('accounts/:id/transactions')
  @ApiOperation({ summary: 'Historial de transacciones de una cuenta' })
  async getTransactions(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.creditService.getTransactions(tenantId, id, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }
}
