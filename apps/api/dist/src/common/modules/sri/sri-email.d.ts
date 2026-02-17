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
    tipoComprobante: string;
    numero: string;
    claveAcceso: string;
    total: string;
    fechaEmision: string;
    xmlContent?: string;
    xmlFileName?: string;
    rideBuffer?: Buffer;
    rideFileName?: string;
}
export declare function sendInvoiceEmail(smtp: SmtpConfig, data: SendInvoiceEmailData): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export declare function getTipoDocLabel(codDoc: string): string;
