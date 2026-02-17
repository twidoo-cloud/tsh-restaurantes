import { MenuService } from './menu.service';
export declare class MenuController {
    private service;
    constructor(service: MenuService);
    getMenu(slug: string): unknown;
    getQrConfig(tenantId: string): unknown;
}
