export declare class UpdateSriConfigDto {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccionMatriz: string;
    obligadoContabilidad?: boolean;
    contribuyenteEspecial?: string;
    regimenRimpe?: boolean;
    ambiente?: string;
    establecimiento?: string;
    puntoEmision?: string;
    emailNotificacion?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    smtpFromName?: string;
    smtpSecure?: boolean;
}
export declare class EmitirFacturaDto {
    orderId: string;
    tipoIdentificacion?: string;
    identificacion?: string;
    razonSocial?: string;
    email?: string;
    direccion?: string;
    telefono?: string;
}
export declare class EmitirNotaCreditoDto {
    facturaId: string;
    motivo: string;
    itemIds?: string[];
}
export declare class AnularComprobanteDto {
    motivo: string;
}
export declare class EnviarEmailDto {
    email: string;
}
