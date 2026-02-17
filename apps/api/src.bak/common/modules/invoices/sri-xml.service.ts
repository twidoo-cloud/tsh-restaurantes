import { Injectable } from '@nestjs/common';

/**
 * SRI Ecuador XML generation for electronic invoices.
 * Generates XML per SRI technical specification v2.1.0
 * 
 * Document types:
 * - 01: Factura
 * - 04: Nota de Crédito
 * - 05: Nota de Débito
 * - 06: Guía de Remisión
 * - 07: Comprobante de Retención
 */

export interface SriInvoiceData {
  // Emisor (tenant)
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccionMatriz: string;
  direccionEstablecimiento: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: 'SI' | 'NO';
  agenteRetencion?: string;
  regimenMicroempresas?: boolean;

  // Comprobante
  codDoc: '01' | '04' | '05';
  estab: string;      // 001
  ptoEmi: string;     // 001
  secuencial: string;  // 000000001
  fechaEmision: string; // DD/MM/YYYY
  ambiente: '1' | '2'; // 1=Pruebas, 2=Producción

  // Comprador
  tipoIdentificacionComprador: '04' | '05' | '06' | '07' | '08';
  razonSocialComprador: string;
  identificacionComprador: string;
  direccionComprador?: string;
  emailComprador?: string;

  // Detalles
  detalles: SriDetalleItem[];

  // Totales
  totalSinImpuestos: number;
  totalDescuento: number;
  propina: number;
  importeTotal: number;

  // Pagos
  pagos: { formaPago: string; total: number; plazo?: number; unidadTiempo?: string }[];
}

export interface SriDetalleItem {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
  // IVA
  codigoPorcentaje: '0' | '2' | '3' | '4' | '5'; // 0=0%, 2=12%, 3=14%, 4=No objeto, 5=15%
  baseImponible: number;
  tarifa: number;
  valor: number; // tax amount
}

@Injectable()
export class SriXmlService {

  /**
   * Generate access key (clave de acceso) - 49 digits
   * Format: fecha(8) + codDoc(2) + ruc(13) + ambiente(1) + serie(6) + secuencial(9) + codigoNumerico(8) + tipoEmision(1) + digitoVerificador(1)
   */
  generateClaveAcceso(data: SriInvoiceData): string {
    const fecha = data.fechaEmision.split('/').join(''); // DDMMYYYY
    const codDoc = data.codDoc;
    const ruc = data.ruc;
    const ambiente = data.ambiente;
    const serie = data.estab + data.ptoEmi;
    const secuencial = data.secuencial;
    const codigoNumerico = this.generateRandomCode(8);
    const tipoEmision = '1'; // Normal

    const base = fecha + codDoc + ruc + ambiente + serie + secuencial + codigoNumerico + tipoEmision;
    const digitoVerificador = this.modulo11(base);

    return base + digitoVerificador;
  }

