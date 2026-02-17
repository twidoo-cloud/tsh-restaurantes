'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Search, Filter, AlertTriangle, AlertCircle, Info,
  User, Clock, Activity, ChevronDown, ChevronLeft, ChevronRight,
  RefreshCw, Download, X, Eye, FileText, Settings, ShoppingCart,
  Package, CreditCard, Users, Truck, Zap, Calendar,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const hdrs = () => ({ 'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('pos_token') : ''}`, 'Content-Type': 'application/json' });
const get = async <T,>(p: string): Promise<T> => { const r = await fetch(`${API}${p}`, { headers: hdrs() }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Error'); return r.json(); };

const SEVERITY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  info:     { label: 'Info',     icon: Info,           color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  warning:  { label: 'Alerta',   icon: AlertTriangle,  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  critical: { label: 'Crítico',  icon: AlertCircle,    color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Crear', update: 'Actualizar', delete: 'Eliminar', login: 'Iniciar sesión',
  logout: 'Cerrar sesión', void: 'Anular', refund: 'Reembolso', open: 'Abrir',
  close: 'Cerrar', send: 'Enviar', approve: 'Aprobar', reject: 'Rechazar',
  export: 'Exportar', import: 'Importar', charge: 'Cargo', payment: 'Pago',
  adjustment: 'Ajuste', suspend: 'Suspender', activate: 'Activar',
};

const ENTITY_ICONS: Record<string, any> = {
  order: ShoppingCart, product: Package, customer: User, shift: CreditCard,
  invoice: FileText, settings: Settings, inventory: Package, staff: Users,
  delivery: Truck, sri: Zap, reservation: Calendar, credit: CreditCard,
};

export default function AuditPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterOptions, setFilterOptions] = useState<any>({ actions: [], entities: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [view, setView] = useState<'dashboard' | 'logs'>('dashboard');

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [dash, filters] = await Promise.all([
        get<any>('/audit/dashboard'),
        get<any>('/audit/filters'),
      ]);
      setDashboard(dash);
      setFilterOptions(filters);
    } catch (e) { console.error(e); }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);
      if (severityFilter) params.set('severity', severityFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('page', page.toString());
      params.set('limit', '50');

      const result = await get<any>(`/audit/logs?${params.toString()}`);
      setLogs(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, actionFilter, entityFilter, severityFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadDashboard();
    loadLogs();
  }, []);

  useEffect(() => { loadLogs(); }, [page, actionFilter, entityFilter, severityFilter, dateFrom, dateTo]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadLogs(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const clearFilters = () => {
    setSearch(''); setActionFilter(''); setEntityFilter('');
    setSeverityFilter(''); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const hasFilters = search || actionFilter || entityFilter || severityFilter || dateFrom || dateTo;

  const s = dashboard?.summary || {};

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">Auditoría</h1>
          <div className="flex rounded-lg border bg-gray-50 p-0.5">
            <button onClick={() => setView('dashboard')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${view === 'dashboard' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              Dashboard
            </button>
            <button onClick={() => setView('logs')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${view === 'logs' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              Registros
            </button>
          </div>
        </div>
        <button onClick={() => { loadDashboard(); loadLogs(); }}
          className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ═══ DASHBOARD VIEW ═══ */}
        {view === 'dashboard' && dashboard && (
          <div className="p-4 space-y-4 max-w-5xl mx-auto">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium"><Activity size={14} /> Eventos (30d)</div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{(s.total_events || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-medium"><Clock size={14} /> Hoy</div>
                <p className="text-2xl font-bold text-blue-700 mt-1">{s.today_count || 0}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-amber-600 font-medium"><AlertTriangle size={14} /> Alertas</div>
                <p className="text-2xl font-bold text-amber-700 mt-1">{s.warning_count || 0}</p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-red-600 font-medium"><AlertCircle size={14} /> Críticos</div>
                <p className="text-2xl font-bold text-red-700 mt-1">{s.critical_count || 0}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Activity by hour */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Clock size={16} /> Actividad Hoy por Hora</h3>
                <div className="flex items-end gap-1 h-32">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hourData = dashboard?.activityByHour?.find((h: any) => h.hour === i);
                    const count = hourData?.count || 0;
                    const maxCount = Math.max(...(dashboard?.activityByHour?.map((h: any) => h.count) || [1]));
                    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    const now = new Date().getHours();
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${i}:00 - ${count} eventos`}>
                        <div className="w-full rounded-t"
                          style={{ height: `${Math.max(height, 2)}%`, backgroundColor: i === now ? '#2563eb' : count > 0 ? '#93c5fd' : '#e5e7eb' }} />
                        {i % 4 === 0 && <span className="text-[9px] text-gray-400">{i}h</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top users */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users size={16} /> Usuarios más Activos (7d)</h3>
                <div className="space-y-2">
                  {(dashboard?.topUsers || []).slice(0, 5).map((u: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {(u.user_name || '?')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.user_name}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{u.user_role}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-600">{u.event_count}</span>
                    </div>
                  ))}
                  {(!dashboard?.topUsers || dashboard.topUsers.length === 0) && (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin datos aún</p>
                  )}
                </div>
              </div>
            </div>

            {/* Top actions */}
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Activity size={16} /> Acciones Frecuentes (7d)</h3>
              <div className="flex flex-wrap gap-2">
                {(dashboard?.topActions || []).map((a: any, i: number) => {
                  const EntityIcon = ENTITY_ICONS[a.entity] || Shield;
                  return (
                    <button key={i} onClick={() => { setActionFilter(a.action); setEntityFilter(a.entity); setView('logs'); }}
                      className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm hover:bg-blue-50 hover:border-blue-200 transition">
                      <EntityIcon size={14} className="text-gray-400" />
                      <span className="font-medium text-gray-700">{ACTION_LABELS[a.action] || a.action}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{a.entity}</span>
                      <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">{a.count}</span>
                    </button>
                  );
                })}
                {(!dashboard?.topActions || dashboard.topActions.length === 0) && (
                  <p className="text-sm text-gray-400 py-4 text-center w-full">Sin datos aún</p>
                )}
              </div>
            </div>

            {/* Recent critical events */}
            {dashboard?.recentCritical?.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2"><AlertCircle size={16} /> Eventos Críticos Recientes</h3>
                <div className="space-y-2">
                  {dashboard.recentCritical.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 border border-red-100">
                      <AlertCircle size={16} className="text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{log.description}</p>
                        <p className="text-[10px] text-gray-400">{log.user_name} · {formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ LOGS VIEW ═══ */}
        {view === 'logs' && (
          <div className="p-4 space-y-3 max-w-5xl mx-auto">
            {/* Search & Filters */}
            <div className="rounded-xl border bg-white p-3 shadow-sm space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Buscar en descripción, usuario, ID..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-lg border bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none" />
                </div>
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    hasFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <Filter size={14} /> Filtros {hasFilters && '•'}
                </button>
                {hasFilters && (
                  <button onClick={clearFilters} className="rounded-lg border px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
                    <X size={14} />
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 pt-2 border-t">
                  <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                    className="rounded-lg border bg-gray-50 py-2 px-3 text-sm">
                    <option value="">Todas las acciones</option>
                    {filterOptions.actions.map((a: string) => (
                      <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
                    ))}
                  </select>
                  <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
                    className="rounded-lg border bg-gray-50 py-2 px-3 text-sm">
                    <option value="">Todas las entidades</option>
                    {filterOptions.entities.map((e: string) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                  <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
                    className="rounded-lg border bg-gray-50 py-2 px-3 text-sm">
                    <option value="">Toda severidad</option>
                    <option value="info">Info</option>
                    <option value="warning">Alerta</option>
                    <option value="critical">Crítico</option>
                  </select>
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    className="rounded-lg border bg-gray-50 py-2 px-3 text-sm" placeholder="Desde" />
                  <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    className="rounded-lg border bg-gray-50 py-2 px-3 text-sm" placeholder="Hasta" />
                </div>
              )}
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{total.toLocaleString()} registros encontrados</span>
              <span>Página {page} de {totalPages || 1}</span>
            </div>

            {/* Log entries */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Shield size={40} className="mb-2 opacity-30" />
                  <p className="text-sm">No hay registros de auditoría</p>
                  <p className="text-xs mt-1">Los eventos aparecerán conforme se use el sistema</p>
                </div>
              ) : (
                <div className="divide-y">
                  {logs.map(log => {
                    const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                    const SevIcon = sev.icon;
                    const EntityIcon = ENTITY_ICONS[log.entity] || Shield;
                    const isSelected = selectedLog?.id === log.id;

                    return (
                      <div key={log.id}>
                        <button onClick={() => setSelectedLog(isSelected ? null : log)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                          {/* Severity indicator */}
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sev.bg}`}>
                            <SevIcon size={16} className={sev.color} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${sev.bg} ${sev.color}`}>
                                {ACTION_LABELS[log.action] || log.action}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                <EntityIcon size={10} /> {log.entity}
                              </span>
                              {log.entity_id && (
                                <span className="text-[10px] text-gray-300 font-mono">#{log.entity_id.slice(0, 8)}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-800 mt-0.5 truncate">{log.description}</p>
                          </div>

                          {/* Meta */}
                          <div className="text-right shrink-0 hidden sm:block">
                            <p className="text-xs text-gray-500">{log.user_name || 'Sistema'}</p>
                            <p className="text-[10px] text-gray-400">{formatDate(log.created_at)}</p>
                          </div>

                          <ChevronDown size={14} className={`shrink-0 text-gray-300 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Expanded detail */}
                        {isSelected && (
                          <div className="px-4 pb-3 bg-gray-50 border-t">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-3 text-xs">
                              <div>
                                <span className="text-gray-400 block">Usuario</span>
                                <span className="text-gray-700 font-medium">{log.user_name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Rol</span>
                                <span className="text-gray-700 font-medium uppercase">{log.user_role || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block">IP</span>
                                <span className="text-gray-700 font-mono">{log.ip_address || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block">Fecha completa</span>
                                <span className="text-gray-700">{formatDate(log.created_at)}</span>
                              </div>
                            </div>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-2">
                                <span className="text-[10px] text-gray-400 uppercase font-semibold">Detalles</span>
                                <pre className="mt-1 rounded-lg bg-gray-900 text-green-400 p-3 text-xs overflow-x-auto max-h-40">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft size={14} /> Anterior
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`h-8 w-8 rounded-lg text-sm font-medium transition ${p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  Siguiente <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}
