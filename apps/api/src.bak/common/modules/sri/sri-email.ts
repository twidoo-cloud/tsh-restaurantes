/**
 * SRI Ecuador - Email Service
 * Sends electronic invoice XML + RIDE PDF to buyers via SMTP
 */

import * as nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface SendInvoiceEmailData {
  to: string;
  buyerName: string;
  emisorName: string;
  tipoComprobante: string; // 'FACTURA', 'NOTA DE CRÉDITO'
  numero: string;          // 001-001-000000001
  claveAcceso: string;
  total: string;
  fechaEmision: string;
  xmlContent?: string;
  xmlFileName?: string;
  rideBuffer?: Buffer;
  rideFileName?: string;
}

const TIPO_DOC_LABELS: Record<string, string> = {
  '01': 'Factura Electrónica',
  '04': 'Nota de Crédito Electrónica',
  '05': 'Nota de Débito Electrónica',
  '07': 'Comprobante de Retención',
};

/**
 * Send electronic invoice/credit note via email
 */
export async function sendInvoiceEmail(smtp: SmtpConfig, data: SendInvoiceEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify connection
    await transporter.verify();

    const attachments: any[] = [];

    if (data.xmlContent && data.xmlFileName) {
      attachments.push({
        filename: data.xmlFileName,
        content: data.xmlContent,
        contentType: 'text/xml',
      });
    }

    if (data.rideBuffer && data.rideFileName) {
      attachments.push({
        filename: data.rideFileName,
        content: data.rideBuffer,
        contentType: 'application/pdf',
      });
    }

    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">${data.emisorName}</h2>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${data.tipoComprobante}</p>
      </div>
      
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 16px; color: #334155;">Estimado/a <strong>${data.buyerName}</strong>,</p>
        
        <p style="margin: 0 0 16px; color: #334155;">
          Se adjunta su comprobante electrónico con los siguientes datos:
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569; width: 40%;">Número</td>
            <td style="padding: 8px 12px; color: #1e293b;">${data.numero}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; color: #475569;">Fecha Emisión</td>
            <td style="padding: 8px 12px; background: #f1f5f9; color: #1e293b;">${data.fechaEmision}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #e2e8f0; font-weight: bold; color: #475569;">Total</td>
            <td style="padding: 8px 12px; font-weight: bold; color: #1e293b; font-size: 16px;">$${data.total}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; color: #475569;">Clave de Acceso</td>
            <td style="padding: 8px 12px; background: #f1f5f9; color: #64748b; font-size: 10px; font-family: monospace; word-break: break-all;">${data.claveAcceso}</td>
          </tr>
        </table>

        <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">
          ${attachments.length > 0 ? 'Se adjuntan los archivos XML y RIDE (PDF) del comprobante electrónico.' : 'Este es un comprobante electrónico válido ante el SRI.'}
        </p>
      </div>
      
      <div style="background: #f1f5f9; padding: 16px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">
          Documento generado por POS-SaaS — Sistema de Punto de Venta
        </p>
      </div>
    </div>`;

    const result = await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: data.to,
      subject: `${data.tipoComprobante} No. ${data.numero} — ${data.emisorName}`,
      html: htmlBody,
      attachments,
    });

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get display label for document type
 */
export function getTipoDocLabel(codDoc: string): string {
  return TIPO_DOC_LABELS[codDoc] || 'Comprobante Electrónico';
}
