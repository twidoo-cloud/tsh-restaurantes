import { InvoicesService } from './invoices.service';
declare class GenerateInvoiceDto {
    orderId: string;
    taxId?: string;
    name?: string;
    email?: string;
    address?: string;
}
declare class VoidInvoiceDto {
    reason: string;
}
export declare class InvoicesController {
    private invoicesService;
    constructor(invoicesService: InvoicesService);
    list(tenantId: string, status?: string, page?: string, limit?: string): unknown;
    summary(tenantId: string): unknown;
    getOne(tenantId: string, id: string): unknown;
    generate(tenantId: string, dto: GenerateInvoiceDto): unknown;
    send(tenantId: string, id: string): unknown;
    check(tenantId: string, id: string): unknown;
    voidInvoice(tenantId: string, id: string, dto: VoidInvoiceDto): unknown;
}
export {};
