import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { CurrentTenant } from '../../decorators/tenant.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de ventas del día' })
  async getSummary(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getTodaySummary(tenantId);
  }

  @Get('sales-by-hour')
  @ApiOperation({ summary: 'Ventas por hora (hoy)' })
  async getSalesByHour(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getSalesByHour(tenantId);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Productos más vendidos hoy' })
  async getTopProducts(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getTopProducts(tenantId);
  }

  @Get('sales-by-category')
  @ApiOperation({ summary: 'Ventas por categoría' })
  async getSalesByCategory(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getSalesByCategory(tenantId);
  }

  @Get('table-stats')
  @ApiOperation({ summary: 'Rendimiento de mesas hoy' })
  async getTableStats(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getTableStats(tenantId);
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Últimas órdenes completadas' })
  async getRecentOrders(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getRecentOrders(tenantId);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Tendencia últimos 7 días' })
  async getTrend(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getSalesTrend(tenantId);
  }

  @Get('server-stats')
  @ApiOperation({ summary: 'Rendimiento de meseros/vendedores' })
  async getServerStats(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getServerStats(tenantId);
  }
}
