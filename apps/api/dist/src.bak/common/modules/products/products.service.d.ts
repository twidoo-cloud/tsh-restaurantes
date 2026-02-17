import { PrismaService } from '../../prisma.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/products.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, query: ProductQueryDto): unknown;
    findById(tenantId: string, id: string): unknown;
    findByBarcode(tenantId: string, barcode: string): unknown;
    create(tenantId: string, dto: CreateProductDto): unknown;
    update(tenantId: string, id: string, dto: UpdateProductDto): unknown;
    toggleAvailability(tenantId: string, id: string): unknown;
    delete(tenantId: string, id: string): unknown;
    findCategories(tenantId: string): unknown;
}
