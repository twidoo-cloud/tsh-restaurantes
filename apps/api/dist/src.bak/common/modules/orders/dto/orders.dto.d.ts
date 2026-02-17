export declare class CreateOrderDto {
    type?: string;
    customerId?: string;
    metadata?: any;
    notes?: string;
}
export declare class AddOrderItemDto {
    productId: string;
    productVariantId?: string;
    quantity?: number;
    modifiers?: any[];
    modifiersTotal?: number;
    notes?: string;
    metadata?: any;
}
export declare class ProcessPaymentDto {
    method: string;
    amount: number;
    currencyCode?: string;
    reference?: string;
    cashReceived?: number;
}
export declare class VoidItemDto {
    reason: string;
}
export declare class OrderQueryDto {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
}
