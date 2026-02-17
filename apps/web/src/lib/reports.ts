/**
 * Report generation utilities for PDF and Excel exports.
 * Uses jsPDF for PDF and SheetJS (xlsx) for Excel.
 * Both libraries are dynamically imported to avoid bundle bloat.
 */

import { api } from '@/lib/api';

const apiGet = <T,>(path: string): Promise<T> => api.get<T>(path);

const METHOD_NAMES: Record<string, string> = {
  cash: 'Efectivo',
  credit_card: 'Tarjeta Crédito',
  debit_card: 'Tarjeta Débito',
  transfer: 'Transferencia',
  wallet: 'Billetera Digital',
};

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

// ─── PDF GENERATION ───

export async function generateShiftPDF(shiftId: string) {
  const [{ default: jsPDF }, detail] = await Promise.all([
    import('jspdf'),
    apiGet<any>(`/shifts/${shiftId}`),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: [80, 250] }); // Receipt width
  const w = 80;
  let y = 8;
  const lm = 5; // left margin
  const rm = w - 5; // right margin

  // Helper functions
  const center = (text: string, size: number) => {
    doc.setFontSize(size);
    const tw = doc.getTextWidth(text);
    doc.text(text, (w - tw) / 2, y);
    y += size * 0.45;
  };

  const line = () => {
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(lm, y, rm, y);
    y += 3;
  };

  const row = (left: string, right: string, bold = false) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(left, lm, y);
    const rw = doc.getTextWidth(right);
    doc.text(right, rm - rw, y);
    y += 4;
  };

  // ── Header ──
  doc.setFont('helvetica', 'bold');
  center('CIERRE DE CAJA', 12);
  y += 1;

  doc.setFont('helvetica', 'normal');
  center(detail.cash_register_name || 'Caja', 9);
  y += 2;
  line();

  // ── Info ──
  row('Abierto por:', detail.opened_by_name || '-');
  row('Cerrado por:', detail.closed_by_name || '-');
  row('Apertura:', new Date(detail.opened_at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }));
  if (detail.closed_at) {
    row('Cierre:', new Date(detail.closed_at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }));
  }
  row('Estado:', detail.status === 'open' ? 'ABIERTO' : 'CERRADO');
  y += 1;
  line();

  // ── Totales ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RESUMEN', lm, y);
  y += 5;

  row('Monto Apertura', fmt(detail.opening_amount));
  row('Ventas Totales', fmt(detail.total_sales), true);
  row('Órdenes', `${detail.orders_count || 0}`);

  if (detail.closing_amount != null) {
    y += 1;
    line();
    row('Esperado en Caja', fmt(detail.expected_amount || 0));
    row('Conteo Real', fmt(detail.closing_amount));
    const diff = detail.difference || 0;
    doc.setTextColor(diff === 0 ? 0 : diff > 0 ? 0 : 200, diff === 0 ? 128 : diff > 0 ? 0 : 0, 0);
    row('Diferencia', `${diff >= 0 ? '+' : ''}${fmt(diff)}`, true);
    doc.setTextColor(0, 0, 0);

    const status = diff === 0 ? '✓ CUADRA' : diff > 0 ? 'SOBRANTE' : 'FALTANTE';
    center(status, 10);
  }

  y += 1;
  line();

  // ── Pagos ──
  if (detail.payments?.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DESGLOSE DE PAGOS', lm, y);
    y += 5;

    detail.payments.forEach((p: any) => {
      row(`${METHOD_NAMES[p.method] || p.method} (${p.count})`, fmt(p.total));
    });

    y += 1;
    line();
  }

  // ── Top Productos ──
  if (detail.topProducts?.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOP PRODUCTOS', lm, y);
    y += 5;

    detail.topProducts.slice(0, 8).forEach((p: any) => {
      row(`${p.name} x${p.quantity}`, fmt(p.amount));
    });

    y += 1;
    line();
  }

  // ── Footer ──
  y += 2;
  doc.setFontSize(7);
  doc.setTextColor(128);
  const now = new Date().toLocaleString('es-EC');
  center(`Generado: ${now}`, 7);
  center('TSH Restaurantes — Reporte', 7);

  // Trim document to actual content height
  const pageHeight = y + 10;
  // Save
  const filename = `cierre-caja-${new Date(detail.opened_at).toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

// ─── EXCEL GENERATION ───

export async function generateShiftExcel(shiftId: string) {
  const [XLSX, detail] = await Promise.all([
    import('xlsx'),
    apiGet<any>(`/shifts/${shiftId}`),
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen
  const summaryData = [
    ['CIERRE DE CAJA'],
    [''],
    ['Caja', detail.cash_register_name],
    ['Abierto por', detail.opened_by_name],
    ['Cerrado por', detail.closed_by_name || '-'],
    ['Apertura', new Date(detail.opened_at).toLocaleString('es-EC')],
    ['Cierre', detail.closed_at ? new Date(detail.closed_at).toLocaleString('es-EC') : '-'],
    ['Estado', detail.status === 'open' ? 'ABIERTO' : 'CERRADO'],
    [''],
    ['RESUMEN'],
    ['Monto Apertura', detail.opening_amount],
    ['Ventas Totales', detail.total_sales],
    ['Órdenes', detail.orders_count || 0],
    [''],
  ];

  if (detail.closing_amount != null) {
    summaryData.push(
      ['ARQUEO'],
      ['Esperado en Caja', detail.expected_amount || 0],
      ['Conteo Real', detail.closing_amount],
      ['Diferencia', detail.difference || 0],
      ['Estado', detail.difference === 0 ? 'Cuadra' : detail.difference > 0 ? 'Sobrante' : 'Faltante'],
    );
  }

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // Sheet 2: Pagos
  if (detail.payments?.length > 0) {
    const payData = [
      ['Método de Pago', 'Transacciones', 'Total'],
      ...detail.payments.map((p: any) => [
        METHOD_NAMES[p.method] || p.method,
        p.count,
        p.total,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(payData);
    ws2['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Pagos');
  }

  // Sheet 3: Top Productos
  if (detail.topProducts?.length > 0) {
    const prodData = [
      ['Producto', 'Cantidad', 'Total'],
      ...detail.topProducts.map((p: any) => [p.name, p.quantity, p.amount]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(prodData);
    ws3['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Productos');
  }

  // Sheet 4: Ventas por Hora
  if (detail.hourlySales?.length > 0) {
    const hourData = [
      ['Hora', 'Órdenes', 'Total'],
      ...detail.hourlySales.map((h: any) => [`${h.hour}:00`, h.orders, h.total]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(hourData);
    ws4['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Ventas por Hora');
  }

  const filename = `cierre-caja-${new Date(detail.opened_at).toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─── DAILY SALES REPORT ───

export async function generateDailySalesPDF() {
  const [{ default: jsPDF }, dashboard] = await Promise.all([
    import('jspdf'),
    apiGet<any>('/dashboard/summary'),
  ]);

  const doc = new jsPDF('portrait', 'mm', 'a4');
  const w = 210;
  let y = 20;
  const lm = 15;
  const rm = w - 15;

  const center = (text: string, size: number) => {
    doc.setFontSize(size);
    const tw = doc.getTextWidth(text);
    doc.text(text, (w - tw) / 2, y);
    y += size * 0.5;
  };

  const line = () => {
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(lm, y, rm, y);
    y += 5;
  };

  const row = (left: string, right: string, bold = false) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(left, lm, y);
    const rw = doc.getTextWidth(right);
    doc.text(right, rm - rw, y);
    y += 5;
  };

  // Header
  doc.setFont('helvetica', 'bold');
  center('REPORTE DE VENTAS DIARIO', 16);
  y += 2;
  doc.setFont('helvetica', 'normal');
  center(new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 10);
  y += 5;
  line();

  // KPIs
  row('Ventas del día', fmt(dashboard.todaySales || 0), true);
  row('Órdenes del día', `${dashboard.todayOrders || 0}`);
  row('Ticket promedio', fmt(dashboard.avgTicket || 0));
  y += 2;
  line();

  // Payment methods
  if (dashboard.paymentMethods?.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Métodos de Pago', lm, y);
    y += 7;

    dashboard.paymentMethods.forEach((p: any) => {
      row(`${METHOD_NAMES[p.method] || p.method} (${p.count})`, fmt(p.total));
    });
    y += 2;
    line();
  }

  // Top products
  if (dashboard.topProducts?.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Productos Más Vendidos', lm, y);
    y += 7;

    dashboard.topProducts.slice(0, 10).forEach((p: any, i: number) => {
      row(`${i + 1}. ${p.name} (x${p.quantity})`, fmt(p.revenue || 0));
    });
    y += 2;
    line();
  }

  // Hourly sales
  if (dashboard.hourlySales?.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Ventas por Hora', lm, y);
    y += 7;

    dashboard.hourlySales.forEach((h: any) => {
      row(`${String(h.hour).padStart(2, '0')}:00`, `${h.orders} órdenes — ${fmt(h.total)}`);
    });
    y += 2;
    line();
  }

  // Footer
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(128);
  center(`Generado: ${new Date().toLocaleString('es-EC')}`, 8);
  center('TSH Restaurantes — Reporte', 8);

  doc.save(`ventas-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function generateDailySalesExcel() {
  const [XLSX, dashboard] = await Promise.all([
    import('xlsx'),
    apiGet<any>('/dashboard/summary'),
  ]);

  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['REPORTE DE VENTAS DIARIO'],
    ['Fecha', new Date().toLocaleDateString('es-EC')],
    [''],
    ['Ventas del día', dashboard.todaySales || 0],
    ['Órdenes del día', dashboard.todayOrders || 0],
    ['Ticket promedio', dashboard.avgTicket || 0],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  if (dashboard.topProducts?.length > 0) {
    const prodData = [
      ['Producto', 'Cantidad', 'Total'],
      ...dashboard.topProducts.map((p: any) => [p.name, p.quantity, p.revenue || 0]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(prodData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Top Productos');
  }

  if (dashboard.hourlySales?.length > 0) {
    const hourData = [
      ['Hora', 'Órdenes', 'Total'],
      ...dashboard.hourlySales.map((h: any) => [`${h.hour}:00`, h.orders, h.total]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(hourData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Ventas por Hora');
  }

  XLSX.writeFile(wb, `ventas-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
