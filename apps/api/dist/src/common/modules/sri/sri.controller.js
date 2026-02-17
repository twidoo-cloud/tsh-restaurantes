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
exports.SriController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const tenant_decorator_1 = require("../../decorators/tenant.decorator");
const sri_service_1 = require("./sri.service");
const sri_dto_1 = require("./dto/sri.dto");
let SriController = class SriController {
    constructor(sriService) {
        this.sriService = sriService;
    }
    async getConfig(tenantId) {
        return this.sriService.getConfig(tenantId);
    }
    async updateConfig(tenantId, dto) {
        return this.sriService.updateConfig(tenantId, dto);
    }
    async uploadCertificate(tenantId, file, password) {
        if (!file)
            throw new common_1.BadRequestException('Archivo de certificado requerido');
        if (!password)
            throw new common_1.BadRequestException('Contraseña del certificado requerida');
        return this.sriService.uploadCertificate(tenantId, file.buffer, file.originalname, password);
    }
    async deleteCertificate(tenantId) {
        return this.sriService.deleteCertificate(tenantId);
    }
    async emitirFactura(tenantId, dto) {
        return this.sriService.emitirFactura(tenantId, dto);
    }
    async emitirNotaCredito(tenantId, dto) {
        return this.sriService.emitirNotaCredito(tenantId, dto);
    }
    async firmarFactura(tenantId, id) {
        return this.sriService.firmarFactura(tenantId, id);
    }
    async enviarAlSri(tenantId, id) {
        return this.sriService.enviarAlSri(tenantId, id);
    }
    async consultarEstado(tenantId, id) {
        return this.sriService.consultarEstado(tenantId, id);
    }
    async anularComprobante(tenantId, id, dto) {
        return this.sriService.anularComprobante(tenantId, id, dto);
    }
    async generateRide(tenantId, id) {
        return this.sriService.generateRide(tenantId, id);
    }
    async downloadRide(tenantId, id, res) {
        const { buffer, filename } = await this.sriService.downloadRide(tenantId, id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length.toString(),
        });
        res.end(buffer);
    }
    async enviarEmail(tenantId, id, dto) {
        return this.sriService.enviarEmail(tenantId, id, dto.email);
    }
    async getInvoices(tenantId, page, limit) {
        return this.sriService.getInvoices(tenantId, parseInt(page || '1'), parseInt(limit || '20'));
    }
    async getInvoice(tenantId, id) {
        return this.sriService.getInvoice(tenantId, id);
    }
};
exports.SriController = SriController;
__decorate([
    (0, common_1.Get)('config'),
    (0, swagger_1.ApiOperation)({ summary: 'Get SRI configuration' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)('config'),
    (0, swagger_1.ApiOperation)({ summary: 'Update SRI configuration (includes SMTP)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sri_dto_1.UpdateSriConfigDto]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)('certificate'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload .p12 certificate' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('certificate', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!file.originalname.match(/\.(p12|pfx)$/i)) {
                return cb(new common_1.BadRequestException('Solo se permiten archivos .p12 o .pfx'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('password')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "uploadCertificate", null);
__decorate([
    (0, common_1.Post)('certificate/delete'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete .p12 certificate' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "deleteCertificate", null);
__decorate([
    (0, common_1.Post)('emitir'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate electronic invoice XML from order' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sri_dto_1.EmitirFacturaDto]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "emitirFactura", null);
__decorate([
    (0, common_1.Post)('nota-credito'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate credit note linked to an authorized invoice' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, sri_dto_1.EmitirNotaCreditoDto]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "emitirNotaCredito", null);
__decorate([
    (0, common_1.Post)('firmar/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Sign XML with XAdES-BES' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "firmarFactura", null);
__decorate([
    (0, common_1.Post)('enviar/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Send signed invoice to SRI' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "enviarAlSri", null);
__decorate([
    (0, common_1.Get)('consultar/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Query authorization status' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "consultarEstado", null);
__decorate([
    (0, common_1.Post)('anular/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Void an invoice (generates credit note or marks as voided)' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, sri_dto_1.AnularComprobanteDto]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "anularComprobante", null);
__decorate([
    (0, common_1.Post)('ride/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate RIDE PDF' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "generateRide", null);
__decorate([
    (0, common_1.Get)('ride/:id/download'),
    (0, swagger_1.ApiOperation)({ summary: 'Download RIDE PDF' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "downloadRide", null);
__decorate([
    (0, common_1.Post)('email/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Send XML + RIDE via email to buyer' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, sri_dto_1.EnviarEmailDto]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "enviarEmail", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'List electronic invoices' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get invoice detail' }),
    __param(0, (0, tenant_decorator_1.CurrentTenant)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SriController.prototype, "getInvoice", null);
exports.SriController = SriController = __decorate([
    (0, swagger_1.ApiTags)('SRI Electronic Invoicing'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('sri'),
    __metadata("design:paramtypes", [sri_service_1.SriService])
], SriController);
//# sourceMappingURL=sri.controller.js.map