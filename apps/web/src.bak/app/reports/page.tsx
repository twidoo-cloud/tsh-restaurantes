'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { formatMoney } from '@/lib/currency';
import {
  Calendar, DollarSign, ShoppingCart, TrendingUp, Users as UsersIcon,
  Package, BarChart3, Clock, FileDown, FileSpreadsheet, Filter, ChevronDown, PieChart
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const headers = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const get = async <T,>(p: string): Promise<T> => { const r = await fetch(`${API}${p}`, { headers: headers() }); return r.json(); };

type Tab = 'sales' | 'products' | 'categories' | 'servers' | 'hourly' | 'weekly';

// Quick date range presets
const PRESETS: { label: string; from: string; to: string }[] = (() => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  return [
    { label: 'Hoy', from: fmt(today), to: fmt(today) },
    { label: 'Ayer', from: fmt(daysAgo(1)), to: fmt(daysAgo(1)) },
    { label: '7 días', from: fmt(daysAgo(7)), to: fmt(today) },
    { label: '30 días', from: fmt(daysAgo(30)), to: fmt(today) },
    { label: 'Este mes', from: fmt(monthStart), to: fmt(today) },
    { label: 'Mes pasado', from: fmt(lastMonthStart), to: fmt(lastMonthEnd) },
  ];
})();

