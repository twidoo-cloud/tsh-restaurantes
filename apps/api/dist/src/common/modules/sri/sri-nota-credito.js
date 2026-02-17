"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNotaCreditoXml = generateNotaCreditoXml;
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function generateNotaCreditoXml(data, claveAcceso) {
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
          <codigoInterno>${escapeXml(d.codigoPrincipal)}</codigoInterno>
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
    const infoAdicionalParts = [];
    if (buyer.email)
        infoAdicionalParts.push(`        <campoAdicional nombre="email">${escapeXml(buyer.email)}</campoAdicional>`);
    if (buyer.telefono)
        infoAdicionalParts.push(`        <campoAdicional nombre="telefono">${escapeXml(buyer.telefono)}</campoAdicional>`);
    infoAdicionalParts.push(`        <campoAdicional nombre="motivo">${escapeXml(data.motivo)}</campoAdicional>`);
    const infoAdicional = `
      <infoAdicional>
${infoAdicionalParts.join('\n')}
      </infoAdicional>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${config.ambiente}</ambiente>
    <tipoEmision>${config.tipoEmision}</tipoEmision>
    <razonSocial>${escapeXml(config.razonSocial)}</razonSocial>${config.nombreComercial ? `
    <nombreComercial>${escapeXml(config.nombreComercial)}</nombreComercial>` : ''}
    <ruc>${config.ruc}</ruc>
    <claveAcceso>${claveAcceso}</claveAcceso>
    <codDoc>04</codDoc>
    <estab>${config.establecimiento}</estab>
    <ptoEmi>${config.puntoEmision}</ptoEmi>
    <secuencial>${data.secuencial.padStart(9, '0')}</secuencial>
    <dirMatriz>${escapeXml(config.direccionMatriz)}</dirMatriz>
  </infoTributaria>
  <infoNotaCredito>
    <fechaEmision>${data.fechaEmision}</fechaEmision>
    <dirEstablecimiento>${escapeXml(config.direccionMatriz)}</dirEstablecimiento>${config.contribuyenteEspecial ? `
    <contribuyenteEspecial>${config.contribuyenteEspecial}</contribuyenteEspecial>` : ''}
    <obligadoContabilidad>${config.obligadoContabilidad ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionComprador>${buyer.tipoIdentificacion}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXml(buyer.razonSocial)}</razonSocialComprador>
    <identificacionComprador>${buyer.identificacion}</identificacionComprador>
    <codDocModificado>${data.codDocModificado}</codDocModificado>
    <numDocModificado>${data.numDocModificado}</numDocModificado>
    <fechaEmisionDocSustento>${data.fechaEmisionDocSustento}</fechaEmisionDocSustento>
    <totalSinImpuestos>${data.totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <valorModificacion>${data.importeTotal.toFixed(2)}</valorModificacion>
    <moneda>${data.moneda}</moneda>
    <totalConImpuestos>${totalConImpuestos}
    </totalConImpuestos>
    <motivo>${escapeXml(data.motivo)}</motivo>
  </infoNotaCredito>
  <detalles>${detallesXml}
  </detalles>${infoAdicional}
</notaCredito>`;
}
//# sourceMappingURL=sri-nota-credito.js.map