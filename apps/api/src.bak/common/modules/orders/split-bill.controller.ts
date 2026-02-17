import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SplitBillService } from './split-bill.service';
import {
  CreateEqualSplitDto,
  CreateItemSplitDto,
  CreateCustomSplitDto,
  ProcessSplitPaymentDto,
} from './dto/split-bill.dto';
import { CurrentTenant, CurrentUser } from '../../decorators/tenant.decorator';

@ApiTags('Split Bill')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders/:orderId/splits')
export class SplitBillController {
  constructor(private splitBillService: SplitBillService) {}

  @Get()
  @ApiOperation({ summary: 'Get all splits for an order' })
  async getSplits(
    @CurrentTenant() tenantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.splitBillService.getSplits(tenantId, orderId);
  }

  @Post('equal')
  @ApiOperation({ summary: 'Split order equally among guests' })
  async splitEqual(
    @CurrentTenant() tenantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreateEqualSplitDto,
  ) {
    return this.splitBillService.splitEqual(tenantId, orderId, dto);
  }

  @Post('by-items')
  @ApiOperation({ summary: 'Split order by assigning items to guests' })
  async splitByItems(
    @CurrentTenant() tenantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreateItemSplitDto,
  ) {
    return this.splitBillService.splitByItems(tenantId, orderId, dto);
  }

  @Post('custom')
  @ApiOperation({ summary: 'Split order with custom amounts per guest' })
  async splitCustom(
    @CurrentTenant() tenantId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreateCustomSplitDto,
  ) {
    return this.splitBillService.splitCustom(tenantId, orderId, dto);
  }

  @Post(':splitId/payments')
  @ApiOperation({ summary: 'Process payment for a specific split' })
  async processSplitPayment(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('orderId') orderId: string,
    @Param('splitId') splitId: string,
    @Body() dto: ProcessSplitPaymentDto,
  ) {
    return this.splitBillService.processSplitPayment(tenantId, orderId, splitId, userId, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove all splits from an order (unsplit)' })
  async removeSplits(
    @CurrentTenant() tenantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.splitBillService.removeSplits(tenantId, orderId);
  }
}
