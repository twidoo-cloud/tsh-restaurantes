'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import {
  DollarSign, ShoppingCart, TrendingUp, Users, Clock,
  BarChart3, RefreshCw, Utensils, CreditCard, Banknote, ChefHat, LayoutGrid,
  FileDown, FileSpreadsheet
} from 'lucide-react';
import { generateDailySalesPDF, generateDailySalesExcel } from '@/lib/reports';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const apiGet = async <T,>(path: string): Promise<T> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Error');
  return res.json();
};

function formatCurrency(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}

// Simple bar chart component (no external deps)
function BarChart({ data, maxVal, color = 'bg-blue-500' }: { data: { label: string; value: number }[]; maxVal: number; color?: string }) {
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 min-w-0">
          <div className="w-full flex flex-col items-center justify-end h-28">
            {d.value > 0 && (
              <span className="text-[9px] text-gray-500 mb-0.5">{d.value > 999 ? `${(d.value / 1000).toFixed(1)}k` : Math.round(d.value)}</span>
            )}
            <div
              className={`w-full max-w-[20px] rounded-t ${color} transition-all duration-500`}
              style={{ height: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%`, minHeight: d.value > 0 ? '4px' : '0' }}
            />
          </div>
          <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Donut/pie chart
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin datos</div>;

  let cumPercent = 0;
  const gradientParts = segments.map((seg) => {
    const percent = (seg.value / total) * 100;
    const start = cumPercent;
    cumPercent += percent;
    return `${seg.color} ${start}% ${cumPercent}%`;
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}>
        <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center">
          <span className="text-xs font-bold text-gray-700">{formatCurrency(total)}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="font-semibold text-gray-800">{formatCurrency(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAYMENT_ICONS: Record<string, any> = {
  cash: { icon: Banknote, color: 'text-green-600', bg: 'bg-green-50' },
  credit_card: { icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
  debit_card: { icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
  transfer: { icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50' },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo', credit_card: 'Tarjeta Crédito', debit_card: 'Tarjeta Débito',
  transfer: 'Transferencia', wallet: 'Billetera',
};

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function DashboardPage() {
  const router = useRouter();
  const store = usePosStore();
  const [summary, setSummary] = useState<any>(null);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [tableStats, setTableStats] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [serverStats, setServerStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [sum, hourly, top, cats, tables, recent, servers] = await Promise.all([
        apiGet<any>('/dashboard/summary'),
        apiGet<any[]>('/dashboard/sales-by-hour'),
        apiGet<any[]>('/dashboard/top-products'),
        apiGet<any[]>('/dashboard/sales-by-category'),
        apiGet<any[]>('/dashboard/table-stats'),
        apiGet<any[]>('/dashboard/recent-orders'),
        apiGet<any[]>('/dashboard/server-stats'),
      ]);
      setSummary(sum);
      setHourlyData(hourly);
      setTopProducts(top);
      setCategoryData(cats);
      setTableStats(tables);
      setRecentOrders(recent);
      setServerStats(servers);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const s = summary?.summary;
  const maxHourlySales = Math.max(...hourlyData.map(h => h.sales), 1);
  const activeHours = hourlyData.filter(h => h.sales > 0);
  const displayHours = activeHours.length > 0 ? hourlyData.filter(h => h.hour >= Math.min(...activeHours.map(a => a.hour)) - 1 && h.hour <= Math.max(...activeHours.map(a => a.hour)) + 1) : hourlyData.filter(h => h.hour >= 8 && h.hour <= 22);

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>

          <div className="flex items-center gap-2">

            <button onClick={() => generateDailySalesPDF()} className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50" title="Exportar PDF">
            <FileDown size={16} /> PDF
          </button>

            <button onClick={() => generateDailySalesExcel()} className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50" title="Exportar Excel">
            <FileSpreadsheet size={16} /> Excel
          </button>

            <button onClick={loadData} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <RefreshCw size={18} />
          </button>

          </div>

        </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="mx-auto max-w-7xl space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard icon={DollarSign} label="Ventas Brutas" value={formatCurrency(s?.gross_sales || 0)} color="text-green-600" bg="bg-green-50" />
              <KpiCard icon={ShoppingCart} label="Órdenes" value={s?.completed_orders || 0} sub={`${s?.active_orders || 0} activas`} color="text-blue-600" bg="bg-blue-50" />
              <KpiCard icon={TrendingUp} label="Ticket Promedio" value={formatCurrency(s?.avg_ticket || 0)} color="text-purple-600" bg="bg-purple-50" />
              <KpiCard icon={DollarSign} label="IGV Recaudado" value={formatCurrency(s?.tax_collected || 0)} color="text-amber-600" bg="bg-amber-50" />
              <KpiCard icon={TrendingUp} label="Ticket Máximo" value={formatCurrency(s?.max_ticket || 0)} color="text-cyan-600" bg="bg-cyan-50" />
              <KpiCard icon={ShoppingCart} label="Descuentos" value={formatCurrency(s?.discounts || 0)} color="text-red-600" bg="bg-red-50" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Sales by Hour */}
              <div className="lg:col-span-2 rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" /> Ventas por Hora (Hoy)
                </h3>
                {displayHours.length > 0 ? (
                  <BarChart
                    data={displayHours.map(h => ({ label: h.label, value: h.sales }))}
                    maxVal={maxHourlySales}
                    color="bg-blue-500"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin ventas hoy</div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CreditCard size={16} className="text-purple-500" /> Métodos de Pago
                </h3>
                {summary?.paymentMethods?.length > 0 ? (
                  <div className="space-y-3">
                    {summary.paymentMethods.map((pm: any) => {
                      const style = PAYMENT_ICONS[pm.method] || PAYMENT_ICONS.cash;
                      const Icon = style.icon;
                      return (
                        <div key={pm.method} className={`flex items-center justify-between rounded-lg p-3 ${style.bg}`}>
                          <div className="flex items-center gap-2">
                            <Icon size={18} className={style.color} />
                            <span className="text-sm font-medium text-gray-700">{PAYMENT_LABELS[pm.method] || pm.method}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(pm.total)}</p>
                            <p className="text-xs text-gray-500">{pm.count} pagos</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin pagos hoy</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Top Products */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" /> Top Productos
                </h3>
                {topProducts.length > 0 ? (
                  <div className="space-y-2">
                    {topProducts.map((p: any, i: number) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.total_quantity} vendidos · {p.order_count} órdenes</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(p.total_revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin datos</div>
                )}
              </div>

              {/* Sales by Category */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BarChart3 size={16} className="text-amber-500" /> Ventas por Categoría
                </h3>
                {categoryData.length > 0 ? (
                  <DonutChart segments={categoryData.map((c: any, i: number) => ({
                    label: c.category,
                    value: c.revenue,
                    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  }))} />
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin datos</div>
                )}
              </div>

              {/* Server Performance */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users size={16} className="text-blue-500" /> Rendimiento Equipo
                </h3>
                {serverStats.length > 0 ? (
                  <div className="space-y-3">
                    {serverStats.map((sv: any, i: number) => (
                      <div key={i} className="rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{sv.server_name}</p>
                            <p className="text-xs text-gray-400">{sv.role_name} · {sv.orders_count} órdenes</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{formatCurrency(sv.total_sales)}</p>
                            <p className="text-xs text-gray-500">Prom: {formatCurrency(sv.avg_ticket)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin datos</div>
                )}
              </div>
            </div>

            {/* Recent Orders & Table Stats */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Recent Orders */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <ShoppingCart size={16} className="text-blue-500" /> Últimas Órdenes
                </h3>
                {recentOrders.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {recentOrders.map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{o.orderNumber}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {o.items?.length} items · {o.payments?.[0]?.method ? PAYMENT_LABELS[o.payments[0].method] || o.payments[0].method : ''}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(parseFloat(o.total))}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin órdenes completadas</div>
                )}
              </div>

              {/* Table Performance */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Utensils size={16} className="text-orange-500" /> Rendimiento de Mesas
                </h3>
                {tableStats.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {tableStats.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            t.current_status === 'available' ? 'bg-green-500' : t.current_status === 'occupied' ? 'bg-blue-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-sm font-medium text-gray-900">Mesa {t.table_number}</span>
                          <span className="text-xs text-gray-400">{t.orders_today} órdenes</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(t.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin datos</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}

// KPI Card component
function KpiCard({ icon: Icon, label, value, sub, color, bg }: { icon: any; label: string; value: any; sub?: string; color: string; bg: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-lg p-1.5 ${bg}`}><Icon size={16} className={color} /></div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
