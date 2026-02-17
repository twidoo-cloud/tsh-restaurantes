import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto, CloseShiftDto, ShiftQueryDto } from './dto/shifts.dto';
import { CurrentTenant, CurrentBranch, CurrentUser } from '../../decorators/tenant.decorator';
import { PosEventsGateway } from '../../ws/pos-events.gateway';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('shifts')
export class ShiftsController {
  constructor(
    private shiftsService: ShiftsService,
    private wsGateway: PosEventsGateway,
  ) {}

  @Get('cash-registers')
  @ApiOperation({ summary: 'Listar cajas registradoras con turno activo' })
  async getCashRegisters(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.shiftsService.getCashRegisters(tenantId, branchId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener turno activo actual' })
  async getActiveShift(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.shiftsService.getActiveShift(tenantId, branchId);
  }

  @Post('open')
  @ApiOperation({ summary: 'Abrir un turno/caja' })
  async openShift(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @CurrentUser('sub') userId: string,
    @CurrentUser('firstName') firstName: string,
    @Body() dto: OpenShiftDto,
  ) {
    const result = await this.shiftsService.openShift(tenantId, userId, dto, branchId);
    this.wsGateway.emitShiftOpened(tenantId, {
      shiftId: result.id,
      cashRegisterName: result.cashRegisterName,
      openedBy: firstName,
      openingAmount: result.openingAmount,
    });
    return result;
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Cerrar un turno/caja con arqueo' })
  async closeShift(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') shiftId: string,
    @Body() dto: CloseShiftDto,
  ) {
    const result = await this.shiftsService.closeShift(tenantId, shiftId, userId, dto);
    this.wsGateway.emitShiftClosed(tenantId, {
      shiftId: result.shiftId,
      closingAmount: result.closingAmount,
      difference: result.difference,
    });
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Historial de turnos con paginación' })
  async getShifts(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query() query: ShiftQueryDto,
  ) {
    return this.shiftsService.getShifts(tenantId, query, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de turno con desglose' })
  async getShiftDetail(@CurrentTenant() tenantId: string, @Param('id') shiftId: string) {
    return this.shiftsService.getShiftDetail(tenantId, shiftId);
  }
}
