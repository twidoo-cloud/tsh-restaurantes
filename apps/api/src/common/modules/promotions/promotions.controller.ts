import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto, ApplyCouponDto, PromotionQueryDto } from './dto/promotions.dto';
import { CurrentTenant } from '../../decorators/tenant.decorator';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('promotions')
export class PromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  // ── CRUD ──

  @Get()
  @ApiOperation({ summary: 'List all promotions' })
  async findAll(@CurrentTenant() tenantId: string, @Query() query: PromotionQueryDto) {
    return this.promotionsService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get promotion by ID' })
  async findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.promotionsService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create promotion' })
  async create(@CurrentTenant() tenantId: string, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update promotion' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(tenantId, id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle promotion active/inactive' })
  async toggleActive(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.promotionsService.toggleActive(tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete promotion' })
  async delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.promotionsService.delete(tenantId, id);
  }

  // ── Order integration ──

  @Post('orders/:orderId/apply')
  @ApiOperation({ summary: 'Apply automatic promotions to an order' })
  async applyToOrder(@CurrentTenant() tenantId: string, @Param('orderId') orderId: string) {
    return this.promotionsService.applyPromotionsToOrder(tenantId, orderId);
  }

  @Post('orders/:orderId/coupon')
  @ApiOperation({ summary: 'Apply coupon code to an order' })
  async applyCoupon(
    @CurrentTenant() tenantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.promotionsService.applyCoupon(tenantId, orderId, dto.couponCode);
  }

  @Delete('orders/:orderId/:promotionId')
  @ApiOperation({ summary: 'Remove a promotion from an order' })
  async removeFromOrder(
    @CurrentTenant() tenantId: string,
    @Param('orderId') orderId: string,
    @Param('promotionId') promotionId: string,
  ) {
    return this.promotionsService.removePromotion(tenantId, orderId, promotionId);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get promotions applied to an order' })
  async getOrderPromotions(@CurrentTenant() tenantId: string, @Param('orderId') orderId: string) {
    return this.promotionsService.getOrderPromotions(tenantId, orderId);
  }
}
