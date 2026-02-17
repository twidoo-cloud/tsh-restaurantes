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
exports.DeliveryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const delivery_service_1 = require("./delivery.service");
const delivery_dto_1 = require("./dto/delivery.dto");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
let DeliveryController = class DeliveryController {
    constructor(service) {
        this.service = service;
    }
    findAll(tenantId, branchId, query) {
        return this.service.findAll(tenantId, query, branchId);
    }
    dashboard(tenantId, branchId, date) {
        return this.service.getDashboard(tenantId, date, branchId);
    }
    findById(tenantId, id) {
        return this.service.findById(tenantId, id);
    }
    create(tenantId, branchId, dto) {
        return this.service.create(tenantId, dto, undefined, branchId);
    }
    update(tenantId, id, dto) {
        return this.service.update(tenantId, id, dto);
    }
    confirm(tenantId, id) {
        return this.service.updateStatus(tenantId, id, 'confirmed');
    }
    prepare(tenantId, id) {
        return this.service.updateStatus(tenantId, id, 'preparing');
    }
    ready(tenantId, id) {
        return this.service.updateStatus(tenantId, id, 'ready');
    }
    dispatch(tenantId, id, body) {
        return this.service.updateStatus(tenantId, id, 'out_for_delivery', body);
    }
    deliver(tenantId, id) {
        return this.service.updateStatus(tenantId, id, 'delivered');
    }
    cancel(tenantId, id, body) {
        return this.service.updateStatus(tenantId, id, 'cancelled', body);
    }
    getZones(tenantId, branchId) {
        return this.service.getZones(tenantId, branchId);
    }
    createZone(tenantId, branchId, dto) {
        return this.service.createZone(tenantId, dto, branchId);
    }
    updateZone(tenantId, id, dto) {
        return this.service.updateZone(tenantId, id, dto);
    }
    deleteZone(tenantId, id) {
        return this.service.deleteZone(tenantId, id);
    }
    getSettings(tenantId) {
        return this.service.getOrCreateSettings(tenantId);
    }
    updateSettings(tenantId, dto) {
        return this.service.updateSettings(tenantId, dto);
    }
};
exports.DeliveryController = DeliveryController;
__decorate([
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'List delivery orders' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, delivery_dto_1.DeliveryQueryDto]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('orders/dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Delivery dashboard stats' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get delivery order details' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'Create delivery/pickup order' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, delivery_dto_1.CreateDeliveryOrderDto]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('orders/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update delivery order' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, delivery_dto_1.UpdateDeliveryOrderDto]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('orders/:id/confirm'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "confirm", null);
__decorate([
    (0, common_1.Patch)('orders/:id/prepare'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "prepare", null);
__decorate([
    (0, common_1.Patch)('orders/:id/ready'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "ready", null);
__decorate([
    (0, common_1.Patch)('orders/:id/dispatch'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "dispatch", null);
__decorate([
    (0, common_1.Patch)('orders/:id/deliver'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "deliver", null);
__decorate([
    (0, common_1.Patch)('orders/:id/cancel'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('zones'),
    (0, swagger_1.ApiOperation)({ summary: 'List delivery zones' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "getZones", null);
__decorate([
    (0, common_1.Post)('zones'),
    (0, swagger_1.ApiOperation)({ summary: 'Create delivery zone' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, delivery_dto_1.CreateZoneDto]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "createZone", null);
__decorate([
    (0, common_1.Put)('zones/:id'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, delivery_dto_1.UpdateZoneDto]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "updateZone", null);
__decorate([
    (0, common_1.Delete)('zones/:id'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "deleteZone", null);
__decorate([
    (0, common_1.Get)('settings'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, delivery_dto_1.UpdateDeliverySettingsDto]),
    __metadata("design:returntype", void 0)
], DeliveryController.prototype, "updateSettings", null);
exports.DeliveryController = DeliveryController = __decorate([
    (0, swagger_1.ApiTags)('Delivery'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('delivery'),
    __metadata("design:paramtypes", [delivery_service_1.DeliveryService])
], DeliveryController);
//# sourceMappingURL=delivery.controller.js.map