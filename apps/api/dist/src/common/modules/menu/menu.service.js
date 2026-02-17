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
const delivery_service_1 = require("../delivery/delivery.service");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
const DEFAULT_BRANDING = {
    accentColor: '#2563eb',
    primaryColor: '#1e3a8a',
    logoUrl: null,
    appName: '',
};
let MenuService = class MenuService {
    constructor(prisma, deliveryService, wsGateway) {
        this.prisma = prisma;
        this.deliveryService = deliveryService;
        this.wsGateway = wsGateway;
    }
    async getMenuBySlug(slug) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { slug, isActive: true },
            include: {
                reseller: { select: { themeConfig: true, logoUrl: true } },
            },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Restaurante no encontrado');
        const tenantSettings = tenant.settings || {};
        const tenantBranding = tenantSettings.branding || {};
        const resellerBranding = tenant.reseller?.themeConfig || {};
        const branding = {
            ...DEFAULT_BRANDING,
            appName: tenant.name,
            ...resellerBranding,
            ...tenantBranding,
            logoUrl: tenant.logoUrl || tenantBranding.logoUrl || resellerBranding.logoUrl || tenant.reseller?.logoUrl || null,
        };
        const [categories, products] = await Promise.all([
            this.prisma.productCategory.findMany({
                where: { tenantId: tenant.id, isActive: true },
                orderBy: { displayOrder: 'asc' },
                select: { id: true, name: true, description: true, imageUrl: true },
            }),
            this.prisma.product.findMany({
                where: { tenantId: tenant.id, isActive: true, isAvailable: true },
                orderBy: { displayOrder: 'asc' },
                select: { id: true, categoryId: true, name: true, description: true, price: true, imageUrl: true, tags: true, attributes: true },
            }),
        ]);
        const productsByCategory = new Map();
        const uncategorized = [];
        for (const p of products) {
            if (!p.categoryId) {
                uncategorized.push(p);
                continue;
            }
            const arr = productsByCategory.get(p.categoryId) || [];
            arr.push(p);
            productsByCategory.set(p.categoryId, arr);
        }
        const menu = categories
            .map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            imageUrl: cat.imageUrl,
            products: (productsByCategory.get(cat.id) || []).map(p => ({
                id: p.id, name: p.name, description: p.description,
                price: parseFloat(p.price.toString()),
                imageUrl: p.imageUrl, tags: p.tags, attributes: p.attributes,
            })),
        }))
            .filter(c => c.products.length > 0);
        if (uncategorized.length > 0) {
            menu.push({
                id: 'other', name: 'Otros', description: null, imageUrl: null,
                products: uncategorized.map(p => ({
                    id: p.id, name: p.name, description: p.description,
                    price: parseFloat(p.price.toString()),
                    imageUrl: p.imageUrl, tags: p.tags, attributes: p.attributes,
                })),
            });
        }
        let onlineOrdering = { enabled: false, acceptsDelivery: false, acceptsPickup: false, whatsappNumber: null };
        try {
            const settings = await this.prisma.$queryRawUnsafe(`SELECT is_enabled, accepts_delivery, accepts_pickup, whatsapp_number
         FROM delivery_settings WHERE tenant_id = '${tenant.id}'::uuid`);
            if (settings.length > 0) {
                const s = settings[0];
                onlineOrdering = {
                    enabled: s.is_enabled ?? true,
                    acceptsDelivery: s.accepts_delivery ?? true,
                    acceptsPickup: s.accepts_pickup ?? true,
                    whatsappNumber: s.whatsapp_number || null,
                };
            }
        }
        catch { }
        return {
            restaurant: { name: tenant.name, slug: tenant.slug, currencyCode: tenant.currencyCode, phone: tenant.phone },
            branding,
            settings: { defaultTaxRate: tenantSettings.defaultTaxRate ?? 15, currency: tenantSettings.currency || { code: tenant.currencyCode, symbol: '$', decimals: 2 } },
            menu,
            onlineOrdering,
            totalProducts: products.length,
        };
    }
    async getPublicOrderConfig(slug) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { slug, isActive: true },
            select: { id: true, name: true, phone: true },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Restaurante no encontrado');
        let settings = {};
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM delivery_settings WHERE tenant_id = '${tenant.id}'::uuid`);
            if (rows.length)
                settings = rows[0];
        }
        catch { }
        let zones = [];
        try {
            zones = await this.prisma.$queryRawUnsafe(`SELECT id, name, delivery_fee, min_order_amount, estimated_minutes, color
         FROM delivery_zones
         WHERE tenant_id = '${tenant.id}'::uuid AND is_active = true
         ORDER BY display_order, name`);
        }
        catch { }
        return {
            restaurantName: tenant.name,
            restaurantPhone: tenant.phone,
            isEnabled: settings.is_enabled ?? true,
            acceptsDelivery: settings.accepts_delivery ?? true,
            acceptsPickup: settings.accepts_pickup ?? true,
            defaultDeliveryFee: parseFloat(settings.default_delivery_fee) || 0,
            freeDeliveryAbove: settings.free_delivery_above ? parseFloat(settings.free_delivery_above) : null,
            minOrderAmount: parseFloat(settings.min_order_amount) || 0,
            estimatedDeliveryMinutes: settings.estimated_delivery_minutes || 45,
            estimatedPickupMinutes: settings.estimated_pickup_minutes || 20,
            deliveryHoursStart: settings.delivery_hours_start || '11:00',
            deliveryHoursEnd: settings.delivery_hours_end || '22:00',
            whatsappNumber: settings.whatsapp_number || null,
            zones: zones.map(z => ({
                id: z.id,
                name: z.name,
                deliveryFee: parseFloat(z.delivery_fee) || 0,
                minOrderAmount: parseFloat(z.min_order_amount) || 0,
                estimatedMinutes: z.estimated_minutes || 30,
            })),
        };
    }
    async createPublicOrder(slug, dto) {
        const tenant = await this.prisma.tenant.findFirst({
            where: { slug, isActive: true },
            select: { id: true, name: true },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Restaurante no encontrado');
        let settings = {};
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT * FROM delivery_settings WHERE tenant_id = '${tenant.id}'::uuid`);
            if (rows.length)
                settings = rows[0];
        }
        catch { }
        if (settings.is_enabled === false) {
            throw new common_1.BadRequestException('Los pedidos online no están habilitados');
        }
        if (dto.deliveryType === 'delivery' && settings.accepts_delivery === false) {
            throw new common_1.BadRequestException('Delivery no disponible');
        }
        if (dto.deliveryType === 'pickup' && settings.accepts_pickup === false) {
            throw new common_1.BadRequestException('Pickup no disponible');
        }
        const productIds = dto.items.map(i => i.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, tenantId: tenant.id, isActive: true, isAvailable: true },
            select: { id: true, name: true, price: true },
        });
        if (products.length !== productIds.length) {
            throw new common_1.BadRequestException('Uno o más productos no están disponibles');
        }
        const result = await this.deliveryService.create(tenant.id, {
            customerName: dto.customerName,
            customerPhone: dto.customerPhone,
            customerEmail: dto.customerEmail,
            deliveryType: dto.deliveryType,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            addressReference: dto.addressReference,
            city: dto.city,
            zoneId: dto.zoneId,
            paymentMethod: dto.paymentMethod || 'cash',
            source: 'online_menu',
            notes: dto.notes,
            items: dto.items,
        });
        this.wsGateway.emitToTenant(tenant.id, 'delivery:new-online-order', {
            orderId: result.order_id,
            orderNumber: result.order_number,
            customerName: dto.customerName,
            customerPhone: dto.customerPhone,
            deliveryType: dto.deliveryType,
            total: result.order_total,
            source: 'online_menu',
        });
        return {
            success: true,
            orderNumber: result.order_number,
            estimatedMinutes: dto.deliveryType === 'pickup'
                ? (settings.estimated_pickup_minutes || 20)
                : (settings.estimated_delivery_minutes || 45),
            message: `Pedido ${result.order_number} recibido. ${dto.deliveryType === 'pickup'
                ? `Listo para recoger en ~${settings.estimated_pickup_minutes || 20} min.`
                : `Entrega estimada en ~${settings.estimated_delivery_minutes || 45} min.`}`,
        };
    }
    async getQrConfig(tenantId) {
        const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        const tables = await this.prisma.$queryRaw `
      SELECT t.id, t.number, t.capacity, t.shape, z.name as zone_name, z.color as zone_color
      FROM tables t JOIN zones z ON z.id = t.zone_id
      WHERE t.tenant_id = ${tenantId}::uuid AND t.is_active = true
      ORDER BY z.name, t.number
    `;
        return {
            slug: tenant.slug,
            name: tenant.name,
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        delivery_service_1.DeliveryService,
        pos_events_gateway_1.PosEventsGateway])
], MenuService);
//# sourceMappingURL=menu.service.js.map