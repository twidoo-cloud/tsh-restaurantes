"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarComprobante = enviarComprobante;
exports.consultarAutorizacion = consultarAutorizacion;
const SRI_ENDPOINTS = {
    '1': {
        recepcion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
        autorizacion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
    },
    '2': {
        recepcion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
        autorizacion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
    },
};
async function enviarComprobante(xml, ambiente) {
    const endpoint = SRI_ENDPOINTS[ambiente]?.recepcion;
    if (!endpoint)
        throw new Error(`Ambiente inválido: ${ambiente}`);
    const xmlBase64 = Buffer.from(xml, 'utf-8').toString('base64');
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:validarComprobante>
      <xml>${xmlBase64}</xml>
    </ec:validarComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;
    const response = await fetch(endpoint.replace('?wsdl', ''), {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': '',
        },
        body: soapEnvelope,
    });
    const responseText = await response.text();
    return parseRecepcionResponse(responseText);
}
async function consultarAutorizacion(claveAcceso, ambiente) {
    const endpoint = SRI_ENDPOINTS[ambiente]?.autorizacion;
    if (!endpoint)
        throw new Error(`Ambiente inválido: ${ambiente}`);
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;
    const response = await fetch(endpoint.replace('?wsdl', ''), {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': '',
        },
        body: soapEnvelope,
    });
    const responseText = await response.text();
    return parseAutorizacionResponse(responseText);
}
function parseRecepcionResponse(xml) {
    const estado = extractTag(xml, 'estado');
    const mensajes = [];
    const mensajeBlocks = xml.match(/<mensaje>([\s\S]*?)<\/mensaje>/g) || [];
    for (const block of mensajeBlocks) {
        mensajes.push({
            identificador: extractTag(block, 'identificador') || '',
            mensaje: extractTag(block, 'mensaje') || '',
            informacionAdicional: extractTag(block, 'informacionAdicional'),
            tipo: extractTag(block, 'tipo'),
        });
    }
    return {
        estado,
        comprobantes: mensajes.length > 0 ? {
            comprobante: [{
                    claveAcceso: extractTag(xml, 'claveAcceso') || '',
                    mensajes: { mensaje: mensajes },
                }],
        } : undefined,
    };
}
function parseAutorizacionResponse(xml) {
    const estado = extractTag(xml, 'estado');
    const numeroAutorizacion = extractTag(xml, 'numeroAutorizacion') || '';
    const fechaAutorizacion = extractTag(xml, 'fechaAutorizacion') || '';
    const ambiente = extractTag(xml, 'ambiente') || '';
    const comprobante = extractTag(xml, 'comprobante') || '';
    const mensajes = [];
    const mensajeBlocks = xml.match(/<mensaje>([\s\S]*?)<\/mensaje>/g) || [];
    for (const block of mensajeBlocks) {
        mensajes.push({
            identificador: extractTag(block, 'identificador') || '',
            mensaje: extractTag(block, 'mensaje') || '',
            informacionAdicional: extractTag(block, 'informacionAdicional'),
            tipo: extractTag(block, 'tipo'),
        });
    }
    return {
        numeroComprobantes: extractTag(xml, 'numeroComprobantes') || '0',
        autorizaciones: {
            autorizacion: [{
                    estado,
                    numeroAutorizacion,
                    fechaAutorizacion,
                    ambiente,
                    comprobante,
                    mensajes: mensajes.length > 0 ? { mensaje: mensajes } : undefined,
                }],
        },
    };
}
function extractTag(xml, tag) {
    const regex = new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:]+:)?${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
}
//# sourceMappingURL=sri-soap.js.map