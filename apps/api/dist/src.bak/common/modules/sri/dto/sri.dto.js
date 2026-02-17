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
exports.EnviarEmailDto = exports.AnularComprobanteDto = exports.EmitirNotaCreditoDto = exports.EmitirFacturaDto = exports.UpdateSriConfigDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateSriConfigDto {
}
exports.UpdateSriConfigDto = UpdateSriConfigDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "ruc", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "razonSocial", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "nombreComercial", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "direccionMatriz", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSriConfigDto.prototype, "obligadoContabilidad", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "contribuyenteEspecial", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSriConfigDto.prototype, "regimenRimpe", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "ambiente", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "establecimiento", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "puntoEmision", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "emailNotificacion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "smtpHost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateSriConfigDto.prototype, "smtpPort", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "smtpUser", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "smtpPassword", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateSriConfigDto.prototype, "smtpFromName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateSriConfigDto.prototype, "smtpSecure", void 0);
class EmitirFacturaDto {
}
exports.EmitirFacturaDto = EmitirFacturaDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirFacturaDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirFacturaDto.prototype, "tipoIdentificacion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirFacturaDto.prototype, "identificacion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirFacturaDto.prototype, "razonSocial", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirFacturaDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirFacturaDto.prototype, "direccion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirFacturaDto.prototype, "telefono", void 0);
class EmitirNotaCreditoDto {
}
exports.EmitirNotaCreditoDto = EmitirNotaCreditoDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID de la factura autorizada a la que se aplica la NC' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirNotaCreditoDto.prototype, "facturaId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Motivo de la nota de crédito' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmitirNotaCreditoDto.prototype, "motivo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Si es parcial, IDs de items a incluir (vacío = total)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], EmitirNotaCreditoDto.prototype, "itemIds", void 0);
class AnularComprobanteDto {
}
exports.AnularComprobanteDto = AnularComprobanteDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Motivo de la anulación' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnularComprobanteDto.prototype, "motivo", void 0);
class EnviarEmailDto {
}
exports.EnviarEmailDto = EnviarEmailDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Email del destinatario' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EnviarEmailDto.prototype, "email", void 0);
//# sourceMappingURL=sri.dto.js.map