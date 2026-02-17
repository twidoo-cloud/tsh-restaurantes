import { PrismaService } from '../../prisma.service';
export interface BrandingConfig {
    primaryColor: string;
    secondaryColor: string;
    sidebarColor: string;
    sidebarTextColor: string;
    accentColor: string;
    logoUrl: string | null;
    logoWidth: number;
    faviconUrl: string | null;
    appName: string;
    loginSubtitle: string;
    footerText: string;
    showPoweredBy: boolean;
    customCss: string | null;
}
export interface TenantSettings {
    branding: BrandingConfig;
    locale: string;
    receiptHeader: string;
    receiptFooter: string;
    defaultTaxRate: number;
    currency: {
        code: string;
        symbol: string;
        decimals: number;
    };
    timezone: string;
}
export declare class TenantsService {
    private prisma;
    constructor(prisma: PrismaService);
    getCurrent(tenantId: string): unknown;
    updateBranding(tenantId: string, branding: Partial<BrandingConfig>): unknown;
    updateSettings(tenantId: string, settings: Partial<TenantSettings>): unknown;
    updateProfile(tenantId: string, profile: {
        name?: string;
        phone?: string;
        address?: any;
        verticalType?: string;
    }): unknown;
    changePlan(tenantId: string, user: any, plan: string, paymentMethod?: string): unknown;
    checkTrialExpiry(tenantId: string): unknown;
    listUsers(tenantId: string): unknown;
    createUser(tenantId: string, data: {
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        roleId: string;
        pin?: string;
    }): unknown;
    updateUser(tenantId: string, userId: string, data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        roleId?: string;
        isActive?: boolean;
        password?: string;
        pin?: string | null;
    }): unknown;
    listRoles(tenantId: string): unknown;
    resellerListTenants(resellerId: string): unknown;
    resellerUpdateTheme(resellerId: string, themeConfig: Partial<BrandingConfig>): unknown;
    private assertSuperAdmin;
    adminListAll(user: any): unknown;
    adminCreateTenant(user: any, data: {
        name: string;
        slug: string;
        verticalType?: string;
        countryCode?: string;
        currencyCode?: string;
        timezone?: string;
        phone?: string;
        taxId?: string;
        subscriptionPlan?: string;
        ownerEmail: string;
        ownerFirstName: string;
        ownerLastName: string;
        ownerPassword: string;
    }): unknown;
    adminUpdateTenant(user: any, tenantId: string, data: {
        name?: string;
        phone?: string;
        taxId?: string;
        subscriptionPlan?: string;
        subscriptionStatus?: string;
        enabledModules?: string[];
        isActive?: boolean;
        verticalType?: string;
        countryCode?: string;
        currencyCode?: string;
        timezone?: string;
    }): unknown;
    adminToggleTenant(user: any, tenantId: string): unknown;
    adminGetTenantDetail(user: any, tenantId: string): unknown;
    private seedDefaultRoles;
    exportTenantData(tenantId: string, user: any): unknown;
}
