'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { Plus, Calendar, Clock, Users, X, Check, Phone,
  Mail, ChevronLeft, ChevronRight, Edit2, Trash2, Settings,
  UserCheck, UserX, Search, MapPin } from 'lucide-react';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmada', color: 'text-blue-700', bg: 'bg-blue-100' },
  seated: { label: 'Sentado', color: 'text-green-700', bg: 'bg-green-100' },
  completed: { label: 'Completada', color: 'text-gray-700', bg: 'bg-gray-100' },
  cancelled: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-100' },
  no_show: { label: 'No asistió', color: 'text-amber-700', bg: 'bg-amber-100' } };

const emptyForm = () => ({
  guestName: '', guestPhone: '', guestEmail: '', guestCount: '2',
  reservationDate: '', startTime: '', durationMinutes: '90',
  tableId: '', notes: '', specialRequests: '', source: 'phone' });

export default function ReservationsPage() {
  const router = useRouter();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();

  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [summary, setSummary] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [settingsForm, setSettingsForm] = useState<any>({});

  useEffect(() => { refreshBranding(); loadSettings(); }, []);
  useEffect(() => { load(); loadSummary(); }, [selectedDate]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.request<any>(`/reservations?date=${selectedDate}&limit=100`);
      setReservations(r.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try { const s = await api.request<any>(`/reservations/summary/${selectedDate}`); setSummary(s); } catch {}
  };

  const loadSettings = async () => {
    try { const s = await api.request<any>('/reservations/settings'); setSettings(s); setSettingsForm(s); } catch {}
  };

  const loadSlots = async (date: string, guests: number) => {
    try {
      const r = await api.request<any>(`/reservations/availability/${date}?guests=${guests}`);
      setSlots(r.slots || []);
    } catch {}
  };

  const loadTables = async () => {
    try {
      const fps: any = await api.request<any>('/tables/floor-plans');
      const allTables: any[] = [];
      (fps || []).forEach((fp: any) => (fp.zones || []).forEach((z: any) => (z.tables || []).forEach((t: any) => allTables.push({ ...t, zone_name: z.name }))));
      setTables(allTables);
    } catch {}
  };

  const openNew = () => {
    const f = emptyForm();
    f.reservationDate = selectedDate;
    setForm(f); setEditId(null); setShowForm(true); setSlots([]);
    loadTables();
    loadSlots(selectedDate, 2);
  };

  const openEdit = (r: any) => {
    setForm({
      guestName: r.guest_name || '', guestPhone: r.guest_phone || '', guestEmail: r.guest_email || '',
      guestCount: r.guest_count?.toString() || '2',
      reservationDate: typeof r.reservation_date === 'string' ? r.reservation_date.slice(0, 10) : new Date(r.reservation_date).toISOString().slice(0, 10),
      startTime: typeof r.start_time === 'string' ? r.start_time.slice(0, 5) : '', durationMinutes: r.duration_minutes?.toString() || '90',
      tableId: r.table_id || '', notes: r.notes || '', specialRequests: r.special_requests || '', source: r.source || 'phone' });
    setEditId(r.id); setShowForm(true); loadTables();
  };

  const save = async () => {
    setError('');
    try {
      const payload = {
        guestName: form.guestName, guestPhone: form.guestPhone || undefined,
        guestEmail: form.guestEmail || undefined, guestCount: parseInt(form.guestCount) || 2,
        reservationDate: form.reservationDate, startTime: form.startTime,
        durationMinutes: parseInt(form.durationMinutes) || 90,
        tableId: form.tableId || undefined, notes: form.notes || undefined,
        specialRequests: form.specialRequests || undefined, source: form.source };
      if (editId) {
        await api.request(`/reservations/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api.request('/reservations', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false); setForm(emptyForm()); setEditId(null); await load(); loadSummary();
      setSuccess(editId ? 'Actualizada' : 'Reservación creada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const updateStatus = async (id: string, action: string, reason?: string) => {
    try {
      const body = reason ? JSON.stringify({ reason }) : undefined;
      await api.request(`/reservations/${id}/${action}`, { method: 'PATCH', body });
      await load(); loadSummary();
    } catch (e: any) { setError(e.message); }
  };

  const saveSettings = async () => {
    try {
      await api.request('/reservations/settings', { method: 'PUT', body: JSON.stringify({
        isEnabled: settingsForm.is_enabled, defaultDurationMinutes: settingsForm.default_duration_minutes,
        minAdvanceHours: settingsForm.min_advance_hours, maxAdvanceDays: settingsForm.max_advance_days,
        slotIntervalMinutes: settingsForm.slot_interval_minutes,
        openingTime: settingsForm.opening_time, closingTime: settingsForm.closing_time,
        maxPartySize: settingsForm.max_party_size, autoCancelMinutes: settingsForm.auto_cancel_minutes }) });
      setShowSettings(false); loadSettings();
      setSuccess('Configuración guardada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const F = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const SF = (k: string, v: any) => setSettingsForm((f: any) => ({ ...f, [k]: v }));

  const filtered = reservations.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search && !r.guest_name?.toLowerCase().includes(search.toLowerCase()) && !r.guest_phone?.includes(search)) return false;
    return true;
  });

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const dateLabel = new Date(selectedDate + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}      {/* Page toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Reservaciones</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowSettings(true); loadSettings(); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><Settings size={20} /></button>
          <button onClick={openNew} className="flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}>
              <Plus size={18} /> Nueva
            </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4 space-y-4">
        {error && <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}
        {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600"><Check size={16} />{success}</div>}

        {/* Date nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => changeDate(-1)} className="rounded-lg p-2 hover:bg-gray-100"><ChevronLeft size={20} /></button>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 capitalize">{dateLabel}</p>
            {isToday && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: branding.accentColor }}>HOY</span>}
          </div>
          <div className="flex items-center gap-2">
            {!isToday && <button onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))} className="rounded-lg px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100">Hoy</button>}
            <button onClick={() => changeDate(1)} className="rounded-lg p-2 hover:bg-gray-100"><ChevronRight size={20} /></button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {[
            { label: 'Confirmadas', val: summary.confirmed || 0, color: 'text-blue-600' },
            { label: 'Sentados', val: summary.seated || 0, color: 'text-green-600' },
            { label: 'Completadas', val: summary.completed || 0, color: 'text-gray-600' },
            { label: 'No show', val: summary.no_show || 0, color: 'text-amber-600' },
            { label: 'Personas esp.', val: summary.expected_guests || 0, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-3 text-center">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Search & filter */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre o teléfono..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {[{ k: '', l: 'Todas' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ k, l: v.label }))].map(f => (
              <button key={f.k} onClick={() => setStatusFilter(statusFilter === f.k ? '' : f.k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${statusFilter === f.k ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                style={statusFilter === f.k ? { backgroundColor: branding.accentColor } : {}}>{f.l}</button>
            ))}
          </div>
        </div>

        {/* Reservations list */}
        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No hay reservaciones para este día</p>
            <button onClick={openNew} className="mt-3 text-sm font-medium hover:underline" style={{ color: branding.accentColor }}>Crear reservación</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const st = STATUS_CFG[r.status] || STATUS_CFG.confirmed;
              const time = typeof r.start_time === 'string' ? r.start_time.slice(0, 5) : '';
              const endTime = typeof r.end_time === 'string' ? r.end_time.slice(0, 5) : '';
              return (
                <div key={r.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-100">
                        <span className="text-lg font-bold text-gray-900">{time}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{r.guest_name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.bg} ${st.color}`}>{st.label}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Users size={12} />{r.guest_count} personas</span>
                          <span className="flex items-center gap-1"><Clock size={12} />{time} - {endTime}</span>
                          {r.table_number && <span className="flex items-center gap-1"><MapPin size={12} />Mesa {r.table_number}</span>}
                          {r.guest_phone && <span className="flex items-center gap-1"><Phone size={12} />{r.guest_phone}</span>}
                        </div>
                        {r.special_requests && <p className="mt-1 text-xs text-amber-600 italic">"{r.special_requests}"</p>}
                        {r.notes && <p className="mt-0.5 text-xs text-gray-400">{r.notes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {r.status === 'confirmed' && (
                        <>
                          <button onClick={() => updateStatus(r.id, 'seat')} className="flex items-center gap-1 rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200">
                            <UserCheck size={14} /> Sentar
                          </button>
                          <button onClick={() => updateStatus(r.id, 'no-show')} className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200">
                            <UserX size={14} /> No show
                          </button>
                        </>
                      )}
                      {r.status === 'seated' && (
                        <button onClick={() => updateStatus(r.id, 'complete')} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                          <Check size={14} /> Completar
                        </button>
                      )}
                      {(r.status === 'confirmed' || r.status === 'seated') && (
                        <>
                          <button onClick={() => openEdit(r)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
                            <Edit2 size={14} /> Editar
                          </button>
                          <button onClick={() => { if (confirm('¿Cancelar esta reservación?')) updateStatus(r.id, 'cancel', 'Cancelada por el restaurante'); }}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50">
                            <Trash2 size={14} /> Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ NEW/EDIT FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowForm(false); setEditId(null); }} />
          <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Editar' : 'Nueva'} Reservación</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                  <input type="text" value={form.guestName} onChange={e => F('guestName', e.target.value)} placeholder="Nombre del cliente"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="tel" value={form.guestPhone} onChange={e => F('guestPhone', e.target.value)} placeholder="0991234567"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={form.guestEmail} onChange={e => F('guestEmail', e.target.value)} placeholder="email@ejemplo.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Personas *</label>
                  <input type="number" value={form.guestCount} onChange={e => { F('guestCount', e.target.value); if (form.reservationDate) loadSlots(form.reservationDate, parseInt(e.target.value) || 2); }} min="1" max="20"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fuente</label>
                  <select value={form.source} onChange={e => F('source', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
                    <option value="phone">Teléfono</option>
                    <option value="walk_in">En persona</option>
                    <option value="online">Online</option>
                    <option value="app">App</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fecha *</label>
                  <input type="date" value={form.reservationDate} onChange={e => { F('reservationDate', e.target.value); loadSlots(e.target.value, parseInt(form.guestCount) || 2); }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Hora *</label>
                  <input type="time" value={form.startTime} onChange={e => F('startTime', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>

              {/* Available slots */}
              {slots.length > 0 && !form.startTime && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Horarios disponibles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {slots.filter(s => s.available).map(s => (
                      <button key={s.time} onClick={() => F('startTime', s.time)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:bg-blue-50">
                        {s.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Table selection */}
              {tables.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Mesa (opcional - auto-asigna si vacío)</label>
                  <select value={form.tableId} onChange={e => F('tableId', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
                    <option value="">Auto-asignar</option>
                    {tables.filter(t => t.capacity >= (parseInt(form.guestCount) || 2)).map(t => (
                      <option key={t.id} value={t.id}>Mesa {t.number} ({t.capacity} personas) - {t.zone_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Pedidos especiales</label>
                <input type="text" value={form.specialRequests} onChange={e => F('specialRequests', e.target.value)} placeholder="Ej: mesa junto a la ventana, cumpleaños..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas internas</label>
                <input type="text" value={form.notes} onChange={e => F('notes', e.target.value)} placeholder="Notas para el staff"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={save} disabled={!form.guestName || !form.reservationDate || !form.startTime}
                className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: branding.accentColor }}>
                {editId ? 'Guardar Cambios' : 'Crear Reservación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SETTINGS MODAL ═══ */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettings(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Configuración</h2>
              <button onClick={() => setShowSettings(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Apertura</label>
                  <input type="time" value={settingsForm.opening_time || ''} onChange={e => SF('opening_time', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cierre</label>
                  <input type="time" value={settingsForm.closing_time || ''} onChange={e => SF('closing_time', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Duración (min)</label>
                  <input type="number" value={settingsForm.default_duration_minutes || 90} onChange={e => SF('default_duration_minutes', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Intervalo (min)</label>
                  <input type="number" value={settingsForm.slot_interval_minutes || 30} onChange={e => SF('slot_interval_minutes', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Máx. personas</label>
                  <input type="number" value={settingsForm.max_party_size || 20} onChange={e => SF('max_party_size', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Anticipación mín (hrs)</label>
                  <input type="number" value={settingsForm.min_advance_hours || 1} onChange={e => SF('min_advance_hours', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Máx. días adelanto</label>
                  <input type="number" value={settingsForm.max_advance_days || 30} onChange={e => SF('max_advance_days', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Auto no-show (min)</label>
                  <input type="number" value={settingsForm.auto_cancel_minutes || 15} onChange={e => SF('auto_cancel_minutes', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={saveSettings} className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}>
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
