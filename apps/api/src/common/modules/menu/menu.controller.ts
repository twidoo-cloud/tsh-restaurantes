import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuService } from './menu.service';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { CreatePublicOrderDto } from './dto/public-order.dto';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private service: MenuService) {}

  // PUBLIC - no auth required
  @Get(':slug')
  @ApiOperation({ summary: 'Get public menu by restaurant slug' })
  getMenu(@Param('slug') slug: string) {
    return this.service.getMenuBySlug(slug);
  }

  // PUBLIC - delivery/pickup config for online ordering
  @Get(':slug/order-config')
  @ApiOperation({ summary: 'Get public ordering configuration (delivery zones, hours, WhatsApp)' })
  getOrderConfig(@Param('slug') slug: string) {
    return this.service.getPublicOrderConfig(slug);
  }

  // PUBLIC - create order from online menu (no auth)
  @Post(':slug/order')
  @ApiOperation({ summary: 'Create a delivery/pickup order from the public menu' })
  createPublicOrder(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicOrderDto,
  ) {
    return this.service.createPublicOrder(slug, dto);
  }

  // ADMIN - auth required
  @Get('admin/qr-config')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get QR configuration for tables' })
  getQrConfig(@CurrentTenant() tenantId: string) {
    return this.service.getQrConfig(tenantId);
  }
}
