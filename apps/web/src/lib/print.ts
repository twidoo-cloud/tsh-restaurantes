/**
 * TSH Restaurantes — Thermal Print Library
 * Soporta: Epson TM-T20, Star, genéricas ESC/POS
 * Métodos: Red local (IP), USB via QZ Tray, Ventana del navegador (fallback)
 *
 * USO en pos/page.tsx (ya importado):
 *   import { printComanda, printPreBill, getPrintConfig } from '@/lib/print';
 */

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

export type PrintMethod = 'browser' | 'network' | 'qz';

export interface PrintConfig {
  method: PrintMethod;
  printerIp?: string;       // Para método 'network', ej: '192.168.1.100'
  printerPort?: number;     // Default 9100 (puerto ESC/POS estándar)
  paperWidth?: 32 | 40 | 48; // Caracteres por línea (58mm=32, 80mm=40-48)
  businessName?: string;
  businessRuc?: string;
  businessAddress?: string;
  businessPhone?: string;
  showLogo?: boolean;
  footerMessage?: string;
}

export interface PrintLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  size?: 'normal' | 'double';
  separator?: boolean; // línea de guiones
}

// ─────────────────────────────────────────────────────────────
// CONFIG — Lee desde localStorage, con defaults
// ─────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: PrintConfig = {
  method: 'browser',
  paperWidth: 40,
  businessName: 'Restaurante',
  footerMessage: '¡Gracias por su visita!',
};

export function getPrintConfig(): PrintConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const saved = localStorage.getItem('tsh_print_config');
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export function savePrintConfig(config: Partial<PrintConfig>): void {
  if (typeof window === 'undefined') return;
  const current = getPrintConfig();
  localStorage.setItem('tsh_print_config', JSON.stringify({ ...current, ...config }));
}

// ─────────────────────────────────────────────────────────────
// FORMATEO DE TEXTO para impresora de 40/48 columnas
// ─────────────────────────────────────────────────────────────

function padRight(text: string, width: number): string {
  return text.padEnd(width, ' ').substring(0, width);
}

function padLeft(text: string, width: number): string {
  return text.padStart(width, ' ').substring(0, width);
}

