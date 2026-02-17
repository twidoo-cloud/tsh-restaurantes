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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftQueryDto = exports.CloseShiftDto = exports.OpenShiftDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class OpenShiftDto {
}
exports.OpenShiftDto = OpenShiftDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Cash register ID', example: '13000000-0000-0000-0000-000000000001' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OpenShiftDto.prototype, "cashRegisterId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Opening cash amount', example: 100.00 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OpenShiftDto.prototype, "openingAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes for the shift opening' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OpenShiftDto.prototype, "notes", void 0);
class CloseShiftDto {
}
exports.CloseShiftDto = CloseShiftDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Actual counted cash amount at closing', example: 450.50 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CloseShiftDto.prototype, "closingAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes for the shift closing' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloseShiftDto.prototype, "notes", void 0);
class ShiftQueryDto {
}
exports.ShiftQueryDto = ShiftQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['open', 'closed'], description: 'Filter by status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShiftQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShiftQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ShiftQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=shifts.dto.js.map