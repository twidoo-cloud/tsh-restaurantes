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
    dashboard(tenantId: string): unknown;
    listAccounts(tenantId: string, status?: string, search?: string, overdue?: string): unknown;
    getAccount(tenantId: string, id: string): unknown;
    getByCustomer(tenantId: string, customerId: string): unknown;
    createAccount(tenantId: string, dto: CreateCreditAccountDto): unknown;
    updateAccount(tenantId: string, id: string, dto: UpdateCreditAccountDto): unknown;
    recordCharge(tenantId: string, id: string, dto: RecordChargeDto, user: any): unknown;
    recordPayment(tenantId: string, id: string, dto: RecordPaymentDto, user: any): unknown;
    recordAdjustment(tenantId: string, id: string, dto: RecordAdjustmentDto, user: any): unknown;
    getTransactions(tenantId: string, id: string, page?: string, limit?: string): unknown;
}
export {};
