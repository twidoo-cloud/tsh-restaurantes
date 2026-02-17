import { PrismaService } from '../../prisma.service';
export declare class BranchesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): unknown;
    findOne(tenantId: string, id: string): unknown;
    create(tenantId: string, data: {
        name: string;
        code?: string;
        address?: any;
        phone?: string;
        email?: string;
        establecimientoSri?: string;
        puntoEmisionSri?: string;
        settings?: any;
    }): unknown;
    update(tenantId: string, id: string, data: {
        name?: string;
        code?: string;
        address?: any;
        phone?: string;
        email?: string;
        establecimientoSri?: string;
        puntoEmisionSri?: string;
        isActive?: boolean;
        settings?: any;
    }): unknown;
    setMain(tenantId: string, id: string): unknown;
    delete(tenantId: string, id: string): unknown;
    getStats(tenantId: string, branchId: string): unknown;
}
