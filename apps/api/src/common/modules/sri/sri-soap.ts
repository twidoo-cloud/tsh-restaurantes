/**
 * SRI Ecuador SOAP WebService Client
 * Handles sending and querying electronic invoices
 */

const SRI_ENDPOINTS = {
  // Pruebas (Certificación)
  '1': {
    recepcion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
  // Producción
  '2': {
    recepcion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    autorizacion: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
};

export interface SriRecepcionResponse {
  estado: 'RECIBIDA' | 'DEVUELTA';
  comprobantes?: { comprobante: { claveAcceso: string; mensajes: { mensaje: SriMensaje[] } }[] };
}

export interface SriAutorizacionResponse {
  numeroComprobantes: string;
  autorizaciones: {
    autorizacion: {
      estado: 'AUTORIZADO' | 'NO AUTORIZADO';
      numeroAutorizacion: string;
      fechaAutorizacion: string;
      ambiente: string;
      comprobante: string; // XML autorizado
      mensajes?: { mensaje: SriMensaje[] };
    }[];
  };
}

export interface SriMensaje {
  identificador: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo?: string;
}

/**
 * Send signed XML to SRI Recepción WebService
 */
export async function enviarComprobante(xml: string, ambiente: string): Promise<SriRecepcionResponse> {
  const endpoint = SRI_ENDPOINTS[ambiente as '1' | '2']?.recepcion;
  if (!endpoint) throw new Error(`Ambiente inválido: ${ambiente}`);

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

/**
 * Query authorization status from SRI
 */
export async function consultarAutorizacion(claveAcceso: string, ambiente: string): Promise<SriAutorizacionResponse> {
  const endpoint = SRI_ENDPOINTS[ambiente as '1' | '2']?.autorizacion;
  if (!endpoint) throw new Error(`Ambiente inválido: ${ambiente}`);

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

/**
 * Parse SOAP response from Recepción
 */
function parseRecepcionResponse(xml: string): SriRecepcionResponse {
  const estado = extractTag(xml, 'estado') as 'RECIBIDA' | 'DEVUELTA';
  const mensajes: SriMensaje[] = [];

  // Extract all mensaje blocks
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

/**
 * Parse SOAP response from Autorización
 */
function parseAutorizacionResponse(xml: string): SriAutorizacionResponse {
  const estado = extractTag(xml, 'estado') as 'AUTORIZADO' | 'NO AUTORIZADO';
  const numeroAutorizacion = extractTag(xml, 'numeroAutorizacion') || '';
  const fechaAutorizacion = extractTag(xml, 'fechaAutorizacion') || '';
  const ambiente = extractTag(xml, 'ambiente') || '';
  const comprobante = extractTag(xml, 'comprobante') || '';

  const mensajes: SriMensaje[] = [];
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

function extractTag(xml: string, tag: string): string | undefined {
  // Handle namespaced tags too
  const regex = new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[^:]+:)?${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : undefined;
}
