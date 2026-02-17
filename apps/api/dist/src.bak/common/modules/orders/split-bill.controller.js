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
exports.SplitBillController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const split_bill_service_1 = require("./split-bill.service");
const split_bill_dto_1 = require("./dto/split-bill.dto");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
let SplitBillController = class SplitBillController {
    constructor(splitBillService) {
        this.splitBillService = splitBillService;
    }
    async getSplits(tenantId, orderId) {
        return this.splitBillService.getSplits(tenantId, orderId);
    }
    async splitEqual(tenantId, orderId, dto) {
        return this.splitBillService.splitEqual(tenantId, orderId, dto);
    }
    async splitByItems(tenantId, orderId, dto) {
        return this.splitBillService.splitByItems(tenantId, orderId, dto);
    }
    async splitCustom(tenantId, orderId, dto) {
        return this.splitBillService.splitCustom(tenantId, orderId, dto);
    }
    async processSplitPayment(tenantId, userId, orderId, splitId, dto) {
        return this.splitBillService.processSplitPayment(tenantId, orderId, splitId, userId, dto);
    }
    async removeSplits(tenantId, orderId) {
        return this.splitBillService.removeSplits(tenantId, orderId);
    }
};
exports.SplitBillController = SplitBillController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all splits for an order' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SplitBillController.prototype, "getSplits", null);
__decorate([
    (0, common_1.Post)('equal'),
    (0, swagger_1.ApiOperation)({ summary: 'Split order equally among guests' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, split_bill_dto_1.CreateEqualSplitDto]),
    __metadata("design:returntype", Promise)
], SplitBillController.prototype, "splitEqual", null);
__decorate([
    (0, common_1.Post)('by-items'),
    (0, swagger_1.ApiOperation)({ summary: 'Split order by assigning items to guests' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, split_bill_dto_1.CreateItemSplitDto]),
    __metadata("design:returntype", Promise)
], SplitBillController.prototype, "splitByItems", null);
__decorate([
    (0, common_1.Post)('custom'),
    (0, swagger_1.ApiOperation)({ summary: 'Split order with custom amounts per guest' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('orderId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, split_bill_dto_1.CreateCustomSplitDto]),
    __metadata("design:returntype", Promise)
], SplitBillController.prototype, "splitCustom", null);
__decorate([
    (0, common_1.Post)(':splitId/payments'),
    (0, swagger_1.ApiOperation)({ summary: 'Process payment for a specific split' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('orderId')),
    __param(3, (0, common_1.Param)('splitId')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, split_bill_dto_1.ProcessSplitPaymentDto]),
    __metadata("design:returntype", Promise)
], SplitBillController.prototype, "processSplitPayment", null);
__decorate([
    (0, common_1.Delete)(),
    (0, swagger_1.ApiOperation)({ summary: 'Remove all splits from an order (unsplit)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SplitBillController.prototype, "removeSplits", null);
exports.SplitBillController = SplitBillController = __decorate([
    (0, swagger_1.ApiTags)('Split Bill'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('orders/:orderId/splits'),
    __metadata("design:paramtypes", [split_bill_service_1.SplitBillService])
], SplitBillController);
//# sourceMappingURL=split-bill.controller.js.map