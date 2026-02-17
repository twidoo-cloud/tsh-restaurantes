import { SriConfigData, InvoiceDetail, BuyerInfo } from './sri-xml';
export interface NotaCreditoData {
    config: SriConfigData;
    secuencial: string;
    fechaEmision: string;
    buyer: BuyerInfo;
    codDocModificado: string;
    numDocModificado: string;
    fechaEmisionDocSustento: string;
    motivo: string;
    details: InvoiceDetail[];
    totalSinImpuestos: number;
    importeTotal: number;
    moneda: string;
}
export declare function generateNotaCreditoXml(data: NotaCreditoData, claveAcceso: string): string;
