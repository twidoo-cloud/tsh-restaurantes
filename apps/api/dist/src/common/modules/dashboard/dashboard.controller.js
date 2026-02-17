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
    async getSummary(tenantId, branchId) {
        return this.dashboardService.getTodaySummary(tenantId, branchId);
    }
    async getSalesByHour(tenantId, branchId) {
        return this.dashboardService.getSalesByHour(tenantId, branchId);
    }
    async getTopProducts(tenantId, branchId) {
        return this.dashboardService.getTopProducts(tenantId, branchId);
    }
    async getSalesByCategory(tenantId, branchId) {
        return this.dashboardService.getSalesByCategory(tenantId, branchId);
    }
    async getTableStats(tenantId, branchId) {
        return this.dashboardService.getTableStats(tenantId, branchId);
    }
    async getRecentOrders(tenantId, branchId) {
        return this.dashboardService.getRecentOrders(tenantId, branchId);
    }
    async getTrend(tenantId, branchId) {
        return this.dashboardService.getSalesTrend(tenantId, branchId);
    }
    async getServerStats(tenantId, branchId) {
        return this.dashboardService.getServerStats(tenantId, branchId);
    }
    async getCostAnalysis(tenantId, branchId) {
        return this.dashboardService.getCostAnalysis(tenantId, branchId);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Resumen de ventas del día' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('sales-by-hour'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSalesByHour", null);
__decorate([
    (0, common_1.Get)('top-products'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTopProducts", null);
__decorate([
    (0, common_1.Get)('sales-by-category'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSalesByCategory", null);
__decorate([
    (0, common_1.Get)('table-stats'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTableStats", null);
__decorate([
    (0, common_1.Get)('recent-orders'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getRecentOrders", null);
__decorate([
    (0, common_1.Get)('trend'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTrend", null);
__decorate([
    (0, common_1.Get)('server-stats'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getServerStats", null);
__decorate([
    (0, common_1.Get)('cost-analysis'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getCostAnalysis", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map