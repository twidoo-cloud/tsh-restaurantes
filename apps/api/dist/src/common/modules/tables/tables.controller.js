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
exports.TablesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const tables_service_1 = require("./tables.service");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class OpenTableDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 4 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], OpenTableDto.prototype, "guestCount", void 0);
class UpdateStatusDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStatusDto.prototype, "orderId", void 0);
class TransferDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransferDto.prototype, "toTableId", void 0);
class MergeDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], MergeDto.prototype, "secondaryTableIds", void 0);
class SwapDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SwapDto.prototype, "tableBId", void 0);
class CreateZoneDto {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateZoneDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateZoneDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateZoneDto.prototype, "floorPlanId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateZoneDto.prototype, "displayOrder", void 0);
class UpdateZoneDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateZoneDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateZoneDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateZoneDto.prototype, "displayOrder", void 0);
class CreateTableDto {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateTableDto.prototype, "number", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTableDto.prototype, "zoneId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateTableDto.prototype, "capacity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTableDto.prototype, "shape", void 0);
class UpdateTableDto {
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateTableDto.prototype, "number", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTableDto.prototype, "zoneId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], UpdateTableDto.prototype, "capacity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTableDto.prototype, "shape", void 0);
class BulkCreateTablesDto {
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateTablesDto.prototype, "zoneId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], BulkCreateTablesDto.prototype, "startNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], BulkCreateTablesDto.prototype, "count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], BulkCreateTablesDto.prototype, "capacity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BulkCreateTablesDto.prototype, "shape", void 0);
let TablesController = class TablesController {
    constructor(tablesService) {
        this.tablesService = tablesService;
    }
    async getFloorPlans(tenantId, branchId) {
        return this.tablesService.getFloorPlans(tenantId, branchId);
    }
    async getMyTables(tenantId, userId) {
        return this.tablesService.getWaiterTables(tenantId, userId);
    }
    async listZones(tenantId, branchId) {
        return this.tablesService.listZones(tenantId, branchId);
    }
    async createZone(tenantId, branchId, dto) {
        return this.tablesService.createZone(tenantId, dto, branchId);
    }
    async updateZone(tenantId, id, dto) {
        return this.tablesService.updateZone(tenantId, id, dto);
    }
    async deleteZone(tenantId, id) {
        return this.tablesService.deleteZone(tenantId, id);
    }
    async createTable(tenantId, branchId, dto) {
        return this.tablesService.createTable(tenantId, dto, branchId);
    }
    async bulkCreateTables(tenantId, branchId, dto) {
        return this.tablesService.bulkCreateTables(tenantId, dto, branchId);
    }
    async updateTable(tenantId, id, dto) {
        return this.tablesService.updateTable(tenantId, id, dto);
    }
    async deleteTable(tenantId, id) {
        return this.tablesService.deleteTable(tenantId, id);
    }
    async getTable(tenantId, id) {
        return this.tablesService.getTableWithOrder(tenantId, id);
    }
    async openTable(tenantId, userId, id, dto) {
        return this.tablesService.openTable(tenantId, id, userId, dto.guestCount || 2);
    }
    async closeTable(tenantId, id) {
        return this.tablesService.closeTable(tenantId, id);
    }
    async updateStatus(tenantId, id, dto) {
        return this.tablesService.updateTableStatus(tenantId, id, dto.status, dto.orderId);
    }
    async transfer(tenantId, fromId, dto) {
        return this.tablesService.transferOrder(tenantId, fromId, dto.toTableId);
    }
    async merge(tenantId, primaryId, dto) {
        return this.tablesService.mergeTables(tenantId, primaryId, dto.secondaryTableIds);
    }
    async unmerge(tenantId, primaryId) {
        return this.tablesService.unmergeTables(tenantId, primaryId);
    }
    async swap(tenantId, tableAId, dto) {
        return this.tablesService.swapTables(tenantId, tableAId, dto.tableBId);
    }
};
exports.TablesController = TablesController;
__decorate([
    (0, common_1.Get)('floor-plans'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener planos con zonas y mesas' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "getFloorPlans", null);
__decorate([
    (0, common_1.Get)('my-tables'),
    (0, swagger_1.ApiOperation)({ summary: 'Mesas del mesero con órdenes activas' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "getMyTables", null);
__decorate([
    (0, common_1.Get)('zones'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar zonas' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "listZones", null);
__decorate([
    (0, common_1.Post)('zones'),
    (0, swagger_1.ApiOperation)({ summary: 'Crear zona' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, CreateZoneDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "createZone", null);
__decorate([
    (0, common_1.Put)('zones/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Editar zona' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateZoneDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "updateZone", null);
__decorate([
    (0, common_1.Delete)('zones/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar zona (soft delete)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "deleteZone", null);
__decorate([
    (0, common_1.Post)('manage'),
    (0, swagger_1.ApiOperation)({ summary: 'Crear mesa' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, CreateTableDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "createTable", null);
__decorate([
    (0, common_1.Post)('manage/bulk'),
    (0, swagger_1.ApiOperation)({ summary: 'Crear múltiples mesas' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentBranch)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, BulkCreateTablesDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "bulkCreateTables", null);
__decorate([
    (0, common_1.Put)('manage/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Editar mesa' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateTableDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "updateTable", null);
__decorate([
    (0, common_1.Delete)('manage/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar mesa (soft delete)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "deleteTable", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener mesa con orden activa' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "getTable", null);
__decorate([
    (0, common_1.Post)(':id/open'),
    (0, swagger_1.ApiOperation)({ summary: 'Abrir mesa (crear orden)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)('sub')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, OpenTableDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "openTable", null);
__decorate([
    (0, common_1.Patch)(':id/close'),
    (0, swagger_1.ApiOperation)({ summary: 'Cerrar mesa (liberar)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "closeTable", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Cambiar estado de la mesa' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateStatusDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/transfer'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, TransferDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "transfer", null);
__decorate([
    (0, common_1.Post)(':id/merge'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, MergeDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "merge", null);
__decorate([
    (0, common_1.Post)(':id/unmerge'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "unmerge", null);
__decorate([
    (0, common_1.Post)(':id/swap'),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, SwapDto]),
    __metadata("design:returntype", Promise)
], TablesController.prototype, "swap", null);
exports.TablesController = TablesController = __decorate([
    (0, swagger_1.ApiTags)('Tables'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('tables'),
    __metadata("design:paramtypes", [tables_service_1.TablesService])
], TablesController);
//# sourceMappingURL=tables.controller.js.map