function center(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function twoColumns(left: string, right: string, width: number): string {
  const rightLen = right.length;
  const leftMax = width - rightLen - 1;
  const leftTrunc = left.substring(0, leftMax);
  return leftTrunc.padEnd(leftMax, ' ') + ' ' + right;
}

function separator(width: number, char = '-'): string {
  return char.repeat(width);
}

function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('es-EC', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
};

// ─────────────────────────────────────────────────────────────
// BUILDERS — Arman el contenido de cada ticket
// ─────────────────────────────────────────────────────────────

/**
 * TICKET DE COCINA (Comanda)
 * Va a la impresora de cocina cuando se hace el pedido.
 * Sin precios, letras grandes, fácil de leer.
 */
export function buildComandaLines(order: any, config: PrintConfig): string[] {
  const W = config.paperWidth || 40;
  const lines: string[] = [];

  lines.push(separator(W, '='));
  lines.push(center('** COMANDA **', W));
  lines.push(separator(W, '='));
  lines.push(`Orden:  ${order.orderNumber || order.order_number || ''}`);

  const meta = order.metadata || {};
  const tableNum = meta.table_number || meta.tableNumber || '';
  const tableId = meta.table_id || meta.tableId || '';
  if (tableNum) lines.push(`Mesa:   ${tableNum}`);

  const serverName = order.serverName || order.server_name || '';
  if (serverName) lines.push(`Mesero: ${serverName}`);

  lines.push(`Hora:   ${formatDate()}`);
  lines.push(separator(W, '-'));

  const items = (order.items || []).filter((i: any) => !i.isVoid && !i.is_void);
  if (items.length === 0) {
    lines.push(center('(sin items)', W));
  } else {
    for (const item of items) {
      const name = item.product?.name || item.productName || item.product_name || 'Producto';
      const qty = toNum(item.quantity);
      // Cantidad grande y nombre en mayúsculas para fácil lectura en cocina
      lines.push(`${qty}x ${name.toUpperCase()}`);
      if (item.notes || item.notas) {
        lines.push(`   >> ${item.notes || item.notas}`);
      }
    }
  }

  lines.push(separator(W, '='));
  lines.push('');

  return lines;
}

/**
 * PRE-CUENTA
 * Se le muestra al cliente antes del pago.
 * Con precios, totales, IVA.
 */
export function buildPreBillLines(order: any, config: PrintConfig): string[] {
  const W = config.paperWidth || 40;
  const lines: string[] = [];

  // Header
  lines.push(separator(W, '='));
  if (config.businessName) lines.push(center(config.businessName.toUpperCase(), W));
  if (config.businessRuc) lines.push(center(`RUC: ${config.businessRuc}`, W));
  if (config.businessAddress) lines.push(center(config.businessAddress, W));
  if (config.businessPhone) lines.push(center(`Tel: ${config.businessPhone}`, W));
  lines.push(separator(W, '-'));
  lines.push(center('PRE-CUENTA', W));
  lines.push(separator(W, '-'));

  lines.push(`Orden:  ${order.orderNumber || order.order_number || ''}`);
  const meta = order.metadata || {};
  const tableNum = meta.table_number || meta.tableNumber || '';
  if (tableNum) lines.push(`Mesa:   ${tableNum}`);

  const customer = order.customer;
  if (customer?.name) lines.push(`Cliente: ${customer.name}`);

  lines.push(`Fecha:  ${formatDate()}`);
  lines.push(separator(W, '-'));

  // Header de columnas
  lines.push(twoColumns('DESCRIPCION', 'TOTAL', W));
  lines.push(separator(W, '-'));

  // Items
  const items = (order.items || []).filter((i: any) => !i.isVoid && !i.is_void);
  for (const item of items) {
    const name = item.product?.name || item.productName || item.product_name || 'Producto';
    const qty = toNum(item.quantity);
    const price = toNum(item.unitPrice || item.unit_price);
    const subtotal = toNum(item.subtotal);
    const discount = toNum(item.discountAmount || item.discount_amount);

    // Nombre del producto (puede ser largo, lo partimos)
    const itemDesc = `${qty}x ${name}`;
    if (itemDesc.length <= W - 8) {
      lines.push(twoColumns(itemDesc, formatMoney(subtotal + discount), W));
    } else {
      lines.push(name.substring(0, W));
      lines.push(twoColumns(`  ${qty}x ${formatMoney(price)}`, formatMoney(subtotal + discount), W));
    }

    if (discount > 0) {
      lines.push(twoColumns('  Descuento', `-${formatMoney(discount)}`, W));
    }
    if (item.notes || item.notas) {
      lines.push(`  > ${item.notes || item.notas}`);
    }
  }

  lines.push(separator(W, '-'));

  // Totales
  const subtotal = toNum(order.subtotal);
  const taxAmount = toNum(order.taxAmount || order.tax_amount);
  const discount = toNum(order.discountAmount || order.discount_amount);
  const total = toNum(order.total);

  lines.push(twoColumns('Subtotal (sin IVA)', formatMoney(subtotal), W));
  if (discount > 0) lines.push(twoColumns('Descuento', `-${formatMoney(discount)}`, W));
  lines.push(twoColumns('IVA (15%)', formatMoney(taxAmount), W));
  lines.push(separator(W, '-'));
  lines.push(twoColumns('TOTAL', formatMoney(total), W));
  lines.push(separator(W, '='));

  if (config.footerMessage) {
    lines.push('');
    lines.push(center(config.footerMessage, W));
  }
  lines.push(center('** NO ES DOCUMENTO FISCAL **', W));
  lines.push(separator(W, '='));
  lines.push('');
  lines.push('');

  return lines;
}

/**
 * RECIBO DE PAGO con datos de Factura SRI
 * Se imprime después del pago cuando hay factura electrónica.
 */
export function buildReceiptLines(order: any, invoice: any, config: PrintConfig): string[] {
  const W = config.paperWidth || 40;
  const lines: string[] = [];

  // Header del emisor
  lines.push(separator(W, '='));
  if (config.businessName) lines.push(center(config.businessName.toUpperCase(), W));
  if (config.businessRuc) lines.push(center(`RUC: ${config.businessRuc}`, W));
  if (config.businessAddress) lines.push(center(config.businessAddress, W));
  lines.push(separator(W, '-'));

  if (invoice) {
    lines.push(center('FACTURA ELECTRÓNICA', W));
    lines.push(center(`001-001-${(invoice.secuencial || '').padStart(9, '0')}`, W));
    lines.push(center(`Autorización: ${invoice.estado?.toUpperCase() || 'GENERADA'}`, W));
    lines.push(separator(W, '-'));
    lines.push(`Comprador: ${invoice.razonSocialComprador || 'CONSUMIDOR FINAL'}`);
    lines.push(`ID:        ${invoice.identificacionComprador || '9999999999999'}`);
  } else {
    lines.push(center('RECIBO DE PAGO', W));
    lines.push(separator(W, '-'));
    const customer = order.customer;
    if (customer?.name) lines.push(`Cliente: ${customer.name}`);
  }

  lines.push(`Orden:  ${order.orderNumber || order.order_number || ''}`);
  lines.push(`Fecha:  ${formatDate()}`);
  lines.push(separator(W, '-'));

  // Items
  lines.push(twoColumns('DESCRIPCION', 'TOTAL', W));
  lines.push(separator(W, '-'));
  const items = (order.items || []).filter((i: any) => !i.isVoid && !i.is_void);
  for (const item of items) {
    const name = item.product?.name || item.productName || item.product_name || 'Producto';
    const qty = toNum(item.quantity);
    const subtotal = toNum(item.subtotal);
    const discount = toNum(item.discountAmount || item.discount_amount);
    lines.push(twoColumns(`${qty}x ${name}`.substring(0, W - 8), formatMoney(subtotal + discount), W));
    if (discount > 0) lines.push(twoColumns('  Descuento', `-${formatMoney(discount)}`, W));
  }
  lines.push(separator(W, '-'));

  // Totales
  const subtotal = toNum(order.subtotal);
  const taxAmount = toNum(order.taxAmount || order.tax_amount);
  const discount = toNum(order.discountAmount || order.discount_amount);
  const total = toNum(order.total);

  lines.push(twoColumns('Subtotal (sin IVA)', formatMoney(subtotal), W));
  if (discount > 0) lines.push(twoColumns('Descuento', `-${formatMoney(discount)}`, W));
  lines.push(twoColumns('IVA (15%)', formatMoney(taxAmount), W));
  lines.push(separator(W, '-'));
  lines.push(twoColumns('TOTAL', formatMoney(total), W));

  // Pagos
  const payments = order.payments || [];
  if (payments.length > 0) {
    lines.push(separator(W, '-'));
    const methodLabels: Record<string, string> = {
      cash: 'Efectivo',
      credit_card: 'Tarjeta Crédito',
      debit_card: 'Tarjeta Débito',
      transfer: 'Transferencia',
      wallet: 'Billetera Digital',
    };
    for (const p of payments) {
      const label = methodLabels[p.method] || p.method;
      lines.push(twoColumns(label, formatMoney(toNum(p.amount)), W));
      if (toNum(p.changeGiven || p.change_given) > 0) {
        lines.push(twoColumns('  Cambio', formatMoney(toNum(p.changeGiven || p.change_given)), W));
      }
    }
  }

  lines.push(separator(W, '='));

  // Clave de acceso SRI (en bloques de 10 para legibilidad)
  if (invoice?.claveAcceso) {
    lines.push('');
    lines.push(center('CLAVE DE ACCESO', W));
    const clave = invoice.claveAcceso;
    for (let i = 0; i < clave.length; i += 10) {
      lines.push(center(clave.substring(i, i + 10), W));
    }
  }

  lines.push('');
  if (config.footerMessage) lines.push(center(config.footerMessage, W));
  lines.push(separator(W, '='));
  lines.push('');
  lines.push('');

  return lines;
}

// ─────────────────────────────────────────────────────────────
// MÉTODOS DE IMPRESIÓN
// ─────────────────────────────────────────────────────────────

/**
 * Método 1: Impresión via ventana del navegador (fallback universal)
 * Funciona sin configuración adicional.
 * El usuario ve el diálogo de impresión del OS.
 */
function printViaBrowser(lines: string[], title = 'Ticket'): void {
  const content = lines.join('\n');
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('Habilita las ventanas emergentes para imprimir');
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.4;
          width: 80mm;
          padding: 4mm;
          color: #000;
          background: #fff;
        }
        pre {
          white-space: pre-wrap;
          word-break: break-all;
          font-family: inherit;
          font-size: inherit;
        }
        @media print {
          body { width: 80mm; }
          @page { margin: 0; size: 80mm auto; }
        }
      </style>
    </head>
    <body>
      <pre>${content}</pre>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(() => window.close(), 1000);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
}

