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
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
const tenants_service_1 = require("./tenants.service");
let TenantsController = class TenantsController {
    constructor(service) {
        this.service = service;
    }
    async getCurrent(tenantId) {
        return this.service.getCurrent(tenantId);
    }
    async updateBranding(tenantId, branding) {
        return this.service.updateBranding(tenantId, branding);
    }
    async updateSettings(tenantId, settings) {
        return this.service.updateSettings(tenantId, settings);
    }
    async updateProfile(tenantId, profile) {
        return this.service.updateProfile(tenantId, profile);
    }
    async changePlan(tenantId, user, body) {
        return this.service.changePlan(tenantId, user, body.plan, body.paymentMethod);
    }
    async checkTrial(tenantId) {
        return this.service.checkTrialExpiry(tenantId);
    }
    async listUsers(tenantId) {
        return this.service.listUsers(tenantId);
    }
    async createUser(tenantId, body) {
        return this.service.createUser(tenantId, body);
    }
    async updateUser(tenantId, userId, body) {
        return this.service.updateUser(tenantId, userId, body);
    }
    async listRoles(tenantId) {
        return this.service.listRoles(tenantId);
    }
    async adminListAll(user) {
        return this.service.adminListAll(user);
    }
    async adminCreate(user, body) {
        return this.service.adminCreateTenant(user, body);
    }
    async adminUpdate(user, tenantId, body) {
        return this.service.adminUpdateTenant(user, tenantId, body);
    }
    async adminToggle(user, tenantId) {
        return this.service.adminToggleTenant(user, tenantId);
    }
    async adminDetail(user, tenantId) {
        return this.service.adminGetTenantDetail(user, tenantId);
    }
    async exportData(tenantId, user) {
        return this.service.exportTenantData(tenantId, user);
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.Get)('current'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current tenant info with merged branding' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "getCurrent", null);
__decorate([
    (0, common_1.Put)('branding'),
    (0, swagger_1.ApiOperation)({ summary: 'Update tenant branding' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateBranding", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update tenant settings' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Put)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Update tenant profile' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('change-plan'),
    (0, swagger_1.ApiOperation)({ summary: 'Change subscription plan' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "changePlan", null);
__decorate([
    (0, common_1.Get)('check-trial'),
    (0, swagger_1.ApiOperation)({ summary: 'Check trial status and auto-downgrade if expired' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "checkTrial", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'List tenant users' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Post)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "createUser", null);
__decorate([
    (0, common_1.Put)('users/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a user' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Get)('roles'),
    (0, swagger_1.ApiOperation)({ summary: 'List tenant roles' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "listRoles", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, swagger_1.ApiOperation)({ summary: 'Super Admin: Listar todos los tenants' }),
    __param(0, (0, tenant_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "adminListAll", null);
__decorate([
    (0, common_1.Post)('admin/create'),
    (0, swagger_1.ApiOperation)({ summary: 'Super Admin: Crear nuevo tenant' }),
    __param(0, (0, tenant_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "adminCreate", null);
__decorate([
    (0, common_1.Put)('admin/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Super Admin: Editar tenant' }),
    __param(0, (0, tenant_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "adminUpdate", null);
__decorate([
    (0, common_1.Patch)('admin/:id/toggle'),
    (0, swagger_1.ApiOperation)({ summary: 'Super Admin: Activar/desactivar tenant' }),
    __param(0, (0, tenant_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "adminToggle", null);
__decorate([
    (0, common_1.Get)('admin/:id/detail'),
    (0, swagger_1.ApiOperation)({ summary: 'Super Admin: Detalle de tenant con usuarios y roles' }),
    __param(0, (0, tenant_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "adminDetail", null);
__decorate([
    (0, common_1.Get)('export/data'),
    (0, swagger_1.ApiOperation)({ summary: 'Exportar todos los datos del tenant (backup)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "exportData", null);
exports.TenantsController = TenantsController = __decorate([
    (0, swagger_1.ApiTags)('Tenants'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('tenants'),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map