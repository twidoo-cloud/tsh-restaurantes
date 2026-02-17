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
exports.ProcessSplitPaymentDto = exports.CreateCustomSplitDto = exports.CustomSplitGuest = exports.CreateItemSplitDto = exports.SplitItemAssignment = exports.CreateEqualSplitDto = exports.SplitType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
var SplitType;
(function (SplitType) {
    SplitType["EQUAL"] = "equal";
    SplitType["BY_ITEMS"] = "by_items";
    SplitType["CUSTOM"] = "custom_amount";
})(SplitType || (exports.SplitType = SplitType = {}));
class CreateEqualSplitDto {
}
exports.CreateEqualSplitDto = CreateEqualSplitDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, description: 'Number of people to split between' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(2),
    __metadata("design:type", Number)
], CreateEqualSplitDto.prototype, "numberOfGuests", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['Carlos', 'María', 'Juan'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateEqualSplitDto.prototype, "guestNames", void 0);
class SplitItemAssignment {
}
exports.SplitItemAssignment = SplitItemAssignment;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Guest index (0-based)' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SplitItemAssignment.prototype, "guestIndex", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Order item IDs assigned to this guest' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SplitItemAssignment.prototype, "itemIds", void 0);
class CreateItemSplitDto {
}
exports.CreateItemSplitDto = CreateItemSplitDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(2),
    __metadata("design:type", Number)
], CreateItemSplitDto.prototype, "numberOfGuests", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['Carlos', 'María', 'Juan'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateItemSplitDto.prototype, "guestNames", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SplitItemAssignment], description: 'Item assignments per guest' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SplitItemAssignment),
    __metadata("design:type", Array)
], CreateItemSplitDto.prototype, "assignments", void 0);
class CustomSplitGuest {
}
exports.CustomSplitGuest = CustomSplitGuest;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Carlos' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomSplitGuest.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 15.50 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CustomSplitGuest.prototype, "amount", void 0);
class CreateCustomSplitDto {
}
exports.CreateCustomSplitDto = CreateCustomSplitDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CustomSplitGuest] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(2),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CustomSplitGuest),
    __metadata("design:type", Array)
], CreateCustomSplitDto.prototype, "guests", void 0);
class ProcessSplitPaymentDto {
}
exports.ProcessSplitPaymentDto = ProcessSplitPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'cash', enum: ['cash', 'credit_card', 'debit_card', 'transfer', 'wallet'] }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProcessSplitPaymentDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 16.52 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], ProcessSplitPaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'USD' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProcessSplitPaymentDto.prototype, "currencyCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProcessSplitPaymentDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 20.00 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ProcessSplitPaymentDto.prototype, "cashReceived", void 0);
//# sourceMappingURL=split-bill.dto.js.map