import { TenantsService, BrandingConfig, TenantSettings } from './tenants.service';
export declare class TenantsController {
    private readonly service;
    constructor(service: TenantsService);
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
        trialEndsAt: Date;
        trialExpired: boolean;
        trialDaysRemaining: number;
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
    changePlan(tenantId: string, user: any, body: {
        plan: string;
        paymentMethod?: string;
    }): Promise<{
        tenant: {
            id: string;
            subscriptionPlan: string;
            subscriptionStatus: string;
        };
        message: string;
        previousPlan: string;
    }>;
    checkTrial(tenantId: string): Promise<{
        expired: boolean;
        downgradedTo: string;
        daysRemaining?: undefined;
        isTrial?: undefined;
    } | {
        expired: boolean;
        daysRemaining: number;
        downgradedTo?: undefined;
        isTrial?: undefined;
    } | {
        expired: boolean;
        isTrial: boolean;
        downgradedTo?: undefined;
        daysRemaining?: undefined;
    }>;
    listUsers(tenantId: string): Promise<{
        hasPin: boolean;
        pinHash: any;
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
    createUser(tenantId: string, body: {
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        roleId: string;
    }): Promise<{
        hasPin: boolean;
        pinHash: any;
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
    updateUser(tenantId: string, userId: string, body: any): Promise<{
        hasPin: boolean;
        pinHash: any;
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
    adminListAll(user: any): Promise<any[]>;
    adminCreate(user: any, body: {
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
    }): Promise<{
        tenant: {
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
        };
        message: string;
    }>;
    adminUpdate(user: any, tenantId: string, body: any): Promise<{
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
    adminToggle(user: any, tenantId: string): Promise<{
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
    adminDetail(user: any, tenantId: string): Promise<{
        stats: any;
        reseller: {
            id: string;
            name: string;
        };
        users: {
            role: {
                id: string;
                name: string;
                slug: string;
            };
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            isActive: boolean;
            lastLoginAt: Date;
        }[];
        roles: {
            id: string;
            name: string;
            slug: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            isSystem: boolean;
        }[];
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
    exportData(tenantId: string, user: any): Promise<{
        exportedAt: string;
        version: string;
        tenant: {
            id: string;
            name: string;
            slug: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
        };
        data: {
            categories: {
                count: number;
                records: {
                    description: string | null;
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    name: string;
                    isActive: boolean;
                    updatedAt: Date;
                    imageUrl: string | null;
                    displayOrder: number;
                    parentId: string | null;
                }[];
            };
            products: {
                count: number;
                records: ({
                    variants: {
                        id: string;
                        tenantId: string;
                        createdAt: Date;
                        name: string;
                        isActive: boolean;
                        price: import("@prisma/client/runtime/library").Decimal;
                        cost: import("@prisma/client/runtime/library").Decimal | null;
                        sku: string | null;
                        barcode: string | null;
                        attributes: import("@prisma/client/runtime/library").JsonValue;
                        currentStock: import("@prisma/client/runtime/library").Decimal;
                        productId: string;
                    }[];
                } & {
                    description: string | null;
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    name: string;
                    isActive: boolean;
                    updatedAt: Date;
                    tags: string[];
                    categoryId: string | null;
                    price: import("@prisma/client/runtime/library").Decimal;
                    cost: import("@prisma/client/runtime/library").Decimal | null;
                    sku: string | null;
                    barcode: string | null;
                    taxRate: import("@prisma/client/runtime/library").Decimal;
                    unit: string;
                    trackInventory: boolean;
                    imageUrl: string | null;
                    displayOrder: number;
                    attributes: import("@prisma/client/runtime/library").JsonValue;
                    currentStock: import("@prisma/client/runtime/library").Decimal;
                    minStock: import("@prisma/client/runtime/library").Decimal;
                    isAvailable: boolean;
                })[];
            };
            customers: {
                count: number;
                records: {
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    name: string;
                    email: string | null;
                    isActive: boolean;
                    updatedAt: Date;
                    taxId: string | null;
                    address: import("@prisma/client/runtime/library").JsonValue | null;
                    phone: string | null;
                    notes: string | null;
                    taxIdType: string | null;
                }[];
            };
            suppliers: {
                count: number;
                records: {
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    name: string;
                    email: string | null;
                    isActive: boolean;
                    taxId: string | null;
                    address: string | null;
                    phone: string | null;
                    contactName: string | null;
                }[];
            };
            orders: {
                count: number;
                records: unknown;
                note: string;
            };
            recipes: {
                count: number;
                records: ({
                    items: {
                        id: string;
                        tenantId: string;
                        cost: import("@prisma/client/runtime/library").Decimal;
                        unit: string;
                        quantity: import("@prisma/client/runtime/library").Decimal;
                        ingredientId: string;
                        recipeId: string;
                    }[];
                } & {
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    productId: string;
                    yieldQuantity: import("@prisma/client/runtime/library").Decimal;
                    yieldUnit: string;
                    totalCost: import("@prisma/client/runtime/library").Decimal;
                    instructions: string | null;
                })[];
            };
            roles: {
                count: number;
                records: {
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    name: string;
                    slug: string;
                    permissions: import("@prisma/client/runtime/library").JsonValue;
                    isSystem: boolean;
                }[];
            };
            users: {
                count: number;
                records: {
                    id: string;
                    createdAt: Date;
                    email: string;
                    roleId: string;
                    firstName: string;
                    lastName: string;
                    isActive: boolean;
                }[];
            };
            zones: {
                count: number;
                records: unknown;
            };
            tables: {
                count: number;
                records: unknown;
            };
            promotions: {
                count: number;
                records: {
                    description: string | null;
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    name: string;
                    isActive: boolean;
                    updatedAt: Date;
                    priority: number;
                    discountValue: import("@prisma/client/runtime/library").Decimal;
                    promoType: string;
                    buyQuantity: number | null;
                    getQuantity: number | null;
                    scope: string;
                    productIds: string[];
                    categoryIds: string[];
                    couponCode: string | null;
                    minOrderAmount: import("@prisma/client/runtime/library").Decimal;
                    maxDiscountAmount: import("@prisma/client/runtime/library").Decimal | null;
                    maxUses: number | null;
                    maxUsesPerOrder: number;
                    currentUses: number;
                    startDate: Date;
                    endDate: Date | null;
                    daysOfWeek: number[];
                    startTime: string | null;
                    endTime: string | null;
                    isAutomatic: boolean;
                    stackable: boolean;
                }[];
            };
            creditAccounts: {
                count: number;
                records: ({
                    transactions: {
                        id: string;
                        tenantId: string;
                        createdAt: Date;
                        type: string;
                        notes: string | null;
                        amount: import("@prisma/client/runtime/library").Decimal;
                        reference: string | null;
                        orderId: string | null;
                        processedBy: string | null;
                        creditAccountId: string;
                        balanceAfter: import("@prisma/client/runtime/library").Decimal;
                    }[];
                } & {
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    customerId: string;
                    notes: string | null;
                    status: string;
                    creditLimit: import("@prisma/client/runtime/library").Decimal;
                    balance: import("@prisma/client/runtime/library").Decimal;
                })[];
            };
            auditLogs: {
                count: number;
                records: unknown;
                note: string;
            };
        };
    }>;
}
