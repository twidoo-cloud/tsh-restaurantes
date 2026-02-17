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
exports.KitchenController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const kitchen_service_1 = require("./kitchen.service");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
let KitchenController = class KitchenController {
    constructor(kitchenService) {
        this.kitchenService = kitchenService;
    }
    async getOrders(tenantId, station) {
        return this.kitchenService.getKitchenOrders(tenantId, station);
    }
    async getReady(tenantId) {
        return this.kitchenService.getReadyOrders(tenantId);
    }
    async getStats(tenantId) {
        return this.kitchenService.getStats(tenantId);
    }
    async fireOrder(tenantId, orderId) {
        return this.kitchenService.fireOrderToKitchenWithNotify(tenantId, orderId);
    }
    async startPreparing(tenantId, id) {
        return this.kitchenService.updateItemStatus(tenantId, id, 'preparing');
    }
    async markReady(tenantId, id) {
        return this.kitchenService.updateItemStatus(tenantId, id, 'ready');
    }
    async markDelivered(tenantId, id) {
        return this.kitchenService.updateItemStatus(tenantId, id, 'delivered');
    }
    async bumpOrder(tenantId, orderId) {
        return this.kitchenService.bumpOrder(tenantId, orderId);
    }
};
exports.KitchenController = KitchenController;
__decorate([
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener pedidos activos de cocina (KDS)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('station')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KitchenController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)('ready'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener pedidos listos para servir' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KitchenController.prototype, "getReady", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Estadísticas de cocina (últimas 24h)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KitchenController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('fire/:orderId'),
    (0, swagger_1.ApiOperation)({ summary: 'Enviar orden a cocina' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KitchenController.prototype, "fireOrder", null);
__decorate([
    (0, common_1.Patch)('item/:id/preparing'),
    (0, swagger_1.ApiOperation)({ summary: 'Marcar item como en preparación' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KitchenController.prototype, "startPreparing", null);
__decorate([
    (0, common_1.Patch)('item/:id/ready'),
    (0, swagger_1.ApiOperation)({ summary: 'Marcar item como listo' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KitchenController.prototype, "markReady", null);
__decorate([
    (0, common_1.Patch)('item/:id/delivered'),
    (0, swagger_1.ApiOperation)({ summary: 'Marcar item como entregado' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KitchenController.prototype, "markDelivered", null);
__decorate([
    (0, common_1.Patch)('bump/:orderId'),
    (0, swagger_1.ApiOperation)({ summary: 'Bump: marcar toda la orden como lista' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KitchenController.prototype, "bumpOrder", null);
exports.KitchenController = KitchenController = __decorate([
    (0, swagger_1.ApiTags)('Kitchen'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('kitchen'),
    __metadata("design:paramtypes", [kitchen_service_1.KitchenService])
], KitchenController);
//# sourceMappingURL=kitchen.controller.js.map