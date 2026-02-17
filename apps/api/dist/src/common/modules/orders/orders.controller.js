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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const orders_service_1 = require("./orders.service");
const orders_dto_1 = require("./dto/orders.dto");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async findAll(tenantId, branchId, query, qBranch) {
        return this.ordersService.findAll(tenantId, query, qBranch || branchId);
    }
    async findOpen(tenantId, branchId, qBranch) {
        return this.ordersService.findOpenOrders(tenantId, qBranch || branchId);
    }
    async findById(tenantId, id) {
        return this.ordersService.findById(tenantId, id);
    }
    async create(tenantId, userId, dto) {
        return this.ordersService.create(tenantId, userId, dto);
    }
    async addItem(tenantId, userId, orderId, dto) {
        return this.ordersService.addItem(tenantId, orderId, userId, dto);
    }
    async voidItem(tenantId, userId, orderId, itemId, dto) {
        return this.ordersService.voidItem(tenantId, orderId, itemId, userId, dto.reason);
    }
    async updateItemNotes(tenantId, orderId, itemId, body) {
        return this.ordersService.updateItemNotes(tenantId, orderId, itemId, body.notes);
    }
    async applyOrderDiscount(tenantId, userId, orderId, body) {
        return this.ordersService.applyOrderDiscount(tenantId, orderId, userId, body);
    }
    async applyItemDiscount(tenantId, userId, orderId, itemId, body) {
        return this.ordersService.applyItemDiscount(tenantId, orderId, itemId, userId, body);
    }
    async processPayment(tenantId, userId, orderId, dto) {
        return this.ordersService.processPayment(tenantId, orderId, userId, dto);
    }
    async cancel(tenantId, userId, orderId) {
        return this.ordersService.cancelOrder(tenantId, orderId, userId);
    }
    async assignCustomer(tenantId, orderId, body) {
        return this.ordersService.assignCustomer(tenantId, orderId, body.customerId);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar órdenes con filtros' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, orders_dto_1.OrderQueryDto, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('open'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar órdenes abiertas (para POS)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOpen", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener orden por ID' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nueva orden' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, orders_dto_1.CreateOrderDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    (0, swagger_1.ApiOperation)({ summary: 'Agregar item a la orden' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, orders_dto_1.AddOrderItemDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "addItem", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId/void'),
    (0, swagger_1.ApiOperation)({ summary: 'Anular item de la orden' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Param)('itemId')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, orders_dto_1.VoidItemDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "voidItem", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId/notes'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar notas de un item' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('itemId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateItemNotes", null);
__decorate([
    (0, common_1.Patch)(':id/discount'),
    (0, swagger_1.ApiOperation)({ summary: 'Aplicar descuento a la orden' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "applyOrderDiscount", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId/discount'),
    (0, swagger_1.ApiOperation)({ summary: 'Aplicar descuento a un item' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Param)('itemId')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "applyItemDiscount", null);
__decorate([
    (0, common_1.Post)(':id/payments'),
    (0, swagger_1.ApiOperation)({ summary: 'Procesar pago' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, orders_dto_1.ProcessPaymentDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "processPayment", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancelar orden' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':id/customer'),
    (0, swagger_1.ApiOperation)({ summary: 'Asignar cliente a la orden' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "assignCustomer", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('Orders'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map