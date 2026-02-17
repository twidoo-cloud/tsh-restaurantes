"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./common/prisma.module");
const ws_module_1 = require("./common/ws/ws.module");
const auth_module_1 = require("./common/modules/auth/auth.module");
const products_module_1 = require("./common/modules/products/products.module");
const orders_module_1 = require("./common/modules/orders/orders.module");
const tenants_module_1 = require("./common/modules/tenants/tenants.module");
const tables_module_1 = require("./common/modules/tables/tables.module");
const kitchen_module_1 = require("./common/modules/kitchen/kitchen.module");
const dashboard_module_1 = require("./common/modules/dashboard/dashboard.module");
const inventory_module_1 = require("./common/modules/inventory/inventory.module");
const invoices_module_1 = require("./common/modules/invoices/invoices.module");
const customers_module_1 = require("./common/modules/customers/customers.module");
const shifts_module_1 = require("./common/modules/shifts/shifts.module");
const recipes_module_1 = require("./common/modules/recipes/recipes.module");
const suppliers_module_1 = require("./common/modules/suppliers/suppliers.module");
const sri_module_1 = require("./common/modules/sri/sri.module");
const reports_module_1 = require("./common/modules/reports/reports.module");
const promotions_module_1 = require("./common/modules/promotions/promotions.module");
const reservations_module_1 = require("./common/modules/reservations/reservations.module");
const delivery_module_1 = require("./common/modules/delivery/delivery.module");
const loyalty_module_1 = require("./common/modules/loyalty/loyalty.module");
const staff_module_1 = require("./common/modules/staff/staff.module");
const menu_module_1 = require("./common/modules/menu/menu.module");
const credit_module_1 = require("./common/modules/credit/credit.module");
const audit_module_1 = require("./common/modules/audit/audit.module");
const notifications_module_1 = require("./common/modules/notifications/notifications.module");
const roles_module_1 = require("./common/modules/roles/roles.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule, ws_module_1.WsModule, auth_module_1.AuthModule, tenants_module_1.TenantsModule, products_module_1.ProductsModule,
            orders_module_1.OrdersModule, tables_module_1.TablesModule, kitchen_module_1.KitchenModule, dashboard_module_1.DashboardModule,
            inventory_module_1.InventoryModule, invoices_module_1.InvoicesModule, customers_module_1.CustomersModule, shifts_module_1.ShiftsModule,
            recipes_module_1.RecipesModule, suppliers_module_1.SuppliersModule, sri_module_1.SriModule, reports_module_1.ReportsModule,
            promotions_module_1.PromotionsModule, reservations_module_1.ReservationsModule, delivery_module_1.DeliveryModule, loyalty_module_1.LoyaltyModule,
            staff_module_1.StaffModule, menu_module_1.MenuModule, credit_module_1.CreditModule, audit_module_1.AuditModule, notifications_module_1.NotificationsModule, roles_module_1.RolesModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map