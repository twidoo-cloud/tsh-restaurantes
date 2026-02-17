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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const DEFAULT_BRANDING = {
    primaryColor: '#1e3a8a',
    secondaryColor: '#0ea5e9',
    sidebarColor: '#1e293b',
    sidebarTextColor: '#ffffff',
    accentColor: '#2563eb',
    logoUrl: null,
    logoWidth: 120,
    faviconUrl: null,
    appName: '',
    loginSubtitle: '',
    footerText: '',
    showPoweredBy: true,
    customCss: null,
};
let TenantsService = class TenantsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCurrent(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                reseller: { select: { id: true, name: true, slug: true, themeConfig: true, logoUrl: true, domain: true } },
            },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        if (tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt && new Date() > new Date(tenant.trialEndsAt)) {
            await this.prisma.tenant.update({
                where: { id: tenantId },
                data: { subscriptionPlan: 'basic', subscriptionStatus: 'active' },
            });
            tenant.subscriptionPlan = 'basic';
            tenant.subscriptionStatus = 'active';
        }
        const resellerBranding = tenant.reseller?.themeConfig || {};
        const tenantSettings = tenant.settings || {};
        const tenantBranding = tenantSettings.branding || {};
        const branding = {
            ...DEFAULT_BRANDING,
            appName: tenant.name,
            ...resellerBranding,
            ...tenantBranding,
            logoUrl: tenant.logoUrl || tenantBranding.logoUrl || resellerBranding.logoUrl || tenant.reseller?.logoUrl || null,
        };
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            verticalType: tenant.verticalType,
            enabledModules: tenant.enabledModules,
            countryCode: tenant.countryCode,
            currencyCode: tenant.currencyCode,
            timezone: tenant.timezone,
            phone: tenant.phone,
            logoUrl: tenant.logoUrl,
            subscriptionPlan: tenant.subscriptionPlan,
            subscriptionStatus: tenant.subscriptionStatus,
            trialEndsAt: tenant.trialEndsAt,
            trialExpired: tenant.trialEndsAt ? new Date() > new Date(tenant.trialEndsAt) : false,
            trialDaysRemaining: tenant.trialEndsAt
                ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000))
                : null,
            isActive: tenant.isActive,
            branding,
            settings: {
                locale: tenantSettings.locale || 'es',
                receiptHeader: tenantSettings.receiptHeader || tenant.name,
                receiptFooter: tenantSettings.receiptFooter || 'Gracias por su compra',
                defaultTaxRate: tenantSettings.defaultTaxRate ?? 15,
                currency: tenantSettings.currency || { code: tenant.currencyCode, symbol: '$', decimals: 2 },
                timezone: tenant.timezone,
            },
            reseller: tenant.reseller ? {
                id: tenant.reseller.id,
                name: tenant.reseller.name,
                slug: tenant.reseller.slug,
            } : null,
        };
    }
    async updateBranding(tenantId, branding) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        const currentSettings = tenant.settings || {};
        const currentBranding = currentSettings.branding || {};
        const colorFields = ['primaryColor', 'secondaryColor', 'sidebarColor', 'sidebarTextColor', 'accentColor'];
        for (const field of colorFields) {
            if (branding[field] && !/^#[0-9a-fA-F]{6}$/.test(branding[field])) {
                throw new common_1.BadRequestException(`${field} debe ser un color hex válido (ej: #1e3a8a)`);
            }
        }
        const updatedBranding = { ...currentBranding, ...branding };
        const updatedSettings = { ...currentSettings, branding: updatedBranding };
        const updated = await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                settings: updatedSettings,
                ...(branding.logoUrl !== undefined ? { logoUrl: branding.logoUrl } : {}),
            },
        });
        return { success: true, branding: updatedBranding };
    }
    async updateSettings(tenantId, settings) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        const currentSettings = tenant.settings || {};
        const updatedSettings = {
            ...currentSettings,
            ...(settings.locale !== undefined ? { locale: settings.locale } : {}),
            ...(settings.receiptHeader !== undefined ? { receiptHeader: settings.receiptHeader } : {}),
            ...(settings.receiptFooter !== undefined ? { receiptFooter: settings.receiptFooter } : {}),
            ...(settings.defaultTaxRate !== undefined ? { defaultTaxRate: settings.defaultTaxRate } : {}),
            ...(settings.currency !== undefined ? { currency: settings.currency } : {}),
        };
        const data = { settings: updatedSettings };
        if (settings.timezone)
            data.timezone = settings.timezone;
        await this.prisma.tenant.update({ where: { id: tenantId }, data });
        return { success: true, settings: updatedSettings };
    }
    async updateProfile(tenantId, profile) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        const data = {};
        if (profile.name)
            data.name = profile.name;
        if (profile.phone !== undefined)
            data.phone = profile.phone;
        if (profile.address !== undefined)
            data.address = profile.address;
        if (profile.verticalType)
            data.verticalType = profile.verticalType;
        return this.prisma.tenant.update({ where: { id: tenantId }, data });
    }
    async changePlan(tenantId, user, plan, paymentMethod) {
        const validPlans = ['basic', 'standard', 'premium', 'enterprise'];
        if (!validPlans.includes(plan)) {
            throw new common_1.BadRequestException(`Plan inválido. Opciones: ${validPlans.join(', ')}`);
        }
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        if (user?.role !== 'owner') {
            throw new common_1.ForbiddenException('Solo el dueño puede cambiar de plan');
        }
        const oldPlan = tenant.subscriptionPlan;
        const now = new Date();
        const updateData = {
            subscriptionPlan: plan,
            subscriptionStatus: 'active',
        };
        if (tenant.subscriptionStatus === 'trial') {
            updateData.trialEndsAt = null;
        }
        const updated = await this.prisma.tenant.update({
            where: { id: tenantId },
            data: updateData,
        });
        try {
            await this.prisma.$executeRaw `
        INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, description, metadata, severity)
        VALUES (${tenantId}::uuid, ${user.sub}::uuid, 'plan_change', 'tenant', ${tenantId}::uuid,
          ${`Plan cambiado de ${oldPlan} a ${plan}`},
          ${JSON.stringify({ oldPlan, newPlan: plan, paymentMethod: paymentMethod || 'pending' })}::jsonb,
          'high')
      `;
        }
        catch { }
        return {
            tenant: {
                id: updated.id,
                subscriptionPlan: updated.subscriptionPlan,
                subscriptionStatus: updated.subscriptionStatus,
            },
            message: `Plan actualizado a ${plan}`,
            previousPlan: oldPlan,
        };
    }
    async checkTrialExpiry(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            return null;
        if (tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt) {
            const now = new Date();
            if (now > new Date(tenant.trialEndsAt)) {
                await this.prisma.tenant.update({
                    where: { id: tenantId },
                    data: { subscriptionPlan: 'basic', subscriptionStatus: 'active' },
                });
                return { expired: true, downgradedTo: 'basic' };
            }
            return {
                expired: false,
                daysRemaining: Math.ceil((new Date(tenant.trialEndsAt).getTime() - now.getTime()) / 86400000),
            };
        }
        return { expired: false, isTrial: false };
    }
    async listUsers(tenantId) {
        const users = await this.prisma.user.findMany({
            where: { tenantId },
            select: { id: true, email: true, firstName: true, lastName: true, pinHash: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, lastLoginAt: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        return users.map(u => ({
            ...u,
            hasPin: !!u.pinHash,
            pinHash: undefined,
        }));
    }
    async createUser(tenantId, data) {
        const existing = await this.prisma.user.findFirst({ where: { tenantId, email: data.email } });
        if (existing)
            throw new common_1.BadRequestException('Ya existe un usuario con ese email');
        const bcrypt = await Promise.resolve().then(() => require('bcrypt'));
        const passwordHash = await bcrypt.hash(data.password, 10);
        const pinHash = data.pin && data.pin.length >= 4 ? await bcrypt.hash(data.pin, 10) : null;
        const user = await this.prisma.user.create({
            data: { tenantId, email: data.email, firstName: data.firstName, lastName: data.lastName, passwordHash, pinHash, roleId: data.roleId },
            select: { id: true, email: true, firstName: true, lastName: true, pinHash: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, createdAt: true },
        });
        return { ...user, hasPin: !!user.pinHash, pinHash: undefined };
    }
    async updateUser(tenantId, userId, data) {
        const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        const bcrypt = await Promise.resolve().then(() => require('bcrypt'));
        const updateData = {};
        if (data.firstName)
            updateData.firstName = data.firstName;
        if (data.lastName)
            updateData.lastName = data.lastName;
        if (data.email)
            updateData.email = data.email;
        if (data.roleId)
            updateData.roleId = data.roleId;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        if (data.password) {
            updateData.passwordHash = await bcrypt.hash(data.password, 10);
        }
        if (data.pin === null || data.pin === '') {
            updateData.pinHash = null;
        }
        else if (data.pin && data.pin.length >= 4) {
            updateData.pinHash = await bcrypt.hash(data.pin, 10);
        }
        return this.prisma.user.update({
            where: { id: userId }, data: updateData,
            select: { id: true, email: true, firstName: true, lastName: true, pinHash: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, createdAt: true },
        }).then(u => ({ ...u, hasPin: !!u.pinHash, pinHash: undefined }));
    }
    async listRoles(tenantId) {
        return this.prisma.role.findMany({
            where: { tenantId },
            select: { id: true, name: true, slug: true, isSystem: true },
            orderBy: { name: 'asc' },
        });
    }
    async resellerListTenants(resellerId) {
        return this.prisma.tenant.findMany({
            where: { resellerId },
            select: {
                id: true, name: true, slug: true, verticalType: true, countryCode: true,
                subscriptionPlan: true, subscriptionStatus: true, isActive: true,
                phone: true, logoUrl: true, createdAt: true,
                _count: { select: { users: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async resellerUpdateTheme(resellerId, themeConfig) {
        return this.prisma.reseller.update({
            where: { id: resellerId },
            data: { themeConfig: themeConfig },
        });
    }
    assertSuperAdmin(user) {
        if (user?.role !== 'owner')
            throw new common_1.ForbiddenException('Solo el owner puede realizar esta acción');
    }
    async adminListAll(user) {
        this.assertSuperAdmin(user);
        return this.prisma.$queryRaw `
      SELECT t.id, t.name, t.slug, t.vertical_type, t.country_code, t.currency_code,
        t.subscription_plan, t.subscription_status, t.is_active, t.phone, t.logo_url,
        t.created_at, t.updated_at,
        (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id AND u.is_active = true) as user_count,
        (SELECT COUNT(*)::int FROM orders o WHERE o.tenant_id = t.id AND o.created_at > NOW() - INTERVAL '30 days') as orders_30d,
        r.name as reseller_name
      FROM tenants t
      LEFT JOIN resellers r ON r.id = t.reseller_id
      ORDER BY t.created_at DESC
    `;
    }
    async adminCreateTenant(user, data) {
        this.assertSuperAdmin(user);
        const existing = await this.prisma.tenant.findFirst({ where: { slug: data.slug } });
        if (existing)
            throw new common_1.BadRequestException('Ya existe un tenant con ese slug');
        const currentTenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { resellerId: true } });
        if (!currentTenant)
            throw new common_1.NotFoundException('Tenant actual no encontrado');
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        const tenant = await this.prisma.tenant.create({
            data: {
                resellerId: currentTenant.resellerId,
                name: data.name,
                slug: data.slug,
                verticalType: data.verticalType || 'restaurant',
                countryCode: data.countryCode || 'EC',
                currencyCode: data.currencyCode || 'USD',
                timezone: data.timezone || 'America/Guayaquil',
                phone: data.phone || null,
                taxId: data.taxId || null,
                subscriptionPlan: data.subscriptionPlan || 'premium',
                subscriptionStatus: 'trial',
                trialEndsAt: trialEnd,
                enabledModules: ['core'],
                settings: {},
            },
        });
        await this.seedDefaultRoles(tenant.id);
        const ownerRole = await this.prisma.role.findFirst({ where: { tenantId: tenant.id, slug: 'owner' } });
        if (!ownerRole)
            throw new Error('Error al crear roles por defecto');
        const bcrypt = await Promise.resolve().then(() => require('bcrypt'));
        const passwordHash = await bcrypt.hash(data.ownerPassword, 10);
        await this.prisma.user.create({
            data: {
                tenantId: tenant.id,
                roleId: ownerRole.id,
                email: data.ownerEmail,
                firstName: data.ownerFirstName,
                lastName: data.ownerLastName,
                passwordHash,
            },
        });
        return { tenant, message: 'Tenant creado con usuario dueño' };
    }
    async adminUpdateTenant(user, tenantId, data) {
        this.assertSuperAdmin(user);
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.phone !== undefined)
            updateData.phone = data.phone;
        if (data.taxId !== undefined)
            updateData.taxId = data.taxId;
        if (data.subscriptionPlan !== undefined)
            updateData.subscriptionPlan = data.subscriptionPlan;
        if (data.subscriptionStatus !== undefined)
            updateData.subscriptionStatus = data.subscriptionStatus;
        if (data.enabledModules !== undefined)
            updateData.enabledModules = data.enabledModules;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        if (data.verticalType !== undefined)
            updateData.verticalType = data.verticalType;
        if (data.countryCode !== undefined)
            updateData.countryCode = data.countryCode;
        if (data.currencyCode !== undefined)
            updateData.currencyCode = data.currencyCode;
        if (data.timezone !== undefined)
            updateData.timezone = data.timezone;
        return this.prisma.tenant.update({ where: { id: tenantId }, data: updateData });
    }
    async adminToggleTenant(user, tenantId) {
        this.assertSuperAdmin(user);
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        return this.prisma.tenant.update({ where: { id: tenantId }, data: { isActive: !tenant.isActive } });
    }
    async adminGetTenantDetail(user, tenantId) {
        this.assertSuperAdmin(user);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                users: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true, lastLoginAt: true, role: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: 'asc' } },
                roles: { select: { id: true, name: true, slug: true, permissions: true, isSystem: true }, orderBy: { isSystem: 'desc' } },
                reseller: { select: { id: true, name: true } },
            },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        const stats = await this.prisma.$queryRaw `
      SELECT
        (SELECT COUNT(*)::int FROM orders WHERE tenant_id = ${tenantId}::uuid AND status = 'completed') as total_orders,
        (SELECT COALESCE(SUM(total), 0)::float FROM orders WHERE tenant_id = ${tenantId}::uuid AND status = 'completed') as total_revenue,
        (SELECT COUNT(*)::int FROM products WHERE tenant_id = ${tenantId}::uuid AND is_active = true) as total_products
    `;
        return { ...tenant, stats: stats[0] || {} };
    }
    async seedDefaultRoles(tenantId) {
        const defaultRoles = [
            {
                name: 'Dueño', slug: 'owner', isSystem: true,
                permissions: ['*'],
            },
            {
                name: 'Administrador', slug: 'admin', isSystem: true,
                permissions: [
                    'dashboard.*', 'pos.*', 'tables.*', 'kitchen.*', 'shifts.*',
                    'inventory.*', 'invoices.*', 'customers.*', 'recipes.*',
                    'suppliers.*', 'promotions.*', 'reservations.*', 'delivery.*',
                    'loyalty.*', 'credit.*', 'staff.*', 'reports.*', 'sri.*',
                    'settings.view', 'settings.manage',
                ],
            },
            {
                name: 'Cajero', slug: 'cashier', isSystem: true,
                permissions: [
                    'pos.view', 'pos.create', 'pos.edit', 'pos.void', 'pos.discount', 'pos.payment',
                    'tables.view', 'tables.update',
                    'shifts.view', 'shifts.open', 'shifts.close',
                    'invoices.view', 'invoices.create',
                    'customers.view', 'customers.create',
                    'reservations.view',
                    'delivery.view',
                    'credit.view', 'credit.payment',
                ],
            },
            {
                name: 'Mesero', slug: 'waiter', isSystem: true,
                permissions: [
                    'pos.view', 'pos.create', 'pos.edit',
                    'tables.view', 'tables.update',
                    'reservations.view',
                ],
            },
            {
                name: 'Cocina', slug: 'kitchen', isSystem: true,
                permissions: [
                    'kitchen.view', 'kitchen.update', 'kitchen.bump',
                ],
            },
        ];
        for (const role of defaultRoles) {
            await this.prisma.$executeRaw `
        INSERT INTO roles (tenant_id, name, slug, permissions, is_system)
        VALUES (${tenantId}::uuid, ${role.name}, ${role.slug}, ${JSON.stringify(role.permissions)}::jsonb, ${role.isSystem})
        ON CONFLICT (tenant_id, slug) DO NOTHING
      `;
        }
    }
    async exportTenantData(tenantId, user) {
        if (user?.role !== 'owner' && user?.role !== 'admin') {
            throw new common_1.ForbiddenException('Solo owner o admin pueden exportar datos');
        }
        const [tenant, categories, products, customers, suppliers, orders, recipes, roles, users, zones, tables, promotions, creditAccounts, auditLogs,] = await Promise.all([
            this.prisma.tenant.findUnique({ where: { id: tenantId } }),
            this.prisma.productCategory.findMany({ where: { tenantId } }),
            this.prisma.product.findMany({ where: { tenantId }, include: { variants: true } }),
            this.prisma.customer.findMany({ where: { tenantId } }),
            this.prisma.supplier.findMany({ where: { tenantId } }),
            this.prisma.$queryRaw `
        SELECT o.*, json_agg(json_build_object('id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'subtotal', oi.subtotal, 'notes', oi.notes)) as items
        FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.tenant_id = ${tenantId}::uuid AND o.created_at > NOW() - INTERVAL '90 days'
        GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5000
      `,
            this.prisma.recipe.findMany({ where: { tenantId }, include: { items: true } }),
            this.prisma.role.findMany({ where: { tenantId } }),
            this.prisma.user.findMany({ where: { tenantId }, select: { id: true, email: true, firstName: true, lastName: true, isActive: true, roleId: true, createdAt: true } }),
            this.prisma.$queryRaw `SELECT * FROM zones WHERE tenant_id = ${tenantId}::uuid`,
            this.prisma.$queryRaw `SELECT * FROM tables WHERE tenant_id = ${tenantId}::uuid`,
            this.prisma.promotion.findMany({ where: { tenantId } }),
            this.prisma.creditAccount.findMany({ where: { tenantId }, include: { transactions: { take: 100, orderBy: { createdAt: 'desc' } } } }),
            this.prisma.$queryRaw `SELECT * FROM audit_logs WHERE tenant_id = ${tenantId}::uuid AND created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 2000`,
        ]);
        return {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            tenant: { id: tenant?.id, name: tenant?.name, slug: tenant?.slug, settings: tenant?.settings },
            data: {
                categories: { count: categories.length, records: categories },
                products: { count: products.length, records: products },
                customers: { count: customers.length, records: customers },
                suppliers: { count: suppliers.length, records: suppliers },
                orders: { count: orders.length, records: orders, note: 'Últimos 90 días, máx 5000' },
                recipes: { count: recipes.length, records: recipes },
                roles: { count: roles.length, records: roles },
                users: { count: users.length, records: users },
                zones: { count: zones.length, records: zones },
                tables: { count: tables.length, records: tables },
                promotions: { count: promotions.length, records: promotions },
                creditAccounts: { count: creditAccounts.length, records: creditAccounts },
                auditLogs: { count: auditLogs.length, records: auditLogs, note: 'Últimos 30 días, máx 2000' },
            },
        };
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map