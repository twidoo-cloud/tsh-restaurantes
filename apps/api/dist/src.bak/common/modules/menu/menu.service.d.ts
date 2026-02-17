import { PrismaService } from '../../prisma.service';
export declare class MenuService {
    private prisma;
    constructor(prisma: PrismaService);
    getMenuBySlug(slug: string): Promise<{
        restaurant: {
            name: string;
            slug: string;
            currencyCode: string;
        };
        branding: any;
        menu: {
            id: string;
            name: string;
            description: string;
            imageUrl: string;
            products: {
                id: string;
                name: string;
                description: string;
                price: import("@prisma/client/runtime/library").Decimal;
                imageUrl: string;
                tags: string[];
                attributes: import("@prisma/client/runtime/library").JsonValue;
            }[];
        }[];
        updatedAt: string;
    }>;
    getQrConfig(tenantId: string): Promise<{
        slug: string;
        menuUrl: string;
        tables: any[];
    }>;
}
