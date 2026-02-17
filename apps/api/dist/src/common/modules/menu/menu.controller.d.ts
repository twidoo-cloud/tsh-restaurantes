import { MenuService } from './menu.service';
import { CreatePublicOrderDto } from './dto/public-order.dto';
export declare class MenuController {
    private service;
    constructor(service: MenuService);
    getMenu(slug: string): unknown;
    getOrderConfig(slug: string): unknown;
    createPublicOrder(slug: string, dto: CreatePublicOrderDto): unknown;
    getQrConfig(tenantId: string): unknown;
}
