import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuService } from './menu.service';
import { CurrentTenant } from '../../decorators/tenant.decorator';

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

  // ADMIN - auth required
  @Get('admin/qr-config')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get QR configuration for tables' })
  getQrConfig(@CurrentTenant() tenantId: string) {
    return this.service.getQrConfig(tenantId);
  }
}
