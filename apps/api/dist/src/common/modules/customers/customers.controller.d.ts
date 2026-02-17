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
    list(tenantId: string, search?: string, page?: string, limit?: string): unknown;
    dashboard(tenantId: string): unknown;
    top(tenantId: string, limit?: string): unknown;
    quickSearch(tenantId: string, q: string): unknown;
    findByTaxId(tenantId: string, taxId: string): unknown;
    getOne(tenantId: string, id: string): unknown;
    history(tenantId: string, id: string): unknown;
    stats(tenantId: string, id: string): unknown;
    create(tenantId: string, dto: CreateCustomerDto): unknown;
    update(tenantId: string, id: string, dto: UpdateCustomerDto): unknown;
    linkOrder(tenantId: string, id: string, dto: LinkOrderDto): unknown;
    delete(tenantId: string, id: string): unknown;
}
export {};
