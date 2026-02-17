import * as crypto from 'crypto';
interface CertificateData {
    privateKey: crypto.KeyObject;
    certificate: string;
    issuerName: string;
    serialNumber: string;
    notBefore: Date;
    notAfter: Date;
}
export declare function loadP12Certificate(p12Path: string, password: string): CertificateData;
export declare function validateP12(p12Path: string, password: string): {
    valid: boolean;
    issuer?: string;
    serialNumber?: string;
    validFrom?: string;
    validTo?: string;
    error?: string;
};
export declare function signXml(xml: string, p12Path: string, password: string): string;
export {};
