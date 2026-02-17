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

    // Auto-downgrade expired trials
    if (tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt && new Date() > new Date(tenant.trialEndsAt)) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { subscriptionPlan: 'basic', subscriptionStatus: 'active' },
      });
      tenant.subscriptionPlan = 'basic';
      tenant.subscriptionStatus = 'active';
    }

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

  async updateProfile(tenantId: string, profile: { name?: string; phone?: string; address?: any; verticalType?: string }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const data: any = {};
    if (profile.name) data.name = profile.name;
    if (profile.phone !== undefined) data.phone = profile.phone;
    if (profile.address !== undefined) data.address = profile.address;
    if (profile.verticalType) data.verticalType = profile.verticalType;

    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  // ─── CHANGE PLAN ───

  async changePlan(tenantId: string, user: any, plan: string, paymentMethod?: string) {
    const validPlans = ['basic', 'standard', 'premium', 'enterprise'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException(`Plan inválido. Opciones: ${validPlans.join(', ')}`);
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    // Only owner can change plan
    if (user?.role !== 'owner') {
      throw new ForbiddenException('Solo el dueño puede cambiar de plan');
    }

    const oldPlan = tenant.subscriptionPlan;
    const now = new Date();

    // Build update data
    const updateData: any = {
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
    };

    // If coming from trial, clear trial
    if (tenant.subscriptionStatus === 'trial') {
      updateData.trialEndsAt = null;
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    // Audit log
    try {
      await this.prisma.$executeRaw`
        INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, description, metadata, severity)
        VALUES (${tenantId}::uuid, ${user.sub}::uuid, 'plan_change', 'tenant', ${tenantId}::uuid,
          ${`Plan cambiado de ${oldPlan} a ${plan}`},
          ${JSON.stringify({ oldPlan, newPlan: plan, paymentMethod: paymentMethod || 'pending' })}::jsonb,
          'high')
      `;
    } catch {}

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

  // ─── CHECK TRIAL EXPIRY ───

  async checkTrialExpiry(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return null;

    if (tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt) {
      const now = new Date();
      if (now > new Date(tenant.trialEndsAt)) {
        // Trial expired — downgrade to basic
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

  // ─── LIST USERS ───

  async listUsers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, pinHash: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    // Return hasPin boolean instead of the actual hash
    return users.map(u => ({
      ...u,
      hasPin: !!u.pinHash,
      pinHash: undefined,
    }));
  }

  // ─── CREATE USER ───

  async createUser(tenantId: string, data: { email: string; firstName: string; lastName: string; password: string; roleId: string; pin?: string }) {
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email: data.email } });
    if (existing) throw new BadRequestException('Ya existe un usuario con ese email');

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const pinHash = data.pin && data.pin.length >= 4 ? await bcrypt.hash(data.pin, 10) : null;

    const user = await this.prisma.user.create({
      data: { tenantId, email: data.email, firstName: data.firstName, lastName: data.lastName, passwordHash, pinHash, roleId: data.roleId },
      select: { id: true, email: true, firstName: true, lastName: true, pinHash: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, createdAt: true },
    });
    return { ...user, hasPin: !!user.pinHash, pinHash: undefined };
  }

  // ─── UPDATE USER ───

  async updateUser(tenantId: string, userId: string, data: { firstName?: string; lastName?: string; email?: string; roleId?: string; isActive?: boolean; password?: string; pin?: string | null }) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const bcrypt = await import('bcrypt');
    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.roleId) updateData.roleId = data.roleId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    // Handle PIN: null removes it, string sets it
    if (data.pin === null || data.pin === '') {
      updateData.pinHash = null;
    } else if (data.pin && data.pin.length >= 4) {
      updateData.pinHash = await bcrypt.hash(data.pin, 10);
    }

    return this.prisma.user.update({
      where: { id: userId }, data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, pinHash: true, role: { select: { id: true, name: true, slug: true } }, isActive: true, createdAt: true },
    }).then(u => ({ ...u, hasPin: !!u.pinHash, pinHash: undefined }));
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

  // ═══════════════════════════════════════════
  // ═══ SUPER ADMIN: TENANT MANAGEMENT     ═══
  // ═══════════════════════════════════════════

  private assertSuperAdmin(user: any) {
    if (user?.role !== 'owner') throw new ForbiddenException('Solo el owner puede realizar esta acción');
  }

  async adminListAll(user: any) {
    this.assertSuperAdmin(user);
    return this.prisma.$queryRaw<any[]>`
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

  async adminCreateTenant(user: any, data: {
    name: string; slug: string; verticalType?: string; countryCode?: string;
    currencyCode?: string; timezone?: string; phone?: string; taxId?: string;
    subscriptionPlan?: string; ownerEmail: string; ownerFirstName: string; ownerLastName: string; ownerPassword: string;
  }) {
    this.assertSuperAdmin(user);

    // Validate slug uniqueness
    const existing = await this.prisma.tenant.findFirst({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException('Ya existe un tenant con ese slug');

    // Get the reseller from the current user's tenant
    const currentTenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { resellerId: true } });
    if (!currentTenant) throw new NotFoundException('Tenant actual no encontrado');

    // Create tenant — always starts in 7-day trial with premium access
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

    // Seed default roles
    await this.seedDefaultRoles(tenant.id);

    // Get the owner role to create user
    const ownerRole = await this.prisma.role.findFirst({ where: { tenantId: tenant.id, slug: 'owner' } });
    if (!ownerRole) throw new Error('Error al crear roles por defecto');

    // Create the owner user
    const bcrypt = await import('bcrypt');
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

  async adminUpdateTenant(user: any, tenantId: string, data: {
    name?: string; phone?: string; taxId?: string; subscriptionPlan?: string;
    subscriptionStatus?: string; enabledModules?: string[]; isActive?: boolean;
    verticalType?: string; countryCode?: string; currencyCode?: string; timezone?: string;
  }) {
    this.assertSuperAdmin(user);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.subscriptionPlan !== undefined) updateData.subscriptionPlan = data.subscriptionPlan;
    if (data.subscriptionStatus !== undefined) updateData.subscriptionStatus = data.subscriptionStatus;
    if (data.enabledModules !== undefined) updateData.enabledModules = data.enabledModules;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.verticalType !== undefined) updateData.verticalType = data.verticalType;
    if (data.countryCode !== undefined) updateData.countryCode = data.countryCode;
    if (data.currencyCode !== undefined) updateData.currencyCode = data.currencyCode;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;

    return this.prisma.tenant.update({ where: { id: tenantId }, data: updateData });
  }

  async adminToggleTenant(user: any, tenantId: string) {
    this.assertSuperAdmin(user);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { isActive: !tenant.isActive } });
  }

  async adminGetTenantDetail(user: any, tenantId: string) {
    this.assertSuperAdmin(user);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true, lastLoginAt: true, role: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: 'asc' } },
        roles: { select: { id: true, name: true, slug: true, permissions: true, isSystem: true }, orderBy: { isSystem: 'desc' } },
        reseller: { select: { id: true, name: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const stats: any[] = await this.prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*)::int FROM orders WHERE tenant_id = ${tenantId}::uuid AND status = 'completed') as total_orders,
        (SELECT COALESCE(SUM(total), 0)::float FROM orders WHERE tenant_id = ${tenantId}::uuid AND status = 'completed') as total_revenue,
        (SELECT COUNT(*)::int FROM products WHERE tenant_id = ${tenantId}::uuid AND is_active = true) as total_products
    `;

    return { ...tenant, stats: stats[0] || {} };
  }

  // ─── SEED DEFAULT ROLES ───

  private async seedDefaultRoles(tenantId: string) {
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
      await this.prisma.$executeRaw`
        INSERT INTO roles (tenant_id, name, slug, permissions, is_system)
        VALUES (${tenantId}::uuid, ${role.name}, ${role.slug}, ${JSON.stringify(role.permissions)}::jsonb, ${role.isSystem})
        ON CONFLICT (tenant_id, slug) DO NOTHING
      `;
    }
  }

  // ═══ EXPORT / BACKUP ═══

  async exportTenantData(tenantId: string, user: any) {
    if (user?.role !== 'owner' && user?.role !== 'admin') {
      throw new ForbiddenException('Solo owner o admin pueden exportar datos');
    }

    const [
      tenant, categories, products, customers, suppliers,
      orders, recipes, roles, users, zones, tables,
      promotions, creditAccounts, auditLogs,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.productCategory.findMany({ where: { tenantId } }),
      this.prisma.product.findMany({ where: { tenantId }, include: { variants: true } }),
      this.prisma.customer.findMany({ where: { tenantId } }),
      this.prisma.supplier.findMany({ where: { tenantId } }),
      this.prisma.$queryRaw`
        SELECT o.*, json_agg(json_build_object('id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'subtotal', oi.subtotal, 'notes', oi.notes)) as items
        FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.tenant_id = ${tenantId}::uuid AND o.created_at > NOW() - INTERVAL '90 days'
        GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5000
      `,
      this.prisma.recipe.findMany({ where: { tenantId }, include: { items: true } }),
      this.prisma.role.findMany({ where: { tenantId } }),
      this.prisma.user.findMany({ where: { tenantId }, select: { id: true, email: true, firstName: true, lastName: true, isActive: true, roleId: true, createdAt: true } }),
      this.prisma.$queryRaw`SELECT * FROM zones WHERE tenant_id = ${tenantId}::uuid`,
      this.prisma.$queryRaw`SELECT * FROM tables WHERE tenant_id = ${tenantId}::uuid`,
      this.prisma.promotion.findMany({ where: { tenantId } }),
      this.prisma.creditAccount.findMany({ where: { tenantId }, include: { transactions: { take: 100, orderBy: { createdAt: 'desc' } } } }),
      this.prisma.$queryRaw`SELECT * FROM audit_logs WHERE tenant_id = ${tenantId}::uuid AND created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 2000`,
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
        orders: { count: (orders as any[]).length, records: orders, note: 'Últimos 90 días, máx 5000' },
        recipes: { count: recipes.length, records: recipes },
        roles: { count: roles.length, records: roles },
        users: { count: users.length, records: users },
        zones: { count: (zones as any[]).length, records: zones },
        tables: { count: (tables as any[]).length, records: tables },
        promotions: { count: promotions.length, records: promotions },
        creditAccounts: { count: creditAccounts.length, records: creditAccounts },
        auditLogs: { count: (auditLogs as any[]).length, records: auditLogs, note: 'Últimos 30 días, máx 2000' },
      },
    };
  }
}
