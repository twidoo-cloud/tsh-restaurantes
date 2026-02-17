import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { CurrentTenant } from '../../decorators/tenant.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard de auditoría' })
  async dashboard(@CurrentTenant() tenantId: string) {
    return this.auditService.getDashboard(tenantId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Buscar logs de auditoría' })
  async search(
    @CurrentTenant() tenantId: string,
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('severity') severity?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.search(tenantId, {
      search, action, entity, userId, severity, dateFrom, dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('filters')
  @ApiOperation({ summary: 'Opciones de filtro disponibles' })
  async filters(@CurrentTenant() tenantId: string) {
    return this.auditService.getFilterOptions(tenantId);
  }
}
