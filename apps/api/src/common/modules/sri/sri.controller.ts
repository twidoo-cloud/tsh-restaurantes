import {
  Controller, Get, Post, Put, Body, Param, Query, Res,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CurrentTenant } from '../../decorators/tenant.decorator';
import { SriService } from './sri.service';
import {
  UpdateSriConfigDto, EmitirFacturaDto, EmitirNotaCreditoDto,
  AnularComprobanteDto, EnviarEmailDto,
} from './dto/sri.dto';

@ApiTags('SRI Electronic Invoicing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sri')
export class SriController {
  constructor(private readonly sriService: SriService) {}

  // ═══ CONFIG ═══

  @Get('config')
  @ApiOperation({ summary: 'Get SRI configuration' })
  async getConfig(@CurrentTenant() tenantId: string) {
    return this.sriService.getConfig(tenantId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Update SRI configuration (includes SMTP)' })
  async updateConfig(@CurrentTenant() tenantId: string, @Body() dto: UpdateSriConfigDto) {
    return this.sriService.updateConfig(tenantId, dto);
  }

  // ═══ CERTIFICATE ═══

  @Post('certificate')
  @ApiOperation({ summary: 'Upload .p12 certificate' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('certificate', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req: any, file: any, cb: any) => {
      if (!file.originalname.match(/\.(p12|pfx)$/i)) {
        return cb(new BadRequestException('Solo se permiten archivos .p12 o .pfx'), false);
      }
      cb(null, true);
    },
  }))
  async uploadCertificate(
    @CurrentTenant() tenantId: string,
    @UploadedFile() file: any,
    @Body('password') password: string,
  ) {
    if (!file) throw new BadRequestException('Archivo de certificado requerido');
    if (!password) throw new BadRequestException('Contraseña del certificado requerida');
    return this.sriService.uploadCertificate(tenantId, file.buffer, file.originalname, password);
  }

  @Post('certificate/delete')
  @ApiOperation({ summary: 'Delete .p12 certificate' })
  async deleteCertificate(@CurrentTenant() tenantId: string) {
    return this.sriService.deleteCertificate(tenantId);
  }

  // ═══ FACTURA ═══

  @Post('emitir')
  @ApiOperation({ summary: 'Generate electronic invoice XML from order' })
  async emitirFactura(@CurrentTenant() tenantId: string, @Body() dto: EmitirFacturaDto) {
    return this.sriService.emitirFactura(tenantId, dto);
  }

  // ═══ NOTA DE CRÉDITO (P5) ═══

  @Post('nota-credito')
  @ApiOperation({ summary: 'Generate credit note linked to an authorized invoice' })
  async emitirNotaCredito(@CurrentTenant() tenantId: string, @Body() dto: EmitirNotaCreditoDto) {
    return this.sriService.emitirNotaCredito(tenantId, dto);
  }

  // ═══ SIGN ═══

  @Post('firmar/:id')
  @ApiOperation({ summary: 'Sign XML with XAdES-BES' })
  async firmarFactura(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.sriService.firmarFactura(tenantId, id);
  }

  // ═══ SEND TO SRI ═══

  @Post('enviar/:id')
  @ApiOperation({ summary: 'Send signed invoice to SRI' })
  async enviarAlSri(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.sriService.enviarAlSri(tenantId, id);
  }

  @Get('consultar/:id')
  @ApiOperation({ summary: 'Query authorization status' })
  async consultarEstado(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.sriService.consultarEstado(tenantId, id);
  }

  // ═══ ANULACIÓN (P6) ═══

  @Post('anular/:id')
  @ApiOperation({ summary: 'Void an invoice (generates credit note or marks as voided)' })
  async anularComprobante(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: AnularComprobanteDto) {
    return this.sriService.anularComprobante(tenantId, id, dto);
  }

  // ═══ RIDE PDF ═══

  @Post('ride/:id')
  @ApiOperation({ summary: 'Generate RIDE PDF' })
  async generateRide(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.sriService.generateRide(tenantId, id);
  }

  @Get('ride/:id/download')
  @ApiOperation({ summary: 'Download RIDE PDF' })
  async downloadRide(@CurrentTenant() tenantId: string, @Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.sriService.downloadRide(tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.end(buffer);
  }

  // ═══ EMAIL (P4) ═══

  @Post('email/:id')
  @ApiOperation({ summary: 'Send XML + RIDE via email to buyer' })
  async enviarEmail(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: EnviarEmailDto) {
    return this.sriService.enviarEmail(tenantId, id, dto.email);
  }

  // ═══ LIST / DETAIL ═══

  @Get('invoices')
  @ApiOperation({ summary: 'List electronic invoices' })
  async getInvoices(@CurrentTenant() tenantId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.sriService.getInvoices(tenantId, parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice detail' })
  async getInvoice(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.sriService.getInvoice(tenantId, id);
  }
}
