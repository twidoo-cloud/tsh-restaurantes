import { PrismaService } from '../../prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/suppliers.dto';
export declare class SuppliersService {
    private prisma;
    constructor(prisma: PrismaService);
    getSuppliers(tenantId: string): Promise<{
        ingredientCount: number;
        totalValue: number;
        ingredients: {
            id: string;
            name: string;
            unit: string;
            costPerUnit: import("@prisma/client/runtime/library").Decimal;
        }[];
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
    }[]>;
    getSupplier(tenantId: string, id: string): Promise<{
        ingredients: {
            id: string;
            name: string;
            unit: string;
            currentStock: import("@prisma/client/runtime/library").Decimal;
            minStock: import("@prisma/client/runtime/library").Decimal;
            costPerUnit: import("@prisma/client/runtime/library").Decimal;
        }[];
    } & {
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
    }>;
    createSupplier(tenantId: string, dto: CreateSupplierDto): Promise<{
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
    }>;
    updateSupplier(tenantId: string, id: string, dto: UpdateSupplierDto): Promise<{
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
    }>;
    deleteSupplier(tenantId: string, id: string): Promise<{
        success: boolean;
    }>;
    linkIngredient(tenantId: string, supplierId: string, ingredientId: string): Promise<{
        success: boolean;
    }>;
    unlinkIngredient(tenantId: string, ingredientId: string): Promise<{
        success: boolean;
    }>;
}
