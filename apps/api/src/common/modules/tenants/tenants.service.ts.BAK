import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

// ─── BRANDING INTERFACES ───

export interface BrandingConfig {
  // Colors
  primaryColor: string;       // Main brand color (default: #1e3a8a)
  secondaryColor: string;     // Accent color (default: #0ea5e9)
  sidebarColor: string;       // Sidebar/header bg (default: #1e293b)
  sidebarTextColor: string;   // Sidebar text (default: #ffffff)
  accentColor: string;        // Buttons, links (default: #2563eb)
  // Logo
  logoUrl: string | null;
  logoWidth: number;          // px, default 120
  faviconUrl: string | null;
  // Text
  appName: string;            // Shown in header/login (default: tenant name)
  loginSubtitle: string;      // Login page subtitle
  footerText: string;         // Footer or receipt footer
  // Features
  showPoweredBy: boolean;     // "Powered by POS SaaS"
  customCss: string | null;   // Optional custom CSS overrides
}

export interface TenantSettings {
  branding: BrandingConfig;
  locale: string;             // 'es' | 'en'
  receiptHeader: string;
  receiptFooter: string;
  defaultTaxRate: number;
  currency: { code: string; symbol: string; decimals: number };
  timezone: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
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

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  // ─── GET CURRENT TENANT ───

  async getCurrent(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        reseller: { select: { id: true, name: true, slug: true, themeConfig: true, logoUrl: true, domain: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    // Merge branding: tenant settings override reseller defaults
    const resellerBranding = (tenant.reseller?.themeConfig as any) || {};
    const tenantSettings = (tenant.settings as any) || {};
    const tenantBranding = tenantSettings.branding || {};

    const branding: BrandingConfig = {
      ...DEFAULT_BRANDING,
      appName: tenant.name,
      ...resellerBranding,
      ...tenantBranding,
      // Tenant logo overrides reseller logo
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

  // ─── UPDATE BRANDING ───

  async updateBranding(tenantId: string, branding: Partial<BrandingConfig>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const currentSettings = (tenant.settings as any) || {};
    const currentBranding = currentSettings.branding || {};

    // Validate colors
    const colorFields = ['primaryColor', 'secondaryColor', 'sidebarColor', 'sidebarTextColor', 'accentColor'];
    for (const field of colorFields) {
      if (branding[field as keyof BrandingConfig] && !/^#[0-9a-fA-F]{6}$/.test(branding[field as keyof BrandingConfig] as string)) {
        throw new BadRequestException(`${field} debe ser un color hex válido (ej: #1e3a8a)`);
      }
    }

    const updatedBranding = { ...currentBranding, ...branding };
    const updatedSettings = { ...currentSettings, branding: updatedBranding };

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: updatedSettings,
        // Also update top-level logoUrl if provided
        ...(branding.logoUrl !== undefined ? { logoUrl: branding.logoUrl } : {}),
      },
    });

    return { success: true, branding: updatedBranding };
  }

  // ─── UPDATE SETTINGS ───

  async updateSettings(tenantId: string, settings: Partial<TenantSettings>) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const currentSettings = (tenant.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ...(settings.locale !== undefined ? { locale: settings.locale } : {}),
      ...(settings.receiptHeader !== undefined ? { receiptHeader: settings.receiptHeader } : {}),
      ...(settings.receiptFooter !== undefined ? { receiptFooter: settings.receiptFooter } : {}),
      ...(settings.defaultTaxRate !== undefined ? { defaultTaxRate: settings.defaultTaxRate } : {}),
      ...(settings.currency !== undefined ? { currency: settings.currency } : {}),
    };

    // Also update top-level fields if provided
    const data: any = { settings: updatedSettings };
    if (settings.timezone) data.timezone = settings.timezone;

    await this.prisma.tenant.update({ where: { id: tenantId }, data });
    return { success: true, settings: updatedSettings };
  }

  // ─── UPDATE TENANT PROFILE ───

  async updateProfile(tenantId: string, profile: { name?: string; phone?: string; address?: any }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const data: any = {};
    if (profile.name) data.name = profile.name;
    if (profile.phone !== undefined) data.phone = profile.phone;
    if (profile.address !== undefined) data.address = profile.address;

    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  // ─── LIST USERS ───

  async listUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── CREATE USER ───

  async createUser(tenantId: string, data: { email: string; firstName: string; lastName: string; password: string; roleId: string }) {
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email: data.email } });
    if (existing) throw new BadRequestException('Ya existe un usuario con ese email');

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: { tenantId, email: data.email, firstName: data.firstName, lastName: data.lastName, passwordHash, roleId: data.roleId },
      select: { id: true, email: true, firstName: true, lastName: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, createdAt: true },
    });
  }

  // ─── UPDATE USER ───

  async updateUser(tenantId: string, userId: string, data: { firstName?: string; lastName?: string; email?: string; roleId?: string; isActive?: boolean; password?: string }) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.roleId) updateData.roleId = data.roleId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      const bcrypt = await import('bcrypt');
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id: userId }, data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, createdAt: true },
    });
  }

  // ─── LIST ROLES ───

  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      select: { id: true, name: true, slug: true, isSystem: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── RESELLER: LIST TENANTS ───

  async resellerListTenants(resellerId: string) {
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

  // ─── RESELLER: UPDATE THEME ───

  async resellerUpdateTheme(resellerId: string, themeConfig: Partial<BrandingConfig>) {
    return this.prisma.reseller.update({
      where: { id: resellerId },
      data: { themeConfig: themeConfig as any },
    });
  }
}
