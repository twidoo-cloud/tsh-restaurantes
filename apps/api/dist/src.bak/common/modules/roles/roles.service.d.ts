import { PrismaService } from '../../prisma.service';
export declare class RolesService {
    private prisma;
    constructor(prisma: PrismaService);
    getPermissionsCatalog(): {
        module: string;
        label: string;
        icon: string;
        permissions: {
            key: string;
            label: string;
        }[];
    }[];
    list(tenantId: string): Promise<any[]>;
    getById(tenantId: string, id: string): Promise<any>;
    create(tenantId: string, dto: {
        name: string;
        description?: string;
        color?: string;
        permissions: string[];
    }): Promise<any>;
    update(tenantId: string, id: string, dto: {
        name?: string;
        description?: string;
        color?: string;
        permissions?: string[];
    }): Promise<any>;
    delete(tenantId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    duplicate(tenantId: string, id: string): Promise<any>;
}
