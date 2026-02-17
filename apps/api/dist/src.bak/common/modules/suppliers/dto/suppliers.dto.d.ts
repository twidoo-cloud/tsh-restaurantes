export declare class CreateSupplierDto {
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    address?: string;
}
export declare class UpdateSupplierDto {
    name?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    address?: string;
    isActive?: boolean;
}
