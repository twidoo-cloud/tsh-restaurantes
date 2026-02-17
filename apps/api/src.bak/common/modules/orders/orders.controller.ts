import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto, AddOrderItemDto, ProcessPaymentDto, VoidItemDto, OrderQueryDto } from './dto/orders.dto';
import { CurrentTenant, CurrentUser } from '../../decorators/tenant.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar órdenes con filtros' })
  async findAll(@CurrentTenant() tenantId: string, @Query() query: OrderQueryDto) {
    return this.ordersService.findAll(tenantId, query);
  }

  @Get('open')
  @ApiOperation({ summary: 'Listar órdenes abiertas (para POS)' })
  async findOpen(@CurrentTenant() tenantId: string) {
    return this.ordersService.findOpenOrders(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener orden por ID' })
  async findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.ordersService.findById(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva orden' })
  async create(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(tenantId, userId, dto);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Agregar item a la orden' })
  async addItem(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: AddOrderItemDto,
  ) {
    return this.ordersService.addItem(tenantId, orderId, dto);
  }

  @Patch(':id/items/:itemId/void')
  @ApiOperation({ summary: 'Anular item de la orden' })
  async voidItem(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: VoidItemDto,
  ) {
    return this.ordersService.voidItem(tenantId, orderId, itemId, dto.reason);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Procesar pago' })
  async processPayment(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.ordersService.processPayment(tenantId, orderId, userId, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar orden' })
  async cancel(@CurrentTenant() tenantId: string, @Param('id') orderId: string) {
    return this.ordersService.cancelOrder(tenantId, orderId);
  }
}
