"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const dashboard_service_1 = require("./dashboard.service");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
let DashboardController = class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getSummary(tenantId) {
        return this.dashboardService.getTodaySummary(tenantId);
    }
    async getSalesByHour(tenantId) {
        return this.dashboardService.getSalesByHour(tenantId);
    }
    async getTopProducts(tenantId) {
        return this.dashboardService.getTopProducts(tenantId);
    }
    async getSalesByCategory(tenantId) {
        return this.dashboardService.getSalesByCategory(tenantId);
    }
    async getTableStats(tenantId) {
        return this.dashboardService.getTableStats(tenantId);
    }
    async getRecentOrders(tenantId) {
        return this.dashboardService.getRecentOrders(tenantId);
    }
    async getTrend(tenantId) {
        return this.dashboardService.getSalesTrend(tenantId);
    }
    async getServerStats(tenantId) {
        return this.dashboardService.getServerStats(tenantId);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Resumen de ventas del día' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('sales-by-hour'),
    (0, swagger_1.ApiOperation)({ summary: 'Ventas por hora (hoy)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSalesByHour", null);
__decorate([
    (0, common_1.Get)('top-products'),
    (0, swagger_1.ApiOperation)({ summary: 'Productos más vendidos hoy' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTopProducts", null);
__decorate([
    (0, common_1.Get)('sales-by-category'),
    (0, swagger_1.ApiOperation)({ summary: 'Ventas por categoría' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSalesByCategory", null);
__decorate([
    (0, common_1.Get)('table-stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Rendimiento de mesas hoy' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTableStats", null);
__decorate([
    (0, common_1.Get)('recent-orders'),
    (0, swagger_1.ApiOperation)({ summary: 'Últimas órdenes completadas' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getRecentOrders", null);
__decorate([
    (0, common_1.Get)('trend'),
    (0, swagger_1.ApiOperation)({ summary: 'Tendencia últimos 7 días' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTrend", null);
__decorate([
    (0, common_1.Get)('server-stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Rendimiento de meseros/vendedores' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getServerStats", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map