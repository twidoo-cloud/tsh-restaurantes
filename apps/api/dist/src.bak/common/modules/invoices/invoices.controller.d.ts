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
    list(tenantId: string, status?: string, page?: string, limit?: string): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
    }>;
    summary(tenantId: string): Promise<any>;
    getOne(tenantId: string, id: string): Promise<any>;
    generate(tenantId: string, dto: GenerateInvoiceDto): Promise<{
        fullNumber: string;
        claveAcceso: string;
        documentType: string;
        buyer: {
            taxId: string;
            name: string;
        };
        subtotal: number;
        taxAmount: number;
        total: number;
        status: string;
        ambiente: string;
        xml: string;
    }>;
    send(tenantId: string, id: string): Promise<{
        claveAcceso: any;
        estado: string;
        comprobantes: {
            claveAcceso: any;
            mensajes: {
                identificador: string;
                mensaje: string;
                informacionAdicional: string;
                tipo: string;
            }[];
        }[];
        ambiente: any;
        nota: string;
    }>;
    check(tenantId: string, id: string): Promise<{
        claveAcceso: any;
        estado: string;
        numeroAutorizacion: any;
        fechaAutorizacion: string;
        ambiente: any;
        nota: string;
    }>;
    voidInvoice(tenantId: string, id: string, dto: VoidInvoiceDto): Promise<{
        invoiceId: string;
        status: string;
        reason: string;
    }>;
}
export {};
