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
    list(tenantId: string): unknown;
    permissionsCatalog(): unknown;
    getOne(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: CreateRoleDto): unknown;
    update(tenantId: string, id: string, dto: UpdateRoleDto): unknown;
    delete(tenantId: string, id: string): unknown;
    duplicate(tenantId: string, id: string): unknown;
}
export {};
