import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { CurrentTenant, CurrentBranch } from '../../decorators/tenant.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de ventas del día' })
  async getSummary(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getTodaySummary(tenantId, branchId);
  }

  @Get('sales-by-hour')
  async getSalesByHour(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getSalesByHour(tenantId, branchId);
  }

  @Get('top-products')
  async getTopProducts(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getTopProducts(tenantId, branchId);
  }

  @Get('sales-by-category')
  async getSalesByCategory(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getSalesByCategory(tenantId, branchId);
  }

  @Get('table-stats')
  async getTableStats(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getTableStats(tenantId, branchId);
  }

  @Get('recent-orders')
  async getRecentOrders(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getRecentOrders(tenantId, branchId);
  }

  @Get('trend')
  async getTrend(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getSalesTrend(tenantId, branchId);
  }

  @Get('server-stats')
  async getServerStats(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getServerStats(tenantId, branchId);
  }

  @Get('cost-analysis')
  async getCostAnalysis(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null) {
    return this.dashboardService.getCostAnalysis(tenantId, branchId);
  }
}
