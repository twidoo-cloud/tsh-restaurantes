import { CreditService } from './credit.service';
declare class CreateCreditAccountDto {
    customerId: string;
    creditLimit: number;
    notes?: string;
}
declare class UpdateCreditAccountDto {
    creditLimit?: number;
    status?: string;
    notes?: string;
}
declare class RecordChargeDto {
    orderId: string;
    amount: number;
    notes?: string;
}
declare class RecordPaymentDto {
    amount: number;
    method?: string;
    reference?: string;
    notes?: string;
}
declare class RecordAdjustmentDto {
    amount: number;
    reason: string;
}
export declare class CreditController {
    private creditService;
    constructor(creditService: CreditService);
    dashboard(tenantId: string): Promise<{
        summary: any;
        last30Days: any[];
        recentPayments: any[];
    }>;
    listAccounts(tenantId: string, status?: string, search?: string, overdue?: string): Promise<any[]>;
    getAccount(tenantId: string, id: string): Promise<any>;
    getByCustomer(tenantId: string, customerId: string): Promise<any>;
    createAccount(tenantId: string, dto: CreateCreditAccountDto): Promise<any>;
    updateAccount(tenantId: string, id: string, dto: UpdateCreditAccountDto): Promise<any>;
    recordCharge(tenantId: string, id: string, dto: RecordChargeDto, userId: string): Promise<{
        transaction: any;
        newBalance: number;
    }>;
    recordPayment(tenantId: string, id: string, dto: RecordPaymentDto, userId: string): Promise<{
        transaction: any;
        newBalance: number;
    }>;
    recordAdjustment(tenantId: string, id: string, dto: RecordAdjustmentDto, userId: string): Promise<{
        transaction: any;
        newBalance: number;
    }>;
    getTransactions(tenantId: string, id: string, page?: string, limit?: string): Promise<any[]>;
}
export {};
