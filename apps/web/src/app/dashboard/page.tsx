'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';
import { SetupProgressBanner } from '@/components/welcome-wizard';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { api } from '@/lib/api';
import {
  DollarSign, ShoppingCart, TrendingUp, Users, Clock,
  BarChart3, RefreshCw, Utensils, CreditCard, Banknote,
  FileDown, FileSpreadsheet, Radio
} from 'lucide-react';
import { formatMoney } from '@/lib/currency';
import { generateDailySalesPDF, generateDailySalesExcel } from '@/lib/reports';
import { useLiveDashboard, EVENT_LABELS } from '@/lib/use-socket';


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
          <span className="text-xs font-bold text-gray-700">{formatMoney(total)}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="font-semibold text-gray-800">{formatMoney(seg.value)}</span>
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
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { connected: wsConnected, liveEvents, sessionTotals } = useLiveDashboard();

  const loadData = useCallback(async () => {
    try {
      const [sum, hourly, top, cats, tables, recent, servers, costs] = await Promise.all([
        api.get<any>('/dashboard/summary'),
        api.get<any[]>('/dashboard/sales-by-hour'),
        api.get<any[]>('/dashboard/top-products'),
        api.get<any[]>('/dashboard/sales-by-category'),
        api.get<any[]>('/dashboard/table-stats'),
        api.get<any[]>('/dashboard/recent-orders'),
        api.get<any[]>('/dashboard/server-stats'),
        api.get<any>('/dashboard/cost-analysis'),
      ]);
      setSummary(sum);
      setHourlyData(hourly);
      setTopProducts(top);
      setCategoryData(cats);
      setTableStats(tables);
      setRecentOrders(recent);
      setServerStats(servers);
      setCostAnalysis(costs);
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
    // Poll less frequently since WS provides real-time updates
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Refresh dashboard data when payment events arrive via WS
  useEffect(() => {
    if (liveEvents.length === 0) return;
    const last = liveEvents[0];
    if (last?.type === 'order:paid' || last?.type === 'order:cancelled' || last?.type === 'shift:closed') {
      loadData();
    }
  }, [liveEvents.length]);

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
            {/* Setup progress */}
            <SetupProgressBanner />
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard icon={DollarSign} label="Ventas Brutas" value={formatMoney(s?.gross_sales || 0)} color="text-green-600" bg="bg-green-50" />
              <KpiCard icon={ShoppingCart} label="Órdenes" value={s?.completed_orders || 0} sub={`${s?.active_orders || 0} activas`} color="text-blue-600" bg="bg-blue-50" />
              <KpiCard icon={TrendingUp} label="Ticket Promedio" value={formatMoney(s?.avg_ticket || 0)} color="text-purple-600" bg="bg-purple-50" />
              <KpiCard icon={DollarSign} label="IVA Recaudado" value={formatMoney(s?.tax_collected || 0)} color="text-amber-600" bg="bg-amber-50" />
              <KpiCard icon={TrendingUp} label="Ticket Máximo" value={formatMoney(s?.max_ticket || 0)} color="text-cyan-600" bg="bg-cyan-50" />
              <KpiCard icon={ShoppingCart} label="Descuentos" value={formatMoney(s?.discounts || 0)} color="text-red-600" bg="bg-red-50" />
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
                            <p className="text-sm font-bold text-gray-900">{formatMoney(pm.total)}</p>
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
                        <span className="text-sm font-bold text-gray-900">{formatMoney(p.total_revenue)}</span>
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
                            <p className="text-sm font-bold text-green-600">{formatMoney(sv.total_sales)}</p>
                            <p className="text-xs text-gray-500">Prom: {formatMoney(sv.avg_ticket)}</p>
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
                        <span className="text-sm font-bold text-gray-900">{formatMoney(parseFloat(o.total))}</span>
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
                        <span className="text-sm font-bold text-gray-900">{formatMoney(t.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-400">Sin datos</div>
                )}
              </div>
            </div>

            {/* Cost & Margin Analysis */}
            {costAnalysis && costAnalysis.today && (
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" /> Costos y Márgenes (Hoy)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div className="rounded-lg bg-blue-50 p-2.5 text-center">
                    <p className="text-lg font-bold text-blue-700">{formatMoney(costAnalysis.today.revenue)}</p>
                    <p className="text-[10px] text-blue-500">Ventas</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2.5 text-center">
                    <p className="text-lg font-bold text-red-600">{formatMoney(costAnalysis.today.estimatedCost)}</p>
                    <p className="text-[10px] text-red-500">Costo estimado</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-2.5 text-center">
                    <p className="text-lg font-bold text-green-700">{formatMoney(costAnalysis.today.estimatedProfit)}</p>
                    <p className="text-[10px] text-green-500">Ganancia</p>
                  </div>
                  <div className={`rounded-lg p-2.5 text-center ${costAnalysis.today.avgMargin >= 50 ? 'bg-green-50' : costAnalysis.today.avgMargin >= 30 ? 'bg-amber-50' : 'bg-red-50'}`}>
                    <p className={`text-lg font-bold ${costAnalysis.today.avgMargin >= 50 ? 'text-green-700' : costAnalysis.today.avgMargin >= 30 ? 'text-amber-700' : 'text-red-600'}`}>
                      {costAnalysis.today.avgMargin}%
                    </p>
                    <p className="text-[10px] text-gray-500">Margen promedio</p>
                  </div>
                </div>
                {costAnalysis.today.productsWithoutCost > 0 && (
                  <p className="text-[10px] text-amber-600 mb-2">⚠ {costAnalysis.today.productsWithoutCost} productos vendidos sin receta/costo asignado</p>
                )}
                {costAnalysis.lowStockAlerts?.length > 0 && (
                  <div className="mt-2 rounded-lg bg-red-50 px-3 py-2">
                    <p className="text-[10px] font-semibold text-red-600 mb-1">Ingredientes con stock bajo:</p>
                    <div className="flex flex-wrap gap-1">
                      {costAnalysis.lowStockAlerts.map((a: any) => (
                        <span key={a.id} className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">
                          {a.name}: {a.current_stock} {a.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Activity Feed */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Radio size={16} className={wsConnected ? 'text-green-500 animate-pulse' : 'text-gray-400'} />
                  Actividad en vivo
                </h3>
                <div className="flex items-center gap-2">
                  {wsConnected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      Desconectado
                    </span>
                  )}
                  {sessionTotals.ordersCreated > 0 && (
                    <span className="text-[10px] text-gray-400">
                      +{formatMoney(sessionTotals.salesAmount)} · {sessionTotals.ordersPaid} cobradas
                    </span>
                  )}
                </div>
              </div>
              {liveEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-hide">
                  {liveEvents.map((ev, i) => {
                    const meta = EVENT_LABELS[ev.type] || { label: ev.type, icon: '📌', color: 'text-gray-600 bg-gray-50' };
                    const time = ev._at ? new Date(ev._at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
                    return (
                      <div key={`${ev.type}-${i}`} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${meta.color} ${i === 0 ? 'ring-1 ring-inset ring-current/10' : ''}`}>
                        <span className="text-sm">{meta.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold">{meta.label}</span>
                          {ev.orderNumber && <span className="ml-1.5 text-xs opacity-70">#{ev.orderNumber}</span>}
                          {ev.total && <span className="ml-1.5 text-xs font-bold">{formatMoney(ev.total)}</span>}
                          {ev.method && <span className="ml-1 text-[10px] opacity-60">({ev.method})</span>}
                          {ev.tableNumber && <span className="ml-1.5 text-[10px] opacity-60">Mesa {ev.tableNumber}</span>}
                        </div>
                        <span className="text-[10px] opacity-50 shrink-0">{time}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <Radio size={24} className="mb-2 opacity-30" />
                  <p className="text-xs">{wsConnected ? 'Esperando actividad...' : 'Conectando al servidor...'}</p>
                  <p className="text-[10px] mt-1 opacity-60">Las ventas, órdenes y eventos aparecerán aquí en tiempo real</p>
                </div>
              )}
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
