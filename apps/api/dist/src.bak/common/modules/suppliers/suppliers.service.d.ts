import { PrismaService } from '../../prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/suppliers.dto';
export declare class SuppliersService {
    private prisma;
    constructor(prisma: PrismaService);
    getSuppliers(tenantId: string): unknown;
    getSupplier(tenantId: string, id: string): unknown;
    createSupplier(tenantId: string, dto: CreateSupplierDto): unknown;
    updateSupplier(tenantId: string, id: string, dto: UpdateSupplierDto): unknown;
    deleteSupplier(tenantId: string, id: string): unknown;
    linkIngredient(tenantId: string, supplierId: string, ingredientId: string): unknown;
    unlinkIngredient(tenantId: string, ingredientId: string): unknown;
}
