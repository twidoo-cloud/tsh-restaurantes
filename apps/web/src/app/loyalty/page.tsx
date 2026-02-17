'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { Plus, Star, X, Check, Gift, Award, Users,
  Settings, Search, TrendingUp, Crown, Edit2, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';

const TIER_ICONS: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎', diamond: '👑' };

const REWARD_TYPES: Record<string, string> = {
  discount: 'Descuento $', free_item: 'Producto gratis', percentage: 'Descuento %', custom: 'Personalizado' };

export default function LoyaltyPage() {
  const router = useRouter();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();

  const [tab, setTab] = useState<'dashboard' | 'rewards' | 'leaderboard' | 'settings'>('dashboard');
  const [dashboard, setDashboard] = useState<any>({});
  const [rewards, setRewards] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editRewardId, setEditRewardId] = useState<string | null>(null);
  const [rewardForm, setRewardForm] = useState({ name: '', description: '', pointsCost: '', rewardType: 'discount', rewardValue: '', minTier: 'bronze', maxRedemptions: '' });
  const [products, setProducts] = useState<any[]>([]);

  // Enroll modal
  const [showEnroll, setShowEnroll] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [enrollId, setEnrollId] = useState('');
  const [enrollBday, setEnrollBday] = useState('');
  const [custSearch, setCustSearch] = useState('');

  useEffect(() => { refreshBranding(); loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, r, l, t, s] = await Promise.all([
        api.request<any>('/loyalty/dashboard'),
        api.request<any>('/loyalty/rewards'),
        api.request<any>('/loyalty/leaderboard'),
        api.request<any>('/loyalty/tiers'),
        api.request<any>('/loyalty/settings'),
      ]);
      setDashboard(d); setRewards(r || []); setLeaderboard(l || []); setTiers(t || []);
      setSettings(s); setSettingsForm(s);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadCustomers = async () => {
    try { const c = await api.request<any>('/customers?limit=200'); setCustomers(c.data || []); } catch {}
  };

  const loadProducts = async () => {
    try { const p = await api.getProducts(); setProducts(p.data || []); } catch {}
  };

  const enroll = async () => {
    if (!enrollId) return;
    try {
      await api.request('/loyalty/enroll', { method: 'POST', body: JSON.stringify({ customerId: enrollId, birthday: enrollBday || undefined }) });
      setShowEnroll(false); setEnrollId(''); setEnrollBday(''); await loadAll();
      setSuccess('Cliente inscrito'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const saveReward = async () => {
    try {
      const payload = {
        name: rewardForm.name, description: rewardForm.description || undefined,
        pointsCost: parseInt(rewardForm.pointsCost), rewardType: rewardForm.rewardType,
        rewardValue: parseFloat(rewardForm.rewardValue) || 0, minTier: rewardForm.minTier,
        maxRedemptions: rewardForm.maxRedemptions ? parseInt(rewardForm.maxRedemptions) : undefined };
      if (editRewardId) {
        await api.request(`/loyalty/rewards/${editRewardId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api.request('/loyalty/rewards', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowRewardForm(false); setEditRewardId(null); await loadAll();
      setSuccess(editRewardId ? 'Actualizada' : 'Recompensa creada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const deleteReward = async (id: string) => {
    if (!confirm('¿Eliminar esta recompensa?')) return;
    try { await api.request(`/loyalty/rewards/${id}`, { method: 'DELETE' }); await loadAll(); } catch (e: any) { setError(e.message); }
  };

  const toggleReward = async (id: string, isActive: boolean) => {
    try { await api.request(`/loyalty/rewards/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: !isActive }) }); await loadAll(); } catch (e: any) { setError(e.message); }
  };

  const saveSettings = async () => {
    try {
      await api.request('/loyalty/settings', { method: 'PUT', body: JSON.stringify({
        isEnabled: settingsForm.is_enabled, pointsPerDollar: parseFloat(settingsForm.points_per_dollar) || 1,
        minPurchaseForPoints: parseFloat(settingsForm.min_purchase_for_points) || 0,
        pointsExpiryDays: parseInt(settingsForm.points_expiry_days) || 365,
        welcomeBonus: parseInt(settingsForm.welcome_bonus) || 0,
        birthdayBonus: parseInt(settingsForm.birthday_bonus) || 0,
        referralBonus: parseInt(settingsForm.referral_bonus) || 0,
        minPointsToRedeem: parseInt(settingsForm.min_points_to_redeem) || 10 }) });
      await loadAll(); setSuccess('Configuración guardada'); setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  const RF = (k: string, v: any) => setRewardForm(f => ({ ...f, [k]: v }));
  const SF = (k: string, v: any) => setSettingsForm((f: any) => ({ ...f, [k]: v }));

  const filteredCust = customers.filter(c =>
    !c.enrolled_at && (custSearch ? (c.name?.toLowerCase().includes(custSearch.toLowerCase()) || c.phone?.includes(custSearch)) : true)
  );

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">      {/* Page toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Fidelidad</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadCustomers(); setShowEnroll(true); }} className="flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}>
            <Plus size={18} /> Inscribir
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4 space-y-4">
        {error && <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}
        {success && <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-600"><Check size={16} />{success}</div>}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {[
            { k: 'dashboard' as const, l: 'Dashboard', i: TrendingUp },
            { k: 'rewards' as const, l: 'Recompensas', i: Gift },
            { k: 'leaderboard' as const, l: 'Ranking', i: Crown },
            { k: 'settings' as const, l: 'Config', i: Settings },
          ].map(t => {
            const I = t.i;
            return (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition ${tab === t.k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                <I size={14} /> {t.l}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : (
          <>
            {/* ═══ DASHBOARD ═══ */}
            {tab === 'dashboard' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Inscritos', val: dashboard.enrolled_customers || 0, color: 'text-blue-600' },
                    { label: 'Activos (30d)', val: dashboard.active_30d || 0, color: 'text-green-600' },
                    { label: 'Puntos activos', val: (dashboard.total_active_points || 0).toLocaleString(), color: 'text-amber-600' },
                    { label: 'Puntos canjeados', val: (dashboard.total_points_redeemed || 0).toLocaleString(), color: 'text-purple-600' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border bg-white p-4 text-center">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                    </div>
                  ))}
                </div>
                {/* Tiers */}
                <div className="rounded-xl border bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Niveles</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {tiers.map(t => {
                      const count = (dashboard.tierDistribution || []).find((td: any) => td.loyalty_tier === t.slug)?.count || 0;
                      return (
                        <div key={t.id} className="rounded-lg border p-3 text-center" style={{ borderColor: t.color }}>
                          <span className="text-2xl">{TIER_ICONS[t.slug] || '⭐'}</span>
                          <p className="text-sm font-bold" style={{ color: t.color }}>{t.name}</p>
                          <p className="text-xs text-gray-500">{t.min_points}+ pts · x{parseFloat(t.points_multiplier)}</p>
                          <p className="mt-1 text-lg font-bold text-gray-900">{count}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ REWARDS ═══ */}
            {tab === 'rewards' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button onClick={() => { setRewardForm({ name: '', description: '', pointsCost: '', rewardType: 'discount', rewardValue: '', minTier: 'bronze', maxRedemptions: '' }); setEditRewardId(null); setShowRewardForm(true); }}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: branding.accentColor }}>
                    <Plus size={16} /> Nueva Recompensa
                  </button>
                </div>
                {rewards.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <Gift size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No hay recompensas configuradas</p>
                  </div>
                ) : (
                  rewards.map(r => (
                    <div key={r.id} className={`rounded-xl border bg-white p-4 ${!r.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                            <Gift size={20} className="text-amber-700" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{r.name}</h3>
                            <p className="text-sm text-gray-500">{r.description}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">{r.points_cost} pts</span>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">{REWARD_TYPES[r.reward_type]}{r.reward_value > 0 ? ` ${r.reward_value}` : ''}</span>
                              <span className="text-gray-400">{TIER_ICONS[r.min_tier]} {r.min_tier}+</span>
                              {r.max_redemptions && <span className="text-gray-400">{r.current_redemptions}/{r.max_redemptions} canjes</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => toggleReward(r.id, r.is_active)} className="rounded-lg p-1.5 hover:bg-gray-100">
                            {r.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-400" />}
                          </button>
                          <button onClick={() => {
                            setRewardForm({ name: r.name, description: r.description || '', pointsCost: r.points_cost.toString(), rewardType: r.reward_type, rewardValue: r.reward_value?.toString() || '', minTier: r.min_tier, maxRedemptions: r.max_redemptions?.toString() || '' });
                            setEditRewardId(r.id); setShowRewardForm(true);
                          }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"><Edit2 size={16} /></button>
                          <button onClick={() => deleteReward(r.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ═══ LEADERBOARD ═══ */}
            {tab === 'leaderboard' && (
              <div className="rounded-xl border bg-white overflow-hidden">
                {leaderboard.length === 0 ? (
                  <div className="p-12 text-center"><Crown size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Sin clientes inscritos</p></div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Cliente</th><th className="px-4 py-3 text-center">Nivel</th><th className="px-4 py-3 text-right">Puntos</th><th className="px-4 py-3 text-right">Visitas</th><th className="px-4 py-3 text-right">Gastado</th></tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((c: any, i: number) => (
                        <tr key={c.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-bold text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                          </td>
                          <td className="px-4 py-3 text-center">{TIER_ICONS[c.loyalty_tier] || '⭐'}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600">{(c.loyalty_points || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{c.visit_count || 0}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatMoney(parseFloat(c.lifetime_spending) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {tab === 'settings' && (
              <div className="rounded-xl border bg-white p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Puntos por $1</label>
                    <input type="number" value={settingsForm.points_per_dollar ?? 1} onChange={e => SF('points_per_dollar', e.target.value)} step="0.5"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Compra mín. ($)</label>
                    <input type="number" value={settingsForm.min_purchase_for_points ?? 0} onChange={e => SF('min_purchase_for_points', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Expiración (días)</label>
                    <input type="number" value={settingsForm.points_expiry_days ?? 365} onChange={e => SF('points_expiry_days', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Bono bienvenida</label>
                    <input type="number" value={settingsForm.welcome_bonus ?? 0} onChange={e => SF('welcome_bonus', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Bono cumpleaños</label>
                    <input type="number" value={settingsForm.birthday_bonus ?? 0} onChange={e => SF('birthday_bonus', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Mín. para canjear</label>
                    <input type="number" value={settingsForm.min_points_to_redeem ?? 10} onChange={e => SF('min_points_to_redeem', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                  </div>
                </div>
                <button onClick={saveSettings} className="rounded-xl px-6 py-3 font-semibold text-white hover:opacity-90" style={{ backgroundColor: branding.accentColor }}>
                  Guardar Configuración
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ ENROLL MODAL ═══ */}
      {showEnroll && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEnroll(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">Inscribir Cliente</h2>
              <button onClick={() => setShowEnroll(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Buscar cliente..."
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredCust.map(c => (
                  <button key={c.id} onClick={() => setEnrollId(c.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${enrollId === c.id ? 'bg-blue-50 border border-blue-300' : 'hover:bg-gray-50'}`}>
                    <Users size={16} className="text-gray-400 shrink-0" />
                    <div><p className="font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.phone || c.email}</p></div>
                  </button>
                ))}
                {filteredCust.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Sin clientes disponibles</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cumpleaños (opcional)</label>
                <input type="date" value={enrollBday} onChange={e => setEnrollBday(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={enroll} disabled={!enrollId} className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: branding.accentColor }}>
                Inscribir al Programa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REWARD FORM MODAL ═══ */}
      {showRewardForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRewardForm(false)} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">{editRewardId ? 'Editar' : 'Nueva'} Recompensa</h2>
              <button onClick={() => setShowRewardForm(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                <input type="text" value={rewardForm.name} onChange={e => RF('name', e.target.value)} placeholder="Ej: Postre gratis"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
                <input type="text" value={rewardForm.description} onChange={e => RF('description', e.target.value)} placeholder="Opcional"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Puntos *</label>
                  <input type="number" value={rewardForm.pointsCost} onChange={e => RF('pointsCost', e.target.value)} placeholder="100"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
                  <select value={rewardForm.rewardType} onChange={e => RF('rewardType', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
                    {Object.entries(REWARD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Valor</label>
                  <input type="number" value={rewardForm.rewardValue} onChange={e => RF('rewardValue', e.target.value)} placeholder="5.00" step="0.5"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nivel mínimo</label>
                  <select value={rewardForm.minTier} onChange={e => RF('minTier', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none">
                    <option value="bronze">🥉 Bronce</option><option value="silver">🥈 Plata</option>
                    <option value="gold">🥇 Oro</option><option value="platinum">💎 Platino</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <button onClick={saveReward} disabled={!rewardForm.name || !rewardForm.pointsCost}
                className="w-full rounded-xl py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: branding.accentColor }}>
                {editRewardId ? 'Guardar' : 'Crear Recompensa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
