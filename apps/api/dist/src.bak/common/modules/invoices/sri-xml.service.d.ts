export interface SriInvoiceData {
    ruc: string;
    razonSocial: string;
    nombreComercial: string;
    direccionMatriz: string;
    direccionEstablecimiento: string;
    contribuyenteEspecial?: string;
    obligadoContabilidad: 'SI' | 'NO';
    agenteRetencion?: string;
    regimenMicroempresas?: boolean;
    codDoc: '01' | '04' | '05';
    estab: string;
    ptoEmi: string;
    secuencial: string;
    fechaEmision: string;
    ambiente: '1' | '2';
    tipoIdentificacionComprador: '04' | '05' | '06' | '07' | '08';
    razonSocialComprador: string;
    identificacionComprador: string;
    direccionComprador?: string;
    emailComprador?: string;
    detalles: SriDetalleItem[];
    totalSinImpuestos: number;
    totalDescuento: number;
    propina: number;
    importeTotal: number;
    pagos: {
        formaPago: string;
        total: number;
        plazo?: number;
        unidadTiempo?: string;
    }[];
}
export interface SriDetalleItem {
    codigoPrincipal: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    precioTotalSinImpuesto: number;
    codigoPorcentaje: '0' | '2' | '3' | '4' | '5';
    baseImponible: number;
    tarifa: number;
    valor: number;
}
export declare class SriXmlService {
    generateClaveAcceso(data: SriInvoiceData): string;
    generateFacturaXml(data: SriInvoiceData): string;
    generateNotaCreditoXml(data: SriInvoiceData & {
        codDocModificado: string;
        numDocModificado: string;
        fechaEmisionDocSustento: string;
        motivo: string;
    }): string;
    private calculateImpuestos;
    private modulo11;
    private generateRandomCode;
    private escapeXml;
    static getFormaPago(method: string): string;
    static getTipoIdentificacion(taxId: string): '04' | '05' | '06' | '07' | '08';
    static getCodigoPorcentajeIVA(taxRate: number): '0' | '2' | '3' | '4' | '5';
}
