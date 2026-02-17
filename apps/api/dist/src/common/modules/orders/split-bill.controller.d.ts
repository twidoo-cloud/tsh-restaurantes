import { SplitBillService } from './split-bill.service';
import { CreateEqualSplitDto, CreateItemSplitDto, CreateCustomSplitDto, ProcessSplitPaymentDto } from './dto/split-bill.dto';
export declare class SplitBillController {
    private splitBillService;
    constructor(splitBillService: SplitBillService);
    getSplits(tenantId: string, orderId: string): Promise<{
        orderId: string;
        orderNumber: string;
        orderTotal: import("@prisma/client/runtime/library").Decimal;
        splitCount: number;
        allPaid: boolean;
        splits: {
            amount: number;
            taxAmount: number;
            total: number;
            paidAmount: number;
            remaining: number;
            payments: {
                id: string;
                tenantId: string;
                createdAt: Date;
                currencyCode: string;
                method: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                reference: string | null;
                cashReceived: import("@prisma/client/runtime/library").Decimal | null;
                orderId: string;
                splitId: string | null;
                processedBy: string | null;
                changeGiven: import("@prisma/client/runtime/library").Decimal | null;
            }[];
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            status: string;
            orderId: string;
            label: string;
            splitType: string;
        }[];
    }>;
    splitEqual(tenantId: string, orderId: string, dto: CreateEqualSplitDto): Promise<{
        orderId: string;
        orderNumber: string;
        orderTotal: import("@prisma/client/runtime/library").Decimal;
        splitCount: number;
        allPaid: boolean;
        splits: {
            amount: number;
            taxAmount: number;
            total: number;
            paidAmount: number;
            remaining: number;
            payments: {
                id: string;
                tenantId: string;
                createdAt: Date;
                currencyCode: string;
                method: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                reference: string | null;
                cashReceived: import("@prisma/client/runtime/library").Decimal | null;
                orderId: string;
                splitId: string | null;
                processedBy: string | null;
                changeGiven: import("@prisma/client/runtime/library").Decimal | null;
            }[];
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            status: string;
            orderId: string;
            label: string;
            splitType: string;
        }[];
    }>;
    splitByItems(tenantId: string, orderId: string, dto: CreateItemSplitDto): Promise<{
        orderId: string;
        orderNumber: string;
        orderTotal: import("@prisma/client/runtime/library").Decimal;
        splitCount: number;
        allPaid: boolean;
        splits: {
            amount: number;
            taxAmount: number;
            total: number;
            paidAmount: number;
            remaining: number;
            payments: {
                id: string;
                tenantId: string;
                createdAt: Date;
                currencyCode: string;
                method: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                reference: string | null;
                cashReceived: import("@prisma/client/runtime/library").Decimal | null;
                orderId: string;
                splitId: string | null;
                processedBy: string | null;
                changeGiven: import("@prisma/client/runtime/library").Decimal | null;
            }[];
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            status: string;
            orderId: string;
            label: string;
            splitType: string;
        }[];
    }>;
    splitCustom(tenantId: string, orderId: string, dto: CreateCustomSplitDto): Promise<{
        orderId: string;
        orderNumber: string;
        orderTotal: import("@prisma/client/runtime/library").Decimal;
        splitCount: number;
        allPaid: boolean;
        splits: {
            amount: number;
            taxAmount: number;
            total: number;
            paidAmount: number;
            remaining: number;
            payments: {
                id: string;
                tenantId: string;
                createdAt: Date;
                currencyCode: string;
                method: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                reference: string | null;
                cashReceived: import("@prisma/client/runtime/library").Decimal | null;
                orderId: string;
                splitId: string | null;
                processedBy: string | null;
                changeGiven: import("@prisma/client/runtime/library").Decimal | null;
            }[];
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            status: string;
            orderId: string;
            label: string;
            splitType: string;
        }[];
    }>;
    processSplitPayment(tenantId: string, userId: string, orderId: string, splitId: string, dto: ProcessSplitPaymentDto): Promise<{
        payment: {
            id: string;
            tenantId: string;
            createdAt: Date;
            currencyCode: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
            cashReceived: import("@prisma/client/runtime/library").Decimal | null;
            orderId: string;
            splitId: string | null;
            processedBy: string | null;
            changeGiven: import("@prisma/client/runtime/library").Decimal | null;
        };
        splitStatus: string;
        splitPaidAmount: number;
        splitRemaining: number;
        allSplitsPaid: boolean;
        change: number;
    }>;
    removeSplits(tenantId: string, orderId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
