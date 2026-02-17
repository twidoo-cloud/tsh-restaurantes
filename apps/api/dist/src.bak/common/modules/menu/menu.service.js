"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let MenuService = class MenuService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMenuBySlug(slug) {
        const tenants = await this.prisma.tenant.findMany({ where: { slug } });
        if (!tenants.length)
            throw new common_1.NotFoundException('Restaurante no encontrado');
        const tenant = tenants[0];
        const branding = null;
        const categories = await this.prisma.productCategory.findMany({
            where: { tenantId: tenant.id, isActive: true },
            orderBy: { displayOrder: 'asc' },
        });
        const products = await this.prisma.product.findMany({
            where: { tenantId: tenant.id, isActive: true, isAvailable: true },
            orderBy: { displayOrder: 'asc' },
        });
        const menu = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            imageUrl: cat.imageUrl,
            products: products
                .filter(p => p.categoryId === cat.id)
                .map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                imageUrl: p.imageUrl,
                tags: p.tags,
                attributes: p.attributes,
            })),
        })).filter(c => c.products.length > 0);
        const uncategorized = products.filter(p => !p.categoryId);
        if (uncategorized.length > 0) {
            menu.push({
                id: 'other',
                name: 'Otros',
                description: null,
                imageUrl: null,
                products: uncategorized.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    imageUrl: p.imageUrl,
                    tags: p.tags,
                    attributes: p.attributes,
                })),
            });
        }
        return {
            restaurant: {
                name: tenant.name,
                slug: tenant.slug,
                currencyCode: tenant.currencyCode,
            },
            branding,
            menu,
            updatedAt: new Date().toISOString(),
        };
    }
    async getQrConfig(tenantId) {
        const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        const tables = await this.prisma.$queryRawUnsafe(`
      SELECT t.id, t.number, t.capacity, z.name as zone_name
      FROM tables t JOIN zones z ON z.id = t.zone_id
      WHERE t.tenant_id = '${tenantId}'::uuid AND t.is_active = true
      ORDER BY t.number
    `);
        return {
            slug: tenant.slug,
            menuUrl: `/menu/${tenant.slug}`,
            tables: tables.map(t => ({
                ...t,
                qrUrl: `/menu/${tenant.slug}?table=${t.number}`,
            })),
        };
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MenuService);
//# sourceMappingURL=menu.service.js.map