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
    }): Promise<any>;
    update(tenantId: string, customerId: string, data: {
        taxId?: string;
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
        notes?: string;
    }): Promise<any>;
    list(tenantId: string, filters?: {
        search?: string;
        page?: number;
        limit?: number;
        sortBy?: string;
        sortOrder?: string;
    }): Promise<{
        data: any[];
        total: any;
        page: number;
        limit: number;
    }>;
    getById(tenantId: string, customerId: string): Promise<any>;
    getHistory(tenantId: string, customerId: string, limit?: number): Promise<{
        orders: any[];
        invoices: any[];
    }>;
    getStats(tenantId: string, customerId: string): Promise<any>;
    findByTaxId(tenantId: string, taxId: string): Promise<any>;
    quickSearch(tenantId: string, query: string): Promise<any[]>;
    getTopCustomers(tenantId: string, limit?: number): Promise<any[]>;
    getDashboard(tenantId: string): Promise<any>;
    linkToOrder(tenantId: string, customerId: string, orderId: string): Promise<{
        customerId: string;
        orderId: string;
        linked: boolean;
    }>;
    delete(tenantId: string, customerId: string): Promise<{
        deleted: boolean;
        anonymized: boolean;
    } | {
        deleted: boolean;
        anonymized?: undefined;
    }>;
}
