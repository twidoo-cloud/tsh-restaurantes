/**
 * TSH Restaurantes — Print utilities
 * Generates thermal-style print layouts for:
 *   - Kitchen tickets (comandas)
 *   - Pre-bills (prefacturas)
 * Uses window.print() with a hidden iframe for clean output.
 */

import { formatMoney, getCurrencySymbol, getTaxName, getTaxRate } from './currency';

interface OrderItem {
  id: string;
  product?: { name?: string; sku?: string; attributes?: any };
  productName?: string;
  quantity: string | number;
  unitPrice: string | number;
  subtotal: string | number;
  taxAmount?: string | number;
  notes?: string;
  isVoid?: boolean;
  modifiers?: any;
}

interface Order {
  id: string;
  orderNumber: string;
  type?: string;
  status?: string;
  subtotal: string | number;
  taxAmount: string | number;
  discountAmount?: string | number;
  total: string | number;
  notes?: string;
  metadata?: any;
  items: OrderItem[];
  customer?: { name?: string; taxId?: string; taxIdType?: string; phone?: string; email?: string } | null;
  payments?: any[];
  createdAt?: string;
  openedAt?: string;
}

interface PrintConfig {
  businessName: string;
  businessAddress?: string;
  ruc?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  tableNumber?: string;
  serverName?: string;
}

function getActiveItems(order: Order): OrderItem[] {
  return order.items.filter(i => !i.isVoid);
}

function getItemName(item: OrderItem): string {
  return item.product?.name || item.productName || 'Producto';
}

function getStation(item: OrderItem): string {
  return item.product?.attributes?.kitchen_station || '';
}

function n(v: string | number | undefined | null): number {
  return typeof v === 'number' ? v : parseFloat(String(v || '0')) || 0;
}

