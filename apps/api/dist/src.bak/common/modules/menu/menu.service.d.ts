import { PrismaService } from '../../prisma.service';
export declare class MenuService {
    private prisma;
    constructor(prisma: PrismaService);
    getMenuBySlug(slug: string): unknown;
    getQrConfig(tenantId: string): unknown;
}
