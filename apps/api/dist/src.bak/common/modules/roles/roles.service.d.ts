import { PrismaService } from '../../prisma.service';
export declare class RolesService {
    private prisma;
    constructor(prisma: PrismaService);
    getPermissionsCatalog(): {};
    list(tenantId: string): unknown;
    getById(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: {
        name: string;
        description?: string;
        color?: string;
        permissions: string[];
    }): unknown;
    update(tenantId: string, id: string, dto: {
        name?: string;
        description?: string;
        color?: string;
        permissions?: string[];
    }): unknown;
    delete(tenantId: string, id: string): unknown;
    duplicate(tenantId: string, id: string): unknown;
}