function fmtDate(d?: string): string {
  const date = d ? new Date(d) : new Date();
  return date.toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function printHTML(html: string, title: string) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:80mm;height:auto;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  @page { margin: 2mm; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 76mm; color: #000; line-height: 1.4; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 16px; font-weight: bold; }
  .small { font-size: 10px; }
  .right { text-align: right; }
  .row { display: flex; justify-content: space-between; }
  .dashed { border-top: 1px dashed #000; margin: 4px 0; }
  .double { border-top: 2px double #000; margin: 4px 0; }
  .item { padding: 2px 0; }
  .item-name { font-weight: bold; }
  .item-note { font-size: 10px; padding-left: 8px; font-style: italic; }
  .station { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; padding: 2px 0; margin-top: 4px; }
  .total-row { font-size: 14px; font-weight: bold; }
  .mt { margin-top: 6px; }
  .mb { margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  td.qty { width: 24px; text-align: center; }
  td.price { text-align: right; white-space: nowrap; }
  td.name { }
</style>
</head><body>${html}</body></html>`);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    try { iframe.contentWindow?.print(); } catch {}
    setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 1000);
  }, 1500);
}

// ═══════════════════════════════════════════
// KITCHEN TICKET (COMANDA)
// ═══════════════════════════════════════════
export function printComanda(order: Order, config: PrintConfig) {
  const items = getActiveItems(order);
  const now = fmtDate();
  const tableInfo = config.tableNumber ? `MESA ${config.tableNumber}` : (order.metadata?.table_id ? 'MESA' : 'PARA LLEVAR');

  // Group items by kitchen station
  const grouped: Record<string, OrderItem[]> = {};
  items.forEach(item => {
    const station = getStation(item) || 'general';
    if (!grouped[station]) grouped[station] = [];
    grouped[station].push(item);
  });

  const stationLabels: Record<string, string> = {
    grill: 'PARRILLA', cold: 'FRÍOS', bar: 'BAR',
    pastry: 'PASTELERÍA', general: 'COCINA',
  };

  let html = `
    <div class="center big mb">=== COMANDA ===</div>
    <div class="dashed"></div>
    <div class="row"><span class="bold">Orden:</span><span class="bold big">#${order.orderNumber}</span></div>
    <div class="row"><span>${now}</span><span class="bold">${tableInfo}</span></div>
    ${config.serverName ? `<div class="row"><span>Mesero:</span><span>${config.serverName}</span></div>` : ''}
    <div class="dashed"></div>
  `;

  // Items grouped by station
  Object.entries(grouped).forEach(([station, stationItems]) => {
    html += `<div class="station">▶ ${stationLabels[station] || station.toUpperCase()}</div>`;
    stationItems.forEach(item => {
      const qty = n(item.quantity);
      html += `
        <div class="item">
          <div class="row">
            <span class="item-name">${qty > 1 ? qty + 'x ' : ''}${getItemName(item)}</span>
          </div>
          ${item.notes ? `<div class="item-note">→ ${item.notes}</div>` : ''}
        </div>
      `;
    });
  });

  html += `
    <div class="dashed"></div>
    <div class="center small">Total items: ${items.length}</div>
    ${order.notes ? `<div class="dashed"></div><div class="center small bold">NOTA: ${order.notes}</div>` : ''}
    <div class="dashed"></div>
    <div class="center small">${config.businessName}</div>
    <div style="margin-bottom:10mm"></div>
  `;

  printHTML(html, `Comanda #${order.orderNumber}`);
}

// Print comanda for a specific station only
export function printComandaByStation(order: Order, station: string, config: PrintConfig) {
  const items = getActiveItems(order).filter(i => (getStation(i) || 'general') === station);
  if (items.length === 0) return;

  const now = fmtDate();
  const tableInfo = config.tableNumber ? `MESA ${config.tableNumber}` : 'PARA LLEVAR';
  const stationLabels: Record<string, string> = {
    grill: 'PARRILLA', cold: 'FRÍOS', bar: 'BAR',
    pastry: 'PASTELERÍA', general: 'COCINA',
  };

  let html = `
    <div class="center big mb">▶ ${stationLabels[station] || station.toUpperCase()}</div>
    <div class="dashed"></div>
    <div class="row"><span class="bold">Orden:</span><span class="bold big">#${order.orderNumber}</span></div>
    <div class="row"><span>${now}</span><span class="bold">${tableInfo}</span></div>
    <div class="dashed"></div>
  `;

  items.forEach(item => {
    const qty = n(item.quantity);
    html += `
      <div class="item">
        <div class="item-name">${qty > 1 ? qty + 'x ' : ''}${getItemName(item)}</div>
        ${item.notes ? `<div class="item-note">→ ${item.notes}</div>` : ''}
      </div>
    `;
  });

  html += `
    <div class="dashed"></div>
    <div class="center small">${config.businessName} | Orden #${order.orderNumber}</div>
    <div style="margin-bottom:10mm"></div>
  `;

  printHTML(html, `Comanda ${station} #${order.orderNumber}`);
}

// ═══════════════════════════════════════════
// PRE-BILL (PREFACTURA)
// ═══════════════════════════════════════════
export function printPreBill(order: Order, config: PrintConfig) {
  const items = getActiveItems(order);
  const sym = getCurrencySymbol();
  const taxName = getTaxName();
  const now = fmtDate();
  const tableInfo = config.tableNumber ? `Mesa: ${config.tableNumber}` : '';

  const subtotal = n(order.subtotal);
  const tax = n(order.taxAmount);
  const discount = n(order.discountAmount);
  const total = n(order.total);

  let html = `
    <div class="center bold mb">${config.receiptHeader || config.businessName}</div>
    ${config.businessAddress ? `<div class="center small">${config.businessAddress}</div>` : ''}
    ${config.ruc ? `<div class="center small">RUC: ${config.ruc}</div>` : ''}
    <div class="double"></div>
    <div class="center bold">*** PRE-FACTURA ***</div>
    <div class="center small">Documento no fiscal</div>
    <div class="dashed"></div>
    <div class="row"><span>Orden:</span><span class="bold">#${order.orderNumber}</span></div>
    <div class="row"><span>Fecha:</span><span>${now}</span></div>
    ${tableInfo ? `<div class="row"><span>${tableInfo}</span><span>${config.serverName || ''}</span></div>` : ''}
    ${order.customer?.name ? `<div class="row"><span>Cliente:</span><span>${order.customer.name}</span></div>` : ''}
    ${order.customer?.taxId ? `<div class="row"><span>${order.customer.taxIdType === 'ruc' ? 'RUC' : 'CI'}:</span><span>${order.customer.taxId}</span></div>` : ''}
    <div class="dashed"></div>
    <table>
      <tr class="bold"><td class="qty">Qty</td><td class="name">Producto</td><td class="price">Total</td></tr>
    </table>
    <div class="dashed"></div>
    <table>
  `;

  items.forEach(item => {
    const qty = n(item.quantity);
    const sub = n(item.subtotal);
    const unit = n(item.unitPrice);
    html += `
      <tr>
        <td class="qty">${qty}</td>
        <td class="name">${getItemName(item)}</td>
        <td class="price">${sym} ${sub.toFixed(2)}</td>
      </tr>
    `;
    if (qty > 1) {
      html += `<tr><td></td><td class="small">  @ ${sym} ${unit.toFixed(2)} c/u</td><td></td></tr>`;
    }
    if (item.notes) {
      html += `<tr><td></td><td class="small item-note">→ ${item.notes}</td><td></td></tr>`;
    }
  });

  html += `
    </table>
    <div class="dashed"></div>
    <div class="row"><span>Subtotal:</span><span>${sym} ${subtotal.toFixed(2)}</span></div>
    ${discount > 0 ? `<div class="row"><span>Descuento:</span><span>-${sym} ${discount.toFixed(2)}</span></div>` : ''}
    ${tax > 0 ? `<div class="row"><span>${taxName}:</span><span>${sym} ${tax.toFixed(2)}</span></div>` : ''}
    <div class="double"></div>
    <div class="row total-row"><span>TOTAL:</span><span>${sym} ${total.toFixed(2)}</span></div>
    <div class="double"></div>
  `;

  // Payment status
  const payments = order.payments || [];
  if (payments.length > 0) {
    const methodLabels: Record<string, string> = {
      cash: 'Efectivo', credit_card: 'Tarjeta', debit_card: 'Débito', transfer: 'Transferencia', credit: 'Crédito',
    };
    html += `<div class="mt"></div>`;
    payments.forEach((p: any) => {
      html += `<div class="row small"><span>Pago ${methodLabels[p.method] || p.method}:</span><span>${sym} ${n(p.amount).toFixed(2)}</span></div>`;
      if (p.cashReceived && n(p.cashReceived) > n(p.amount)) {
        html += `<div class="row small"><span>Recibido:</span><span>${sym} ${n(p.cashReceived).toFixed(2)}</span></div>`;
        html += `<div class="row small"><span>Cambio:</span><span>${sym} ${n(p.changeGiven).toFixed(2)}</span></div>`;
      }
    });
    html += `<div class="dashed"></div>`;
  }

  html += `
    <div class="center mt">${config.receiptFooter || 'Gracias por su compra'}</div>
    <div class="dashed"></div>
    <div class="center small">TSH Restaurantes</div>
    <div class="center small">www.twidoo.co</div>
    <div style="margin-bottom:10mm"></div>
  `;

  printHTML(html, `PreFactura #${order.orderNumber}`);
}

// ═══════════════════════════════════════════
// HELPER: Get print config from localStorage
// ═══════════════════════════════════════════
export function getPrintConfig(overrides?: Partial<PrintConfig>): PrintConfig {
  let tenant: any = {};
  let sriConfig: any = {};
  try { tenant = JSON.parse(localStorage.getItem('pos_tenant') || '{}'); } catch {}
  try { sriConfig = JSON.parse(localStorage.getItem('pos_sri_config') || '{}'); } catch {}

  return {
    businessName: sriConfig.razonSocial || sriConfig.nombreComercial || tenant.name || 'Restaurante',
    businessAddress: sriConfig.direccionMatriz || undefined,
    ruc: sriConfig.ruc || tenant.taxId || undefined,
    receiptHeader: tenant.settings?.receiptHeader || tenant.name || 'Restaurante',
    receiptFooter: tenant.settings?.receiptFooter || 'Gracias por su compra',
    ...overrides,
  };
}

export function getTemplateSettings(): any {
  try {
    const tenant = JSON.parse(localStorage.getItem('pos_tenant') || '{}');
    return tenant.settings?.printTemplates || {};
  } catch { return {}; }
}
