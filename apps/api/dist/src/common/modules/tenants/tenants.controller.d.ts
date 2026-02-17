import { TenantsService, BrandingConfig, TenantSettings } from './tenants.service';
export declare class TenantsController {
    private readonly service;
    constructor(service: TenantsService);
    getCurrent(tenantId: string): unknown;
    updateBranding(tenantId: string, branding: Partial<BrandingConfig>): unknown;
    updateSettings(tenantId: string, settings: Partial<TenantSettings>): unknown;
    updateProfile(tenantId: string, profile: {
        name?: string;
        phone?: string;
        address?: any;
    }): unknown;
    changePlan(tenantId: string, user: any, body: {
        plan: string;
        paymentMethod?: string;
    }): unknown;
    checkTrial(tenantId: string): unknown;
    listUsers(tenantId: string): unknown;
    createUser(tenantId: string, body: {
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        roleId: string;
    }): unknown;
    updateUser(tenantId: string, userId: string, body: any): unknown;
    listRoles(tenantId: string): unknown;
    adminListAll(user: any): unknown;
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
    }): unknown;
    adminUpdate(user: any, tenantId: string, body: any): unknown;
    adminToggle(user: any, tenantId: string): unknown;
    adminDetail(user: any, tenantId: string): unknown;
    exportData(tenantId: string, user: any): unknown;
}
