import { MenuService } from './menu.service';
import { CreatePublicOrderDto } from './dto/public-order.dto';
export declare class MenuController {
    private service;
    constructor(service: MenuService);
    getMenu(slug: string): Promise<{
        restaurant: {
            name: string;
            slug: string;
            currencyCode: string;
            phone: string;
        };
        branding: any;
        settings: {
            defaultTaxRate: any;
            currency: any;
        };
        menu: {
            id: string;
            name: string;
            description: string;
            imageUrl: string;
            products: {
                id: string;
                name: string;
                description: string;
                price: number;
                imageUrl: string;
                tags: string[];
                attributes: import("@prisma/client/runtime/library").JsonValue;
            }[];
        }[];
        onlineOrdering: {
            enabled: boolean;
            acceptsDelivery: boolean;
            acceptsPickup: boolean;
            whatsappNumber: string | null;
        };
        totalProducts: number;
    }>;
    getOrderConfig(slug: string): Promise<{
        restaurantName: string;
        restaurantPhone: string;
        isEnabled: any;
        acceptsDelivery: any;
        acceptsPickup: any;
        defaultDeliveryFee: number;
        freeDeliveryAbove: number;
        minOrderAmount: number;
        estimatedDeliveryMinutes: any;
        estimatedPickupMinutes: any;
        deliveryHoursStart: any;
        deliveryHoursEnd: any;
        whatsappNumber: any;
        zones: {
            id: any;
            name: any;
            deliveryFee: number;
            minOrderAmount: number;
            estimatedMinutes: any;
        }[];
    }>;
    createPublicOrder(slug: string, dto: CreatePublicOrderDto): Promise<{
        success: boolean;
        orderNumber: any;
        estimatedMinutes: any;
        message: string;
    }>;
    getQrConfig(tenantId: string): Promise<{
        slug: string;
        name: string;
        menuUrl: string;
        tables: any[];
    }>;
}
