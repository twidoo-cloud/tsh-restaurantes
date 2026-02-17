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
exports.CreditController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const credit_service_1 = require("./credit.service");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
const tenant_decorator_2 = require("../../decorators/tenant.decorator");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateCreditAccountDto {
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCreditAccountDto.prototype, "customerId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateCreditAccountDto.prototype, "creditLimit", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCreditAccountDto.prototype, "notes", void 0);
class UpdateCreditAccountDto {
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateCreditAccountDto.prototype, "creditLimit", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCreditAccountDto.prototype, "status", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCreditAccountDto.prototype, "notes", void 0);
class RecordChargeDto {
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordChargeDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], RecordChargeDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordChargeDto.prototype, "notes", void 0);
class RecordPaymentDto {
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], RecordPaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordPaymentDto.prototype, "method", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordPaymentDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordPaymentDto.prototype, "notes", void 0);
class RecordAdjustmentDto {
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], RecordAdjustmentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    __metadata("design:type", String)
], RecordAdjustmentDto.prototype, "reason", void 0);
let CreditController = class CreditController {
    constructor(creditService) {
        this.creditService = creditService;
    }
    async dashboard(tenantId) {
        return this.creditService.getDashboard(tenantId);
    }
    async listAccounts(tenantId, status, search, overdue) {
        return this.creditService.listAccounts(tenantId, { status, search, overdue: overdue === 'true' });
    }
    async getAccount(tenantId, id) {
        return this.creditService.getAccount(tenantId, id);
    }
    async getByCustomer(tenantId, customerId) {
        return this.creditService.getByCustomer(tenantId, customerId);
    }
    async createAccount(tenantId, dto) {
        return this.creditService.createAccount(tenantId, dto);
    }
    async updateAccount(tenantId, id, dto) {
        return this.creditService.updateAccount(tenantId, id, dto);
    }
    async recordCharge(tenantId, id, dto, userId) {
        return this.creditService.recordCharge(tenantId, id, dto, userId);
    }
    async recordPayment(tenantId, id, dto, userId) {
        return this.creditService.recordPayment(tenantId, id, dto, userId);
    }
    async recordAdjustment(tenantId, id, dto, userId) {
        return this.creditService.recordAdjustment(tenantId, id, dto, userId);
    }
    async getTransactions(tenantId, id, page, limit) {
        return this.creditService.getTransactions(tenantId, id, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50,
        });
    }
};
exports.CreditController = CreditController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Dashboard de cuentas por cobrar' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar cuentas de crédito' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('overdue')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "listAccounts", null);
__decorate([
    (0, common_1.Get)('accounts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Detalle de cuenta de crédito' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "getAccount", null);
__decorate([
    (0, common_1.Get)('customers/:customerId'),
    (0, swagger_1.ApiOperation)({ summary: 'Cuenta de crédito por cliente' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "getByCustomer", null);
__decorate([
    (0, common_1.Post)('accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'Crear cuenta de crédito para cliente' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateCreditAccountDto]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "createAccount", null);
__decorate([
    (0, common_1.Put)('accounts/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar cuenta de crédito' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateCreditAccountDto]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "updateAccount", null);
__decorate([
    (0, common_1.Post)('accounts/:id/charge'),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar venta a crédito (cargo)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, tenant_decorator_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, RecordChargeDto, String]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "recordCharge", null);
__decorate([
    (0, common_1.Post)('accounts/:id/payment'),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar abono/pago' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, tenant_decorator_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, RecordPaymentDto, String]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Post)('accounts/:id/adjustment'),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar ajuste' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, tenant_decorator_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, RecordAdjustmentDto, String]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "recordAdjustment", null);
__decorate([
    (0, common_1.Get)('accounts/:id/transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Historial de transacciones de una cuenta' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], CreditController.prototype, "getTransactions", null);
exports.CreditController = CreditController = __decorate([
    (0, swagger_1.ApiTags)('Credit / Cuentas por Cobrar'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('credit'),
    __metadata("design:paramtypes", [credit_service_1.CreditService])
], CreditController);
//# sourceMappingURL=credit.controller.js.map