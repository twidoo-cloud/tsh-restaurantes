import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LoyaltyService } from './loyalty.service';
import {
  EnrollCustomerDto, EarnPointsDto, RedeemRewardDto, AdjustPointsDto,
  CreateRewardDto, UpdateRewardDto, UpdateLoyaltySettingsDto, LoyaltyQueryDto,
} from './dto/loyalty.dto';
import { CurrentTenant } from '../../decorators/tenant.decorator';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('loyalty')
export class LoyaltyController {
  constructor(private service: LoyaltyService) {}

  // ── Points Engine ──
  @Post('enroll')
  @ApiOperation({ summary: 'Enroll customer in loyalty program' })
  enroll(@CurrentTenant() tenantId: string, @Body() dto: EnrollCustomerDto) {
    return this.service.enrollCustomer(tenantId, dto);
  }

  @Post('earn')
  @ApiOperation({ summary: 'Earn points from a purchase' })
  earn(@CurrentTenant() tenantId: string, @Body() dto: EarnPointsDto) {
    return this.service.earnPoints(tenantId, dto);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a reward' })
  redeem(@CurrentTenant() tenantId: string, @Body() dto: RedeemRewardDto) {
    return this.service.redeemReward(tenantId, dto);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Manually adjust points' })
  adjust(@CurrentTenant() tenantId: string, @Body() dto: AdjustPointsDto) {
    return this.service.adjustPoints(tenantId, dto);
  }

  // ── Customer Info ──
  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Get customer loyalty info' })
  getCustomer(@CurrentTenant() tenantId: string, @Param('customerId') customerId: string) {
    return this.service.getCustomerLoyalty(tenantId, customerId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Top customers leaderboard' })
  leaderboard(@CurrentTenant() tenantId: string) {
    return this.service.getLeaderboard(tenantId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Points transaction history' })
  transactions(@CurrentTenant() tenantId: string, @Query() query: LoyaltyQueryDto) {
    return this.service.getTransactions(tenantId, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Loyalty program dashboard' })
  dashboard(@CurrentTenant() tenantId: string) {
    return this.service.getDashboard(tenantId);
  }

  // ── Rewards CRUD ──
  @Get('rewards')
  @ApiOperation({ summary: 'List rewards catalog' })
  getRewards(@CurrentTenant() tenantId: string) {
    return this.service.getRewards(tenantId);
  }

  @Post('rewards')
  @ApiOperation({ summary: 'Create reward' })
  createReward(@CurrentTenant() tenantId: string, @Body() dto: CreateRewardDto) {
    return this.service.createReward(tenantId, dto);
  }

  @Put('rewards/:id')
  @ApiOperation({ summary: 'Update reward' })
  updateReward(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateRewardDto) {
    return this.service.updateReward(tenantId, id, dto);
  }

  @Delete('rewards/:id')
  @ApiOperation({ summary: 'Delete reward' })
  deleteReward(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.deleteReward(tenantId, id);
  }

  // ── Tiers ──
  @Get('tiers')
  @ApiOperation({ summary: 'Get loyalty tiers' })
  getTiers(@CurrentTenant() tenantId: string) {
    return this.service.getTiers(tenantId);
  }

  // ── Settings ──
  @Get('settings')
  @ApiOperation({ summary: 'Get loyalty settings' })
  getSettings(@CurrentTenant() tenantId: string) {
    return this.service.getOrCreateSettings(tenantId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update loyalty settings' })
  updateSettings(@CurrentTenant() tenantId: string, @Body() dto: UpdateLoyaltySettingsDto) {
    return this.service.updateSettings(tenantId, dto);
  }
}
