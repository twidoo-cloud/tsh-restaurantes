'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { usePosStore } from '@/store/pos-store';
import { useThemeStore } from '@/lib/use-theme';
import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS, Locale } from '@/lib/i18n';
import {
  Palette, Building, Globe, FileText, Save, Eye, RotateCcw, Users,
  Plus, Pencil, X, Lock, UserCircle
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const headers = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const get = async <T,>(p: string): Promise<T> => { const r = await fetch(`${API}${p}`, { headers: headers() }); return r.json(); };
const put = async <T,>(p: string, b: any): Promise<T> => { const r = await fetch(`${API}${p}`, { method: 'PUT', headers: headers(), body: JSON.stringify(b) }); return r.json(); };
const post = async <T,>(p: string, b: any): Promise<T> => { const r = await fetch(`${API}${p}`, { method: 'POST', headers: headers(), body: JSON.stringify(b) }); return r.json(); };

type Tab = 'profile' | 'branding' | 'business' | 'locale' | 'receipt' | 'users';

const COLOR_PRESETS = [
  { name: 'Azul Corp.', primary: '#1e3a8a', sidebar: '#1e293b', accent: '#2563eb' },
  { name: 'Verde Rest.', primary: '#166534', sidebar: '#14532d', accent: '#16a34a' },
  { name: 'Rojo Elegante', primary: '#991b1b', sidebar: '#450a0a', accent: '#dc2626' },
  { name: 'Morado', primary: '#6b21a8', sidebar: '#3b0764', accent: '#9333ea' },
  { name: 'Naranja', primary: '#c2410c', sidebar: '#431407', accent: '#ea580c' },
  { name: 'Cian', primary: '#0e7490', sidebar: '#083344', accent: '#06b6d4' },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = usePosStore();
  const { t, locale, setLocale } = useTranslation();
  const themeStore = useThemeStore();

  const initialTab = (searchParams.get('tab') as Tab) || 'profile';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [tenant, setTenant] = useState<any>(null);
  const [branding, setBranding] = useState(themeStore.branding);
  const [businessProfile, setBusinessProfile] = useState({ name: '', phone: '', address: '' });
  const [receipt, setReceipt] = useState({ receiptHeader: '', receiptFooter: '', defaultTaxRate: 15 });
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [myProfile, setMyProfile] = useState({ firstName: '', lastName: '', email: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  // User editor
  const [editUser, setEditUser] = useState<any>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', password: '', roleId: '' });

  const loadData = useCallback(async () => {
    try {
      const data = await get<any>('/tenants/current');
      setTenant(data);
      if (data.branding) setBranding({ ...themeStore.branding, ...data.branding });
      setBusinessProfile({ name: data.name || '', phone: data.phone || '', address: data.address?.street || '' });
      if (data.settings) {
        setReceipt({
          receiptHeader: data.settings.receiptHeader || data.name,
          receiptFooter: data.settings.receiptFooter || 'Gracias por su compra',
          defaultTaxRate: data.settings.defaultTaxRate ?? 15,
        });
      }
    } catch { /* ignore */ }

    // Load my profile
    if (store.user) {
      setMyProfile({ firstName: store.user.firstName || '', lastName: store.user.lastName || '', email: store.user.email || '' });
    }
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([get<any[]>('/tenants/users'), get<any[]>('/tenants/roles')]);
      setUsers(u);
      setRoles(r);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (tab === 'users' && users.length === 0) loadUsers();
  }, [tab]);

  const saveMyProfile = async () => {
    setSaving(true);
    try {
      const result = await put<any>('/auth/profile', { firstName: myProfile.firstName, lastName: myProfile.lastName });
      // Update local store
      const user = store.user;
      if (user) {
        const updated = { ...user, firstName: result.firstName, lastName: result.lastName };
        localStorage.setItem('pos_user', JSON.stringify(updated));
        store.restoreSession();
      }
      alert('✅ Perfil actualizado');
    } catch (e: any) { alert('Error: ' + (e.message || 'Error desconocido')); }
    setSaving(false);
  };

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) { alert('Las contraseñas no coinciden'); return; }
    if (passwords.new.length < 6) { alert('Mínimo 6 caracteres'); return; }
    setSaving(true);
    try {
      const result = await put<any>('/auth/password', { currentPassword: passwords.current, newPassword: passwords.new });
      if (result.success) {
        alert('✅ Contraseña actualizada');
        setPasswords({ current: '', new: '', confirm: '' });
      } else { alert(result.message || 'Error'); }
    } catch (e: any) { alert('Error: ' + (e.message || 'Contraseña actual incorrecta')); }
    setSaving(false);
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      const result = await put<any>('/tenants/branding', branding);
      if (result.success) { themeStore.setBranding(branding); alert('✅ Branding actualizado'); }
    } catch (e: any) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const saveBusinessProfile = async () => {
    setSaving(true);
    try { await put<any>('/tenants/profile', businessProfile); alert('✅ Perfil actualizado'); } catch (e: any) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const saveReceipt = async () => {
    setSaving(true);
    try { await put<any>('/tenants/settings', receipt); alert('✅ Guardado'); } catch (e: any) { alert('Error: ' + e.message); }
    setSaving(false);
  };

  const openNewUser = () => {
    setEditUser(null);
    setUserForm({ firstName: '', lastName: '', email: '', password: '', roleId: roles[0]?.id || '' });
    setShowUserForm(true);
  };

  const openEditUser = (u: any) => {
    setEditUser(u);
    setUserForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', roleId: u.role?.id || '' });
    setShowUserForm(true);
  };

  const saveUser = async () => {
    setSaving(true);
    try {
      if (editUser) {
        const data: any = { firstName: userForm.firstName, lastName: userForm.lastName, email: userForm.email, roleId: userForm.roleId };
        if (userForm.password) data.password = userForm.password;
        await put<any>(`/tenants/users/${editUser.id}`, data);
      } else {
        if (!userForm.password) { alert('La contraseña es requerida'); setSaving(false); return; }
        await post<any>('/tenants/users', userForm);
      }
      setShowUserForm(false);
      loadUsers();
      alert(editUser ? '✅ Usuario actualizado' : '✅ Usuario creado');
    } catch (e: any) { alert('Error: ' + (e.message || 'Error desconocido')); }
    setSaving(false);
  };

  const toggleUserActive = async (u: any) => {
    try {
      await put<any>(`/tenants/users/${u.id}`, { isActive: !u.isActive });
      loadUsers();
    } catch { /* ignore */ }
  };

  const applyPreset = (p: typeof COLOR_PRESETS[0]) => setBranding({ ...branding, primaryColor: p.primary, sidebarColor: p.sidebar, accentColor: p.accent });
  const previewBranding = () => themeStore.setBranding(branding);
  const resetBranding = () => setBranding({ ...branding, primaryColor: '#1e3a8a', secondaryColor: '#0ea5e9', sidebarColor: '#1e293b', sidebarTextColor: '#ffffff', accentColor: '#2563eb' });

  const isOwnerAdmin = store.user?.role === 'owner' || store.user?.role === 'admin';

  if (loading) return <div className="flex h-full items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;

  const TABS = [
    { id: 'profile' as Tab, icon: UserCircle, label: 'Mi Perfil' },
    ...(isOwnerAdmin ? [
      { id: 'branding' as Tab, icon: Palette, label: 'Marca / Colores' },
      { id: 'business' as Tab, icon: Building, label: 'Negocio' },
    ] : []),
    { id: 'locale' as Tab, icon: Globe, label: 'Idioma' },
    ...(isOwnerAdmin ? [
      { id: 'receipt' as Tab, icon: FileText, label: 'Recibos' },
      { id: 'users' as Tab, icon: Users, label: 'Usuarios' },
    ] : []),
  ];

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">⚙️ Configuración</h1>

        </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 border-r bg-white py-4">
          {TABS.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm ${tab === item.id ? 'bg-blue-50 font-semibold text-blue-700 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">

            {/* ═══ MY PROFILE ═══ */}
            {tab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Mi Perfil</h2>
                <div className="rounded-xl border bg-white p-5 space-y-4">
                  <div className="flex items-center gap-4 pb-3 border-b">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                      {(myProfile.firstName || 'U')[0]}{(myProfile.lastName || '')[0]}
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">{myProfile.firstName} {myProfile.lastName}</p>
                      <p className="text-sm text-gray-500">{myProfile.email}</p>
                      <span className="mt-0.5 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">{store.user?.role}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                      <input value={myProfile.firstName} onChange={e => setMyProfile({ ...myProfile, firstName: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                      <input value={myProfile.lastName} onChange={e => setMyProfile({ ...myProfile, lastName: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                    </div>
                  </div>
                  <button onClick={saveMyProfile} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                    <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Perfil'}
                  </button>
                </div>

                {/* Password change */}
                <div className="rounded-xl border bg-white p-5 space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800"><Lock size={16} /> Cambiar Contraseña</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
                    <input type="password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                      <input type="password" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label>
                      <input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                    </div>
                  </div>
                  <button onClick={changePassword} disabled={saving || !passwords.current || !passwords.new}
                    className="flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-40">
                    <Lock size={16} /> Cambiar Contraseña
                  </button>
                </div>
              </div>
            )}

            {/* ═══ BRANDING ═══ */}
            {tab === 'branding' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Personalización de Marca</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temas predefinidos</label>
                  <div className="grid grid-cols-3 gap-2">
                    {COLOR_PRESETS.map(p => (
                      <button key={p.name} onClick={() => applyPreset(p)}
                        className="flex items-center gap-2 rounded-lg border p-2 text-xs hover:border-blue-300 hover:bg-blue-50">
                        <div className="flex gap-1">
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: p.primary }} />
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: p.sidebar }} />
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: p.accent }} />
                        </div>
                        <span className="text-gray-700">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800">Colores</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'primaryColor', label: 'Primario' }, { key: 'accentColor', label: 'Acento' },
                      { key: 'sidebarColor', label: 'Barra Lateral' }, { key: 'sidebarTextColor', label: 'Texto Barra' },
                      { key: 'secondaryColor', label: 'Secundario' },
                    ].map(c => (
                      <div key={c.key} className="flex items-center gap-3">
                        <input type="color" value={(branding as any)[c.key]} onChange={e => setBranding({ ...branding, [c.key]: e.target.value })}
                          className="h-9 w-12 rounded border cursor-pointer" />
                        <div><p className="text-sm font-medium text-gray-700">{c.label}</p><p className="text-xs text-gray-400 font-mono">{(branding as any)[c.key]}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800">Textos y Logo</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la App</label>
                    <input value={branding.appName} onChange={e => setBranding({ ...branding, appName: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Mi Restaurante POS" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL del Logo</label>
                    <input value={branding.logoUrl || ''} onChange={e => setBranding({ ...branding, logoUrl: e.target.value || null })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="https://mi-sitio.com/logo.png" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={branding.showPoweredBy} onChange={e => setBranding({ ...branding, showPoweredBy: e.target.checked })} className="rounded" />
                    Mostrar "Powered by POS SaaS"
                  </label>
                </div>
                {/* Preview */}
                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Vista Previa</h3>
                  <div className="rounded-xl overflow-hidden border" style={{ maxWidth: 400 }}>
                    <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: branding.sidebarColor, color: branding.sidebarTextColor }}>
                      {branding.logoUrl ? <img src={branding.logoUrl} alt="" className="h-7 object-contain" /> :
                        <div className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold" style={{ backgroundColor: branding.primaryColor, color: '#fff' }}>P</div>}
                      <span className="text-sm font-bold">{branding.appName || 'POS SaaS'}</span>
                    </div>
                    <div className="bg-gray-50 p-4 flex gap-2">
                      <button className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: branding.accentColor }}>Acento</button>
                      <button className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: branding.primaryColor }}>Primario</button>
                    </div>
                    {branding.showPoweredBy && <div className="bg-gray-100 py-1 text-center text-[10px] text-gray-400">Powered by POS SaaS</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={previewBranding} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"><Eye size={16} /> Preview en Vivo</button>
                  <button onClick={resetBranding} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"><RotateCcw size={16} /> Reset</button>
                  <button onClick={saveBranding} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"><Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </div>
            )}

            {/* ═══ BUSINESS ═══ */}
            {tab === 'business' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Datos del Negocio</h2>
                <div className="rounded-xl border bg-white p-5 space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input value={businessProfile.name} onChange={e => setBusinessProfile({ ...businessProfile, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input value={businessProfile.phone} onChange={e => setBusinessProfile({ ...businessProfile, phone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input value={businessProfile.address} onChange={e => setBusinessProfile({ ...businessProfile, address: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
                  {tenant && (
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Plan</p><p className="text-sm font-bold text-gray-900 capitalize">{tenant.subscriptionPlan}</p></div>
                      <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">País</p><p className="text-sm font-bold text-gray-900">{tenant.countryCode}</p></div>
                      <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Moneda</p><p className="text-sm font-bold text-gray-900">{tenant.currencyCode}</p></div>
                    </div>
                  )}
                </div>
                <button onClick={saveBusinessProfile} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"><Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            )}

            {/* ═══ LOCALE ═══ */}
            {tab === 'locale' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Idioma y Región</h2>
                <div className="rounded-xl border bg-white p-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Idioma de la interfaz</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['es', 'en'] as Locale[]).map(loc => (
                      <button key={loc} onClick={() => setLocale(loc)}
                        className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${locale === loc ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="text-2xl">{LOCALE_FLAGS[loc]}</span>
                        <div><p className="text-sm font-bold text-gray-900">{LOCALE_LABELS[loc]}</p></div>
                        {locale === loc && <span className="ml-auto text-blue-600 text-lg">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ RECEIPT ═══ */}
            {tab === 'receipt' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Configuración de Recibos</h2>
                <div className="rounded-xl border bg-white p-5 space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Encabezado</label><input value={receipt.receiptHeader} onChange={e => setReceipt({ ...receipt, receiptHeader: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Pie de recibo</label><textarea value={receipt.receiptFooter} onChange={e => setReceipt({ ...receipt, receiptFooter: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Tasa impuesto (%)</label><input type="number" value={receipt.defaultTaxRate} onChange={e => setReceipt({ ...receipt, defaultTaxRate: parseFloat(e.target.value) })} className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" min={0} max={100} step={0.5} /></div>
                </div>
                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Vista Previa del Recibo</h3>
                  <div className="mx-auto w-64 rounded-lg border bg-white p-4 text-center font-mono text-xs shadow">
                    <p className="text-sm font-bold">{receipt.receiptHeader || tenant?.name}</p><hr className="my-2 border-dashed" />
                    <div className="text-left space-y-1"><div className="flex justify-between"><span>1x Producto</span><span>$10.00</span></div><hr className="border-dashed" /><div className="flex justify-between"><span>Subtotal</span><span>$10.00</span></div><div className="flex justify-between"><span>IVA ({receipt.defaultTaxRate}%)</span><span>${(10 * receipt.defaultTaxRate / 100).toFixed(2)}</span></div><div className="flex justify-between font-bold"><span>TOTAL</span><span>${(10 + 10 * receipt.defaultTaxRate / 100).toFixed(2)}</span></div></div>
                    <hr className="my-2 border-dashed" /><p className="text-gray-500">{receipt.receiptFooter}</p>
                  </div>
                </div>
                <button onClick={saveReceipt} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"><Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            )}

            {/* ═══ USERS ═══ */}
            {tab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Usuarios</h2>
                  <button onClick={openNewUser} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    <Plus size={16} /> Nuevo Usuario
                  </button>
                </div>
                <div className="rounded-xl border bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                      <tr><th className="px-4 py-3 text-left">Nombre</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Rol</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-center">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                          <td className="px-4 py-3 text-gray-600">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              u.role?.slug === 'owner' ? 'bg-blue-100 text-blue-700' :
                              u.role?.slug === 'admin' ? 'bg-purple-100 text-purple-700' :
                              u.role?.slug === 'cashier' ? 'bg-green-100 text-green-700' :
                              u.role?.slug === 'waiter' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>{u.role?.name || u.role?.slug}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => toggleUserActive(u)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {u.isActive ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => openEditUser(u)} className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Editar">
                              <Pencil size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && <div className="py-8 text-center text-gray-400">Cargando usuarios...</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ USER FORM MODAL ═══ */}
      {showUserForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setShowUserForm(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label><input value={userForm.firstName} onChange={e => setUserForm({ ...userForm, firstName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Apellido *</label><input value={userForm.lastName} onChange={e => setUserForm({ ...userForm, lastName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Email *</label><input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Contraseña {editUser ? '(dejar vacío para no cambiar)' : '*'}</label><input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" /></div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rol *</label>
                <select value={userForm.roleId} onChange={e => setUserForm({ ...userForm, roleId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                  <option value="">Seleccionar...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowUserForm(false)} className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveUser} disabled={saving || !userForm.firstName || !userForm.email || !userForm.roleId}
                className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                {saving ? 'Guardando...' : editUser ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
