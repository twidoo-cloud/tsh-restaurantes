export interface SriRecepcionResponse {
    estado: 'RECIBIDA' | 'DEVUELTA';
    comprobantes?: {
        comprobante: {
            claveAcceso: string;
            mensajes: {
                mensaje: SriMensaje[];
            };
        }[];
    };
}
export interface SriAutorizacionResponse {
    numeroComprobantes: string;
    autorizaciones: {
        autorizacion: {
            estado: 'AUTORIZADO' | 'NO AUTORIZADO';
            numeroAutorizacion: string;
            fechaAutorizacion: string;
            ambiente: string;
            comprobante: string;
            mensajes?: {
                mensaje: SriMensaje[];
            };
        }[];
    };
}
export interface SriMensaje {
    identificador: string;
    mensaje: string;
    informacionAdicional?: string;
    tipo?: string;
}
export declare function enviarComprobante(xml: string, ambiente: string): Promise<SriRecepcionResponse>;
export declare function consultarAutorizacion(claveAcceso: string, ambiente: string): Promise<SriAutorizacionResponse>;
