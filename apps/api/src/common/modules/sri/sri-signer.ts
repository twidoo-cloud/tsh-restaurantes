/**
 * SRI Ecuador - XAdES-BES XML Digital Signature
 * Signs electronic invoice XML using a .p12 certificate
 * 
 * Implements the XAdES-BES (XML Advanced Electronic Signatures - Basic) format
 * required by SRI for electronic invoicing in Ecuador.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface CertificateData {
  privateKey: crypto.KeyObject;
  certificate: string; // PEM certificate (base64 body only)
  issuerName: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
}

/**
 * Load and parse a PKCS#12 (.p12) certificate file
 */
export function loadP12Certificate(p12Path: string, password: string): CertificateData {
  if (!fs.existsSync(p12Path)) {
    throw new Error(`Archivo de certificado no encontrado: ${p12Path}`);
  }

  const p12Buffer = fs.readFileSync(p12Path);

  // Parse PKCS#12 using Node.js crypto
  // Node 21+ has native PKCS12 support, but for compatibility we use openssl-style parsing
  // The p12 is converted to PEM components
  const p12Base64 = p12Buffer.toString('base64');

  try {
    // Use crypto to extract the private key and certificate from PKCS#12
    const { key, cert } = extractP12Components(p12Buffer, password);

    // Parse certificate details
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
  } catch (error: any) {
    throw new Error(`Error al leer certificado .p12: ${error.message}. Verifique la contraseña.`);
  }
}

/**
 * Extract private key and certificate from PKCS#12 buffer using OpenSSL via child_process
 * This is the most reliable cross-platform approach for PKCS#12 parsing in Node.js
 */
function extractP12Components(p12Buffer: Buffer, password: string): { key: string; cert: string } {
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

    // Extract private key
    execSync(
      `openssl pkcs12 -in "${p12File}" -nocerts -nodes -out "${keyFile}" -passin pass:"${password}" -legacy 2>/dev/null || ` +
      `openssl pkcs12 -in "${p12File}" -nocerts -nodes -out "${keyFile}" -passin pass:"${password}"`,
      { stdio: 'pipe' }
    );

    // Extract certificate
    execSync(
      `openssl pkcs12 -in "${p12File}" -clcerts -nokeys -out "${certFile}" -passin pass:"${password}" -legacy 2>/dev/null || ` +
      `openssl pkcs12 -in "${p12File}" -clcerts -nokeys -out "${certFile}" -passin pass:"${password}"`,
      { stdio: 'pipe' }
    );

    const key = fs.readFileSync(keyFile, 'utf-8');
    const cert = fs.readFileSync(certFile, 'utf-8');

    if (!key.includes('PRIVATE KEY')) {
      throw new Error('No se pudo extraer la clave privada del certificado');
    }
    if (!cert.includes('CERTIFICATE')) {
      throw new Error('No se pudo extraer el certificado del archivo .p12');
    }

    return { key, cert };
  } finally {
    // Cleanup temp files securely
    [p12File, keyFile, certFile].forEach(f => {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    });
    try { fs.rmdirSync(tmpDir); } catch { /* ignore if not empty */ }
  }
}

/**
 * Validate a .p12 certificate file can be read with the given password
 */
export function validateP12(p12Path: string, password: string): {
  valid: boolean;
  issuer?: string;
  serialNumber?: string;
  validFrom?: string;
  validTo?: string;
  error?: string;
} {
  try {
    const certData = loadP12Certificate(p12Path, password);
    return {
      valid: true,
      issuer: certData.issuerName,
      serialNumber: certData.serialNumber,
      validFrom: certData.notBefore.toISOString(),
      validTo: certData.notAfter.toISOString(),
    };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Sign XML with XAdES-BES format as required by SRI Ecuador
 */
export function signXml(xml: string, p12Path: string, password: string): string {
  const certData = loadP12Certificate(p12Path, password);

  // 1. Canonicalize the XML (C14N - simple normalization for SRI)
  const canonicalXml = xml.trim();

  // 2. Calculate digest of the document (SHA-256)
  const docDigest = crypto
    .createHash('sha256')
    .update(canonicalXml, 'utf-8')
    .digest('base64');

  // 3. Build SignedInfo
  const signedInfoId = `SignedInfo-${generateId()}`;
  const signatureId = `Signature-${generateId()}`;
  const signedPropertiesId = `SignedProperties-${generateId()}`;
  const referenceId = `Reference-${generateId()}`;
  const keyInfoId = `KeyInfo-${generateId()}`;
  const certificateId = `Certificate-${generateId()}`;
  const signingTime = new Date().toISOString();

  // 4. Build XAdES SignedProperties
  const signedProperties = buildSignedProperties(
    signedPropertiesId,
    certificateId,
    certData,
    signingTime,
  );

  // Calculate digest of SignedProperties
  const signedPropsDigest = crypto
    .createHash('sha256')
    .update(signedProperties, 'utf-8')
    .digest('base64');

  // Calculate digest of KeyInfo
  const keyInfoContent = buildKeyInfoContent(keyInfoId, certData);
  const keyInfoDigest = crypto
    .createHash('sha256')
    .update(keyInfoContent, 'utf-8')
    .digest('base64');

  // 5. Build SignedInfo with all references
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

  // 6. Sign the SignedInfo
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signedInfo, 'utf-8');
  const signatureValue = signer.sign(certData.privateKey, 'base64');

  // 7. Build the complete ds:Signature element
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

  // 8. Insert signature before closing tag of root element
  // Find the closing tag of the root element (</factura>, </notaCredito>, etc.)
  const closingTagMatch = canonicalXml.match(/<\/([a-zA-Z]+)>\s*$/);
  if (!closingTagMatch) {
    throw new Error('No se encontró el tag de cierre del documento XML');
  }

  const closingTag = closingTagMatch[0];
  const insertPosition = canonicalXml.lastIndexOf(closingTag);
  const signedXml = canonicalXml.substring(0, insertPosition) + signatureBlock + '\n' + closingTag;

  return signedXml;
}

/**
 * Build XAdES SignedProperties element
 */
function buildSignedProperties(
  id: string,
  certificateId: string,
  certData: CertificateData,
  signingTime: string,
): string {
  // Calculate certificate digest
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

/**
 * Build KeyInfo element
 */
function buildKeyInfoContent(id: string, certData: CertificateData): string {
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

/**
 * Extract RSA modulus from private key
 */
function getRsaModulus(privateKey: crypto.KeyObject): string {
  try {
    const publicKey = crypto.createPublicKey(privateKey);
    const jwk = publicKey.export({ format: 'jwk' });
    return (jwk as any).n || '';
  } catch {
    return '';
  }
}

/**
 * Extract RSA exponent from private key
 */
function getRsaExponent(privateKey: crypto.KeyObject): string {
  try {
    const publicKey = crypto.createPublicKey(privateKey);
    const jwk = publicKey.export({ format: 'jwk' });
    return (jwk as any).e || 'AQAB';
  } catch {
    return 'AQAB';
  }
}

/**
 * Generate a random ID for XML elements
 */
function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Format base64 string with line breaks every 76 chars (per XML Signature spec)
 */
function formatBase64(b64: string): string {
  const clean = b64.replace(/\s/g, '');
  const lines: string[] = [];
  for (let i = 0; i < clean.length; i += 76) {
    lines.push(clean.substring(i, i + 76));
  }
  return '\n' + lines.join('\n') + '\n';
}
