export interface SriConfigData {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccionMatriz: string;
    obligadoContabilidad: boolean;
    contribuyenteEspecial?: string;
    regimenRimpe: boolean;
    ambiente: string;
    tipoEmision: string;
    establecimiento: string;
    puntoEmision: string;
}
export interface InvoiceDetail {
    codigoPrincipal: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    precioTotalSinImpuesto: number;
    codigoImpuesto: string;
    codigoPorcentaje: string;
    tarifa: number;
    baseImponible: number;
    valor: number;
}
export interface BuyerInfo {
    tipoIdentificacion: string;
    identificacion: string;
    razonSocial: string;
    direccion?: string;
    email?: string;
    telefono?: string;
}
export interface InvoiceData {
    config: SriConfigData;
    secuencial: string;
    fechaEmision: string;
    buyer: BuyerInfo;
    details: InvoiceDetail[];
    totalSinImpuestos: number;
    totalDescuento: number;
    propina: number;
    importeTotal: number;
    moneda: string;
    formaPago: {
        codigo: string;
        total: number;
        plazo?: number;
        unidadTiempo?: string;
    }[];
}
export declare function generateClaveAcceso(fechaEmision: string, tipoComprobante: string, ruc: string, ambiente: string, establecimiento: string, puntoEmision: string, secuencial: string, codigoNumerico: string, tipoEmision: string): string;
export declare function modulo11(data: string): string;
export declare function generateFacturaXml(data: InvoiceData, claveAcceso: string): string;
export declare const PAYMENT_METHOD_MAP: Record<string, string>;
export declare const IVA_RATES: Record<string, {
    codigo: string;
    tarifa: number;
}>;
