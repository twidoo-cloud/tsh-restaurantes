"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadP12Certificate = loadP12Certificate;
exports.validateP12 = validateP12;
exports.signXml = signXml;
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
function loadP12Certificate(p12Path, password) {
    if (!fs.existsSync(p12Path)) {
        throw new Error(`Archivo de certificado no encontrado: ${p12Path}`);
    }
    const p12Buffer = fs.readFileSync(p12Path);
    const p12Base64 = p12Buffer.toString('base64');
    try {
        const { key, cert } = extractP12Components(p12Buffer, password);
        const x509 = new crypto.X509Certificate(cert);
        const certBody = cert
            .replace('-----BEGIN CERTIFICATE-----', '')
            .replace('-----END CERTIFICATE-----', '')
            .replace(/\s/g, '');
        return {
            privateKey: crypto.createPrivateKey({ key, passphrase: password, format: 'pem', type: 'pkcs8' }),
            certificate: certBody,
            issuerName: x509.issuer,
            serialNumber: x509.serialNumber,
            notBefore: new Date(x509.validFrom),
            notAfter: new Date(x509.validTo),
        };
    }
    catch (error) {
        throw new Error(`Error al leer certificado .p12: ${error.message}. Verifique la contraseña.`);
    }
}
function extractP12Components(p12Buffer, password) {
    const { execSync } = require('child_process');
    const tmpDir = path.join(process.cwd(), 'tmp-certs');
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
    const p12File = path.join(tmpDir, `cert-${Date.now()}.p12`);
    const keyFile = path.join(tmpDir, `key-${Date.now()}.pem`);
    const certFile = path.join(tmpDir, `cert-${Date.now()}.pem`);
    try {
        fs.writeFileSync(p12File, p12Buffer);
        execSync(`openssl pkcs12 -in "${p12File}" -nocerts -nodes -out "${keyFile}" -passin pass:"${password}" -legacy 2>/dev/null || ` +
            `openssl pkcs12 -in "${p12File}" -nocerts -nodes -out "${keyFile}" -passin pass:"${password}"`, { stdio: 'pipe' });
        execSync(`openssl pkcs12 -in "${p12File}" -clcerts -nokeys -out "${certFile}" -passin pass:"${password}" -legacy 2>/dev/null || ` +
            `openssl pkcs12 -in "${p12File}" -clcerts -nokeys -out "${certFile}" -passin pass:"${password}"`, { stdio: 'pipe' });
        const key = fs.readFileSync(keyFile, 'utf-8');
        const cert = fs.readFileSync(certFile, 'utf-8');
        if (!key.includes('PRIVATE KEY')) {
            throw new Error('No se pudo extraer la clave privada del certificado');
        }
        if (!cert.includes('CERTIFICATE')) {
            throw new Error('No se pudo extraer el certificado del archivo .p12');
        }
        return { key, cert };
    }
    finally {
        [p12File, keyFile, certFile].forEach(f => {
            try {
                fs.unlinkSync(f);
            }
            catch { }
        });
        try {
            fs.rmdirSync(tmpDir);
        }
        catch { }
    }
}
function validateP12(p12Path, password) {
    try {
        const certData = loadP12Certificate(p12Path, password);
        return {
            valid: true,
            issuer: certData.issuerName,
            serialNumber: certData.serialNumber,
            validFrom: certData.notBefore.toISOString(),
            validTo: certData.notAfter.toISOString(),
        };
    }
    catch (error) {
        return { valid: false, error: error.message };
    }
}
function signXml(xml, p12Path, password) {
    const certData = loadP12Certificate(p12Path, password);
    const canonicalXml = xml.trim();
    const docDigest = crypto
        .createHash('sha256')
        .update(canonicalXml, 'utf-8')
        .digest('base64');
    const signedInfoId = `SignedInfo-${generateId()}`;
    const signatureId = `Signature-${generateId()}`;
    const signedPropertiesId = `SignedProperties-${generateId()}`;
    const referenceId = `Reference-${generateId()}`;
    const keyInfoId = `KeyInfo-${generateId()}`;
    const certificateId = `Certificate-${generateId()}`;
    const signingTime = new Date().toISOString();
    const signedProperties = buildSignedProperties(signedPropertiesId, certificateId, certData, signingTime);
    const signedPropsDigest = crypto
        .createHash('sha256')
        .update(signedProperties, 'utf-8')
        .digest('base64');
    const keyInfoContent = buildKeyInfoContent(keyInfoId, certData);
    const keyInfoDigest = crypto
        .createHash('sha256')
        .update(keyInfoContent, 'utf-8')
        .digest('base64');
    const signedInfo = `<ds:SignedInfo Id="${signedInfoId}">
<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
<ds:Reference Id="${referenceId}" URI="#comprobante">
<ds:Transforms>
<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
</ds:Transforms>
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ds:DigestValue>${docDigest}</ds:DigestValue>
</ds:Reference>
<ds:Reference URI="#${signedPropertiesId}" Type="http://uri.etsi.org/01903#SignedProperties">
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ds:DigestValue>${signedPropsDigest}</ds:DigestValue>
</ds:Reference>
<ds:Reference URI="#${keyInfoId}">
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ds:DigestValue>${keyInfoDigest}</ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signedInfo, 'utf-8');
    const signatureValue = signer.sign(certData.privateKey, 'base64');
    const signatureBlock = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" Id="${signatureId}">
${signedInfo}
<ds:SignatureValue>${formatBase64(signatureValue)}</ds:SignatureValue>
${keyInfoContent}
<ds:Object Id="XadesObjectId">
<etsi:QualifyingProperties Target="#${signatureId}">
${signedProperties}
</etsi:QualifyingProperties>
</ds:Object>
</ds:Signature>`;
    const closingTagMatch = canonicalXml.match(/<\/([a-zA-Z]+)>\s*$/);
    if (!closingTagMatch) {
        throw new Error('No se encontró el tag de cierre del documento XML');
    }
    const closingTag = closingTagMatch[0];
    const insertPosition = canonicalXml.lastIndexOf(closingTag);
    const signedXml = canonicalXml.substring(0, insertPosition) + signatureBlock + '\n' + closingTag;
    return signedXml;
}
function buildSignedProperties(id, certificateId, certData, signingTime) {
    const certDigest = crypto
        .createHash('sha256')
        .update(Buffer.from(certData.certificate, 'base64'))
        .digest('base64');
    return `<etsi:SignedProperties Id="${id}">
<etsi:SignedSignatureProperties>
<etsi:SigningTime>${signingTime}</etsi:SigningTime>
<etsi:SigningCertificate>
<etsi:Cert>
<etsi:CertDigest>
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ds:DigestValue>${certDigest}</ds:DigestValue>
</etsi:CertDigest>
<etsi:IssuerSerial>
<ds:X509IssuerName>${certData.issuerName}</ds:X509IssuerName>
<ds:X509SerialNumber>${certData.serialNumber}</ds:X509SerialNumber>
</etsi:IssuerSerial>
</etsi:Cert>
</etsi:SigningCertificate>
</etsi:SignedSignatureProperties>
<etsi:SignedDataObjectProperties>
<etsi:DataObjectFormat ObjectReference="#${certificateId}">
<etsi:Description>Comprobante electrónico</etsi:Description>
<etsi:MimeType>text/xml</etsi:MimeType>
</etsi:DataObjectFormat>
</etsi:SignedDataObjectProperties>
</etsi:SignedProperties>`;
}
function buildKeyInfoContent(id, certData) {
    return `<ds:KeyInfo Id="${id}">
<ds:X509Data>
<ds:X509Certificate>${formatBase64(certData.certificate)}</ds:X509Certificate>
</ds:X509Data>
<ds:KeyValue>
<ds:RSAKeyValue>
<ds:Modulus>${getRsaModulus(certData.privateKey)}</ds:Modulus>
<ds:Exponent>${getRsaExponent(certData.privateKey)}</ds:Exponent>
</ds:RSAKeyValue>
</ds:KeyValue>
</ds:KeyInfo>`;
}
function getRsaModulus(privateKey) {
    try {
        const publicKey = crypto.createPublicKey(privateKey);
        const jwk = publicKey.export({ format: 'jwk' });
        return jwk.n || '';
    }
    catch {
        return '';
    }
}
function getRsaExponent(privateKey) {
    try {
        const publicKey = crypto.createPublicKey(privateKey);
        const jwk = publicKey.export({ format: 'jwk' });
        return jwk.e || 'AQAB';
    }
    catch {
        return 'AQAB';
    }
}
function generateId() {
    return crypto.randomBytes(8).toString('hex');
}
function formatBase64(b64) {
    const clean = b64.replace(/\s/g, '');
    const lines = [];
    for (let i = 0; i < clean.length; i += 76) {
        lines.push(clean.substring(i, i + 76));
    }
    return '\n' + lines.join('\n') + '\n';
}
//# sourceMappingURL=sri-signer.js.map