  /**
   * Generate full SRI XML for factura (01)
   */
  generateFacturaXml(data: SriInvoiceData): string {
    const claveAcceso = this.generateClaveAcceso(data);

    const impuestos = this.calculateImpuestos(data.detalles);

    return `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">
  <infoTributaria>
    <ambiente>${data.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${this.escapeXml(data.razonSocial)}</razonSocial>
    <nombreComercial>${this.escapeXml(data.nombreComercial)}</nombreComercial>
    <ruc>${data.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>${data.codDoc}</codDoc>
    <estab>${data.estab}</estab>
    <ptoEmi>${data.ptoEmi}</ptoEmi>
    <secuencial>${data.secuencial}</secuencial>
    <dirMatriz>${this.escapeXml(data.direccionMatriz)}</dirMatriz>
${data.agenteRetencion ? `    <agenteRetencion>${data.agenteRetencion}</agenteRetencion>` : ''}
${data.regimenMicroempresas ? `    <regimenMicroempresas>CONTRIBUYENTE RÉGIMEN MICROEMPRESAS</regimenMicroempresas>` : ''}
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${data.fechaEmision}</fechaEmision>
    <dirEstablecimiento>${this.escapeXml(data.direccionEstablecimiento)}</dirEstablecimiento>
${data.contribuyenteEspecial ? `    <contribuyenteEspecial>${data.contribuyenteEspecial}</contribuyenteEspecial>` : ''}
    <obligadoContabilidad>${data.obligadoContabilidad}</obligadoContabilidad>
    <tipoIdentificacionComprador>${data.tipoIdentificacionComprador}</tipoIdentificacionComprador>
    <razonSocialComprador>${this.escapeXml(data.razonSocialComprador)}</razonSocialComprador>
    <identificacionComprador>${data.identificacionComprador}</identificacionComprador>
${data.direccionComprador ? `    <direccionComprador>${this.escapeXml(data.direccionComprador)}</direccionComprador>` : ''}
    <totalSinImpuestos>${data.totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>${data.totalDescuento.toFixed(2)}</totalDescuento>
    <totalConImpuestos>
${impuestos.map(imp => `      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${imp.codigoPorcentaje}</codigoPorcentaje>
        <baseImponible>${imp.baseImponible.toFixed(2)}</baseImponible>
        <tarifa>${imp.tarifa.toFixed(2)}</tarifa>
        <valor>${imp.valor.toFixed(2)}</valor>
      </totalImpuesto>`).join('\n')}
    </totalConImpuestos>
    <propina>${data.propina.toFixed(2)}</propina>
    <importeTotal>${data.importeTotal.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
${data.pagos.map(p => `      <pago>
        <formaPago>${p.formaPago}</formaPago>
        <total>${p.total.toFixed(2)}</total>
${p.plazo ? `        <plazo>${p.plazo}</plazo>
        <unidadTiempo>${p.unidadTiempo || 'dias'}</unidadTiempo>` : ''}
      </pago>`).join('\n')}
    </pagos>
  </infoFactura>
  <detalles>
${data.detalles.map(d => `    <detalle>
      <codigoPrincipal>${this.escapeXml(d.codigoPrincipal)}</codigoPrincipal>
      <descripcion>${this.escapeXml(d.descripcion)}</descripcion>
      <cantidad>${d.cantidad.toFixed(6)}</cantidad>
      <precioUnitario>${d.precioUnitario.toFixed(6)}</precioUnitario>
      <descuento>${d.descuento.toFixed(2)}</descuento>
      <precioTotalSinImpuesto>${d.precioTotalSinImpuesto.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${d.codigoPorcentaje}</codigoPorcentaje>
          <tarifa>${d.tarifa.toFixed(2)}</tarifa>
          <baseImponible>${d.baseImponible.toFixed(2)}</baseImponible>
          <valor>${d.valor.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`).join('\n')}
  </detalles>
${data.emailComprador ? `  <infoAdicional>
    <campoAdicional nombre="email">${this.escapeXml(data.emailComprador)}</campoAdicional>
  </infoAdicional>` : ''}
</factura>`;
  }

  /**
   * Generate nota de crédito XML
   */
  generateNotaCreditoXml(data: SriInvoiceData & {
    codDocModificado: string;
    numDocModificado: string;
    fechaEmisionDocSustento: string;
    motivo: string;
  }): string {
    const claveAcceso = this.generateClaveAcceso({ ...data, codDoc: '04' });
    const impuestos = this.calculateImpuestos(data.detalles);

    return `<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${data.ambiente}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${this.escapeXml(data.razonSocial)}</razonSocial>
    <nombreComercial>${this.escapeXml(data.nombreComercial)}</nombreComercial>
    <ruc>${data.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>04</codDoc>
    <estab>${data.estab}</estab>
    <ptoEmi>${data.ptoEmi}</ptoEmi>
    <secuencial>${data.secuencial}</secuencial>
    <dirMatriz>${this.escapeXml(data.direccionMatriz)}</dirMatriz>
  </infoTributaria>
  <infoNotaCredito>
    <fechaEmision>${data.fechaEmision}</fechaEmision>
    <dirEstablecimiento>${this.escapeXml(data.direccionEstablecimiento)}</dirEstablecimiento>
    <tipoIdentificacionComprador>${data.tipoIdentificacionComprador}</tipoIdentificacionComprador>
    <razonSocialComprador>${this.escapeXml(data.razonSocialComprador)}</razonSocialComprador>
    <identificacionComprador>${data.identificacionComprador}</identificacionComprador>
    <obligadoContabilidad>${data.obligadoContabilidad}</obligadoContabilidad>
    <codDocModificado>${data.codDocModificado}</codDocModificado>
    <numDocModificado>${data.numDocModificado}</numDocModificado>
    <fechaEmisionDocSustento>${data.fechaEmisionDocSustento}</fechaEmisionDocSustento>
    <totalSinImpuestos>${data.totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <valorModificacion>${data.importeTotal.toFixed(2)}</valorModificacion>
    <moneda>DOLAR</moneda>
    <totalConImpuestos>
${impuestos.map(imp => `      <totalImpuesto>
        <codigo>2</codigo>
        <codigoPorcentaje>${imp.codigoPorcentaje}</codigoPorcentaje>
        <baseImponible>${imp.baseImponible.toFixed(2)}</baseImponible>
        <tarifa>${imp.tarifa.toFixed(2)}</tarifa>
        <valor>${imp.valor.toFixed(2)}</valor>
      </totalImpuesto>`).join('\n')}
    </totalConImpuestos>
    <motivo>${this.escapeXml(data.motivo)}</motivo>
  </infoNotaCredito>
  <detalles>
${data.detalles.map(d => `    <detalle>
      <codigoPrincipal>${this.escapeXml(d.codigoPrincipal)}</codigoPrincipal>
      <descripcion>${this.escapeXml(d.descripcion)}</descripcion>
      <cantidad>${d.cantidad.toFixed(6)}</cantidad>
      <precioUnitario>${d.precioUnitario.toFixed(6)}</precioUnitario>
      <descuento>${d.descuento.toFixed(2)}</descuento>
      <precioTotalSinImpuesto>${d.precioTotalSinImpuesto.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>2</codigo>
          <codigoPorcentaje>${d.codigoPorcentaje}</codigoPorcentaje>
          <tarifa>${d.tarifa.toFixed(2)}</tarifa>
          <baseImponible>${d.baseImponible.toFixed(2)}</baseImponible>
          <valor>${d.valor.toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`).join('\n')}
  </detalles>
</notaCredito>`;
  }

  // ══ Helpers ══

  private calculateImpuestos(detalles: SriDetalleItem[]): { codigoPorcentaje: string; baseImponible: number; tarifa: number; valor: number }[] {
    const grouped = new Map<string, { baseImponible: number; tarifa: number; valor: number }>();
    for (const d of detalles) {
      const key = d.codigoPorcentaje;
      if (!grouped.has(key)) grouped.set(key, { baseImponible: 0, tarifa: d.tarifa, valor: 0 });
      const g = grouped.get(key)!;
      g.baseImponible += d.baseImponible;
      g.valor += d.valor;
    }
    return Array.from(grouped.entries()).map(([k, v]) => ({ codigoPorcentaje: k, ...v }));
  }

  private modulo11(data: string): string {
    const weights = [2, 3, 4, 5, 6, 7];
    let sum = 0;
    const digits = data.split('').reverse();
    for (let i = 0; i < digits.length; i++) {
      sum += parseInt(digits[i]) * weights[i % weights.length];
    }
    const mod = 11 - (sum % 11);
    if (mod === 11) return '0';
    if (mod === 10) return '1';
    return mod.toString();
  }

  private generateRandomCode(length: number): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * SRI Payment codes
   */
  static getFormaPago(method: string): string {
    const map: Record<string, string> = {
      'cash': '01',              // Sin utilización del sistema financiero
      'credit_card': '19',       // Tarjeta de crédito
      'debit_card': '16',        // Tarjeta de débito
      'transfer': '20',          // Otros con utilización del sistema financiero
      'wallet': '20',
    };
    return map[method] || '01';
  }

  /**
   * SRI Buyer identification type codes
   */
  static getTipoIdentificacion(taxId: string): '04' | '05' | '06' | '07' | '08' {
    if (!taxId || taxId === '9999999999999') return '07'; // Consumidor final
    if (taxId.length === 13) return '04'; // RUC
    if (taxId.length === 10) return '05'; // Cédula
    return '06'; // Pasaporte
  }

  /**
   * IVA code for Ecuador (15% as of 2024)
   */
  static getCodigoPorcentajeIVA(taxRate: number): '0' | '2' | '3' | '4' | '5' {
    if (taxRate === 0) return '0';
    if (taxRate === 0.12) return '2';
    if (taxRate === 0.14) return '3';
    if (taxRate === 0.15) return '5'; // 15% IVA (current)
    return '4'; // No objeto de impuesto
  }
}