/**
 * Método 2: Impresión directa via red local (IP:9100)
 * Requiere que el backend exponga un endpoint proxy para ESC/POS.
 * La impresora debe estar en la misma red y tener IP fija.
 *
 * Endpoint requerido en el backend:
 *   POST /print/raw  { ip: string, port: number, data: string }
 */
async function printViaNetwork(lines: string[], config: PrintConfig): Promise<void> {
  if (!config.printerIp) {
    throw new Error('IP de impresora no configurada');
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('pos_token');

  // Convertir líneas a texto con saltos de línea ESC/POS
  const ESC = '\x1B';
  const GS = '\x1D';
  const LF = '\n';
  const INIT = ESC + '@';               // Inicializar impresora
  const BOLD_ON = ESC + 'E' + '\x01';
  const BOLD_OFF = ESC + 'E' + '\x00';
  const DOUBLE_ON = GS + '!' + '\x11'; // Doble altura y ancho
  const DOUBLE_OFF = GS + '!' + '\x00';
  const CUT = GS + 'V' + '\x41' + '\x03'; // Corte parcial

  let rawData = INIT;
  for (const line of lines) {
    rawData += line + LF;
  }
  rawData += LF + LF + LF + CUT;

  const response = await fetch(`${API_URL}/print/raw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ip: config.printerIp,
      port: config.printerPort || 9100,
      data: Buffer.from(rawData, 'binary').toString('base64'),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Error de impresión' }));
    throw new Error(err.message || 'Error al imprimir via red');
  }
}

// ─────────────────────────────────────────────────────────────
// API PÚBLICA — Funciones que usa pos/page.tsx
// ─────────────────────────────────────────────────────────────

/**
 * Imprime la comanda de cocina
 */
export async function printComanda(order: any, config: PrintConfig): Promise<void> {
  const lines = buildComandaLines(order, config);

  if (config.method === 'network' && config.printerIp) {
    await printViaNetwork(lines, config);
  } else {
    printViaBrowser(lines, `Comanda - ${order.orderNumber || ''}`);
  }
}

/**
 * Imprime la pre-cuenta para mostrar al cliente
 */
export async function printPreBill(order: any, config: PrintConfig): Promise<void> {
  const lines = buildPreBillLines(order, config);

  if (config.method === 'network' && config.printerIp) {
    await printViaNetwork(lines, config);
  } else {
    printViaBrowser(lines, `Pre-cuenta - ${order.orderNumber || ''}`);
  }
}

/**
 * Imprime el recibo final con datos de factura SRI
 * invoice puede ser null si no hay factura electrónica
 */
export async function printReceipt(order: any, invoice: any | null, config: PrintConfig): Promise<void> {
  const lines = buildReceiptLines(order, invoice, config);

  if (config.method === 'network' && config.printerIp) {
    await printViaNetwork(lines, config);
  } else {
    printViaBrowser(lines, `Recibo - ${order.orderNumber || ''}`);
  }
}

/**
 * Test de impresora — imprime una página de prueba
 */
export async function printTestPage(config: PrintConfig): Promise<void> {
  const W = config.paperWidth || 40;
  const lines = [
    separator(W, '='),
    center('PÁGINA DE PRUEBA', W),
    center('TSH Restaurantes', W),
    separator(W, '-'),
    `Método: ${config.method}`,
    config.printerIp ? `IP: ${config.printerIp}:${config.printerPort || 9100}` : '',
    `Ancho: ${W} caracteres`,
    `Fecha: ${formatDate()}`,
    separator(W, '-'),
    center('Texto normal', W),
    twoColumns('Columna izquierda', 'Derecha', W),
    twoColumns('Producto ejemplo', '$9.99', W),
    separator(W, '-'),
    twoColumns('TOTAL', '$9.99', W),
    separator(W, '='),
    center('¡Impresora OK!', W),
    '',
    '',
  ].filter(l => l !== undefined) as string[];

  if (config.method === 'network' && config.printerIp) {
    await printViaNetwork(lines, config);
  } else {
    printViaBrowser(lines, 'Página de Prueba');
  }
}
