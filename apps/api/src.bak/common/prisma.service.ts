import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Sets the current tenant for RLS policies.
   * Must be called before any tenant-scoped query.
   */
  async setTenant(tenantId: string) {
    await this.$executeRawUnsafe(
      `SET LOCAL app.current_tenant = '${tenantId}'`,
    );
  }

  /**
   * Executes a callback within a transaction with tenant isolation.
   * This ensures all queries inside respect RLS.
   */
  async withTenant<T>(tenantId: string, callback: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant = '${tenantId}'`,
      );
      return callback(tx as PrismaClient);
    });
  }
}
