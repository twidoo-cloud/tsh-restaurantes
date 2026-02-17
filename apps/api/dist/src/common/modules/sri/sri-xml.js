"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IVA_RATES = exports.PAYMENT_METHOD_MAP = void 0;
exports.generateClaveAcceso = generateClaveAcceso;
exports.modulo11 = modulo11;
exports.generateFacturaXml = generateFacturaXml;
function generateClaveAcceso(fechaEmision, tipoComprobante, ruc, ambiente, establecimiento, puntoEmision, secuencial, codigoNumerico, tipoEmision) {
    const parts = fechaEmision.split('/');
    const fecha = parts[0] + parts[1] + parts[2];
    const serie = establecimiento + puntoEmision;
    const base = fecha + tipoComprobante + ruc + ambiente + serie + secuencial.padStart(9, '0') + codigoNumerico + tipoEmision;
    if (base.length !== 48) {
        throw new Error(`Clave de acceso base debe tener 48 dígitos, tiene ${base.length}: ${base}`);
    }
    const checkDigit = modulo11(base);
    return base + checkDigit;
}
function modulo11(data) {
    const weights = [2, 3, 4, 5, 6, 7];
    let sum = 0;
    const digits = data.split('').reverse();
    for (let i = 0; i < digits.length; i++) {
        sum += parseInt(digits[i]) * weights[i % weights.length];
    }
    const remainder = sum % 11;
    let checkDigit = 11 - remainder;
    if (checkDigit === 11)
        checkDigit = 0;
    if (checkDigit === 10)
        checkDigit = 1;
    return checkDigit.toString();
}
function generateFacturaXml(data, claveAcceso) {
    const { config, buyer, details } = data;
    const taxGroups = {};
    for (const d of details) {
        const key = `${d.codigoImpuesto}-${d.codigoPorcentaje}`;
        if (!taxGroups[key]) {
            taxGroups[key] = { baseImponible: 0, valor: 0, codigo: d.codigoImpuesto, codigoPorcentaje: d.codigoPorcentaje, tarifa: d.tarifa };
        }
        taxGroups[key].baseImponible += d.baseImponible;
        taxGroups[key].valor += d.valor;
    }
    const totalConImpuestos = Object.values(taxGroups).map(t => `
          <totalImpuesto>
            <codigo>${t.codigo}</codigo>
            <codigoPorcentaje>${t.codigoPorcentaje}</codigoPorcentaje>
            <baseImponible>${t.baseImponible.toFixed(2)}</baseImponible>
            <tarifa>${t.tarifa.toFixed(2)}</tarifa>
            <valor>${t.valor.toFixed(2)}</valor>
          </totalImpuesto>`).join('');
    const detallesXml = details.map(d => `
        <detalle>
          <codigoPrincipal>${escapeXml(d.codigoPrincipal)}</codigoPrincipal>
          <descripcion>${escapeXml(d.descripcion)}</descripcion>
          <cantidad>${d.cantidad.toFixed(6)}</cantidad>
          <precioUnitario>${d.precioUnitario.toFixed(6)}</precioUnitario>
          <descuento>${d.descuento.toFixed(2)}</descuento>
          <precioTotalSinImpuesto>${d.precioTotalSinImpuesto.toFixed(2)}</precioTotalSinImpuesto>
          <impuestos>
            <impuesto>
              <codigo>${d.codigoImpuesto}</codigo>
              <codigoPorcentaje>${d.codigoPorcentaje}</codigoPorcentaje>
              <tarifa>${d.tarifa.toFixed(2)}</tarifa>
              <baseImponible>${d.baseImponible.toFixed(2)}</baseImponible>
              <valor>${d.valor.toFixed(2)}</valor>
            </impuesto>
          </impuestos>
        </detalle>`).join('');
    const pagosXml = data.formaPago.map(p => `
        <pago>
          <formaPago>${p.codigo}</formaPago>
          <total>${p.total.toFixed(2)}</total>
          <plazo>${p.plazo || 0}</plazo>
          <unidadTiempo>${p.unidadTiempo || 'dias'}</unidadTiempo>
        </pago>`).join('');
    const infoAdicionalParts = [];
    if (buyer.email)
        infoAdicionalParts.push(`        <campoAdicional nombre="email">${escapeXml(buyer.email)}</campoAdicional>`);
    if (buyer.telefono)
        infoAdicionalParts.push(`        <campoAdicional nombre="telefono">${escapeXml(buyer.telefono)}</campoAdicional>`);
    if (buyer.direccion)
        infoAdicionalParts.push(`        <campoAdicional nombre="direccion">${escapeXml(buyer.direccion)}</campoAdicional>`);
    const infoAdicional = infoAdicionalParts.length > 0 ? `
      <infoAdicional>
${infoAdicionalParts.join('\n')}
      </infoAdicional>` : '';
    return `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="2.1.0">
  <infoTributaria>
    <ambiente>${config.ambiente}</ambiente>
    <tipoEmision>${config.tipoEmision}</tipoEmision>
    <razonSocial>${escapeXml(config.razonSocial)}</razonSocial>${config.nombreComercial ? `
    <nombreComercial>${escapeXml(config.nombreComercial)}</nombreComercial>` : ''}
    <ruc>${config.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${config.establecimiento}</estab>
    <ptoEmi>${config.puntoEmision}</ptoEmi>
    <secuencial>${data.secuencial.padStart(9, '0')}</secuencial>
    <dirMatriz>${escapeXml(config.direccionMatriz)}</dirMatriz>
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${data.fechaEmision}</fechaEmision>
    <dirEstablecimiento>${escapeXml(config.direccionMatriz)}</dirEstablecimiento>${config.contribuyenteEspecial ? `
    <contribuyenteEspecial>${config.contribuyenteEspecial}</contribuyenteEspecial>` : ''}
    <obligadoContabilidad>${config.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionComprador>${buyer.tipoIdentificacion}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXml(buyer.razonSocial)}</razonSocialComprador>
    <identificacionComprador>${buyer.identificacion}</identificacionComprador>
    <totalSinImpuestos>${data.totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>${data.totalDescuento.toFixed(2)}</totalDescuento>
    <totalConImpuestos>${totalConImpuestos}
    </totalConImpuestos>
    <propina>${data.propina.toFixed(2)}</propina>
    <importeTotal>${data.importeTotal.toFixed(2)}</importeTotal>
    <moneda>${data.moneda}</moneda>
    <pagos>${pagosXml}
    </pagos>
  </infoFactura>
  <detalles>${detallesXml}
  </detalles>${infoAdicional}
</factura>`;
}
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
exports.PAYMENT_METHOD_MAP = {
    cash: '01',
    credit_card: '19',
    debit_card: '16',
    transfer: '20',
    wallet: '20',
};
exports.IVA_RATES = {
    '0': { codigo: '0', tarifa: 0 },
    '12': { codigo: '2', tarifa: 12 },
    '14': { codigo: '3', tarifa: 14 },
    '15': { codigo: '4', tarifa: 15 },
    '5': { codigo: '5', tarifa: 5 },
};
//# sourceMappingURL=sri-xml.js.map