import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { WsModule } from './common/ws/ws.module';
import { AuthModule } from './common/modules/auth/auth.module';
import { ProductsModule } from './common/modules/products/products.module';
import { OrdersModule } from './common/modules/orders/orders.module';
import { TenantsModule } from './common/modules/tenants/tenants.module';
import { TablesModule } from './common/modules/tables/tables.module';
import { KitchenModule } from './common/modules/kitchen/kitchen.module';
import { DashboardModule } from './common/modules/dashboard/dashboard.module';
import { InventoryModule } from './common/modules/inventory/inventory.module';
import { BranchesModule } from './common/modules/branches/branches.module';
import { CustomersModule } from './common/modules/customers/customers.module';
import { ShiftsModule } from './common/modules/shifts/shifts.module';
import { RecipesModule } from './common/modules/recipes/recipes.module';
import { SuppliersModule } from './common/modules/suppliers/suppliers.module';
import { SriModule } from './common/modules/sri/sri.module';
import { ReportsModule } from './common/modules/reports/reports.module';
import { PromotionsModule } from './common/modules/promotions/promotions.module';
import { ReservationsModule } from './common/modules/reservations/reservations.module';
import { DeliveryModule } from './common/modules/delivery/delivery.module';
import { LoyaltyModule } from './common/modules/loyalty/loyalty.module';
import { StaffModule } from './common/modules/staff/staff.module';
import { MenuModule } from './common/modules/menu/menu.module';
import { CreditModule } from './common/modules/credit/credit.module';
import { AuditModule } from './common/modules/audit/audit.module';
import { NotificationsModule } from './common/modules/notifications/notifications.module';
import { RolesModule } from './common/modules/roles/roles.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, WsModule, AuthModule, TenantsModule, ProductsModule,
    OrdersModule, TablesModule, KitchenModule, DashboardModule,
    InventoryModule, BranchesModule, CustomersModule, ShiftsModule,
    RecipesModule, SuppliersModule, SriModule, ReportsModule,
    PromotionsModule, ReservationsModule, DeliveryModule, LoyaltyModule,
    StaffModule, MenuModule, CreditModule, AuditModule, NotificationsModule, RolesModule,
  ],
})
export class AppModule {}
