import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/products.dto';
export declare class ProductsController {
    private productsService;
    constructor(productsService: ProductsService);
    findAll(tenantId: string, query: ProductQueryDto): Promise<{
        data: ({
            category: {
                id: string;
                name: string;
            };
            variants: {
                id: string;
                tenantId: string;
                createdAt: Date;
                name: string;
                isActive: boolean;
                price: import("@prisma/client/runtime/library").Decimal;
                cost: import("@prisma/client/runtime/library").Decimal | null;
                sku: string | null;
                barcode: string | null;
                attributes: import("@prisma/client/runtime/library").JsonValue;
                currentStock: import("@prisma/client/runtime/library").Decimal;
                productId: string;
            }[];
        } & {
            description: string | null;
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            tags: string[];
            categoryId: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            cost: import("@prisma/client/runtime/library").Decimal | null;
            sku: string | null;
            barcode: string | null;
            taxRate: import("@prisma/client/runtime/library").Decimal;
            unit: string;
            trackInventory: boolean;
            imageUrl: string | null;
            displayOrder: number;
            attributes: import("@prisma/client/runtime/library").JsonValue;
            currentStock: import("@prisma/client/runtime/library").Decimal;
            minStock: import("@prisma/client/runtime/library").Decimal;
            isAvailable: boolean;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findCategories(tenantId: string): Promise<({
        products: {
            id: string;
        }[];
    } & {
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        imageUrl: string | null;
        displayOrder: number;
        parentId: string | null;
    })[]>;
    findByBarcode(tenantId: string, barcode: string): Promise<{
        category: {
            id: string;
            name: string;
        };
    } & {
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        tags: string[];
        categoryId: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        cost: import("@prisma/client/runtime/library").Decimal | null;
        sku: string | null;
        barcode: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        trackInventory: boolean;
        imageUrl: string | null;
        displayOrder: number;
        attributes: import("@prisma/client/runtime/library").JsonValue;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        isAvailable: boolean;
    }>;
    findById(tenantId: string, id: string): Promise<{
        category: {
            description: string | null;
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            updatedAt: Date;
            imageUrl: string | null;
            displayOrder: number;
            parentId: string | null;
        };
        variants: {
            id: string;
            tenantId: string;
            createdAt: Date;
            name: string;
            isActive: boolean;
            price: import("@prisma/client/runtime/library").Decimal;
            cost: import("@prisma/client/runtime/library").Decimal | null;
            sku: string | null;
            barcode: string | null;
            attributes: import("@prisma/client/runtime/library").JsonValue;
            currentStock: import("@prisma/client/runtime/library").Decimal;
            productId: string;
        }[];
    } & {
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        tags: string[];
        categoryId: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        cost: import("@prisma/client/runtime/library").Decimal | null;
        sku: string | null;
        barcode: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        trackInventory: boolean;
        imageUrl: string | null;
        displayOrder: number;
        attributes: import("@prisma/client/runtime/library").JsonValue;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        isAvailable: boolean;
    }>;
    create(tenantId: string, dto: CreateProductDto): Promise<{
        category: {
            id: string;
            name: string;
        };
    } & {
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        tags: string[];
        categoryId: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        cost: import("@prisma/client/runtime/library").Decimal | null;
        sku: string | null;
        barcode: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        trackInventory: boolean;
        imageUrl: string | null;
        displayOrder: number;
        attributes: import("@prisma/client/runtime/library").JsonValue;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        isAvailable: boolean;
    }>;
    update(tenantId: string, id: string, dto: UpdateProductDto): Promise<{
        category: {
            id: string;
            name: string;
        };
    } & {
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        tags: string[];
        categoryId: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        cost: import("@prisma/client/runtime/library").Decimal | null;
        sku: string | null;
        barcode: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        trackInventory: boolean;
        imageUrl: string | null;
        displayOrder: number;
        attributes: import("@prisma/client/runtime/library").JsonValue;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        isAvailable: boolean;
    }>;
    toggleAvailability(tenantId: string, id: string): Promise<{
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        tags: string[];
        categoryId: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        cost: import("@prisma/client/runtime/library").Decimal | null;
        sku: string | null;
        barcode: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        trackInventory: boolean;
        imageUrl: string | null;
        displayOrder: number;
        attributes: import("@prisma/client/runtime/library").JsonValue;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        isAvailable: boolean;
    }>;
    delete(tenantId: string, id: string): Promise<{
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        tags: string[];
        categoryId: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        cost: import("@prisma/client/runtime/library").Decimal | null;
        sku: string | null;
        barcode: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        unit: string;
        trackInventory: boolean;
        imageUrl: string | null;
        displayOrder: number;
        attributes: import("@prisma/client/runtime/library").JsonValue;
        currentStock: import("@prisma/client/runtime/library").Decimal;
        minStock: import("@prisma/client/runtime/library").Decimal;
        isAvailable: boolean;
    }>;
    createCategory(tenantId: string, body: {
        name: string;
        description?: string;
        displayOrder?: number;
        imageUrl?: string;
    }): Promise<{
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        imageUrl: string | null;
        displayOrder: number;
        parentId: string | null;
    }>;
    updateCategory(tenantId: string, id: string, body: {
        name?: string;
        description?: string;
        displayOrder?: number;
        imageUrl?: string;
    }): Promise<{
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        imageUrl: string | null;
        displayOrder: number;
        parentId: string | null;
    }>;
    deleteCategory(tenantId: string, id: string): Promise<{
        description: string | null;
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        imageUrl: string | null;
        displayOrder: number;
        parentId: string | null;
    }>;
}
