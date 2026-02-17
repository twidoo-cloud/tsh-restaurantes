import { Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { KitchenService } from './kitchen.service';
import { CurrentTenant, CurrentBranch } from '../../decorators/tenant.decorator';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('kitchen')
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  @Get('orders')
  @ApiOperation({ summary: 'Obtener pedidos activos de cocina (KDS)' })
  async getOrders(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
    @Query('station') station?: string,
  ) {
    return this.kitchenService.getKitchenOrders(tenantId, station, branchId);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Obtener pedidos listos para servir' })
  async getReady(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.kitchenService.getReadyOrders(tenantId, branchId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de cocina (últimas 24h)' })
  async getStats(
    @CurrentTenant() tenantId: string,
    @CurrentBranch() branchId: string | null,
  ) {
    return this.kitchenService.getStats(tenantId, branchId);
  }

  @Post('fire/:orderId')
  @ApiOperation({ summary: 'Enviar orden a cocina' })
  async fireOrder(@CurrentTenant() tenantId: string, @Param('orderId') orderId: string) {
    return this.kitchenService.fireOrderToKitchenWithNotify(tenantId, orderId);
  }

  @Patch('item/:id/preparing')
  @ApiOperation({ summary: 'Marcar item como en preparación' })
  async startPreparing(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.kitchenService.updateItemStatus(tenantId, id, 'preparing');
  }

  @Patch('item/:id/ready')
  @ApiOperation({ summary: 'Marcar item como listo' })
  async markReady(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.kitchenService.updateItemStatus(tenantId, id, 'ready');
  }

  @Patch('item/:id/delivered')
  @ApiOperation({ summary: 'Marcar item como entregado' })
  async markDelivered(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.kitchenService.updateItemStatus(tenantId, id, 'delivered');
  }

  @Patch('bump/:orderId')
  @ApiOperation({ summary: 'Bump: marcar toda la orden como lista' })
  async bumpOrder(@CurrentTenant() tenantId: string, @Param('orderId') orderId: string) {
    return this.kitchenService.bumpOrder(tenantId, orderId);
  }
}
