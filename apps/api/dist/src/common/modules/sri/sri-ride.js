"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRidePdf = generateRidePdf;
exports.generateRidePdfBuffer = generateRidePdfBuffer;
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const TIPO_ID_MAP = {
    '04': 'RUC',
    '05': 'Cédula',
    '06': 'Pasaporte',
    '07': 'Consumidor Final',
};
const FORMA_PAGO_MAP = {
    '01': 'Sin utilización del sistema financiero',
    '15': 'Compensación de deudas',
    '16': 'Tarjeta de débito',
    '17': 'Dinero electrónico',
    '18': 'Tarjeta prepago',
    '19': 'Tarjeta de crédito',
    '20': 'Otros con utilización del sistema financiero',
    '21': 'Endoso de títulos',
};
const TIPO_COMPROBANTE_MAP = {
    '01': 'FACTURA',
    '04': 'NOTA DE CRÉDITO',
    '05': 'NOTA DE DÉBITO',
    '06': 'GUÍA DE REMISIÓN',
    '07': 'COMPROBANTE DE RETENCIÓN',
};
async function generateRidePdf(data, outputDir) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const fileName = `RIDE-${data.claveAcceso}.pdf`;
    const filePath = path.join(outputDir, fileName);
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 30, bottom: 30, left: 40, right: 40 },
                info: {
                    Title: `Factura ${data.establecimiento}-${data.puntoEmision}-${data.secuencial}`,
                    Author: data.razonSocial,
                    Subject: 'Representación Impresa del Documento Electrónico (RIDE)',
                    Creator: 'POS-SaaS',
                },
            });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const leftCol = doc.page.margins.left;
            const rightColStart = leftCol + pageWidth * 0.55 + 10;
            const rightColWidth = pageWidth * 0.45 - 10;
            const leftColWidth = pageWidth * 0.55;
            let y = doc.page.margins.top;
            const headerTop = y;
            if (data.logoUrl && fs.existsSync(data.logoUrl)) {
                try {
                    doc.image(data.logoUrl, leftCol, y, { width: 80, height: 50 });
                    y += 55;
                }
                catch { }
            }
            doc.fontSize(11).font('Helvetica-Bold');
            doc.text(data.razonSocial, leftCol, y, { width: leftColWidth });
            y = doc.y + 3;
            if (data.nombreComercial) {
                doc.fontSize(9).font('Helvetica');
                doc.text(data.nombreComercial, leftCol, y, { width: leftColWidth });
                y = doc.y + 2;
            }
            doc.fontSize(8).font('Helvetica');
            doc.text(`Dir. Matriz: ${data.direccionMatriz}`, leftCol, y, { width: leftColWidth });
            y = doc.y + 2;
            if (data.obligadoContabilidad) {
                doc.text('Obligado a llevar contabilidad: SÍ', leftCol, y, { width: leftColWidth });
                y = doc.y + 2;
            }
            if (data.contribuyenteEspecial) {
                doc.text(`Contribuyente Especial Nro: ${data.contribuyenteEspecial}`, leftCol, y, { width: leftColWidth });
                y = doc.y + 2;
            }
            if (data.regimenRimpe) {
                doc.fontSize(7).font('Helvetica-Bold');
                doc.text('CONTRIBUYENTE RÉGIMEN RIMPE', leftCol, y, { width: leftColWidth });
                y = doc.y + 2;
            }
            const leftColBottom = y;
            y = headerTop;
            const boxX = rightColStart;
            const boxWidth = rightColWidth;
            doc.rect(boxX, y, boxWidth, 0).stroke();
            const boxTop = y;
            y += 8;
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text(`R.U.C.: ${data.ruc}`, boxX + 8, y, { width: boxWidth - 16 });
            y = doc.y + 6;
            const tipoDoc = TIPO_COMPROBANTE_MAP[data.tipoComprobante] || 'FACTURA';
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text(tipoDoc, boxX + 8, y, { width: boxWidth - 16, align: 'center' });
            y = doc.y + 4;
            doc.fontSize(9).font('Helvetica');
            doc.text(`No. ${data.establecimiento}-${data.puntoEmision}-${data.secuencial.padStart(9, '0')}`, boxX + 8, y, { width: boxWidth - 16, align: 'center' });
            y = doc.y + 6;
            doc.fontSize(7).font('Helvetica');
            const ambienteText = data.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS';
            doc.text(`AMBIENTE: ${ambienteText}`, boxX + 8, y, { width: boxWidth - 16 });
            y = doc.y + 2;
            doc.text('EMISIÓN: NORMAL', boxX + 8, y, { width: boxWidth - 16 });
            y = doc.y + 6;
            doc.fontSize(7).font('Helvetica-Bold');
            doc.text('CLAVE DE ACCESO:', boxX + 8, y, { width: boxWidth - 16 });
            y = doc.y + 2;
            drawBarcodePattern(doc, data.claveAcceso, boxX + 8, y, boxWidth - 16, 25);
            y += 28;
            doc.fontSize(6).font('Courier');
            doc.text(data.claveAcceso, boxX + 8, y, { width: boxWidth - 16, align: 'center' });
            y = doc.y + 6;
            if (data.numeroAutorizacion) {
                doc.fontSize(7).font('Helvetica-Bold');
                doc.text('No. AUTORIZACIÓN:', boxX + 8, y, { width: boxWidth - 16 });
                y = doc.y + 2;
                doc.fontSize(6).font('Courier');
                doc.text(data.numeroAutorizacion, boxX + 8, y, { width: boxWidth - 16 });
                y = doc.y + 3;
                if (data.fechaAutorizacion) {
                    doc.fontSize(7).font('Helvetica');
                    const fechaAuth = new Date(data.fechaAutorizacion);
                    doc.text(`FECHA AUTORIZACIÓN: ${fechaAuth.toLocaleDateString('es-EC')} ${fechaAuth.toLocaleTimeString('es-EC')}`, boxX + 8, y, { width: boxWidth - 16 });
                    y = doc.y + 3;
                }
            }
            const boxBottom = y + 6;
            doc.rect(boxX, boxTop, boxWidth, boxBottom - boxTop).stroke();
            y = Math.max(leftColBottom, boxBottom) + 15;
            doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
            y += 8;
            doc.fontSize(8).font('Helvetica');
            const buyerLabelWidth = 130;
            doc.font('Helvetica-Bold').text('Razón Social / Nombres:', leftCol, y, { width: buyerLabelWidth, continued: false });
            doc.font('Helvetica').text(data.razonSocialComprador, leftCol + buyerLabelWidth, y, { width: pageWidth - buyerLabelWidth });
            y = doc.y + 3;
            const tipoIdLabel = TIPO_ID_MAP[data.tipoIdentificacionComprador] || 'Identificación';
            doc.font('Helvetica-Bold').text(`${tipoIdLabel}:`, leftCol, y, { width: buyerLabelWidth });
            doc.font('Helvetica').text(data.identificacionComprador, leftCol + buyerLabelWidth, y, { width: pageWidth / 2 - buyerLabelWidth });
            doc.font('Helvetica-Bold').text('Fecha Emisión:', leftCol + pageWidth / 2, y, { width: 100 });
            doc.font('Helvetica').text(data.fechaEmision, leftCol + pageWidth / 2 + 100, y, { width: 150 });
            y = doc.y + 3;
            if (data.infoAdicional && data.infoAdicional.length > 0) {
                for (const info of data.infoAdicional) {
                    doc.font('Helvetica-Bold').text(`${info.nombre}:`, leftCol, y, { width: buyerLabelWidth });
                    doc.font('Helvetica').text(info.valor, leftCol + buyerLabelWidth, y, { width: pageWidth - buyerLabelWidth });
                    y = doc.y + 2;
                }
            }
            y += 8;
            const colWidths = {
                codigo: 70,
                descripcion: pageWidth - 70 - 55 - 70 - 55 - 80,
                cantidad: 55,
                precioUnit: 70,
                descuento: 55,
                total: 80,
            };
            const drawTableHeader = (yPos) => {
                doc.rect(leftCol, yPos, pageWidth, 18).fill('#2563EB');
                doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold');
                let x = leftCol + 4;
                doc.text('Cód. Principal', x, yPos + 4, { width: colWidths.codigo });
                x += colWidths.codigo;
                doc.text('Descripción', x, yPos + 4, { width: colWidths.descripcion });
                x += colWidths.descripcion;
                doc.text('Cant.', x, yPos + 4, { width: colWidths.cantidad, align: 'right' });
                x += colWidths.cantidad;
                doc.text('P. Unitario', x, yPos + 4, { width: colWidths.precioUnit, align: 'right' });
                x += colWidths.precioUnit;
                doc.text('Dscto.', x, yPos + 4, { width: colWidths.descuento, align: 'right' });
                x += colWidths.descuento;
                doc.text('Total', x, yPos + 4, { width: colWidths.total, align: 'right' });
                doc.fillColor('#000000');
                return yPos + 18;
            };
            y = drawTableHeader(y);
            doc.fontSize(7).font('Helvetica');
            let isOdd = false;
            for (const det of data.detalles) {
                const rowHeight = 16;
                if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 180) {
                    doc.addPage();
                    y = doc.page.margins.top;
                    y = drawTableHeader(y);
                }
                if (isOdd) {
                    doc.rect(leftCol, y, pageWidth, rowHeight).fill('#F9FAFB');
                    doc.fillColor('#000000');
                }
                let x = leftCol + 4;
                doc.text(det.codigoPrincipal.substring(0, 12), x, y + 4, { width: colWidths.codigo });
                x += colWidths.codigo;
                doc.text(det.descripcion.substring(0, 50), x, y + 4, { width: colWidths.descripcion });
                x += colWidths.descripcion;
                doc.text(det.cantidad.toFixed(2), x, y + 4, { width: colWidths.cantidad, align: 'right' });
                x += colWidths.cantidad;
                doc.text(det.precioUnitario.toFixed(2), x, y + 4, { width: colWidths.precioUnit, align: 'right' });
                x += colWidths.precioUnit;
                doc.text(det.descuento.toFixed(2), x, y + 4, { width: colWidths.descuento, align: 'right' });
                x += colWidths.descuento;
                doc.text(det.precioTotalSinImpuesto.toFixed(2), x, y + 4, { width: colWidths.total, align: 'right' });
                y += rowHeight;
                isOdd = !isOdd;
            }
            doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
            y += 12;
            const totalsX = leftCol + pageWidth * 0.55;
            const totalsWidth = pageWidth * 0.45;
            const paymentX = leftCol;
            const paymentWidth = pageWidth * 0.5;
            const totalsTop = y;
            doc.fontSize(8).font('Helvetica-Bold');
            doc.text('Forma de Pago', paymentX, y, { width: paymentWidth });
            y = doc.y + 4;
            doc.fontSize(7).font('Helvetica');
            for (const pago of data.pagos) {
                const label = FORMA_PAGO_MAP[pago.formaPago] || pago.formaPago;
                doc.text(`${label}:`, paymentX, y, { width: paymentWidth - 70 });
                doc.text(`$${pago.total.toFixed(2)}`, paymentX + paymentWidth - 70, y, { width: 70, align: 'right' });
                y = doc.y + 2;
            }
            y = totalsTop;
            const drawTotalRow = (label, value, bold = false) => {
                const font = bold ? 'Helvetica-Bold' : 'Helvetica';
                const size = bold ? 9 : 8;
                doc.fontSize(size).font(font);
                doc.text(label, totalsX, y, { width: totalsWidth * 0.6 });
                doc.text(value, totalsX + totalsWidth * 0.6, y, { width: totalsWidth * 0.4, align: 'right' });
                y = doc.y + 3;
            };
            drawTotalRow('SUBTOTAL SIN IMPUESTOS', `$${(data.subtotalSinIva + data.subtotalIva).toFixed(2)}`);
            if (data.subtotalSinIva > 0) {
                drawTotalRow('SUBTOTAL IVA 0%', `$${data.subtotalSinIva.toFixed(2)}`);
            }
            if (data.subtotalIva > 0) {
                drawTotalRow(`SUBTOTAL IVA ${data.ivaRate}%`, `$${data.subtotalIva.toFixed(2)}`);
            }
            if (data.totalDescuento > 0) {
                drawTotalRow('TOTAL DESCUENTO', `$${data.totalDescuento.toFixed(2)}`);
            }
            drawTotalRow(`IVA ${data.ivaRate}%`, `$${data.iva.toFixed(2)}`);
            if (data.propina > 0) {
                drawTotalRow('PROPINA', `$${data.propina.toFixed(2)}`);
            }
            doc.moveTo(totalsX, y).lineTo(totalsX + totalsWidth, y).stroke();
            y += 4;
            drawTotalRow('VALOR TOTAL', `$${data.importeTotal.toFixed(2)}`, true);
            y += 15;
            doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
            y += 6;
            doc.fontSize(6).font('Helvetica').fillColor('#666666');
            doc.text('Documento generado por POS-SaaS — Sistema de Punto de Venta Multi-Tenant', leftCol, y, { width: pageWidth, align: 'center' });
            doc.end();
            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
        }
        catch (error) {
            reject(error);
        }
    });
}
async function generateRidePdfBuffer(data) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 30, bottom: 30, left: 40, right: 40 },
            });
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            buildRideContent(doc, data);
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
}
function drawBarcodePattern(doc, code, x, y, width, height) {
    const barWidth = width / (code.length * 3 + 10);
    let currentX = x;
    currentX += barWidth * 3;
    for (let i = 0; i < code.length; i++) {
        const digit = parseInt(code[i]);
        const thick = digit >= 5;
        const bw = thick ? barWidth * 1.5 : barWidth;
        doc.rect(currentX, y, bw, height).fill('#000000');
        currentX += bw;
        currentX += barWidth * 0.5;
        if (i % 2 === 0) {
            doc.rect(currentX, y, barWidth * 0.5, height).fill('#000000');
            currentX += barWidth;
        }
    }
    doc.fillColor('#000000');
}
function buildRideContent(doc, data) {
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftCol = doc.page.margins.left;
    const rightColStart = leftCol + pageWidth * 0.55 + 10;
    const rightColWidth = pageWidth * 0.45 - 10;
    const leftColWidth = pageWidth * 0.55;
    let y = doc.page.margins.top;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(data.razonSocial, leftCol, y, { width: leftColWidth });
    y = doc.y + 3;
    if (data.nombreComercial) {
        doc.fontSize(9).font('Helvetica');
        doc.text(data.nombreComercial, leftCol, y, { width: leftColWidth });
        y = doc.y + 2;
    }
    doc.fontSize(8).font('Helvetica');
    doc.text(`Dir. Matriz: ${data.direccionMatriz}`, leftCol, y, { width: leftColWidth });
    y = doc.y + 2;
    doc.text(`RUC: ${data.ruc}`, leftCol, y, { width: leftColWidth });
    y = doc.y + 2;
    if (data.obligadoContabilidad) {
        doc.text('Obligado a llevar contabilidad: SÍ', leftCol, y, { width: leftColWidth });
        y = doc.y + 2;
    }
    if (data.regimenRimpe) {
        doc.fontSize(7).font('Helvetica-Bold');
        doc.text('CONTRIBUYENTE RÉGIMEN RIMPE', leftCol, y, { width: leftColWidth });
        y = doc.y + 2;
    }
    y += 10;
    const tipoDoc = TIPO_COMPROBANTE_MAP[data.tipoComprobante] || 'FACTURA';
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`${tipoDoc} No. ${data.establecimiento}-${data.puntoEmision}-${data.secuencial.padStart(9, '0')}`, leftCol, y, { width: pageWidth, align: 'center' });
    y = doc.y + 4;
    doc.fontSize(7).font('Helvetica');
    doc.text(`Clave de Acceso: ${data.claveAcceso}`, leftCol, y, { width: pageWidth, align: 'center' });
    y = doc.y + 2;
    if (data.numeroAutorizacion) {
        doc.text(`Autorización: ${data.numeroAutorizacion}`, leftCol, y, { width: pageWidth, align: 'center' });
        y = doc.y + 2;
        if (data.fechaAutorizacion) {
            doc.text(`Fecha Autorización: ${data.fechaAutorizacion}`, leftCol, y, { width: pageWidth, align: 'center' });
            y = doc.y + 2;
        }
    }
    y += 8;
    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
    y += 6;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text(`Razón Social: `, leftCol, y, { continued: true });
    doc.font('Helvetica').text(data.razonSocialComprador);
    y = doc.y + 2;
    const tipoIdLabel = TIPO_ID_MAP[data.tipoIdentificacionComprador] || 'Identificación';
    doc.font('Helvetica-Bold').text(`${tipoIdLabel}: `, leftCol, y, { continued: true });
    doc.font('Helvetica').text(data.identificacionComprador);
    y = doc.y + 2;
    doc.font('Helvetica-Bold').text('Fecha Emisión: ', leftCol, y, { continued: true });
    doc.font('Helvetica').text(data.fechaEmision);
    y = doc.y + 10;
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Descripción', leftCol, y, { width: pageWidth * 0.4 });
    doc.text('Cant.', leftCol + pageWidth * 0.4, y, { width: pageWidth * 0.12, align: 'right' });
    doc.text('P.Unit.', leftCol + pageWidth * 0.52, y, { width: pageWidth * 0.16, align: 'right' });
    doc.text('Total', leftCol + pageWidth * 0.68, y, { width: pageWidth * 0.32, align: 'right' });
    y = doc.y + 2;
    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
    y += 4;
    doc.fontSize(7).font('Helvetica');
    for (const det of data.detalles) {
        doc.text(det.descripcion, leftCol, y, { width: pageWidth * 0.4 });
        doc.text(det.cantidad.toFixed(2), leftCol + pageWidth * 0.4, y, { width: pageWidth * 0.12, align: 'right' });
        doc.text(det.precioUnitario.toFixed(2), leftCol + pageWidth * 0.52, y, { width: pageWidth * 0.16, align: 'right' });
        doc.text(det.precioTotalSinImpuesto.toFixed(2), leftCol + pageWidth * 0.68, y, { width: pageWidth * 0.32, align: 'right' });
        y = doc.y + 3;
    }
    y += 6;
    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).stroke();
    y += 6;
    const totalsX = leftCol + pageWidth * 0.55;
    const totalsWidth = pageWidth * 0.45;
    doc.fontSize(8).font('Helvetica');
    doc.text(`Subtotal:`, totalsX, y, { width: totalsWidth * 0.6 });
    doc.text(`$${(data.subtotalSinIva + data.subtotalIva).toFixed(2)}`, totalsX + totalsWidth * 0.6, y, { width: totalsWidth * 0.4, align: 'right' });
    y = doc.y + 3;
    doc.text(`IVA ${data.ivaRate}%:`, totalsX, y, { width: totalsWidth * 0.6 });
    doc.text(`$${data.iva.toFixed(2)}`, totalsX + totalsWidth * 0.6, y, { width: totalsWidth * 0.4, align: 'right' });
    y = doc.y + 3;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('TOTAL:', totalsX, y, { width: totalsWidth * 0.6 });
    doc.text(`$${data.importeTotal.toFixed(2)}`, totalsX + totalsWidth * 0.6, y, { width: totalsWidth * 0.4, align: 'right' });
}
//# sourceMappingURL=sri-ride.js.map