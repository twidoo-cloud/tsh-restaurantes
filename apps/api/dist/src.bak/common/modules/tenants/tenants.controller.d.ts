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
}
