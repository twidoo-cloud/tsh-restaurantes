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
    }): unknown;
    listInvoices(tenantId: string, filters?: {
        status?: string;
        page?: number;
        limit?: number;
    }): unknown;
    getInvoice(tenantId: string, invoiceId: string): unknown;
    sendToSri(tenantId: string, invoiceId: string): unknown;
    checkAuthorization(tenantId: string, invoiceId: string): unknown;
    getSummary(tenantId: string): unknown;
    voidInvoice(tenantId: string, invoiceId: string, reason: string): unknown;
    private getNextInvoiceNumber;
    private formatDate;
}
