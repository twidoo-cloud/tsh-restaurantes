import { Response } from 'express';
import { SriService } from './sri.service';
import { UpdateSriConfigDto, EmitirFacturaDto, EmitirNotaCreditoDto, AnularComprobanteDto, EnviarEmailDto } from './dto/sri.dto';
export declare class SriController {
    private readonly sriService;
    constructor(sriService: SriService);
    getConfig(tenantId: string): unknown;
    updateConfig(tenantId: string, dto: UpdateSriConfigDto): unknown;
    uploadCertificate(tenantId: string, file: any, password: string): unknown;
    deleteCertificate(tenantId: string): unknown;
    emitirFactura(tenantId: string, dto: EmitirFacturaDto): unknown;
    emitirNotaCredito(tenantId: string, dto: EmitirNotaCreditoDto): unknown;
    firmarFactura(tenantId: string, id: string): unknown;
    enviarAlSri(tenantId: string, id: string): unknown;
    consultarEstado(tenantId: string, id: string): unknown;
    anularComprobante(tenantId: string, id: string, dto: AnularComprobanteDto): unknown;
    generateRide(tenantId: string, id: string): unknown;
    downloadRide(tenantId: string, id: string, res: Response): any;
    enviarEmail(tenantId: string, id: string, dto: EnviarEmailDto): unknown;
    getInvoices(tenantId: string, page?: string, limit?: string): unknown;
    getInvoice(tenantId: string, id: string): unknown;
}
