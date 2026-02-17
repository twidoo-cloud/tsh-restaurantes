"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SriXmlService = void 0;
const common_1 = require("@nestjs/common");
let SriXmlService = class SriXmlService {
    generateClaveAcceso(data) {
        const fecha = data.fechaEmision.split('/').join('');
        const codDoc = data.codDoc;
        const ruc = data.ruc;
        const ambiente = data.ambiente;
        const serie = data.estab + data.ptoEmi;
        const secuencial = data.secuencial;
        const codigoNumerico = this.generateRandomCode(8);
        const tipoEmision = '1';
        const base = fecha + codDoc + ruc + ambiente + serie + secuencial + codigoNumerico + tipoEmision;
        const digitoVerificador = this.modulo11(base);
        return base + digitoVerificador;
    }
    generateFacturaXml(data) {
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
    generateNotaCreditoXml(data) {
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
    calculateImpuestos(detalles) {
        const grouped = new Map();
        for (const d of detalles) {
            const key = d.codigoPorcentaje;
            if (!grouped.has(key))
                grouped.set(key, { baseImponible: 0, tarifa: d.tarifa, valor: 0 });
            const g = grouped.get(key);
            g.baseImponible += d.baseImponible;
            g.valor += d.valor;
        }
        return Array.from(grouped.entries()).map(([k, v]) => ({ codigoPorcentaje: k, ...v }));
    }
    modulo11(data) {
        const weights = [2, 3, 4, 5, 6, 7];
        let sum = 0;
        const digits = data.split('').reverse();
        for (let i = 0; i < digits.length; i++) {
            sum += parseInt(digits[i]) * weights[i % weights.length];
        }
        const mod = 11 - (sum % 11);
        if (mod === 11)
            return '0';
        if (mod === 10)
            return '1';
        return mod.toString();
    }
    generateRandomCode(length) {
        let code = '';
        for (let i = 0; i < length; i++) {
            code += Math.floor(Math.random() * 10).toString();
        }
        return code;
    }
    escapeXml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    static getFormaPago(method) {
        const map = {
            'cash': '01',
            'credit_card': '19',
            'debit_card': '16',
            'transfer': '20',
            'wallet': '20',
        };
        return map[method] || '01';
    }
    static getTipoIdentificacion(taxId) {
        if (!taxId || taxId === '9999999999999')
            return '07';
        if (taxId.length === 13)
            return '04';
        if (taxId.length === 10)
            return '05';
        return '06';
    }
    static getCodigoPorcentajeIVA(taxRate) {
        if (taxRate === 0)
            return '0';
        if (taxRate === 0.12)
            return '2';
        if (taxRate === 0.14)
            return '3';
        if (taxRate === 0.15)
            return '5';
        return '4';
    }
};
exports.SriXmlService = SriXmlService;
exports.SriXmlService = SriXmlService = __decorate([
    (0, common_1.Injectable)()
], SriXmlService);
//# sourceMappingURL=sri-xml.service.js.map