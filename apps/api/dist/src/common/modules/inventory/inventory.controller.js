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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const inventory_service_1 = require("./inventory.service");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class RecordMovementDto {
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordMovementDto.prototype, "productId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ enum: ['purchase', 'sale', 'adjustment', 'waste', 'transfer', 'return', 'initial'] }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordMovementDto.prototype, "movementType", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 10 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordMovementDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 15.50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordMovementDto.prototype, "unitCost", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordMovementDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordMovementDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordMovementDto.prototype, "supplierId", void 0);
class BulkAdjustmentItem {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkAdjustmentItem.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BulkAdjustmentItem.prototype, "newStock", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkAdjustmentItem.prototype, "notes", void 0);
class BulkAdjustmentDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkAdjustmentItem),
    __metadata("design:type", Array)
], BulkAdjustmentDto.prototype, "adjustments", void 0);
class UpdateMinStockDto {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateMinStockDto.prototype, "minStock", void 0);
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async getStockLevels(tenantId, branchId, categoryId, lowStockOnly, search) {
        return this.inventoryService.getStockLevelsSimple(tenantId, branchId, {
            categoryId: categoryId || undefined,
            lowStockOnly: lowStockOnly === 'true',
            search: search || undefined,
        });
    }
    async getAlerts(tenantId, branchId) {
        return this.inventoryService.getAlerts(tenantId, branchId);
    }
    async getSummary(tenantId, branchId) {
        return this.inventoryService.getSummary(tenantId, branchId);
    }
    async getMovements(tenantId, branchId, productId, movementType, page, limit) {
        return this.inventoryService.getMovements(tenantId, {
            productId: productId || undefined,
            movementType: movementType || undefined,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 50,
            branchId,
        });
    }
    async recordMovement(tenantId, branchId, userId, dto) {
        return this.inventoryService.recordMovement(tenantId, userId, dto, branchId);
    }
    async bulkAdjustment(tenantId, branchId, userId, dto) {
        return this.inventoryService.bulkAdjustment(tenantId, userId, dto.adjustments, branchId);
    }
    async updateMinStock(tenantId, productId, dto) {
        return this.inventoryService.updateMinStock(tenantId, productId, dto.minStock);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('stock'),
    (0, swagger_1.ApiOperation)({ summary: 'Niveles de stock actuales' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Query)('categoryId')),
    __param(3, (0, common_1.Query)('lowStockOnly')),
    __param(4, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getStockLevels", null);
__decorate([
    (0, common_1.Get)('alerts'),
    (0, swagger_1.ApiOperation)({ summary: 'Alertas de stock bajo y agotado' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Resumen general de inventario' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('movements'),
    (0, swagger_1.ApiOperation)({ summary: 'Historial de movimientos de stock' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Query)('productId')),
    __param(3, (0, common_1.Query)('movementType')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getMovements", null);
__decorate([
    (0, common_1.Post)('movement'),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar movimiento de stock' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, RecordMovementDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "recordMovement", null);
__decorate([
    (0, common_1.Post)('bulk-adjustment'),
    (0, swagger_1.ApiOperation)({ summary: 'Ajuste masivo de inventario (conteo físico)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, BulkAdjustmentDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "bulkAdjustment", null);
__decorate([
    (0, common_1.Patch)(':productId/min-stock'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar stock mínimo de un producto' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateMinStockDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateMinStock", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('Inventory'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('inventory'),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map