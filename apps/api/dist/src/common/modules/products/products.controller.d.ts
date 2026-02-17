import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/products.dto';
export declare class ProductsController {
    private productsService;
    constructor(productsService: ProductsService);
    findAll(tenantId: string, query: ProductQueryDto): unknown;
    findCategories(tenantId: string): unknown;
    findByBarcode(tenantId: string, barcode: string): unknown;
    findById(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: CreateProductDto): unknown;
    update(tenantId: string, id: string, dto: UpdateProductDto): unknown;
    toggleAvailability(tenantId: string, id: string): unknown;
    delete(tenantId: string, id: string): unknown;
    createCategory(tenantId: string, body: {
        name: string;
        description?: string;
        displayOrder?: number;
        imageUrl?: string;
    }): unknown;
    updateCategory(tenantId: string, id: string, body: {
        name?: string;
        description?: string;
        displayOrder?: number;
        imageUrl?: string;
    }): unknown;
    deleteCategory(tenantId: string, id: string): unknown;
}
