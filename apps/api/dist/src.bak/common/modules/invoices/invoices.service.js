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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const sri_xml_service_1 = require("./sri-xml.service");
let InvoicesService = class InvoicesService {
    constructor(prisma, sriXml) {
        this.prisma = prisma;
        this.sriXml = sriXml;
    }
    async generateFromOrder(tenantId, orderId, customerData) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: {
                items: {
                    where: { isVoid: false },
                    include: { product: { select: { name: true, sku: true, taxRate: true } } },
                },
                payments: true,
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Orden no encontrada');
        if (order.status !== 'completed')
            throw new common_1.BadRequestException('La orden debe estar completada para facturar');
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado');
        const settings = tenant.settings || {};
        const nextNumber = await this.getNextInvoiceNumber(tenantId, '01');
        const estab = settings.invoice_prefix?.split('-')[0] || '001';
        const ptoEmi = settings.invoice_prefix?.split('-')[1] || '001';
        const secuencial = nextNumber.toString().padStart(9, '0');
        const fullNumber = `${estab}-${ptoEmi}-${secuencial}`;
        const buyerTaxId = customerData?.taxId || '9999999999999';
        const buyerName = customerData?.name || 'CONSUMIDOR FINAL';
        const taxRate = settings.tax_rate || 0.15;
        const detalles = order.items.map(item => {
            const qty = parseFloat(item.quantity.toString());
            const unitPrice = parseFloat(item.unitPrice.toString());
            const subtotal = parseFloat(item.subtotal.toString());
            const itemTaxRate = item.product.taxRate ? parseFloat(item.product.taxRate.toString()) : taxRate;
            const taxAmount = subtotal * itemTaxRate;
            return {
                codigoPrincipal: item.product.sku || item.productId.substring(0, 10),
                descripcion: item.product.name,
                cantidad: qty,
                precioUnitario: unitPrice,
                descuento: 0,
                precioTotalSinImpuesto: subtotal,
                codigoPorcentaje: sri_xml_service_1.SriXmlService.getCodigoPorcentajeIVA(itemTaxRate),
                baseImponible: subtotal,
                tarifa: itemTaxRate * 100,
                valor: taxAmount,
            };
        });
        const totalSinImpuestos = parseFloat(order.subtotal.toString());
        const totalImpuestos = parseFloat(order.taxAmount.toString());
        const importeTotal = parseFloat(order.total.toString());
        const sriData = {
            ruc: tenant.taxId || '9999999999001',
            razonSocial: tenant.name,
            nombreComercial: tenant.name,
            direccionMatriz: tenant.address?.street || 'Ecuador',
            direccionEstablecimiento: tenant.address?.street || 'Ecuador',
            obligadoContabilidad: 'NO',
            regimenMicroempresas: true,
            codDoc: '01',
            estab,
            ptoEmi,
            secuencial,
            fechaEmision: this.formatDate(new Date()),
            ambiente: settings.sri_environment === 'production' ? '2' : '1',
            tipoIdentificacionComprador: sri_xml_service_1.SriXmlService.getTipoIdentificacion(buyerTaxId),
            razonSocialComprador: buyerName,
            identificacionComprador: buyerTaxId,
            direccionComprador: customerData?.address,
            emailComprador: customerData?.email,
            detalles,
            totalSinImpuestos,
            totalDescuento: 0,
            propina: 0,
            importeTotal,
            pagos: order.payments.map(p => ({
                formaPago: sri_xml_service_1.SriXmlService.getFormaPago(p.method),
                total: parseFloat(p.amount.toString()),
            })),
        };
        const xmlContent = this.sriXml.generateFacturaXml(sriData);
        const claveAcceso = xmlContent.match(/<claveAcceso>(\d+)<\/claveAcceso>/)?.[1] || '';
        await this.prisma.$executeRaw `
      INSERT INTO invoices (
        tenant_id, order_id, document_type, series, number, full_number,
        customer_id, subtotal, tax_amount, total, currency_code,
        xml_content, authority_response, status, issued_at
      ) VALUES (
        ${tenantId}::uuid, ${orderId}::uuid, 'factura', ${`${estab}-${ptoEmi}`}, ${nextNumber},
        ${fullNumber}, ${null}::uuid,
        ${totalSinImpuestos}, ${totalImpuestos}, ${importeTotal}, 'USD',
        ${xmlContent}, ${JSON.stringify({ claveAcceso, ambiente: sriData.ambiente, estado: 'GENERADA' })}::jsonb,
        'generated', NOW()
      )
    `;
        for (const det of detalles) {
            await this.prisma.$executeRaw `
        INSERT INTO invoice_items (tenant_id, invoice_id, description, quantity, unit_price, tax_rate, tax_amount, total)
        SELECT ${tenantId}::uuid, id, ${det.descripcion}, ${det.cantidad}, ${det.precioUnitario},
               ${det.tarifa / 100}, ${det.valor}, ${det.precioTotalSinImpuesto + det.valor}
        FROM invoices WHERE tenant_id = ${tenantId}::uuid AND full_number = ${fullNumber}
        LIMIT 1
      `;
        }
        return {
            fullNumber,
            claveAcceso,
            documentType: 'factura',
            buyer: { taxId: buyerTaxId, name: buyerName },
            subtotal: totalSinImpuestos,
            taxAmount: totalImpuestos,
            total: importeTotal,
            status: 'generated',
            ambiente: sriData.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN',
            xml: xmlContent,
        };
    }
    async listInvoices(tenantId, filters) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const offset = (page - 1) * limit;
        const rows = await this.prisma.$queryRaw `
      SELECT 
        i.id, i.full_number, i.document_type, i.subtotal::float, i.tax_amount::float, i.total::float,
        i.currency_code, i.status, i.issued_at, i.created_at,
        i.authority_response,
        o.order_number,
        o.metadata
      FROM invoices i
      LEFT JOIN orders o ON o.id = i.order_id
      WHERE i.tenant_id = ${tenantId}::uuid
      ORDER BY i.issued_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
        const countResult = await this.prisma.$queryRaw `
      SELECT COUNT(*)::int as total FROM invoices WHERE tenant_id = ${tenantId}::uuid
    `;
        return {
            data: rows,
            total: countResult[0]?.total || 0,
            page,
            limit,
        };
    }
    async getInvoice(tenantId, invoiceId) {
        const rows = await this.prisma.$queryRaw `
      SELECT i.*, o.order_number
      FROM invoices i
      LEFT JOIN orders o ON o.id = i.order_id
      WHERE i.id = ${invoiceId}::uuid AND i.tenant_id = ${tenantId}::uuid
    `;
        if (!rows.length)
            throw new common_1.NotFoundException('Factura no encontrada');
        const items = await this.prisma.$queryRaw `
      SELECT * FROM invoice_items WHERE invoice_id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        return { ...rows[0], items };
    }
    async sendToSri(tenantId, invoiceId) {
        const invoice = await this.getInvoice(tenantId, invoiceId);
        if (invoice.status === 'authorized')
            throw new common_1.BadRequestException('Factura ya autorizada');
        const claveAcceso = invoice.authority_response?.claveAcceso;
        const sriResponse = {
            claveAcceso,
            estado: 'RECIBIDA',
            comprobantes: [{
                    claveAcceso,
                    mensajes: [{
                            identificador: '60',
                            mensaje: 'FIRMA INVALIDA',
                            informacionAdicional: 'Requiere firma electrónica p12 configurada',
                            tipo: 'ADVERTENCIA',
                        }],
                }],
            ambiente: invoice.authority_response?.ambiente || 'PRUEBAS',
            nota: 'SIMULACIÓN - En producción se conectaría al web service del SRI en https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
        };
        await this.prisma.$executeRaw `
      UPDATE invoices SET 
        status = 'sent',
        authority_response = ${JSON.stringify(sriResponse)}::jsonb
      WHERE id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        return sriResponse;
    }
    async checkAuthorization(tenantId, invoiceId) {
        const invoice = await this.getInvoice(tenantId, invoiceId);
        const claveAcceso = invoice.authority_response?.claveAcceso;
        const authResponse = {
            claveAcceso,
            estado: 'AUTORIZADO',
            numeroAutorizacion: claveAcceso,
            fechaAutorizacion: new Date().toISOString(),
            ambiente: invoice.authority_response?.ambiente || 'PRUEBAS',
            nota: 'SIMULACIÓN - En producción se consultaría al web service del SRI en https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
        };
        await this.prisma.$executeRaw `
      UPDATE invoices SET 
        status = 'authorized',
        authority_response = ${JSON.stringify(authResponse)}::jsonb
      WHERE id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        return authResponse;
    }
    async getSummary(tenantId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const stats = await this.prisma.$queryRaw `
      SELECT 
        COUNT(*)::int as total_invoices,
        COUNT(*) FILTER (WHERE status = 'authorized')::int as authorized,
        COUNT(*) FILTER (WHERE status = 'generated')::int as pending,
        COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
        COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
        COALESCE(SUM(total) FILTER (WHERE status = 'authorized'), 0)::float as authorized_total,
        COALESCE(SUM(total), 0)::float as total_amount,
        COUNT(*) FILTER (WHERE issued_at >= ${today})::int as today_count,
        COALESCE(SUM(total) FILTER (WHERE issued_at >= ${today}), 0)::float as today_total
      FROM invoices
      WHERE tenant_id = ${tenantId}::uuid
    `;
        return stats[0] || {};
    }
    async voidInvoice(tenantId, invoiceId, reason) {
        const invoice = await this.getInvoice(tenantId, invoiceId);
        if (invoice.document_type !== 'factura')
            throw new common_1.BadRequestException('Solo se pueden anular facturas');
        await this.prisma.$executeRaw `
      UPDATE invoices SET status = 'voided'
      WHERE id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
    `;
        return { invoiceId, status: 'voided', reason };
    }
    async getNextInvoiceNumber(tenantId, docType) {
        const result = await this.prisma.$queryRaw `
      SELECT COALESCE(MAX(number), 0)::int + 1 as next_number
      FROM invoices
      WHERE tenant_id = ${tenantId}::uuid AND document_type = 'factura'
    `;
        return result[0]?.next_number || 1;
    }
    formatDate(date) {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        sri_xml_service_1.SriXmlService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map