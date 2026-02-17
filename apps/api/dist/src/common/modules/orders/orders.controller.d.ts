import { OrdersService } from './orders.service';
import { CreateOrderDto, AddOrderItemDto, ProcessPaymentDto, VoidItemDto, OrderQueryDto } from './dto/orders.dto';
export declare class OrdersController {
    private ordersService;
    constructor(ordersService: OrdersService);
    findAll(tenantId: string, branchId: string | null, query: OrderQueryDto, qBranch?: string): Promise<{
        data: unknown;
        total: any;
        page: number;
        limit: number;
    }>;
    findOpen(tenantId: string, branchId: string | null, qBranch?: string): Promise<unknown>;
    findById(tenantId: string, id: string): Promise<{
        customer: {
            id: string;
            name: string;
            email: string;
            phone: string;
            taxId: string;
            taxIdType: string;
        };
        items: ({
            product: {
                name: string;
                sku: string;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            };
        } & {
            id: string;
            tenantId: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountReason: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            notes: string | null;
            createdAt: Date;
            orderId: string;
            productId: string;
            productVariantId: string | null;
            quantity: import("@prisma/client/runtime/library").Decimal;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            modifiers: import("@prisma/client/runtime/library").JsonValue;
            modifiersTotal: import("@prisma/client/runtime/library").Decimal;
            isVoid: boolean;
            voidReason: string | null;
            promotionId: string | null;
        })[];
        payments: {
            id: string;
            tenantId: string;
            createdAt: Date;
            orderId: string;
            splitId: string | null;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currencyCode: string;
            reference: string | null;
            processedBy: string | null;
            cashReceived: import("@prisma/client/runtime/library").Decimal | null;
            changeGiven: import("@prisma/client/runtime/library").Decimal | null;
        }[];
    } & {
        id: string;
        tenantId: string;
        branchId: string | null;
        orderNumber: string;
        customerId: string | null;
        servedBy: string | null;
        shiftId: string | null;
        status: string;
        type: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountReason: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        openedAt: Date;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(tenantId: string, userId: string, dto: CreateOrderDto): Promise<{
        items: {
            id: string;
            tenantId: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountReason: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            notes: string | null;
            createdAt: Date;
            orderId: string;
            productId: string;
            productVariantId: string | null;
            quantity: import("@prisma/client/runtime/library").Decimal;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            modifiers: import("@prisma/client/runtime/library").JsonValue;
            modifiersTotal: import("@prisma/client/runtime/library").Decimal;
            isVoid: boolean;
            voidReason: string | null;
            promotionId: string | null;
        }[];
    } & {
        id: string;
        tenantId: string;
        branchId: string | null;
        orderNumber: string;
        customerId: string | null;
        servedBy: string | null;
        shiftId: string | null;
        status: string;
        type: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountReason: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        openedAt: Date;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addItem(tenantId: string, userId: string, orderId: string, dto: AddOrderItemDto): Promise<{
        productName: string;
        product: {
            name: string;
        };
        id: string;
        tenantId: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountReason: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        createdAt: Date;
        orderId: string;
        productId: string;
        productVariantId: string | null;
        quantity: import("@prisma/client/runtime/library").Decimal;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        modifiers: import("@prisma/client/runtime/library").JsonValue;
        modifiersTotal: import("@prisma/client/runtime/library").Decimal;
        isVoid: boolean;
        voidReason: string | null;
        promotionId: string | null;
    }>;
    voidItem(tenantId: string, userId: string, orderId: string, itemId: string, dto: VoidItemDto): Promise<void>;
    updateItemNotes(tenantId: string, orderId: string, itemId: string, body: {
        notes: string;
    }): Promise<{
        id: string;
        notes: string;
    }>;
    applyOrderDiscount(tenantId: string, userId: string, orderId: string, body: {
        type: 'percent' | 'fixed';
        value: number;
        reason?: string;
    }): Promise<{
        customer: {
            id: string;
            name: string;
            email: string;
            phone: string;
            taxId: string;
            taxIdType: string;
        };
        items: ({
            product: {
                name: string;
                sku: string;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            };
        } & {
            id: string;
            tenantId: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountReason: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            notes: string | null;
            createdAt: Date;
            orderId: string;
            productId: string;
            productVariantId: string | null;
            quantity: import("@prisma/client/runtime/library").Decimal;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            modifiers: import("@prisma/client/runtime/library").JsonValue;
            modifiersTotal: import("@prisma/client/runtime/library").Decimal;
            isVoid: boolean;
            voidReason: string | null;
            promotionId: string | null;
        })[];
        payments: {
            id: string;
            tenantId: string;
            createdAt: Date;
            orderId: string;
            splitId: string | null;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currencyCode: string;
            reference: string | null;
            processedBy: string | null;
            cashReceived: import("@prisma/client/runtime/library").Decimal | null;
            changeGiven: import("@prisma/client/runtime/library").Decimal | null;
        }[];
    } & {
        id: string;
        tenantId: string;
        branchId: string | null;
        orderNumber: string;
        customerId: string | null;
        servedBy: string | null;
        shiftId: string | null;
        status: string;
        type: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountReason: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        openedAt: Date;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    applyItemDiscount(tenantId: string, userId: string, orderId: string, itemId: string, body: {
        type: 'percent' | 'fixed';
        value: number;
        reason?: string;
    }): Promise<{
        customer: {
            id: string;
            name: string;
            email: string;
            phone: string;
            taxId: string;
            taxIdType: string;
        };
        items: ({
            product: {
                name: string;
                sku: string;
                attributes: import("@prisma/client/runtime/library").JsonValue;
            };
        } & {
            id: string;
            tenantId: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            discountReason: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            notes: string | null;
            createdAt: Date;
            orderId: string;
            productId: string;
            productVariantId: string | null;
            quantity: import("@prisma/client/runtime/library").Decimal;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            modifiers: import("@prisma/client/runtime/library").JsonValue;
            modifiersTotal: import("@prisma/client/runtime/library").Decimal;
            isVoid: boolean;
            voidReason: string | null;
            promotionId: string | null;
        })[];
        payments: {
            id: string;
            tenantId: string;
            createdAt: Date;
            orderId: string;
            splitId: string | null;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currencyCode: string;
            reference: string | null;
            processedBy: string | null;
            cashReceived: import("@prisma/client/runtime/library").Decimal | null;
            changeGiven: import("@prisma/client/runtime/library").Decimal | null;
        }[];
    } & {
        id: string;
        tenantId: string;
        branchId: string | null;
        orderNumber: string;
        customerId: string | null;
        servedBy: string | null;
        shiftId: string | null;
        status: string;
        type: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountReason: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        openedAt: Date;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    processPayment(tenantId: string, userId: string, orderId: string, dto: ProcessPaymentDto): Promise<{
        payment: {
            id: string;
            tenantId: string;
            createdAt: Date;
            orderId: string;
            splitId: string | null;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currencyCode: string;
            reference: string | null;
            processedBy: string | null;
            cashReceived: import("@prisma/client/runtime/library").Decimal | null;
            changeGiven: import("@prisma/client/runtime/library").Decimal | null;
        };
        orderStatus: string;
        totalPaid: number;
        remaining: number;
    }>;
    cancel(tenantId: string, userId: string, orderId: string): Promise<{
        id: string;
        tenantId: string;
        branchId: string | null;
        orderNumber: string;
        customerId: string | null;
        servedBy: string | null;
        shiftId: string | null;
        status: string;
        type: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountReason: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        openedAt: Date;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    assignCustomer(tenantId: string, orderId: string, body: {
        customerId: string | null;
    }): Promise<{
        customer: {
            id: string;
            tenantId: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            email: string | null;
            phone: string | null;
            taxId: string | null;
            taxIdType: string | null;
            address: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        tenantId: string;
        branchId: string | null;
        orderNumber: string;
        customerId: string | null;
        servedBy: string | null;
        shiftId: string | null;
        status: string;
        type: string;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountReason: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        notes: string | null;
        openedAt: Date;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
