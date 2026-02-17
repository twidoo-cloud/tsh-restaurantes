export interface RideData {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccionMatriz: string;
    obligadoContabilidad: boolean;
    contribuyenteEspecial?: string;
    regimenRimpe: boolean;
    logoUrl?: string;
    ambiente: string;
    tipoEmision: string;
    tipoComprobante: string;
    establecimiento: string;
    puntoEmision: string;
    secuencial: string;
    claveAcceso: string;
    fechaEmision: string;
    numeroAutorizacion?: string;
    fechaAutorizacion?: string;
    tipoIdentificacionComprador: string;
    identificacionComprador: string;
    razonSocialComprador: string;
    detalles: RideDetalle[];
    subtotalSinIva: number;
    subtotalIva: number;
    totalDescuento: number;
    iva: number;
    ivaRate: number;
    propina: number;
    importeTotal: number;
    pagos: {
        formaPago: string;
        total: number;
    }[];
    infoAdicional?: {
        nombre: string;
        valor: string;
    }[];
}
export interface RideDetalle {
    codigoPrincipal: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    precioTotalSinImpuesto: number;
}
export declare function generateRidePdf(data: RideData, outputDir: string): Promise<string>;
export declare function generateRidePdfBuffer(data: RideData): Promise<Buffer>;