// ─── MINI BAR CHART ───
function MiniBar({ data, color = '#2563eb' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-[2px] h-28">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 min-w-0 group relative">
          <div className="w-full flex flex-col items-center justify-end h-24">
            <div className="w-full max-w-[18px] rounded-t transition-all" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? '3px' : '0', backgroundColor: color }} />
          </div>
          <span className="text-[8px] text-gray-400 mt-0.5 truncate w-full text-center">{d.label}</span>
          {/* Tooltip */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
            {d.value > 999 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(d.value % 1 === 0 ? 0 : 2)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── HORIZONTAL BAR ───
function HBar({ items, color = '#2563eb' }: { items: { label: string; value: number; sub?: string }[]; color?: string }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="font-medium text-gray-700 truncate max-w-[60%]">{item.label}</span>
            <span className="text-gray-500">{item.sub || formatMoney(item.value)}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsContent() {
  const router = useRouter();
  const store = usePosStore();
  const [tab, setTab] = useState<Tab>('sales');
  const [from, setFrom] = useState(PRESETS[0].from);
  const [to, setTo] = useState(PRESETS[0].to);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `from=${from}&to=${to}`;
      let result: any;
      switch (tab) {
        case 'sales': result = await get(`/reports/sales?${qs}`); break;
        case 'products': result = await get(`/reports/products?${qs}`); break;
        case 'categories': result = await get(`/reports/categories?${qs}`); break;
        case 'servers': result = await get(`/reports/servers?${qs}`); break;
        case 'hourly': result = await get(`/reports/hourly?${qs}`); break;
        case 'weekly': result = await get(`/reports/weekly?${qs}`); break;
      }
      setData(result);
    } catch { /* ignore */ }
    setLoading(false);
  }, [tab, from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const applyPreset = (p: typeof PRESETS[0]) => { setFrom(p.from); setTo(p.to); };

  // ─── EXPORT EXCEL ───
  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const period = `${from} a ${to}`;

    if (tab === 'sales' && data?.daily) {
      const s1 = [['REPORTE DE VENTAS', ''], ['Período', period], [''],
        ['Ventas Brutas', data.summary?.gross_sales || 0], ['Ventas Netas', data.summary?.net_sales || 0],
        ['Impuestos', data.summary?.tax_total || 0], ['Descuentos', data.summary?.discounts || 0],
        ['Órdenes', data.summary?.completed || 0], ['Ticket Promedio', data.summary?.avg_ticket || 0]];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), 'Resumen');
      const s2 = [['Fecha', 'Órdenes', 'Ventas', 'Ticket Prom.'], ...data.daily.map((d: any) => [d.date, d.orders, d.sales, d.avg_ticket])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), 'Diario');
      if (data.payments?.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Método', 'Transacciones', 'Total'], ...data.payments.map((p: any) => [p.method, p.count, p.total])]), 'Pagos');
      }
    } else if (tab === 'products' && data?.products) {
      const rows = [['Producto', 'SKU', 'Categoría', 'Cantidad', 'Ingresos', 'Órdenes', 'Precio Prom.'],
        ...data.products.map((p: any) => [p.name, p.sku || '', p.category, p.total_quantity, p.total_revenue, p.order_count, p.avg_price])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Productos');
    } else if (tab === 'categories' && data?.categories) {
      const rows = [['Categoría', 'Ingresos', 'Items', 'Órdenes', '%'], ...data.categories.map((c: any) => [c.category, c.revenue, c.items_sold, c.order_count, c.percentage])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Categorías');
    } else if (tab === 'servers' && data?.servers) {
      const rows = [['Servidor', 'Rol', 'Órdenes', 'Ventas', 'Ticket Prom.', 'Tiempo Prom. (min)'],
        ...data.servers.map((s: any) => [s.name, s.role_name, s.orders_count, s.total_sales, s.avg_ticket, Math.round(s.avg_time_minutes)])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Meseros');
    } else if (tab === 'hourly' && data?.hourly) {
      const rows = [['Hora', 'Órdenes', 'Ventas', 'Ticket Prom.'], ...data.hourly.filter((h: any) => h.orders > 0).map((h: any) => [h.label, h.orders, h.sales, h.avg_ticket])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Por Hora');
    } else if (tab === 'weekly' && data?.weekly) {
      const rows = [['Día', 'Órdenes', 'Ventas', 'Ticket Prom.'], ...data.weekly.map((w: any) => [w.day, w.orders, w.sales, w.avg_ticket])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Por Día');
    }

    XLSX.writeFile(wb, `reporte-${tab}-${from}-${to}.xlsx`);
  };

  // ─── EXPORT PDF ───
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('portrait', 'mm', 'a4');
    let y = 20;
    const lm = 15;
    const rm = 195;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(`Reporte: ${TAB_LABELS[tab]}`, lm, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`Período: ${from} — ${to}`, lm, y); y += 8;
    doc.setDrawColor(200); doc.line(lm, y, rm, y); y += 6;

    const row = (l: string, r: string, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(9);
      doc.text(l, lm, y); doc.text(r, rm, y, { align: 'right' }); y += 5;
    };

    if (tab === 'sales' && data?.summary) {
      const s = data.summary;
      row('Ventas Brutas', formatMoney(s.gross_sales), true);
      row('Ventas Netas', formatMoney(s.net_sales));
      row('Impuestos', formatMoney(s.tax_total));
      row('Descuentos', formatMoney(s.discounts));
      row('Órdenes Completadas', `${s.completed}`);
      row('Ticket Promedio', formatMoney(s.avg_ticket));
      row('Ticket Máximo', formatMoney(s.max_ticket));
    } else if (tab === 'products' && data?.products) {
      data.products.slice(0, 30).forEach((p: any, i: number) => {
        row(`${i + 1}. ${p.name} (x${p.total_quantity})`, formatMoney(p.total_revenue));
      });
    } else if (tab === 'servers' && data?.servers) {
      data.servers.forEach((s: any) => { row(`${s.name} — ${s.orders_count} órdenes`, formatMoney(s.total_sales)); });
    } else if (tab === 'categories' && data?.categories) {
      data.categories.forEach((c: any) => { row(`${c.category} (${c.percentage}%)`, formatMoney(c.revenue)); });
    }

    y += 5; doc.setFontSize(7); doc.setTextColor(128);
    doc.text(`Generado: ${new Date().toLocaleString('es-EC')}`, lm, y);
    doc.save(`reporte-${tab}-${from}-${to}.pdf`);
  };

  const TAB_LABELS: Record<Tab, string> = {
    sales: 'Ventas', products: 'Productos', categories: 'Categorías',
    servers: 'Meseros', hourly: 'Por Hora', weekly: 'Por Día'
  };

  const TABS: { id: Tab; icon: any; label: string }[] = [
    { id: 'sales', icon: DollarSign, label: 'Ventas' },
    { id: 'products', icon: Package, label: 'Productos' },
    { id: 'categories', icon: PieChart, label: 'Categorías' },
    { id: 'servers', icon: UsersIcon, label: 'Meseros' },
    { id: 'hourly', icon: Clock, label: 'Por Hora' },
    { id: 'weekly', icon: Calendar, label: 'Por Día' },
  ];

  const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#dc2626', '#ca8a04', '#6366f1'];

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Reportes</h1>

          <div className="flex items-center gap-2">

            <button onClick={exportExcel} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium hover:bg-green-50">
            <FileSpreadsheet size={16} /> Excel
          </button>

            <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50">
            <FileDown size={16} /> PDF
          </button>

          </div>

        </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900" />
          <span className="text-gray-400">—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900" />
        </div>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${from === p.from && to === p.to ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b bg-white px-4 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-4">

            {/* ═══ SALES ═══ */}
            {tab === 'sales' && data?.summary && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Ventas Brutas', value: formatMoney(data.summary.gross_sales), icon: DollarSign, color: 'text-green-600 bg-green-50' },
                    { label: 'Órdenes', value: data.summary.completed, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Ticket Promedio', value: formatMoney(data.summary.avg_ticket), icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
                    { label: 'Impuestos', value: formatMoney(data.summary.tax_total), icon: BarChart3, color: 'text-amber-600 bg-amber-50' },
                  ].map(kpi => (
                    <div key={kpi.label} className="rounded-xl border bg-white p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`rounded-lg p-1.5 ${kpi.color}`}><kpi.icon size={16} /></div>
                        <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* Daily trend */}
                {data.daily?.length > 0 && (
                  <div className="rounded-xl border bg-white p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Ventas Diarias</h3>
                    <MiniBar data={data.daily.map((d: any) => ({ label: d.date?.slice(5, 10) || '', value: d.sales }))} color="#2563eb" />
                  </div>
                )}

                {/* Extra KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Ventas Netas</p><p className="text-lg font-bold text-gray-900">{formatMoney(data.summary.net_sales)}</p></div>
                  <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Descuentos</p><p className="text-lg font-bold text-red-600">{formatMoney(data.summary.discounts)}</p></div>
                  <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Ticket Máximo</p><p className="text-lg font-bold text-gray-900">{formatMoney(data.summary.max_ticket)}</p></div>
                  <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Canceladas</p><p className="text-lg font-bold text-gray-900">{data.summary.cancelled}</p></div>
                </div>

                {/* Payment methods */}
                {data.payments?.length > 0 && (
                  <div className="rounded-xl border bg-white p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Métodos de Pago</h3>
                    <HBar items={data.payments.map((p: any) => ({ label: PAYMENT_NAMES[p.method] || p.method, value: p.total, sub: `${p.count} tx — ${formatMoney(p.total)}` }))} color="#16a34a" />
                  </div>
                )}
              </>
            )}

            {/* ═══ PRODUCTS ═══ */}
            {tab === 'products' && data?.products && (
              <>
                <div className="rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Producto</th>
                        <th className="px-4 py-3 text-left">Categoría</th>
                        <th className="px-4 py-3 text-right">Cantidad</th>
                        <th className="px-4 py-3 text-right">Ingresos</th>
                        <th className="px-4 py-3 text-right">Órdenes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.products.map((p: any, i: number) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{p.category}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{p.total_quantity}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700">{formatMoney(p.total_revenue)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{p.order_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.products.length === 0 && <div className="py-8 text-center text-gray-400">Sin datos para este período</div>}
                </div>

                {/* Top 10 bar */}
                {data.products.length > 0 && (
                  <div className="rounded-xl border bg-white p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Top 10 por Ingresos</h3>
                    <HBar items={data.products.slice(0, 10).map((p: any) => ({ label: p.name, value: p.total_revenue }))} />
                  </div>
                )}
              </>
            )}

            {/* ═══ CATEGORIES ═══ */}
            {tab === 'categories' && data?.categories && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-white p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Ingresos por Categoría</h3>
                    <HBar items={data.categories.map((c: any, i: number) => ({ label: `${c.category} (${c.percentage}%)`, value: c.revenue }))} color="#9333ea" />
                  </div>
                  <div className="rounded-xl border bg-white p-4">
                    <h3 className="text-sm font-bold text-gray-800 mb-3">Items Vendidos</h3>
                    <HBar items={data.categories.map((c: any) => ({ label: c.category, value: c.items_sold, sub: `${c.items_sold} items` }))} color="#ea580c" />
                  </div>
                </div>
                <div className="rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr><th className="px-4 py-3 text-left">Categoría</th><th className="px-4 py-3 text-right">Ingresos</th><th className="px-4 py-3 text-right">Items</th><th className="px-4 py-3 text-right">Órdenes</th><th className="px-4 py-3 text-right">%</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.categories.map((c: any) => (
                        <tr key={c.category} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{c.category}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700">{formatMoney(c.revenue)}</td>
                          <td className="px-4 py-2.5 text-right">{c.items_sold}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{c.order_count}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{c.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ═══ SERVERS ═══ */}
            {tab === 'servers' && data?.servers && (
              <>
                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Ventas por Mesero</h3>
                  <HBar items={data.servers.map((s: any) => ({ label: s.name, value: s.total_sales, sub: `${s.orders_count} órdenes — ${formatMoney(s.total_sales)}` }))} color="#2563eb" />
                </div>
                <div className="rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr><th className="px-4 py-3 text-left">Mesero</th><th className="px-4 py-3 text-left">Rol</th><th className="px-4 py-3 text-right">Órdenes</th><th className="px-4 py-3 text-right">Ventas</th><th className="px-4 py-3 text-right">Ticket Prom.</th><th className="px-4 py-3 text-right">Tiempo Prom.</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.servers.map((s: any) => (
                        <tr key={s.user_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{s.role_name}</td>
                          <td className="px-4 py-2.5 text-right">{s.orders_count}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700">{formatMoney(s.total_sales)}</td>
                          <td className="px-4 py-2.5 text-right">{formatMoney(s.avg_ticket)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{Math.round(s.avg_time_minutes)} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.servers.length === 0 && <div className="py-8 text-center text-gray-400">Sin datos — asegúrate de asignar meseros a las órdenes</div>}
                </div>
              </>
            )}

            {/* ═══ HOURLY ═══ */}
            {tab === 'hourly' && data?.hourly && (
              <>
                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Ventas por Hora</h3>
                  <MiniBar data={data.hourly.map((h: any) => ({ label: h.label, value: h.sales }))} color="#2563eb" />
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Órdenes por Hora</h3>
                  <MiniBar data={data.hourly.map((h: any) => ({ label: h.label, value: h.orders }))} color="#16a34a" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(() => {
                    const active = data.hourly.filter((h: any) => h.orders > 0);
                    const peakHour = active.reduce((max: any, h: any) => h.sales > (max?.sales || 0) ? h : max, null);
                    const totalOrders = active.reduce((s: number, h: any) => s + h.orders, 0);
                    return [
                      { label: 'Hora Pico', value: peakHour?.label || '-' },
                      { label: 'Horas Activas', value: `${active.length}` },
                      { label: 'Total Órdenes', value: `${totalOrders}` },
                    ];
                  })().map(kpi => (
                    <div key={kpi.label} className="rounded-xl border bg-white p-4 text-center">
                      <p className="text-xs text-gray-500">{kpi.label}</p>
                      <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ═══ WEEKLY ═══ */}
            {tab === 'weekly' && data?.weekly && (
              <>
                <div className="rounded-xl border bg-white p-4">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Ventas por Día de la Semana</h3>
                  <MiniBar data={data.weekly.map((w: any) => ({ label: w.day.slice(0, 3), value: w.sales }))} color="#9333ea" />
                </div>
                <div className="rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr><th className="px-4 py-3 text-left">Día</th><th className="px-4 py-3 text-right">Órdenes</th><th className="px-4 py-3 text-right">Ventas</th><th className="px-4 py-3 text-right">Ticket Prom.</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.weekly.map((w: any) => (
                        <tr key={w.dow} className={`hover:bg-gray-50 ${w.orders === 0 ? 'opacity-40' : ''}`}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{w.day}</td>
                          <td className="px-4 py-2.5 text-right">{w.orders}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700">{formatMoney(w.sales)}</td>
                          <td className="px-4 py-2.5 text-right">{formatMoney(w.avg_ticket)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}

const PAYMENT_NAMES: Record<string, string> = { cash: 'Efectivo', credit_card: 'Tarjeta Crédito', debit_card: 'Tarjeta Débito', transfer: 'Transferencia', wallet: 'Billetera' };

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <ReportsContent />
    </Suspense>
  );
}
