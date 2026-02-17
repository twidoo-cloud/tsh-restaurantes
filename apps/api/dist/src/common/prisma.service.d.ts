import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    onModuleInit(): any;
    onModuleDestroy(): any;
    setTenant(tenantId: string): any;
    withTenant<T>(tenantId: string, callback: (prisma: PrismaClient) => Promise<T>): Promise<T>;
}
