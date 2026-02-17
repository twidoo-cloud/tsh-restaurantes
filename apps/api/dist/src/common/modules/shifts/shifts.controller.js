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
exports.ShiftsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const shifts_service_1 = require("./shifts.service");
const shifts_dto_1 = require("./dto/shifts.dto");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
const pos_events_gateway_1 = require("../../ws/pos-events.gateway");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
class CreateCashRegisterDto {
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCashRegisterDto.prototype, "name", void 0);
class UpdateCashRegisterDto {
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCashRegisterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCashRegisterDto.prototype, "isActive", void 0);
let ShiftsController = class ShiftsController {
    constructor(shiftsService, wsGateway) {
        this.shiftsService = shiftsService;
        this.wsGateway = wsGateway;
    }
    async getCashRegisters(tenantId, branchId) {
        return this.shiftsService.getCashRegisters(tenantId, branchId);
    }
    async createCashRegister(tenantId, branchId, dto) {
        return this.shiftsService.createCashRegister(tenantId, dto.name, branchId);
    }
    async updateCashRegister(tenantId, id, dto) {
        return this.shiftsService.updateCashRegister(tenantId, id, dto);
    }
    async deleteCashRegister(tenantId, id) {
        return this.shiftsService.deleteCashRegister(tenantId, id);
    }
    async getActiveShift(tenantId, branchId) {
        return this.shiftsService.getActiveShift(tenantId, branchId);
    }
    async openShift(tenantId, branchId, userId, firstName, dto) {
        const result = await this.shiftsService.openShift(tenantId, userId, dto, branchId);
        this.wsGateway.emitShiftOpened(tenantId, {
            shiftId: result.id,
            cashRegisterName: result.cashRegisterName,
            openedBy: firstName,
            openingAmount: result.openingAmount,
        });
        return result;
    }
    async closeShift(tenantId, userId, shiftId, dto) {
        const result = await this.shiftsService.closeShift(tenantId, shiftId, userId, dto);
        this.wsGateway.emitShiftClosed(tenantId, {
            shiftId: result.shiftId,
            closingAmount: result.closingAmount,
            difference: result.difference,
        });
        return result;
    }
    async getShifts(tenantId, branchId, query) {
        return this.shiftsService.getShifts(tenantId, query, branchId);
    }
    async getShiftDetail(tenantId, shiftId) {
        return this.shiftsService.getShiftDetail(tenantId, shiftId);
    }
};
exports.ShiftsController = ShiftsController;
__decorate([
    (0, common_1.Get)('cash-registers'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar cajas registradoras con turno activo' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getCashRegisters", null);
__decorate([
    (0, common_1.Post)('cash-registers'),
    (0, swagger_1.ApiOperation)({ summary: 'Crear caja registradora' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, CreateCashRegisterDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "createCashRegister", null);
__decorate([
    (0, common_1.Put)('cash-registers/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar caja registradora' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateCashRegisterDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "updateCashRegister", null);
__decorate([
    (0, common_1.Delete)('cash-registers/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar/desactivar caja registradora' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "deleteCashRegister", null);
__decorate([
    (0, common_1.Get)('active'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener turno activo actual' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getActiveShift", null);
__decorate([
    (0, common_1.Post)('open'),
    (0, swagger_1.ApiOperation)({ summary: 'Abrir un turno/caja' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(3, (0, tenant_decorator_1.CurrentUser)('firstName')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, shifts_dto_1.OpenShiftDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "openShift", null);
__decorate([
    (0, common_1.Patch)(':id/close'),
    (0, swagger_1.ApiOperation)({ summary: 'Cerrar un turno/caja con arqueo' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, shifts_dto_1.CloseShiftDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "closeShift", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Historial de turnos con paginación' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, shifts_dto_1.ShiftQueryDto]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getShifts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Detalle de turno con desglose' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShiftsController.prototype, "getShiftDetail", null);
exports.ShiftsController = ShiftsController = __decorate([
    (0, swagger_1.ApiTags)('Shifts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('shifts'),
    __metadata("design:paramtypes", [shifts_service_1.ShiftsService,
        pos_events_gateway_1.PosEventsGateway])
], ShiftsController);
//# sourceMappingURL=shifts.controller.js.map