import { RolesService } from './roles.service';
declare class CreateRoleDto {
    name: string;
    description?: string;
    color?: string;
    permissions: string[];
}
declare class UpdateRoleDto {
    name?: string;
    description?: string;
    color?: string;
    permissions?: string[];
}
export declare class RolesController {
    private rolesService;
    constructor(rolesService: RolesService);
    list(tenantId: string): Promise<any[]>;
    permissionsCatalog(): Promise<{
        module: string;
        label: string;
        icon: string;
        permissions: {
            key: string;
            label: string;
        }[];
    }[]>;
    getOne(tenantId: string, id: string): Promise<any>;
    create(tenantId: string, dto: CreateRoleDto): Promise<any>;
    update(tenantId: string, id: string, dto: UpdateRoleDto): Promise<any>;
    delete(tenantId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    duplicate(tenantId: string, id: string): Promise<any>;
}
export {};
