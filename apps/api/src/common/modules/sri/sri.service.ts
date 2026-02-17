import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateSriConfigDto, EmitirFacturaDto, EmitirNotaCreditoDto, AnularComprobanteDto } from './dto/sri.dto';
import {
  generateClaveAcceso, generateFacturaXml,
  PAYMENT_METHOD_MAP, IVA_RATES,
  InvoiceData, InvoiceDetail, BuyerInfo, SriConfigData,
} from './sri-xml';
import { generateNotaCreditoXml, NotaCreditoData } from './sri-nota-credito';
import { enviarComprobante, consultarAutorizacion } from './sri-soap';
import { signXml, validateP12 } from './sri-signer';
import { generateRidePdf, generateRidePdfBuffer, RideData } from './sri-ride';
import { sendInvoiceEmail, getTipoDocLabel, SmtpConfig } from './sri-email';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const CERTS_DIR = path.join(process.cwd(), 'storage', 'certificates');
const RIDES_DIR = path.join(process.cwd(), 'storage', 'rides');

const ENCRYPTION_KEY = process.env.SRI_CERT_ENCRYPTION_KEY || 'pos-saas-sri-cert-key-32-chars!';
const ENCRYPTION_IV_LENGTH = 16;

function encryptPassword(text: string): string {
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptPassword(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !encrypted) throw new Error('Formato de contraseña encriptada inválido');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

@Injectable()
export class SriService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════

  async getConfig(tenantId: string) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) return null;
    return {
      ...config,
      certP12Password: config.certP12Password ? '********' : null,
      smtpPassword: config.smtpPassword ? '********' : null,
      hasCertificate: !!config.certP12Path,
      hasSmtp: !!(config.smtpHost && config.smtpUser),
    };
  }

  async updateConfig(tenantId: string, dto: UpdateSriConfigDto) {
    const existing = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    const data: any = {
      ruc: dto.ruc,
      razonSocial: dto.razonSocial,
      nombreComercial: dto.nombreComercial,
      direccionMatriz: dto.direccionMatriz,
      obligadoContabilidad: dto.obligadoContabilidad ?? false,
      contribuyenteEspecial: dto.contribuyenteEspecial,
      regimenRimpe: dto.regimenRimpe ?? false,
      ambiente: dto.ambiente || '1',
      establecimiento: dto.establecimiento || '001',
      puntoEmision: dto.puntoEmision || '001',
      emailNotificacion: dto.emailNotificacion,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpUser: dto.smtpUser,
      smtpFromName: dto.smtpFromName,
      smtpSecure: dto.smtpSecure ?? true,
    };
    // Only update SMTP password if provided (not the masked value)
    if (dto.smtpPassword && dto.smtpPassword !== '********') {
      data.smtpPassword = encryptPassword(dto.smtpPassword);
    }
    if (existing) {
      return this.prisma.sriConfig.update({ where: { tenantId }, data });
    }
    if (dto.smtpPassword) data.smtpPassword = encryptPassword(dto.smtpPassword);
    return this.prisma.sriConfig.create({ data: { tenantId, ...data } });
  }

  // ═══════════════════════════════════════════
  // CERTIFICATE (P1)
  // ═══════════════════════════════════════════

  async uploadCertificate(tenantId: string, fileBuffer: Buffer, originalName: string, password: string) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configure primero los datos del emisor SRI');
    const tenantCertsDir = path.join(CERTS_DIR, tenantId);
    if (!fs.existsSync(tenantCertsDir)) fs.mkdirSync(tenantCertsDir, { recursive: true });
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const certPath = path.join(tenantCertsDir, sanitizedName);
    fs.writeFileSync(certPath, fileBuffer);
    const validation = validateP12(certPath, password);
    if (!validation.valid) {
      try { fs.unlinkSync(certPath); } catch { /* ignore */ }
      throw new BadRequestException(`Certificado inválido: ${validation.error}`);
    }
    if (config.certP12Path && config.certP12Path !== certPath) {
      try { fs.unlinkSync(config.certP12Path); } catch { /* ignore */ }
    }
    await this.prisma.sriConfig.update({
      where: { tenantId },
      data: { certP12Path: certPath, certP12Password: encryptPassword(password) },
    });
    return {
      success: true, message: 'Certificado cargado y validado exitosamente',
      certificate: { fileName: sanitizedName, issuer: validation.issuer, serialNumber: validation.serialNumber, validFrom: validation.validFrom, validTo: validation.validTo },
    };
  }

  async deleteCertificate(tenantId: string) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada');
    if (!config.certP12Path) throw new BadRequestException('No hay certificado configurado');
    if (config.certP12Path && fs.existsSync(config.certP12Path)) fs.unlinkSync(config.certP12Path);
    await this.prisma.sriConfig.update({ where: { tenantId }, data: { certP12Path: null, certP12Password: null } });
    return { success: true, message: 'Certificado eliminado exitosamente' };
  }

  // ═══════════════════════════════════════════
  // EMIT FACTURA
  // ═══════════════════════════════════════════

  async emitirFactura(tenantId: string, dto: EmitirFacturaDto) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada. Configure primero los datos del emisor.');
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, tenantId },
      include: { items: { include: { product: true }, where: { isVoid: false } }, payments: true, customer: true },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status !== 'completed') throw new BadRequestException('La orden debe estar completada para facturar');
    const existingInv = await this.prisma.electronicInvoice.findFirst({
      where: { orderId: order.id, estado: { notIn: ['anulado', 'rechazado'] } },
    });
    if (existingInv) throw new BadRequestException(`Esta orden ya tiene factura: ${existingInv.claveAcceso}`);

    const updated = await this.prisma.sriConfig.update({ where: { tenantId }, data: { secuencialFactura: { increment: 1 } } });
    const secuencial = updated.secuencialFactura.toString().padStart(9, '0');
    const buyer: BuyerInfo = {
      tipoIdentificacion: dto.tipoIdentificacion || '07',
      identificacion: dto.identificacion || '9999999999999',
      razonSocial: dto.razonSocial || order.customer?.name || 'CONSUMIDOR FINAL',
      email: dto.email || order.customer?.email || undefined,
      direccion: dto.direccion || (order.customer?.address as string) || undefined,
      telefono: dto.telefono || order.customer?.phone || undefined,
    };
    const ivaInfo = IVA_RATES['15'] || IVA_RATES['12'] || { codigo: '4', tarifa: 15 };
    const details: InvoiceDetail[] = order.items.map((item: any) => {
      const qty = parseFloat(item.quantity.toString());
      const price = parseFloat(item.unitPrice.toString());
      const subtotal = parseFloat(item.subtotal.toString());
      return {
        codigoPrincipal: item.product?.sku || item.productId.substring(0, 25),
        descripcion: item.product?.name || 'Producto', cantidad: qty, precioUnitario: price, descuento: 0,
        precioTotalSinImpuesto: subtotal, codigoImpuesto: '2', codigoPorcentaje: ivaInfo.codigo,
        tarifa: ivaInfo.tarifa, baseImponible: subtotal, valor: subtotal * (ivaInfo.tarifa / 100),
      };
    });
    const totalSinImpuestos = parseFloat(order.subtotal.toString());
    const totalIva = parseFloat(order.taxAmount.toString());
    const importeTotal = parseFloat(order.total.toString());
    const formaPago = order.payments.map((p: any) => ({ codigo: PAYMENT_METHOD_MAP[p.method] || '01', total: parseFloat(p.amount.toString()) }));
    if (formaPago.length === 0) formaPago.push({ codigo: '01', total: importeTotal });
    const now = new Date();
    const fechaEmision = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();
    const claveAcceso = generateClaveAcceso(fechaEmision, '01', config.ruc, config.ambiente, config.establecimiento, config.puntoEmision, secuencial, codigoNumerico, config.tipoEmision);
    const sriConfig = this.buildSriConfig(config);
    const invoiceData: InvoiceData = { config: sriConfig, secuencial, fechaEmision, buyer, details, totalSinImpuestos, totalDescuento: parseFloat(order.discountAmount.toString()), propina: 0, importeTotal, moneda: 'DOLAR', formaPago };
    const xmlGenerado = generateFacturaXml(invoiceData, claveAcceso);

    let xmlFirmado: string | null = null;
    let estado = 'generado';
    if (config.certP12Path && config.certP12Password) {
      try { xmlFirmado = signXml(xmlGenerado, config.certP12Path, decryptPassword(config.certP12Password)); estado = 'firmado'; }
      catch (e: any) { console.warn(`Auto-firma falló: ${e.message}`); }
    }
    const invoice = await this.prisma.electronicInvoice.create({
      data: { tenantId, orderId: order.id, tipoComprobante: '01', claveAcceso, secuencial, fechaEmision: now, rucEmisor: config.ruc, razonSocialComprador: buyer.razonSocial, identificacionComprador: buyer.identificacion, tipoIdentificacion: buyer.tipoIdentificacion, subtotalSinIva: 0, subtotalIva: totalSinImpuestos, iva: totalIva, total: importeTotal, xmlGenerado, xmlFirmado, estado },
    });
    return { id: invoice.id, claveAcceso, secuencial, estado, message: estado === 'firmado' ? 'XML generado y firmado. Listo para enviar al SRI.' : 'XML generado. Configure certificado .p12 para firmar.' };
  }

  // ═══════════════════════════════════════════
  // NOTA DE CRÉDITO (P5)
  // ═══════════════════════════════════════════

  async emitirNotaCredito(tenantId: string, dto: EmitirNotaCreditoDto) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada');

    // Get the original invoice
    const factura = await this.prisma.electronicInvoice.findFirst({
      where: { id: dto.facturaId, tenantId },
      include: { order: { include: { items: { include: { product: true }, where: { isVoid: false } }, payments: true } } },
    });
    if (!factura) throw new NotFoundException('Factura original no encontrada');
    if (factura.estado !== 'autorizado') throw new BadRequestException('Solo se pueden emitir notas de crédito sobre facturas autorizadas');

    // Check no existing NC for this invoice (unless rejected)
    const existingNC = await this.prisma.electronicInvoice.findFirst({
      where: { facturaOrigenId: factura.id, tipoComprobante: '04', estado: { notIn: ['anulado', 'rechazado'] } },
    });
    if (existingNC) throw new BadRequestException(`Ya existe una nota de crédito para esta factura: ${existingNC.secuencial}`);

    // Increment NC sequential
    const updated = await this.prisma.sriConfig.update({ where: { tenantId }, data: { secuencialNotaCredito: { increment: 1 } } });
    const secuencial = updated.secuencialNotaCredito.toString().padStart(9, '0');

    // Build details — full or partial
    const ivaInfo = IVA_RATES['15'] || IVA_RATES['12'] || { codigo: '4', tarifa: 15 };
    let orderItems = factura.order?.items || [];
    if (dto.itemIds && dto.itemIds.length > 0) {
      orderItems = orderItems.filter((item: any) => dto.itemIds!.includes(item.id));
    }
    if (orderItems.length === 0) throw new BadRequestException('No hay items para la nota de crédito');

    const details: InvoiceDetail[] = orderItems.map((item: any) => {
      const qty = parseFloat(item.quantity.toString());
      const price = parseFloat(item.unitPrice.toString());
      const subtotal = parseFloat(item.subtotal.toString());
      return {
        codigoPrincipal: item.product?.sku || item.productId.substring(0, 25),
        descripcion: item.product?.name || 'Producto', cantidad: qty, precioUnitario: price, descuento: 0,
        precioTotalSinImpuesto: subtotal, codigoImpuesto: '2', codigoPorcentaje: ivaInfo.codigo,
        tarifa: ivaInfo.tarifa, baseImponible: subtotal, valor: subtotal * (ivaInfo.tarifa / 100),
      };
    });

    const totalSinImpuestos = details.reduce((s, d) => s + d.precioTotalSinImpuesto, 0);
    const totalIva = details.reduce((s, d) => s + d.valor, 0);
    const importeTotal = totalSinImpuestos + totalIva;

    const buyer: BuyerInfo = {
      tipoIdentificacion: factura.tipoIdentificacion || '07',
      identificacion: factura.identificacionComprador || '9999999999999',
      razonSocial: factura.razonSocialComprador || 'CONSUMIDOR FINAL',
    };

    const now = new Date();
    const fechaEmision = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();
    const claveAcceso = generateClaveAcceso(fechaEmision, '04', config.ruc, config.ambiente, config.establecimiento, config.puntoEmision, secuencial, codigoNumerico, config.tipoEmision);

    // Build numDocModificado from original invoice
    const numDocModificado = `${config.establecimiento}-${config.puntoEmision}-${factura.secuencial.padStart(9, '0')}`;
    const fechaEmisionOriginal = factura.fechaEmision ? new Date(factura.fechaEmision) : now;
    const fechaEmisionDocSustento = `${fechaEmisionOriginal.getDate().toString().padStart(2, '0')}/${(fechaEmisionOriginal.getMonth() + 1).toString().padStart(2, '0')}/${fechaEmisionOriginal.getFullYear()}`;

    const ncData: NotaCreditoData = {
      config: this.buildSriConfig(config), secuencial, fechaEmision, buyer,
      codDocModificado: '01', numDocModificado, fechaEmisionDocSustento,
      motivo: dto.motivo, details, totalSinImpuestos, importeTotal, moneda: 'DOLAR',
    };

    const xmlGenerado = generateNotaCreditoXml(ncData, claveAcceso);

    // Auto-sign
    let xmlFirmado: string | null = null;
    let estado = 'generado';
    if (config.certP12Path && config.certP12Password) {
      try { xmlFirmado = signXml(xmlGenerado, config.certP12Path, decryptPassword(config.certP12Password)); estado = 'firmado'; }
      catch (e: any) { console.warn(`Auto-firma NC falló: ${e.message}`); }
    }

    const nc = await this.prisma.electronicInvoice.create({
      data: {
        tenantId, orderId: factura.orderId, tipoComprobante: '04', claveAcceso, secuencial,
        fechaEmision: now, rucEmisor: config.ruc, razonSocialComprador: buyer.razonSocial,
        identificacionComprador: buyer.identificacion, tipoIdentificacion: buyer.tipoIdentificacion,
        subtotalSinIva: 0, subtotalIva: totalSinImpuestos, iva: totalIva, total: importeTotal,
        xmlGenerado, xmlFirmado, estado, facturaOrigenId: factura.id,
      },
    });

    return {
      id: nc.id, claveAcceso, secuencial, estado, tipoComprobante: '04',
      message: estado === 'firmado' ? 'Nota de Crédito generada y firmada. Lista para enviar al SRI.' : 'Nota de Crédito generada.',
    };
  }

  // ═══════════════════════════════════════════
  // ANULACIÓN (P6)
  // ═══════════════════════════════════════════

  async anularComprobante(tenantId: string, invoiceId: string, dto: AnularComprobanteDto) {
    const invoice = await this.prisma.electronicInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');

    // If not yet sent to SRI (generado/firmado), just mark as voided
    if (['generado', 'firmado'].includes(invoice.estado)) {
      await this.prisma.electronicInvoice.update({
        where: { id: invoiceId },
        data: { estado: 'anulado', motivoAnulacion: dto.motivo },
      });
      return { id: invoiceId, estado: 'anulado', message: 'Comprobante anulado (no fue enviado al SRI).' };
    }

    // If authorized, need to emit a credit note
    if (invoice.estado === 'autorizado' && invoice.tipoComprobante === '01') {
      const nc = await this.emitirNotaCredito(tenantId, {
        facturaId: invoiceId,
        motivo: dto.motivo || 'Anulación de factura',
      });

      await this.prisma.electronicInvoice.update({
        where: { id: invoiceId },
        data: { motivoAnulacion: dto.motivo },
      });

      return {
        id: invoiceId, estado: invoice.estado,
        notaCreditoId: nc.id, notaCreditoEstado: nc.estado,
        message: `Factura autorizada — se generó Nota de Crédito ${nc.secuencial} para anular.`,
      };
    }

    // Enviado but not authorized — mark as voided
    if (invoice.estado === 'enviado') {
      await this.prisma.electronicInvoice.update({
        where: { id: invoiceId },
        data: { estado: 'anulado', motivoAnulacion: dto.motivo },
      });
      return { id: invoiceId, estado: 'anulado', message: 'Comprobante anulado.' };
    }

    throw new BadRequestException(`No se puede anular un comprobante en estado "${invoice.estado}"`);
  }

  // ═══════════════════════════════════════════
  // SIGN (P2)
  // ═══════════════════════════════════════════

  async firmarFactura(tenantId: string, invoiceId: string) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada');
    if (!config.certP12Path || !config.certP12Password) throw new BadRequestException('Certificado .p12 no configurado.');
    const invoice = await this.prisma.electronicInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');
    if (!invoice.xmlGenerado) throw new BadRequestException('No hay XML generado para firmar');
    if (invoice.estado === 'autorizado') throw new BadRequestException('El comprobante ya está autorizado');
    try {
      const xmlFirmado = signXml(invoice.xmlGenerado, config.certP12Path, decryptPassword(config.certP12Password));
      await this.prisma.electronicInvoice.update({ where: { id: invoiceId }, data: { xmlFirmado, estado: 'firmado' } });
      return { id: invoiceId, estado: 'firmado', message: 'XML firmado con XAdES-BES.' };
    } catch (e: any) { throw new BadRequestException(`Error al firmar: ${e.message}`); }
  }

  // ═══════════════════════════════════════════
  // SEND TO SRI
  // ═══════════════════════════════════════════

  async enviarAlSri(tenantId: string, invoiceId: string) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada');
    const invoice = await this.prisma.electronicInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');
    const xmlToSend = invoice.xmlFirmado || invoice.xmlGenerado;
    if (!xmlToSend) throw new BadRequestException('No hay XML para enviar');
    try {
      const recepcion = await enviarComprobante(xmlToSend, config.ambiente);
      if (recepcion.estado === 'RECIBIDA') {
        await this.prisma.electronicInvoice.update({ where: { id: invoiceId }, data: { estado: 'enviado' } });
        await new Promise(r => setTimeout(r, 3000));
        return this.consultarEstado(tenantId, invoiceId);
      } else {
        const errores = recepcion.comprobantes?.comprobante?.[0]?.mensajes?.mensaje || [];
        await this.prisma.electronicInvoice.update({ where: { id: invoiceId }, data: { estado: 'rechazado', errores: JSON.parse(JSON.stringify(errores)) } });
        return { estado: 'rechazado', errores };
      }
    } catch (e: any) { return { estado: 'error', message: `Error de conexión con SRI: ${e.message}` }; }
  }

  async consultarEstado(tenantId: string, invoiceId: string) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada');
    const invoice = await this.prisma.electronicInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');
    try {
      const result = await consultarAutorizacion(invoice.claveAcceso, config.ambiente);
      const auth = result.autorizaciones?.autorizacion?.[0];
      if (auth?.estado === 'AUTORIZADO') {
        await this.prisma.electronicInvoice.update({ where: { id: invoiceId }, data: { estado: 'autorizado', numeroAutorizacion: auth.numeroAutorizacion, fechaAutorizacion: new Date(auth.fechaAutorizacion), xmlAutorizado: auth.comprobante } });
        return { estado: 'autorizado', numeroAutorizacion: auth.numeroAutorizacion, fechaAutorizacion: auth.fechaAutorizacion };
      } else {
        const errores = auth?.mensajes?.mensaje || [];
        await this.prisma.electronicInvoice.update({ where: { id: invoiceId }, data: { estado: 'rechazado', errores: JSON.parse(JSON.stringify(errores)) } });
        return { estado: 'rechazado', errores };
      }
    } catch (e: any) { return { estado: 'error', message: `Error al consultar: ${e.message}` }; }
  }

  // ═══════════════════════════════════════════
  // EMAIL (P4)
  // ═══════════════════════════════════════════

  async enviarEmail(tenantId: string, invoiceId: string, emailTo: string) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada');
    if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
      throw new BadRequestException('SMTP no configurado. Configure los datos SMTP en la pestaña Configuración.');
    }

    const invoice = await this.prisma.electronicInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { order: { include: { items: { include: { product: true }, where: { isVoid: false } }, payments: true } } },
    });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');

    // Build SMTP config
    const smtp: SmtpConfig = {
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpSecure,
      user: config.smtpUser,
      password: decryptPassword(config.smtpPassword),
      fromName: config.smtpFromName || config.razonSocial,
      fromEmail: config.smtpUser,
    };

    // Get XML (prefer authorized, then signed, then generated)
    const xml = invoice.xmlAutorizado || invoice.xmlFirmado || invoice.xmlGenerado;

    // Try to get RIDE buffer
    let rideBuffer: Buffer | undefined;
    const ridePath = path.join(RIDES_DIR, tenantId, `RIDE-${invoice.claveAcceso}.pdf`);
    if (fs.existsSync(ridePath)) {
      rideBuffer = fs.readFileSync(ridePath);
    } else {
      // Generate on the fly
      try {
        const rideData = this.buildRideData(config, invoice);
        rideBuffer = await generateRidePdfBuffer(rideData);
      } catch { /* no RIDE available */ }
    }

    const tipoDoc = getTipoDocLabel(invoice.tipoComprobante);
    const numero = `${config.establecimiento}-${config.puntoEmision}-${invoice.secuencial.padStart(9, '0')}`;

    const result = await sendInvoiceEmail(smtp, {
      to: emailTo,
      buyerName: invoice.razonSocialComprador || 'Cliente',
      emisorName: config.razonSocial,
      tipoComprobante: tipoDoc,
      numero,
      claveAcceso: invoice.claveAcceso,
      total: parseFloat(invoice.total.toString()).toFixed(2),
      fechaEmision: invoice.fechaEmision ? new Date(invoice.fechaEmision).toLocaleDateString('es-EC') : '',
      xmlContent: xml || undefined,
      xmlFileName: xml ? `${invoice.claveAcceso}.xml` : undefined,
      rideBuffer,
      rideFileName: rideBuffer ? `RIDE-${invoice.secuencial}.pdf` : undefined,
    });

    if (result.success) {
      await this.prisma.electronicInvoice.update({ where: { id: invoiceId }, data: { emailEnviado: true } });
      return { success: true, message: `Email enviado a ${emailTo}`, messageId: result.messageId };
    } else {
      return { success: false, message: `Error al enviar email: ${result.error}` };
    }
  }

  // ═══════════════════════════════════════════
  // RIDE PDF (P3)
  // ═══════════════════════════════════════════

  async generateRide(tenantId: string, invoiceId: string) {
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada');
    const invoice = await this.prisma.electronicInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { order: { include: { items: { include: { product: true }, where: { isVoid: false } }, payments: true } } },
    });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');
    const rideData = this.buildRideData(config, invoice);
    const tenantRidesDir = path.join(RIDES_DIR, tenantId);
    await generateRidePdf(rideData, tenantRidesDir);
    const rideUrl = `/storage/rides/${tenantId}/RIDE-${invoice.claveAcceso}.pdf`;
    await this.prisma.electronicInvoice.update({ where: { id: invoiceId }, data: { rideUrl } });
    return { id: invoiceId, rideUrl, message: 'RIDE (PDF) generado exitosamente' };
  }

  async downloadRide(tenantId: string, invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.prisma.electronicInvoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { order: { include: { items: { include: { product: true }, where: { isVoid: false } }, payments: true } } },
    });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');
    const existingPath = path.join(RIDES_DIR, tenantId, `RIDE-${invoice.claveAcceso}.pdf`);
    if (fs.existsSync(existingPath)) return { buffer: fs.readFileSync(existingPath), filename: `RIDE-${invoice.secuencial}.pdf` };
    const config = await this.prisma.sriConfig.findUnique({ where: { tenantId } });
    if (!config) throw new BadRequestException('Configuración SRI no encontrada');
    const rideData = this.buildRideData(config, invoice);
    const buffer = await generateRidePdfBuffer(rideData);
    return { buffer, filename: `RIDE-${invoice.secuencial}.pdf` };
  }

  // ═══════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════

  private buildSriConfig(config: any): SriConfigData {
    return {
      ruc: config.ruc, razonSocial: config.razonSocial, nombreComercial: config.nombreComercial || undefined,
      direccionMatriz: config.direccionMatriz, obligadoContabilidad: config.obligadoContabilidad,
      contribuyenteEspecial: config.contribuyenteEspecial || undefined, regimenRimpe: config.regimenRimpe,
      ambiente: config.ambiente, tipoEmision: config.tipoEmision, establecimiento: config.establecimiento, puntoEmision: config.puntoEmision,
    };
  }

  private buildRideData(config: any, invoice: any): RideData {
    return {
      ruc: config.ruc, razonSocial: config.razonSocial, nombreComercial: config.nombreComercial || undefined,
      direccionMatriz: config.direccionMatriz, obligadoContabilidad: config.obligadoContabilidad,
      contribuyenteEspecial: config.contribuyenteEspecial || undefined, regimenRimpe: config.regimenRimpe,
      logoUrl: config.logoUrl || undefined, ambiente: config.ambiente, tipoEmision: config.tipoEmision,
      tipoComprobante: invoice.tipoComprobante, establecimiento: config.establecimiento,
      puntoEmision: config.puntoEmision, secuencial: invoice.secuencial, claveAcceso: invoice.claveAcceso,
      fechaEmision: invoice.fechaEmision ? new Date(invoice.fechaEmision).toLocaleDateString('es-EC') : '',
      numeroAutorizacion: invoice.numeroAutorizacion || undefined,
      fechaAutorizacion: invoice.fechaAutorizacion ? invoice.fechaAutorizacion.toISOString() : undefined,
      tipoIdentificacionComprador: invoice.tipoIdentificacion || '07',
      identificacionComprador: invoice.identificacionComprador || '9999999999999',
      razonSocialComprador: invoice.razonSocialComprador || 'CONSUMIDOR FINAL',
      detalles: (invoice.order?.items || []).map((item: any) => ({
        codigoPrincipal: item.product?.sku || item.productId.substring(0, 25),
        descripcion: item.product?.name || 'Producto',
        cantidad: parseFloat(item.quantity.toString()), precioUnitario: parseFloat(item.unitPrice.toString()),
        descuento: 0, precioTotalSinImpuesto: parseFloat(item.subtotal.toString()),
      })),
      subtotalSinIva: parseFloat(invoice.subtotalSinIva.toString()), subtotalIva: parseFloat(invoice.subtotalIva.toString()),
      totalDescuento: 0, iva: parseFloat(invoice.iva.toString()), ivaRate: 15, propina: 0,
      importeTotal: parseFloat(invoice.total.toString()),
      pagos: (invoice.order?.payments || []).map((p: any) => ({ formaPago: PAYMENT_METHOD_MAP[p.method] || '01', total: parseFloat(p.amount.toString()) })),
      infoAdicional: [],
    };
  }

  // ═══════════════════════════════════════════
  // LIST / DETAIL
  // ═══════════════════════════════════════════

  async getInvoices(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      this.prisma.electronicInvoice.findMany({
        where: { tenantId }, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { order: { select: { orderNumber: true, total: true } } },
      }),
      this.prisma.electronicInvoice.count({ where: { tenantId } }),
    ]);
    return { data: invoices, total, page, limit };
  }

  async getInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.electronicInvoice.findFirst({
      where: { id, tenantId },
      include: { order: { include: { items: { include: { product: true } }, payments: true } }, notasCredito: true },
    });
    if (!invoice) throw new NotFoundException('Comprobante no encontrado');
    return invoice;
  }
}
