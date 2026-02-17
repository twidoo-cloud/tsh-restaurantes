import { PrismaService } from '../../prisma.service';
export declare class CustomersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(tenantId: string, data: {
        taxId?: string;
        name: string;
        email?: string;
        phone?: string;
        address?: string;
        notes?: string;
    }): unknown;
    update(tenantId: string, customerId: string, data: {
        taxId?: string;
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        notes?: string;
    }): unknown;
    list(tenantId: string, filters?: {
        search?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: string;
    }): unknown;
    getById(tenantId: string, customerId: string): unknown;
    getHistory(tenantId: string, customerId: string, limit?: number): unknown;
    getStats(tenantId: string, customerId: string): unknown;
    findByTaxId(tenantId: string, taxId: string): unknown;
    quickSearch(tenantId: string, query: string): unknown;
    getTopCustomers(tenantId: string, limit?: number): unknown;
    getDashboard(tenantId: string): unknown;
    linkToOrder(tenantId: string, customerId: string, orderId: string): unknown;
    delete(tenantId: string, customerId: string): unknown;
}
