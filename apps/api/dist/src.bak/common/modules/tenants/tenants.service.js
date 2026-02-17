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
        return this.prisma.tenant.update({ where: { id: tenantId }, data });
    }
    async listUsers(tenantId) {
        return this.prisma.user.findMany({
            where: { tenantId },
            select: { id: true, email: true, firstName: true, lastName: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, lastLoginAt: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
    }
    async createUser(tenantId, data) {
        const existing = await this.prisma.user.findFirst({ where: { tenantId, email: data.email } });
        if (existing)
            throw new common_1.BadRequestException('Ya existe un usuario con ese email');
        const bcrypt = await Promise.resolve().then(() => require('bcrypt'));
        const passwordHash = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: { tenantId, email: data.email, firstName: data.firstName, lastName: data.lastName, passwordHash, roleId: data.roleId },
            select: { id: true, email: true, firstName: true, lastName: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, createdAt: true },
        });
    }
    async updateUser(tenantId, userId, data) {
        const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
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
            const bcrypt = await Promise.resolve().then(() => require('bcrypt'));
            updateData.passwordHash = await bcrypt.hash(data.password, 10);
        }
        return this.prisma.user.update({
            where: { id: userId }, data: updateData,
            select: { id: true, email: true, firstName: true, lastName: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, createdAt: true },
        });
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
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map