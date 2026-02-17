import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SriXmlService, SriInvoiceData, SriDetalleItem } from './sri-xml.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private sriXml: SriXmlService,
  ) {}

  /**
   * Generate invoice from a completed order
   */
  async generateFromOrder(tenantId: string, orderId: string, customerData?: {
    taxId?: string;
    name?: string;
    email?: string;
    address?: string;
  }) {
    // Get order with items
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
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status !== 'completed') throw new BadRequestException('La orden debe estar completada para facturar');

    // Get tenant settings
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    const settings = tenant.settings as any || {};

    // Get or create next invoice number
    const nextNumber = await this.getNextInvoiceNumber(tenantId, '01');
    const estab = settings.invoice_prefix?.split('-')[0] || '001';
    const ptoEmi = settings.invoice_prefix?.split('-')[1] || '001';
    const secuencial = nextNumber.toString().padStart(9, '0');
    const fullNumber = `${estab}-${ptoEmi}-${secuencial}`;

    // Customer info
    const buyerTaxId = customerData?.taxId || '9999999999999';
    const buyerName = customerData?.name || 'CONSUMIDOR FINAL';

    // Build SRI invoice data
    const taxRate = settings.tax_rate || 0.15;
    const detalles: SriDetalleItem[] = order.items.map(item => {
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
        codigoPorcentaje: SriXmlService.getCodigoPorcentajeIVA(itemTaxRate),
        baseImponible: subtotal,
        tarifa: itemTaxRate * 100,
        valor: taxAmount,
      };
    });

    const totalSinImpuestos = parseFloat(order.subtotal.toString());
    const totalImpuestos = parseFloat(order.taxAmount.toString());
    const importeTotal = parseFloat(order.total.toString());

    const sriData: SriInvoiceData = {
      ruc: tenant.taxId || '9999999999001',
      razonSocial: tenant.name,
      nombreComercial: tenant.name,
      direccionMatriz: (tenant.address as any)?.street || 'Ecuador',
      direccionEstablecimiento: (tenant.address as any)?.street || 'Ecuador',
      obligadoContabilidad: 'NO',
      regimenMicroempresas: true,
      codDoc: '01',
      estab,
      ptoEmi,
      secuencial,
      fechaEmision: this.formatDate(new Date()),
      ambiente: settings.sri_environment === 'production' ? '2' : '1',
      tipoIdentificacionComprador: SriXmlService.getTipoIdentificacion(buyerTaxId),
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
        formaPago: SriXmlService.getFormaPago(p.method),
        total: parseFloat(p.amount.toString()),
      })),
    };

    // Generate XML
    const xmlContent = this.sriXml.generateFacturaXml(sriData);
    const claveAcceso = xmlContent.match(/<claveAcceso>(\d+)<\/claveAcceso>/)?.[1] || '';

    // Save invoice
    await this.prisma.$executeRaw`
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

    // Save invoice items
    for (const det of detalles) {
      await this.prisma.$executeRaw`
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

  /**
   * List invoices with filters
   */
  async listInvoices(tenantId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const rows: any[] = await this.prisma.$queryRaw`
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

    const countResult: any[] = await this.prisma.$queryRaw`
      SELECT COUNT(*)::int as total FROM invoices WHERE tenant_id = ${tenantId}::uuid
    `;

    return {
      data: rows,
      total: countResult[0]?.total || 0,
      page,
      limit,
    };
  }

  /**
   * Get invoice detail with XML
   */
  async getInvoice(tenantId: string, invoiceId: string) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT i.*, o.order_number
      FROM invoices i
      LEFT JOIN orders o ON o.id = i.order_id
      WHERE i.id = ${invoiceId}::uuid AND i.tenant_id = ${tenantId}::uuid
    `;
    if (!rows.length) throw new NotFoundException('Factura no encontrada');

    const items: any[] = await this.prisma.$queryRaw`
      SELECT * FROM invoice_items WHERE invoice_id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return { ...rows[0], items };
  }

  /**
   * Simulate sending to SRI (in production this would call the real SRI web service)
   */
  async sendToSri(tenantId: string, invoiceId: string) {
    const invoice = await this.getInvoice(tenantId, invoiceId);
    if (invoice.status === 'authorized') throw new BadRequestException('Factura ya autorizada');

    const claveAcceso = invoice.authority_response?.claveAcceso;

    // Simulate SRI response
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

    await this.prisma.$executeRaw`
      UPDATE invoices SET 
        status = 'sent',
        authority_response = ${JSON.stringify(sriResponse)}::jsonb
      WHERE id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return sriResponse;
  }

  /**
   * Simulate SRI authorization check
   */
  async checkAuthorization(tenantId: string, invoiceId: string) {
    const invoice = await this.getInvoice(tenantId, invoiceId);
    const claveAcceso = invoice.authority_response?.claveAcceso;

    // Simulate authorization
    const authResponse = {
      claveAcceso,
      estado: 'AUTORIZADO',
      numeroAutorizacion: claveAcceso,
      fechaAutorizacion: new Date().toISOString(),
      ambiente: invoice.authority_response?.ambiente || 'PRUEBAS',
      nota: 'SIMULACIÓN - En producción se consultaría al web service del SRI en https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
    };

    await this.prisma.$executeRaw`
      UPDATE invoices SET 
        status = 'authorized',
        authority_response = ${JSON.stringify(authResponse)}::jsonb
      WHERE id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return authResponse;
  }

  /**
   * Get invoice summary stats
   */
  async getSummary(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: any[] = await this.prisma.$queryRaw`
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

  /**
   * Void/anull an invoice (generate nota de crédito)
   */
  async voidInvoice(tenantId: string, invoiceId: string, reason: string) {
    const invoice = await this.getInvoice(tenantId, invoiceId);
    if (invoice.document_type !== 'factura') throw new BadRequestException('Solo se pueden anular facturas');

    await this.prisma.$executeRaw`
      UPDATE invoices SET status = 'voided'
      WHERE id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return { invoiceId, status: 'voided', reason };
  }

  // ── Helpers ──

  private async getNextInvoiceNumber(tenantId: string, docType: string): Promise<number> {
    const result: any[] = await this.prisma.$queryRaw`
      SELECT COALESCE(MAX(number), 0)::int + 1 as next_number
      FROM invoices
      WHERE tenant_id = ${tenantId}::uuid AND document_type = 'factura'
    `;
    return result[0]?.next_number || 1;
  }

  private formatDate(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
}
