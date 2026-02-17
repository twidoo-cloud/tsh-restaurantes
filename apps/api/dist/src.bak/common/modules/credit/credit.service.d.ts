import { PrismaService } from '../../prisma.service';
export declare class CreditService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboard(tenantId: string): Promise<{
        summary: any;
        last30Days: any[];
        recentPayments: any[];
    }>;
    listAccounts(tenantId: string, filters: {
        status?: string;
        search?: string;
        overdue?: boolean;
    }): Promise<any[]>;
    getAccount(tenantId: string, id: string): Promise<any>;
    getByCustomer(tenantId: string, customerId: string): Promise<any>;
    createAccount(tenantId: string, dto: {
        customerId: string;
        creditLimit: number;
        notes?: string;
    }): Promise<any>;
    updateAccount(tenantId: string, id: string, dto: {
        creditLimit?: number;
        status?: string;
        notes?: string;
    }): Promise<any>;
    recordCharge(tenantId: string, accountId: string, dto: {
        orderId: string;
        amount: number;
        notes?: string;
    }, userId: string): Promise<{
        transaction: any;
        newBalance: number;
    }>;
    recordPayment(tenantId: string, accountId: string, dto: {
        amount: number;
        method?: string;
        reference?: string;
        notes?: string;
    }, userId: string): Promise<{
        transaction: any;
        newBalance: number;
    }>;
    recordAdjustment(tenantId: string, accountId: string, dto: {
        amount: number;
        reason: string;
    }, userId: string): Promise<{
        transaction: any;
        newBalance: number;
    }>;
    getTransactions(tenantId: string, accountId: string, pagination: {
        page: number;
        limit: number;
    }): Promise<any[]>;
}
