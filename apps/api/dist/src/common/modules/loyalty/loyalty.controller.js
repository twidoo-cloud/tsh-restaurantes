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
exports.LoyaltyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const loyalty_service_1 = require("./loyalty.service");
const loyalty_dto_1 = require("./dto/loyalty.dto");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
let LoyaltyController = class LoyaltyController {
    constructor(service) {
        this.service = service;
    }
    enroll(tenantId, dto) {
        return this.service.enrollCustomer(tenantId, dto);
    }
    earn(tenantId, dto) {
        return this.service.earnPoints(tenantId, dto);
    }
    redeem(tenantId, dto) {
        return this.service.redeemReward(tenantId, dto);
    }
    adjust(tenantId, dto) {
        return this.service.adjustPoints(tenantId, dto);
    }
    getCustomer(tenantId, customerId) {
        return this.service.getCustomerLoyalty(tenantId, customerId);
    }
    leaderboard(tenantId) {
        return this.service.getLeaderboard(tenantId);
    }
    transactions(tenantId, query) {
        return this.service.getTransactions(tenantId, query);
    }
    dashboard(tenantId) {
        return this.service.getDashboard(tenantId);
    }
    getRewards(tenantId) {
        return this.service.getRewards(tenantId);
    }
    createReward(tenantId, dto) {
        return this.service.createReward(tenantId, dto);
    }
    updateReward(tenantId, id, dto) {
        return this.service.updateReward(tenantId, id, dto);
    }
    deleteReward(tenantId, id) {
        return this.service.deleteReward(tenantId, id);
    }
    getTiers(tenantId) {
        return this.service.getTiers(tenantId);
    }
    getSettings(tenantId) {
        return this.service.getOrCreateSettings(tenantId);
    }
    updateSettings(tenantId, dto) {
        return this.service.updateSettings(tenantId, dto);
    }
};
exports.LoyaltyController = LoyaltyController;
__decorate([
    (0, common_1.Post)('enroll'),
    (0, swagger_1.ApiOperation)({ summary: 'Enroll customer in loyalty program' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, loyalty_dto_1.EnrollCustomerDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "enroll", null);
__decorate([
    (0, common_1.Post)('earn'),
    (0, swagger_1.ApiOperation)({ summary: 'Earn points from a purchase' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, loyalty_dto_1.EarnPointsDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "earn", null);
__decorate([
    (0, common_1.Post)('redeem'),
    (0, swagger_1.ApiOperation)({ summary: 'Redeem a reward' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, loyalty_dto_1.RedeemRewardDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "redeem", null);
__decorate([
    (0, common_1.Post)('adjust'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually adjust points' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, loyalty_dto_1.AdjustPointsDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "adjust", null);
__decorate([
    (0, common_1.Get)('customers/:customerId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer loyalty info' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getCustomer", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Top customers leaderboard' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "leaderboard", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Points transaction history' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, loyalty_dto_1.LoyaltyQueryDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "transactions", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Loyalty program dashboard' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('rewards'),
    (0, swagger_1.ApiOperation)({ summary: 'List rewards catalog' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getRewards", null);
__decorate([
    (0, common_1.Post)('rewards'),
    (0, swagger_1.ApiOperation)({ summary: 'Create reward' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, loyalty_dto_1.CreateRewardDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "createReward", null);
__decorate([
    (0, common_1.Put)('rewards/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update reward' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, loyalty_dto_1.UpdateRewardDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "updateReward", null);
__decorate([
    (0, common_1.Delete)('rewards/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete reward' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "deleteReward", null);
__decorate([
    (0, common_1.Get)('tiers'),
    (0, swagger_1.ApiOperation)({ summary: 'Get loyalty tiers' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getTiers", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get loyalty settings' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update loyalty settings' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, loyalty_dto_1.UpdateLoyaltySettingsDto]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "updateSettings", null);
exports.LoyaltyController = LoyaltyController = __decorate([
    (0, swagger_1.ApiTags)('Loyalty'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('loyalty'),
    __metadata("design:paramtypes", [loyalty_service_1.LoyaltyService])
], LoyaltyController);
//# sourceMappingURL=loyalty.controller.js.map