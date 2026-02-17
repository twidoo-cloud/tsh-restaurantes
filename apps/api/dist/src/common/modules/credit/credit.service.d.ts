import { PrismaService } from '../../prisma.service';
export declare class CreditService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboard(tenantId: string): unknown;
    listAccounts(tenantId: string, filters: {
        status?: string;
        search?: string;
        overdue?: boolean;
    }): unknown;
    getAccount(tenantId: string, id: string): unknown;
    getByCustomer(tenantId: string, customerId: string): unknown;
    createAccount(tenantId: string, dto: {
        customerId: string;
        creditLimit: number;
        notes?: string;
    }): unknown;
    updateAccount(tenantId: string, id: string, dto: {
        creditLimit?: number;
        status?: string;
        notes?: string;
    }): unknown;
    recordCharge(tenantId: string, accountId: string, dto: {
        orderId: string;
        amount: number;
        notes?: string;
    }, userId: string): unknown;
    recordPayment(tenantId: string, accountId: string, dto: {
        amount: number;
        method?: string;
        reference?: string;
        notes?: string;
    }, userId: string): unknown;
    recordAdjustment(tenantId: string, accountId: string, dto: {
        amount: number;
        reason: string;
    }, userId: string): unknown;
    getTransactions(tenantId: string, accountId: string, pagination: {
        page: number;
        limit: number;
    }): unknown;
}
