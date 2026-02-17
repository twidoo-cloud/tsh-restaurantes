import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/suppliers.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    getSuppliers(tenantId: string): unknown;
    getSupplier(tenantId: string, id: string): unknown;
    createSupplier(tenantId: string, dto: CreateSupplierDto): unknown;
    updateSupplier(tenantId: string, id: string, dto: UpdateSupplierDto): unknown;
    deleteSupplier(tenantId: string, id: string): unknown;
    linkIngredient(tenantId: string, id: string, ingredientId: string): unknown;
    unlinkIngredient(tenantId: string, ingredientId: string): unknown;
}
