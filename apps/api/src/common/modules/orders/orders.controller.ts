import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto, AddOrderItemDto, ProcessPaymentDto, VoidItemDto, OrderQueryDto } from './dto/orders.dto';
import { CurrentTenant, CurrentUser, CurrentBranch } from '../../decorators/tenant.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar órdenes con filtros' })
  async findAll(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Query() query: OrderQueryDto, @Query('branchId') qBranch?: string) {
    return this.ordersService.findAll(tenantId, query, qBranch || branchId);
  }

  @Get('open')
  @ApiOperation({ summary: 'Listar órdenes abiertas (para POS)' })
  async findOpen(@CurrentTenant() tenantId: string, @CurrentBranch() branchId: string | null, @Query('branchId') qBranch?: string) {
    return this.ordersService.findOpenOrders(tenantId, qBranch || branchId);
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
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
    @Body() dto: AddOrderItemDto,
  ) {
    return this.ordersService.addItem(tenantId, orderId, userId, dto);
  }

  @Patch(':id/items/:itemId/void')
  @ApiOperation({ summary: 'Anular item de la orden' })
  async voidItem(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: VoidItemDto,
  ) {
    return this.ordersService.voidItem(tenantId, orderId, itemId, userId, dto.reason);
  }

  @Patch(':id/items/:itemId/notes')
  @ApiOperation({ summary: 'Actualizar notas de un item' })
  async updateItemNotes(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: { notes: string },
  ) {
    return this.ordersService.updateItemNotes(tenantId, orderId, itemId, body.notes);
  }

  @Patch(':id/discount')
  @ApiOperation({ summary: 'Aplicar descuento a la orden' })
  async applyOrderDiscount(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
    @Body() body: { type: 'percent' | 'fixed'; value: number; reason?: string },
  ) {
    return this.ordersService.applyOrderDiscount(tenantId, orderId, userId, body);
  }

  @Patch(':id/items/:itemId/discount')
  @ApiOperation({ summary: 'Aplicar descuento a un item' })
  async applyItemDiscount(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body() body: { type: 'percent' | 'fixed'; value: number; reason?: string },
  ) {
    return this.ordersService.applyItemDiscount(tenantId, orderId, itemId, userId, body);
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
  async cancel(
    @CurrentTenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.cancelOrder(tenantId, orderId, userId);
  }

  @Patch(':id/customer')
  @ApiOperation({ summary: 'Asignar cliente a la orden' })
  async assignCustomer(
    @CurrentTenant() tenantId: string,
    @Param('id') orderId: string,
    @Body() body: { customerId: string | null },
  ) {
    return this.ordersService.assignCustomer(tenantId, orderId, body.customerId);
  }
}
