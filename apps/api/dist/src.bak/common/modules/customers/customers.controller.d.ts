import { CustomersService } from './customers.service';
declare class CreateCustomerDto {
    name: string;
    taxId?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}
declare class UpdateCustomerDto {
    name?: string;
    taxId?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}
declare class LinkOrderDto {
    orderId: string;
}
export declare class CustomersController {
    private customersService;
    constructor(customersService: CustomersService);
    list(tenantId: string, search?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
    }>;
    dashboard(tenantId: string): Promise<any>;
    top(tenantId: string, limit?: string): Promise<any[]>;
    quickSearch(tenantId: string, q: string): Promise<any[]>;
    findByTaxId(tenantId: string, taxId: string): Promise<any>;
    getOne(tenantId: string, id: string): Promise<any>;
    history(tenantId: string, id: string): Promise<{
        orders: any[];
        invoices: any[];
    }>;
    stats(tenantId: string, id: string): Promise<any>;
    create(tenantId: string, dto: CreateCustomerDto): Promise<any>;
    update(tenantId: string, id: string, dto: UpdateCustomerDto): Promise<any>;
    linkOrder(tenantId: string, id: string, dto: LinkOrderDto): Promise<{
        customerId: string;
        orderId: string;
        linked: boolean;
    }>;
    delete(tenantId: string, id: string): Promise<{
        deleted: boolean;
        anonymized: boolean;
    } | {
        deleted: boolean;
        anonymized?: undefined;
    }>;
}
export {};
