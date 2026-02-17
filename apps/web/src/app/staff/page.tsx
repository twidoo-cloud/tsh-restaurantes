'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { Users, Clock, X, Check, LogIn, LogOut as LogOutIcon, Calendar,
  Settings, Search, User, AlertCircle, Edit2, ChevronRight, Briefcase,
  DollarSign } from 'lucide-react';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TIME_OFF_TYPES: Record<string, string> = { vacation: 'Vacaciones', sick: 'Enfermedad', personal: 'Personal', other: 'Otro' };

export default function StaffPage() {
  const router = useRouter();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();

  const [tab, setTab] = useState<'team' | 'attendance' | 'schedule' | 'timeoff' | 'payroll'>('team');
  const [staff, setStaff] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [attendance, setAttendance] = useState<any[]>([]);
  const [weekSchedule, setWeekSchedule] = useState<any[]>([]);
  const [timeOff, setTimeOff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [toForm, setToForm] = useState({ userId: '', type: 'vacation', startDate: '', endDate: '', reason: '' });
  const [payroll, setPayroll] = useState<any[]>([]);
  const [payrollFrom, setPayrollFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [payrollTo, setPayrollTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { refreshBranding(); loadAll(); }, []);
  useEffect(() => { if (tab === 'payroll') loadPayroll(); }, [tab, payrollFrom, payrollTo]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, sum, a, ws, to] = await Promise.all([
        api.request<any>('/staff'),
        api.request<any>('/staff/summary'),
        api.request<any>('/staff/attendance?limit=50'),
        api.request<any>('/staff/schedule'),
        api.request<any>('/staff/time-off'),
      ]);
      setStaff(s || []); setSummary(sum); setAttendance(a.data || []); setWeekSchedule(ws || []); setTimeOff(to || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadPayroll = async () => {
    try { const p = await api.request<any>(`/staff/payroll?from=${payrollFrom}&to=${payrollTo}`); setPayroll(p || []); } catch {}
  };

  const clockIn = async (userId: string) => {
    try {
      await api.request('/staff/clock-in', { method: 'POST', body: JSON.stringify({ userId }) });
      await loadAll(); setSuccess('Entrada registrada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const clockOut = async (attendanceId: string) => {
    try {
      await api.request(`/staff/clock-out/${attendanceId}`, { method: 'PATCH', body: JSON.stringify({ breakMinutes: 0 }) });
      await loadAll(); setSuccess('Salida registrada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const openSchedule = async (userId: string) => {
    try {
      const detail = await api.request<any>(`/staff/${userId}`);
      setSelectedUser(detail);
      const existing = (detail.schedule || []).map((s: any) => ({
        dayOfWeek: s.day_of_week, startTime: typeof s.start_time === 'string' ? s.start_time.slice(0, 5) : '', endTime: typeof s.end_time === 'string' ? s.end_time.slice(0, 5) : '' }));
      // Fill all 7 days
      const full = Array.from({ length: 7 }, (_, i) => {
        const e = existing.find((s: any) => s.dayOfWeek === i);
        return e || { dayOfWeek: i, startTime: '', endTime: '' };
      });
      setScheduleForm(full); setShowScheduleForm(true);
    } catch (e: any) { setError(e.message); }
  };

  const saveSchedule = async () => {
    if (!selectedUser) return;
    try {
      const filtered = scheduleForm.filter(s => s.startTime && s.endTime);
      await api.request(`/staff/${selectedUser.id}/schedule`, { method: 'PUT', body: JSON.stringify({ userId: selectedUser.id, schedule: filtered }) });
      setShowScheduleForm(false); await loadAll();
      setSuccess('Horario guardado'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const saveTimeOff = async () => {
    try {
      await api.request('/staff/time-off', { method: 'POST', body: JSON.stringify(toForm) });
      setShowTimeOffForm(false); setToForm({ userId: '', type: 'vacation', startDate: '', endDate: '', reason: '' });
      await loadAll(); setSuccess('Solicitud creada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const reviewTimeOff = async (id: string, action: 'approved' | 'rejected') => {
    try {
      await api.request(`/staff/time-off/${id}/${action}`, { method: 'PATCH' });
      await loadAll();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">      {/* Page toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Personal</h1>
      </div>

      <div className="mx-auto max-w-6xl p-4 space-y-4">
        {error && <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}
        {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600"><Check size={16} />{success}</div>}

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Presentes', val: summary.currently_in || 0, color: 'text-green-600' },
            { label: 'Programados hoy', val: summary.scheduledToday || 0, color: 'text-blue-600' },
            { label: 'Total empleados', val: summary.totalStaff || 0, color: 'text-gray-600' },
            { label: 'Horas hoy', val: parseFloat(summary.total_hours_today || 0).toFixed(1), color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-3 text-center">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
          {[
            { k: 'team' as const, l: 'Equipo', i: Users },
            { k: 'attendance' as const, l: 'Asistencia', i: Clock },
            { k: 'schedule' as const, l: 'Horarios', i: Calendar },
            { k: 'timeoff' as const, l: 'Permisos', i: Briefcase },
            { k: 'payroll' as const, l: 'Nómina', i: DollarSign },
          ].map(t => {
            const I = t.i;
            return (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition whitespace-nowrap px-2 ${tab === t.k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                <I size={14} /> {t.l}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : (
          <>
            {/* ═══ TEAM ═══ */}
            {tab === 'team' && (
              <div className="space-y-3">
                {staff.map(s => {
                  const isClockedIn = !!s.current_clock_in;
                  return (
                    <div key={s.id} className="rounded-xl border bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${isClockedIn ? 'bg-green-500' : 'bg-gray-400'}`}>
                            {s.first_name?.[0]}{s.last_name?.[0]}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{s.first_name} {s.last_name}</h3>
                            <div className="flex gap-2 text-xs text-gray-500">
                              <span className="rounded bg-gray-100 px-1.5 py-0.5">{s.role_name}</span>
                              {s.phone && <span>{s.phone}</span>}
                              {isClockedIn && <span className="text-green-600 font-medium">● En turno</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openSchedule(s.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><Calendar size={16} /></button>
                          {!isClockedIn ? (
                            <button onClick={() => clockIn(s.id)} className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200">
                              <LogIn size={14} /> Entrada
                            </button>
                          ) : (
                            <button onClick={async () => {
                              const att = attendance.find(a => a.user_id === s.id && a.status === 'clocked_in');
                              if (att) clockOut(att.id);
                            }} className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">
                              <LogOutIcon size={14} /> Salida
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══ ATTENDANCE ═══ */}
            {tab === 'attendance' && (
              <div className="rounded-xl border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr><th className="px-4 py-3 text-left">Empleado</th><th className="px-4 py-3 text-left">Entrada</th><th className="px-4 py-3 text-left">Salida</th><th className="px-4 py-3 text-right">Horas</th><th className="px-4 py-3 text-center">Estado</th></tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={a.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{a.first_name} {a.last_name}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(a.clock_in).toLocaleString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 text-gray-600">{a.clock_out ? new Date(a.clock_out).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">{a.hours_worked ? `${parseFloat(a.hours_worked).toFixed(1)}h` : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.status === 'clocked_in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {a.status === 'clocked_in' ? 'En turno' : 'Completado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {attendance.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* ═══ SCHEDULE ═══ */}
            {tab === 'schedule' && (
              <div className="space-y-3">
                {DAYS.map((day, i) => {
                  const daySchedules = weekSchedule.filter(s => s.day_of_week === i);
                  return (
                    <div key={i} className="rounded-xl border bg-white p-4">
                      <h3 className="mb-2 text-sm font-bold text-gray-900">{DAYS_FULL[i]}</h3>
                      {daySchedules.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Sin personal programado</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {daySchedules.map((s: any, j: number) => (
                            <div key={j} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                              <span className="text-xs font-medium text-gray-900">{s.first_name} {s.last_name}</span>
                              <span className="text-[10px] text-gray-500">{typeof s.start_time === 'string' ? s.start_time.slice(0, 5) : ''} - {typeof s.end_time === 'string' ? s.end_time.slice(0, 5) : ''}</span>
                              <span className="rounded bg-gray-200 px-1 py-0.5 text-[9px] text-gray-600">{s.role_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══ TIME OFF ═══ */}
            {tab === 'timeoff' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button onClick={() => setShowTimeOffForm(true)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: branding.accentColor }}>
                    <Briefcase size={16} /> Solicitar Permiso
                  </button>
                </div>
                {timeOff.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center"><p className="text-gray-400">Sin solicitudes</p></div>
                ) : (
                  timeOff.map((t: any) => (
                    <div key={t.id} className="rounded-xl border bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{t.first_name} {t.last_name}</h3>
                          <p className="text-xs text-gray-500">{TIME_OFF_TYPES[t.type] || t.type} · {new Date(t.start_date).toLocaleDateString('es')} → {new Date(t.end_date).toLocaleDateString('es')}</p>
                          {t.reason && <p className="mt-0.5 text-xs text-gray-400 italic">{t.reason}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {t.status === 'pending' ? (
                            <>
                              <button onClick={() => reviewTimeOff(t.id, 'approved')} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200">Aprobar</button>
                              <button onClick={() => reviewTimeOff(t.id, 'rejected')} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200">Rechazar</button>
                            </>
                          ) : (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {t.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ═══ PAYROLL ═══ */}
            {tab === 'payroll' && (
              <div className="space-y-3">
                <div className="flex gap-3 items-end">
                  <div><label className="text-xs text-gray-500">Desde</label><input type="date" value={payrollFrom} onChange={e => setPayrollFrom(e.target.value)} className="block rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                  <div><label className="text-xs text-gray-500">Hasta</label><input type="date" value={payrollTo} onChange={e => setPayrollTo(e.target.value)} className="block rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                </div>
                <div className="rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr><th className="px-4 py-3 text-left">Empleado</th><th className="px-4 py-3 text-right">Días</th><th className="px-4 py-3 text-right">Horas</th><th className="px-4 py-3 text-right">Extra</th><th className="px-4 py-3 text-right">$/h</th><th className="px-4 py-3 text-right">Pago</th></tr>
                    </thead>
                    <tbody>
                      {payroll.map((p: any) => (
                        <tr key={p.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3"><p className="font-medium text-gray-900">{p.first_name} {p.last_name}</p><p className="text-xs text-gray-400">{p.role_name}</p></td>
                          <td className="px-4 py-3 text-right">{p.days_worked}</td>
                          <td className="px-4 py-3 text-right">{parseFloat(p.total_hours).toFixed(1)}</td>
                          <td className="px-4 py-3 text-right text-amber-600">{parseFloat(p.total_overtime).toFixed(1)}</td>
                          <td className="px-4 py-3 text-right">{p.hourly_rate ? formatMoney(parseFloat(p.hourly_rate)) : '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{formatMoney(parseFloat(p.regular_pay) + parseFloat(p.overtime_pay))}</td>
                        </tr>
                      ))}
                      {payroll.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin datos para el período</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ SCHEDULE FORM ═══ */}
      {showScheduleForm && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowScheduleForm(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Horario — {selectedUser.first_name}</h2>
              <button onClick={() => setShowScheduleForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-2">
              {scheduleForm.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-12 text-xs font-medium text-gray-700">{DAYS[s.dayOfWeek]}</span>
                  <input type="time" value={s.startTime} onChange={e => { const f = [...scheduleForm]; f[i] = { ...f[i], startTime: e.target.value }; setScheduleForm(f); }}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                  <span className="text-gray-400">—</span>
                  <input type="time" value={s.endTime} onChange={e => { const f = [...scheduleForm]; f[i] = { ...f[i], endTime: e.target.value }; setScheduleForm(f); }}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                  {s.startTime && <button onClick={() => { const f = [...scheduleForm]; f[i] = { ...f[i], startTime: '', endTime: '' }; setScheduleForm(f); }}
                    className="text-red-400 hover:text-red-600"><X size={14} /></button>}
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">Deja vacío los días libres</p>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={saveSchedule} className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}>
                Guardar Horario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TIME OFF FORM ═══ */}
      {showTimeOffForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTimeOffForm(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Solicitar Permiso</h2>
              <button onClick={() => setShowTimeOffForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Empleado</label>
                <select value={toForm.userId} onChange={e => setToForm(f => ({ ...f, userId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900">
                  <option value="">Seleccionar</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                <select value={toForm.type} onChange={e => setToForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900">
                  {Object.entries(TIME_OFF_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-medium text-gray-700">Desde</label><input type="date" value={toForm.startDate} onChange={e => setToForm(f => ({ ...f, startDate: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label><input type="date" value={toForm.endDate} onChange={e => setToForm(f => ({ ...f, endDate: e.target.value }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700">Razón</label><input type="text" value={toForm.reason} onChange={e => setToForm(f => ({ ...f, reason: e.target.value }))} placeholder="Opcional" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={saveTimeOff} disabled={!toForm.userId || !toForm.startDate || !toForm.endDate}
                className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: branding.accentColor }}>
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
