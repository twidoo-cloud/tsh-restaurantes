import { PrismaService } from '../../prisma.service';
import { SriXmlService } from './sri-xml.service';
export declare class InvoicesService {
    private prisma;
    private sriXml;
    constructor(prisma: PrismaService, sriXml: SriXmlService);
    generateFromOrder(tenantId: string, orderId: string, customerData?: {
        taxId?: string;
        name?: string;
        email?: string;
        address?: string;
    }): Promise<{
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
    listInvoices(tenantId: string, filters?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
    }>;
    getInvoice(tenantId: string, invoiceId: string): Promise<any>;
    sendToSri(tenantId: string, invoiceId: string): Promise<{
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
    checkAuthorization(tenantId: string, invoiceId: string): Promise<{
        claveAcceso: any;
        estado: string;
        numeroAutorizacion: any;
        fechaAutorizacion: string;
        ambiente: any;
        nota: string;
    }>;
    getSummary(tenantId: string): Promise<any>;
    voidInvoice(tenantId: string, invoiceId: string, reason: string): Promise<{
        invoiceId: string;
        status: string;
        reason: string;
    }>;
    private getNextInvoiceNumber;
    private formatDate;
}
