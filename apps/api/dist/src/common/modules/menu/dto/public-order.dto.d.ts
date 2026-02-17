export declare class PublicOrderItemDto {
    productId: string;
    quantity: number;
    notes?: string;
}
export declare class CreatePublicOrderDto {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deliveryType: string;
    addressLine1?: string;
    addressLine2?: string;
    addressReference?: string;
    city?: string;
    zoneId?: string;
    paymentMethod?: string;
    notes?: string;
    items: PublicOrderItemDto[];
}
