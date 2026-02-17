import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { CurrentTenant, CurrentBranch } from '../../decorators/tenant.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Sales summary with daily breakdown' })
  @ApiQuery({ name: 'from', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-01-31' })
  async salesSummary(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.salesSummary(tenantId, from, to, branchId);
  }

  @Get('products')
  @ApiOperation({ summary: 'Product ranking by revenue or quantity' })
  async productRanking(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.service.productRanking(tenantId, from, to, sortBy, branchId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Sales breakdown by category' })
  async categoryBreakdown(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.categoryBreakdown(tenantId, from, to, branchId);
  }

  @Get('servers')
  @ApiOperation({ summary: 'Waiter/server performance' })
  async serverPerformance(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.serverPerformance(tenantId, from, to, branchId);
  }

  @Get('hourly')
  @ApiOperation({ summary: 'Hourly sales patterns' })
  async hourlyPatterns(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.hourlyPatterns(tenantId, from, to, branchId);
  }

  @Get('weekly')
  @ApiOperation({ summary: 'Day-of-week sales patterns' })
  async dayOfWeekPatterns(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.dayOfWeekPatterns(tenantId, from, to, branchId);
  }

  @Get('order-types')
  @ApiOperation({ summary: 'Sales by order type' })
  async orderTypeBreakdown(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.orderTypeBreakdown(tenantId, from, to, branchId);
  }
}
