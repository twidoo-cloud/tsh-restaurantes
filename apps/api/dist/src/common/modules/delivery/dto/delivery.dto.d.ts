export declare class CreateDeliveryOrderDto {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerId?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressReference?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    deliveryType: string;
    zoneId?: string;
    scheduledFor?: string;
    paymentMethod?: string;
    source?: string;
    externalOrderId?: string;
    notes?: string;
    items: {
        productId: string;
        quantity: number;
        notes?: string;
    }[];
}
export declare class UpdateDeliveryOrderDto {
    customerName?: string;
    customerPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressReference?: string;
    driverName?: string;
    driverPhone?: string;
    notes?: string;
    zoneId?: string;
}
export declare class DeliveryQueryDto {
    status?: string;
    type?: string;
    date?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class CreateZoneDto {
    name: string;
    deliveryFee: number;
    minOrderAmount?: number;
    estimatedMinutes?: number;
    color?: string;
}
export declare class UpdateZoneDto {
    name?: string;
    deliveryFee?: number;
    minOrderAmount?: number;
    estimatedMinutes?: number;
    isActive?: boolean;
    color?: string;
}
export declare class UpdateDeliverySettingsDto {
    isEnabled?: boolean;
    acceptsDelivery?: boolean;
    acceptsPickup?: boolean;
    defaultDeliveryFee?: number;
    freeDeliveryAbove?: number;
    minOrderAmount?: number;
    estimatedDeliveryMinutes?: number;
    estimatedPickupMinutes?: number;
    deliveryHoursStart?: string;
    deliveryHoursEnd?: string;
    autoAcceptOrders?: boolean;
    whatsappNumber?: string;
}
