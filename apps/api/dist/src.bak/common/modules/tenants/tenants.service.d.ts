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
    getCurrent(tenantId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        verticalType: string;
        enabledModules: string[];
        countryCode: string;
        currencyCode: string;
        timezone: string;
        phone: string;
        logoUrl: string;
        subscriptionPlan: string;
        subscriptionStatus: string;
        isActive: boolean;
        branding: BrandingConfig;
        settings: {
            locale: any;
            receiptHeader: any;
            receiptFooter: any;
            defaultTaxRate: any;
            currency: any;
            timezone: string;
        };
        reseller: {
            id: string;
            name: string;
            slug: string;
        };
    }>;
    updateBranding(tenantId: string, branding: Partial<BrandingConfig>): Promise<{
        success: boolean;
        branding: any;
    }>;
    updateSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<{
        success: boolean;
        settings: any;
    }>;
    updateProfile(tenantId: string, profile: {
        name?: string;
        phone?: string;
        address?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        resellerId: string;
        slug: string;
        verticalType: string;
        enabledModules: string[];
        taxId: string | null;
        countryCode: string;
        currencyCode: string;
        timezone: string;
        address: import("@prisma/client/runtime/library").JsonValue | null;
        phone: string | null;
        logoUrl: string | null;
        settings: import("@prisma/client/runtime/library").JsonValue;
        subscriptionPlan: string;
        subscriptionStatus: string;
        trialEndsAt: Date | null;
    }>;
    listUsers(tenantId: string): Promise<{
        role: {
            id: string;
            name: string;
            slug: string;
        };
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        lastLoginAt: Date;
    }[]>;
    createUser(tenantId: string, data: {
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        roleId: string;
    }): Promise<{
        role: {
            id: string;
            name: string;
            slug: string;
        };
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
    }>;
    updateUser(tenantId: string, userId: string, data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        roleId?: string;
        isActive?: boolean;
        password?: string;
    }): Promise<{
        role: {
            id: string;
            name: string;
            slug: string;
        };
        id: string;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
    }>;
    listRoles(tenantId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        isSystem: boolean;
    }[]>;
    resellerListTenants(resellerId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        _count: {
            users: number;
        };
        slug: string;
        verticalType: string;
        countryCode: string;
        phone: string;
        logoUrl: string;
        subscriptionPlan: string;
        subscriptionStatus: string;
    }[]>;
    resellerUpdateTheme(resellerId: string, themeConfig: Partial<BrandingConfig>): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        slug: string;
        countryCode: string;
        logoUrl: string | null;
        domain: string | null;
        themeConfig: import("@prisma/client/runtime/library").JsonValue;
        contactEmail: string;
    }>;
}
