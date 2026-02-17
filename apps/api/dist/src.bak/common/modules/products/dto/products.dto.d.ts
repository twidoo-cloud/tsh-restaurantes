export declare class CreateProductDto {
    name: string;
    description?: string;
    categoryId?: string;
    price: number;
    cost?: number;
    sku?: string;
    barcode?: string;
    taxRate?: number;
    unit?: string;
    trackInventory?: boolean;
    imageUrl?: string;
    displayOrder?: number;
    tags?: string[];
    attributes?: any;
}
declare const UpdateProductDto_base: any;
export declare class UpdateProductDto extends UpdateProductDto_base {
}
export declare class ProductQueryDto {
    categoryId?: string;
    search?: string;
    isActive?: string;
    page?: number;
    limit?: number;
}
export {};
