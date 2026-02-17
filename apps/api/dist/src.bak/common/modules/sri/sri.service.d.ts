import { PrismaService } from '../../prisma.service';
import { UpdateSriConfigDto, EmitirFacturaDto, EmitirNotaCreditoDto, AnularComprobanteDto } from './dto/sri.dto';
export declare class SriService {
    private prisma;
    constructor(prisma: PrismaService);
    getConfig(tenantId: string): unknown;
    updateConfig(tenantId: string, dto: UpdateSriConfigDto): unknown;
    uploadCertificate(tenantId: string, fileBuffer: Buffer, originalName: string, password: string): unknown;
    deleteCertificate(tenantId: string): unknown;
    emitirFactura(tenantId: string, dto: EmitirFacturaDto): unknown;
    emitirNotaCredito(tenantId: string, dto: EmitirNotaCreditoDto): unknown;
    anularComprobante(tenantId: string, invoiceId: string, dto: AnularComprobanteDto): unknown;
    firmarFactura(tenantId: string, invoiceId: string): unknown;
    enviarAlSri(tenantId: string, invoiceId: string): unknown;
    consultarEstado(tenantId: string, invoiceId: string): unknown;
    enviarEmail(tenantId: string, invoiceId: string, emailTo: string): unknown;
    generateRide(tenantId: string, invoiceId: string): unknown;
    downloadRide(tenantId: string, invoiceId: string): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    private buildSriConfig;
    private buildRideData;
    getInvoices(tenantId: string, page?: number, limit?: number): unknown;
    getInvoice(tenantId: string, id: string): unknown;
}
