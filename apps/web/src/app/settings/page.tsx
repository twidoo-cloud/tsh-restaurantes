'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { usePosStore } from '@/store/pos-store';
import { useThemeStore } from '@/lib/use-theme';
import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS, Locale } from '@/lib/i18n';
import { api } from '@/lib/api';
import {
  Palette, Building, Globe, FileText, Save, Eye, RotateCcw, Users,
  Plus, Pencil, X, Lock, UserCircle, Printer, Download, Database, Loader2
} from 'lucide-react';
import { PrintSettings } from '@/components/print-settings';

const get = <T,>(p: string): Promise<T> => api.get<T>(p);
const put = <T,>(p: string, b: any): Promise<T> => api.put<T>(p, b);
const post = <T,>(p: string, b: any): Promise<T> => api.post<T>(p, b);

type Tab = 'branding' | 'business' | 'locale' | 'receipt' | 'templates' | 'printer' | 'users' | 'backup';

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

  const initialTab = (searchParams.get('tab') as Tab) || 'business';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [tenant, setTenant] = useState<any>(null);
  const [branding, setBranding] = useState(themeStore.branding);
  const [businessProfile, setBusinessProfile] = useState({ name: '', phone: '', address: '' });
  const [receipt, setReceipt] = useState({ receiptHeader: '', receiptFooter: '', defaultTaxRate: 15 });
  const [templates, setTemplates] = useState({
    comandaShowStation: true,
    comandaShowNotes: true,
    comandaShowTime: true,
    comandaShowServer: true,
    comandaShowTable: true,
    comandaGroupByStation: true,
    comandaFontSize: 'normal' as 'small' | 'normal' | 'large',
    comandaTitle: 'COMANDA',
    prefacturaShowRuc: true,
    prefacturaShowCustomer: true,
    prefacturaShowItemPrice: true,
    prefacturaShowTax: true,
    prefacturaShowPayments: true,
    prefacturaTitle: 'PRE-FACTURA',
    prefacturaFooter: 'Gracias por su compra',
    prefacturaDisclaimer: 'Documento no fiscal',
  });
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
  const [userForm, setUserForm] = useState({ firstName: '', lastName: '', email: '', password: '', roleId: '', pin: '' });

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
        if (data.settings.printTemplates) {
          setTemplates(prev => ({ ...prev, ...data.settings.printTemplates }));
        }
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
    setUserForm({ firstName: '', lastName: '', email: '', password: '', roleId: roles[0]?.id || '', pin: '' });
    setShowUserForm(true);
  };

  const openEditUser = (u: any) => {
    setEditUser(u);
    setUserForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', roleId: u.role?.id || '', pin: '' });
    setShowUserForm(true);
  };

  const saveUser = async () => {
    setSaving(true);
    try {
      if (editUser) {
        const data: any = { firstName: userForm.firstName, lastName: userForm.lastName, email: userForm.email, roleId: userForm.roleId };
        if (userForm.password) data.password = userForm.password;
        if (userForm.pin) data.pin = userForm.pin;
        await put<any>(`/tenants/users/${editUser.id}`, data);
      } else {
        if (!userForm.password) { alert('La contraseña es requerida'); setSaving(false); return; }
        const data: any = { ...userForm };
        if (!data.pin) delete data.pin;
        await post<any>('/tenants/users', data);
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
    ...(isOwnerAdmin ? [
      { id: 'business' as Tab, icon: Building, label: 'Negocio' },
      { id: 'branding' as Tab, icon: Palette, label: 'Marca / Colores' },
    ] : []),
    { id: 'locale' as Tab, icon: Globe, label: 'Idioma' },
    ...(isOwnerAdmin ? [
      { id: 'receipt' as Tab, icon: FileText, label: 'Recibos' },
      { id: 'templates' as Tab, icon: Printer, label: 'Plantillas Impresión' },
      { id: 'printer' as Tab, icon: Printer, label: 'Impresora' },
      { id: 'users' as Tab, icon: Users, label: 'Usuarios' },
      { id: 'backup' as Tab, icon: Database, label: 'Respaldo' },
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
                    Mostrar "Powered by TSH Restaurantes"
                  </label>
                </div>
                {/* Preview */}
                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Vista Previa</h3>
                  <div className="rounded-xl overflow-hidden border" style={{ maxWidth: 400 }}>
                    <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: branding.sidebarColor, color: branding.sidebarTextColor }}>
                      {branding.logoUrl ? <img src={branding.logoUrl} alt="" className="h-7 object-contain" /> :
                        <div className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold" style={{ backgroundColor: branding.primaryColor, color: '#fff' }}>P</div>}
                      <span className="text-sm font-bold">{branding.appName || 'TSH Restaurantes'}</span>
                    </div>
                    <div className="bg-gray-50 p-4 flex gap-2">
                      <button className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: branding.accentColor }}>Acento</button>
                      <button className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: branding.primaryColor }}>Primario</button>
                    </div>
                    {branding.showPoweredBy && <div className="bg-gray-100 py-1 text-center text-[10px] text-gray-400">Powered by TSH Restaurantes</div>}
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
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio</label><input value={businessProfile.name} onChange={e => setBusinessProfile({ ...businessProfile, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input value={businessProfile.phone} onChange={e => setBusinessProfile({ ...businessProfile, phone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label><input value={businessProfile.address} onChange={e => setBusinessProfile({ ...businessProfile, address: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none" /></div>
                  </div>
                  <button onClick={saveBusinessProfile} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"><Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}</button>
                </div>

                {/* Vertical type */}
                {tenant && (
                  <div className="rounded-xl border bg-white p-5 space-y-3">
                    <h3 className="text-sm font-bold text-gray-800">Tipo de Negocio</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'restaurant', label: 'Restaurante', emoji: '🍽️' },
                        { id: 'cafe', label: 'Cafetería', emoji: '☕' },
                        { id: 'bar', label: 'Bar', emoji: '🍸' },
                        { id: 'food_truck', label: 'Food Truck', emoji: '🚚' },
                        { id: 'bakery', label: 'Panadería', emoji: '🥐' },
                        { id: 'other', label: 'Otro', emoji: '🏪' },
                      ].map(v => (
                        <button key={v.id} onClick={async () => {
                          try { await put('/tenants/profile', { verticalType: v.id } as any); setTenant({ ...tenant, verticalType: v.id }); } catch {}
                        }} className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition ${tenant.verticalType === v.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                          <span className="text-lg">{v.emoji}</span> {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plan y Suscripción */}
                {tenant && (() => {
                  const currentPlan = tenant.subscriptionPlan;
                  const isTrial = tenant.subscriptionStatus === 'trial';
                  const trialDays = tenant.trialDaysRemaining ?? tenant.trial_days_remaining;
                  const trialExpired = tenant.trialExpired ?? tenant.trial_expired;
                  const PLANS = [
                    { id: 'basic', label: 'Básico', price: 29, desc: 'Lo esencial para operar',
                      features: ['POS completo', 'Mesas y zonas', 'Cocina en tiempo real', 'Apertura/cierre de caja', 'Productos e inventario', 'Clientes', 'Dashboard', 'Personal', 'Auditoría'],
                      color: 'border-gray-300', accent: '#6b7280', bg: 'bg-gray-50' },
                    { id: 'standard', label: 'Estándar', price: 59, desc: 'Para negocios en crecimiento', popular: true,
                      features: ['Todo de Básico +', 'Facturación electrónica (SRI)', 'Reportes avanzados', 'Recetas y costos', 'Proveedores', 'Promociones', 'Cuentas por cobrar', 'Delivery'],
                      color: 'border-blue-300', accent: '#2563eb', bg: 'bg-blue-50' },
                    { id: 'premium', label: 'Premium', price: 99, desc: 'Experiencia completa',
                      features: ['Todo de Estándar +', 'Programa de fidelidad', 'Reservas online', 'Menú QR digital', 'Soporte prioritario'],
                      color: 'border-purple-300', accent: '#7c3aed', bg: 'bg-purple-50' },
                    { id: 'enterprise', label: 'Enterprise', price: null, desc: 'Soluciones a medida',
                      features: ['Todo de Premium +', 'Gestión multi-tenant', 'API personalizada', 'Integraciones custom', 'Soporte dedicado 24/7'],
                      color: 'border-amber-300', accent: '#d97706', bg: 'bg-amber-50' },
                  ];

                  const handleChangePlan = async (planId: string) => {
                    if (planId === currentPlan && !isTrial) return;
                    if (planId === 'enterprise') { alert('Para el plan Enterprise contacta a ventas@twidoo.co'); return; }
                    const plan = PLANS.find(p => p.id === planId);
                    if (!confirm(`¿Cambiar al plan ${plan?.label} ($${plan?.price}/mes)?\n\nEsto activará las nuevas funciones inmediatamente.`)) return;
                    setSaving(true);
                    try {
                      await put<any>('/tenants/change-plan', { plan: planId, paymentMethod: 'pending' });
                      const t = await get<any>('/tenants/current');
                      setTenant(t);
                      localStorage.setItem('pos_tenant', JSON.stringify(t));
                      store.restoreSession();
                      alert(`✅ Plan actualizado a ${plan?.label}. Las nuevas funciones ya están disponibles.`);
                    } catch (e: any) { alert('Error: ' + e.message); }
                    setSaving(false);
                  };

                  return (
                    <div className="space-y-4">
                      {isTrial && !trialExpired && (
                        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold">Período de prueba</p>
                              <p className="text-xs text-white/80 mt-0.5">Tienes acceso a todas las funciones Premium</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-extrabold">{trialDays}</p>
                              <p className="text-[10px] text-white/70 uppercase">días restantes</p>
                            </div>
                          </div>
                          <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                            <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${Math.max(5, ((7 - (trialDays || 0)) / 7) * 100)}%` }} />
                          </div>
                          <p className="mt-2 text-[10px] text-white/60">Al terminar el periodo de prueba se activará el plan Básico. Elige un plan para mantener tus funciones.</p>
                        </div>
                      )}

                      {isTrial && trialExpired && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                          <p className="text-sm font-bold text-red-700">Tu periodo de prueba ha expirado</p>
                          <p className="text-xs text-red-600 mt-1">Se ha activado el plan Básico. Elige un plan para desbloquear más funciones.</p>
                        </div>
                      )}

                      <div className="rounded-xl border bg-white p-5 space-y-4">
                        <h3 className="text-sm font-bold text-gray-800">Planes disponibles</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {PLANS.map(p => {
                            const isCurrent = currentPlan === p.id && !isTrial;
                            const isDowngrade = ['basic', 'standard', 'premium', 'enterprise'].indexOf(p.id) < ['basic', 'standard', 'premium', 'enterprise'].indexOf(currentPlan);
                            return (
                              <div key={p.id} className={`relative rounded-xl border-2 p-4 transition ${isCurrent ? 'ring-2 ring-blue-500 ' + p.bg + ' ' + p.color : 'border-gray-200 hover:border-gray-300'}`}>
                                {p.popular && <span className="absolute -top-2.5 right-3 rounded-full bg-blue-600 px-2.5 py-0.5 text-[9px] font-bold text-white shadow">POPULAR</span>}
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-gray-900">{p.label}</p>
                                  {isCurrent && <span className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: p.accent }}>ACTUAL</span>}
                                </div>
                                <div className="mt-1">
                                  {p.price ? (
                                    <><span className="text-2xl font-extrabold text-gray-900">${p.price}</span><span className="text-xs text-gray-500">/mes</span></>
                                  ) : (
                                    <span className="text-sm font-bold text-gray-500">Precio personalizado</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">{p.desc}</p>
                                <ul className="mt-3 space-y-1">
                                  {p.features.map((f, i) => (
                                    <li key={i} className={`text-[11px] ${f.startsWith('Todo de') ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
                                      {f.startsWith('Todo de') ? '↗ ' : '✓ '}{f}
                                    </li>
                                  ))}
                                </ul>
                                <button
                                  onClick={() => handleChangePlan(p.id)}
                                  disabled={isCurrent || saving}
                                  className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold transition ${
                                    isCurrent ? 'bg-gray-100 text-gray-400 cursor-default' :
                                    p.id === 'enterprise' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                    isDowngrade ? 'border border-gray-300 text-gray-600 hover:bg-gray-50' :
                                    'text-white hover:opacity-90'
                                  }`}
                                  style={!isCurrent && !isDowngrade && p.id !== 'enterprise' ? { backgroundColor: p.accent } : {}}
                                >
                                  {isCurrent ? 'Plan actual' : p.id === 'enterprise' ? 'Contactar ventas' : isDowngrade ? 'Cambiar a este plan' : saving ? 'Procesando...' : `Activar ${p.label}`}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] text-gray-400 font-medium uppercase">Plan</p><p className="text-sm font-bold text-gray-900 capitalize">{isTrial ? 'Prueba' : currentPlan}</p></div>
                        <div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] text-gray-400 font-medium uppercase">Estado</p><p className={`text-sm font-bold capitalize ${tenant.subscriptionStatus === 'active' ? 'text-green-600' : tenant.subscriptionStatus === 'trial' ? 'text-blue-600' : 'text-red-600'}`}>{tenant.subscriptionStatus === 'trial' ? 'Prueba' : tenant.subscriptionStatus === 'active' ? 'Activo' : tenant.subscriptionStatus}</p></div>
                        <div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] text-gray-400 font-medium uppercase">País</p><p className="text-sm font-bold text-gray-900">{tenant.countryCode}</p></div>
                        <div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] text-gray-400 font-medium uppercase">Moneda</p><p className="text-sm font-bold text-gray-900">{tenant.currencyCode}</p></div>
                      </div>
                    </div>
                  );
                })()}
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

            {/* ═══ PRINT TEMPLATES ═══ */}
            {tab === 'templates' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Plantillas de Impresión</h2>
                <p className="text-sm text-gray-500">Personaliza el formato de las comandas de cocina y prefacturas.</p>

                {/* ── COMANDA TEMPLATE ── */}
                <div className="rounded-xl border bg-white overflow-hidden">
                  <div className="px-5 py-3 bg-amber-50 border-b"><h3 className="font-bold text-gray-900">Comanda de Cocina</h3></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x">
                    <div className="p-5 space-y-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Título</label><input value={templates.comandaTitle} onChange={e => setTemplates({ ...templates, comandaTitle: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Tamaño de fuente</label>
                        <select value={templates.comandaFontSize} onChange={e => setTemplates({ ...templates, comandaFontSize: e.target.value as any })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                          <option value="small">Pequeño</option><option value="normal">Normal</option><option value="large">Grande</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Elementos a mostrar</p>
                        {[
                          { key: 'comandaShowStation', label: 'Estación de cocina' },
                          { key: 'comandaGroupByStation', label: 'Agrupar por estación' },
                          { key: 'comandaShowNotes', label: 'Notas del item' },
                          { key: 'comandaShowTime', label: 'Fecha y hora' },
                          { key: 'comandaShowServer', label: 'Nombre del mesero' },
                          { key: 'comandaShowTable', label: 'Número de mesa' },
                        ].map(opt => (
                          <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={(templates as any)[opt.key]} onChange={e => setTemplates({ ...templates, [opt.key]: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <span className="text-sm text-gray-600">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 mb-3">Vista Previa</p>
                      <div className={`mx-auto w-64 rounded-lg border bg-white p-4 font-mono shadow ${templates.comandaFontSize === 'small' ? 'text-[10px]' : templates.comandaFontSize === 'large' ? 'text-sm' : 'text-xs'}`}>
                        <p className="text-center font-bold text-sm">=== {templates.comandaTitle} ===</p>
                        <hr className="my-1 border-dashed" />
                        <div className="flex justify-between"><span className="font-bold">Orden:</span><span className="font-bold">#0042</span></div>
                        {templates.comandaShowTime && <div className="flex justify-between"><span>13/02/2026 14:30</span><span></span></div>}
                        {templates.comandaShowTable && <div className="flex justify-between"><span></span><span className="font-bold">MESA 5</span></div>}
                        {templates.comandaShowServer && <div className="flex justify-between"><span>Mesero:</span><span>Carlos</span></div>}
                        <hr className="my-1 border-dashed" />
                        {templates.comandaShowStation && templates.comandaGroupByStation && <p className="font-bold mt-1">▶ PARRILLA</p>}
                        <p className="font-bold">2x Lomo Saltado</p>
                        {templates.comandaShowNotes && <p className="italic pl-2 text-gray-500">→ Sin picante</p>}
                        <p className="font-bold">1x Churrasco</p>
                        {templates.comandaShowStation && templates.comandaGroupByStation && <p className="font-bold mt-2">▶ FRÍOS</p>}
                        <p className="font-bold">1x Ceviche Mixto</p>
                        <hr className="my-1 border-dashed" />
                        <p className="text-center text-gray-400">Total items: 4</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── PREFACTURA TEMPLATE ── */}
                <div className="rounded-xl border bg-white overflow-hidden">
                  <div className="px-5 py-3 bg-green-50 border-b"><h3 className="font-bold text-gray-900">Prefactura</h3></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x">
                    <div className="p-5 space-y-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Título</label><input value={templates.prefacturaTitle} onChange={e => setTemplates({ ...templates, prefacturaTitle: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Texto disclaimer</label><input value={templates.prefacturaDisclaimer} onChange={e => setTemplates({ ...templates, prefacturaDisclaimer: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Pie de prefactura</label><textarea value={templates.prefacturaFooter} onChange={e => setTemplates({ ...templates, prefacturaFooter: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Elementos a mostrar</p>
                        {[
                          { key: 'prefacturaShowRuc', label: 'RUC del negocio' },
                          { key: 'prefacturaShowCustomer', label: 'Datos del cliente' },
                          { key: 'prefacturaShowItemPrice', label: 'Precio unitario por item' },
                          { key: 'prefacturaShowTax', label: 'Desglose de impuesto (IVA)' },
                          { key: 'prefacturaShowPayments', label: 'Pagos realizados' },
                        ].map(opt => (
                          <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={(templates as any)[opt.key]} onChange={e => setTemplates({ ...templates, [opt.key]: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                            <span className="text-sm text-gray-600">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 mb-3">Vista Previa</p>
                      <div className="mx-auto w-64 rounded-lg border bg-white p-4 font-mono text-xs shadow">
                        <p className="text-center font-bold text-sm">{receipt.receiptHeader || tenant?.name || 'Restaurante'}</p>
                        {templates.prefacturaShowRuc && <p className="text-center text-gray-500">RUC: 1790012345001</p>}
                        <hr className="my-1.5 border-double border-gray-400" />
                        <p className="text-center font-bold">*** {templates.prefacturaTitle} ***</p>
                        {templates.prefacturaDisclaimer && <p className="text-center text-gray-400">{templates.prefacturaDisclaimer}</p>}
                        <hr className="my-1 border-dashed" />
                        <div className="flex justify-between"><span>Orden:</span><span className="font-bold">#0042</span></div>
                        <div className="flex justify-between"><span>Fecha:</span><span>13/02/2026</span></div>
                        <div className="flex justify-between"><span>Mesa: 5</span><span>Carlos</span></div>
                        {templates.prefacturaShowCustomer && <><div className="flex justify-between"><span>Cliente:</span><span>Juan Pérez</span></div><div className="flex justify-between"><span>CI:</span><span>0912345678</span></div></>}
                        <hr className="my-1 border-dashed" />
                        <div className="flex justify-between font-bold"><span>Qty Producto</span><span>Total</span></div>
                        <hr className="my-0.5 border-dashed" />
                        <div className="flex justify-between"><span>2 Lomo Saltado</span><span>$24.00</span></div>
                        {templates.prefacturaShowItemPrice && <p className="pl-3 text-gray-400">@ $12.00 c/u</p>}
                        <div className="flex justify-between"><span>1 Ceviche Mixto</span><span>$15.00</span></div>
                        <div className="flex justify-between"><span>2 Coca-Cola</span><span>$4.00</span></div>
                        <hr className="my-1 border-dashed" />
                        <div className="flex justify-between"><span>Subtotal:</span><span>$43.00</span></div>
                        {templates.prefacturaShowTax && <div className="flex justify-between"><span>IVA 15%:</span><span>$6.45</span></div>}
                        <hr className="my-0.5 border-double border-gray-400" />
                        <div className="flex justify-between font-bold text-sm"><span>TOTAL:</span><span>$49.45</span></div>
                        <hr className="my-0.5 border-double border-gray-400" />
                        {templates.prefacturaShowPayments && <div className="flex justify-between text-gray-500"><span>Pago Efectivo:</span><span>$50.00</span></div>}
                        {templates.prefacturaShowPayments && <div className="flex justify-between text-gray-500"><span>Cambio:</span><span>$0.55</span></div>}
                        <hr className="my-1 border-dashed" />
                        <p className="text-center">{templates.prefacturaFooter}</p>
                        <hr className="my-1 border-dashed" />
                        <p className="text-center text-gray-400">TSH Restaurantes</p>
                        <p className="text-center text-gray-400">www.twidoo.co</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={async () => {
                  setSaving(true);
                  try { await put<any>('/tenants/settings', { ...receipt, printTemplates: templates }); alert('✅ Plantillas guardadas'); } catch (e: any) { alert('Error: ' + e.message); }
                  setSaving(false);
                }} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Plantillas'}
                </button>
              </div>
            )}

            {/* ═══ PRINTER ═══ */}
            {tab === 'printer' && (
              <div className="rounded-xl border bg-white p-6">
                <PrintSettings />
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
                      <tr><th className="px-4 py-3 text-left">Nombre</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Rol</th><th className="px-4 py-3 text-center">PIN</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-center">Acciones</th></tr>
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
                            {u.hasPin ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Activo
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-300">—</span>
                            )}
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

            {/* ═══ BACKUP / EXPORT ═══ */}
            {tab === 'backup' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">Respaldo de Datos</h2>
                <div className="rounded-xl border bg-white p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"><Database size={20} className="text-blue-600" /></div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Exportar Datos Completos</h3>
                      <p className="text-xs text-gray-500">Descarga todos los datos de tu negocio en formato JSON</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Incluye: productos, categorías, clientes, proveedores, recetas, roles, usuarios, zonas, mesas, promociones, cuentas de crédito, órdenes (90 días) y auditoría (30 días).</p>
                  <button
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const data = await get<any>('/tenants/export/data');
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                        a.download = `backup-${data.tenant?.slug || 'tenant'}-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        alert('Respaldo descargado');
                      } catch (e: any) { alert('Error: ' + e.message); }
                      setSaving(false);
                    }}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Exportando...</> : <><Download size={16} /> Descargar Backup JSON</>}
                  </button>
                </div>
                <div className="rounded-xl border bg-white p-5 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">Exportar por Módulo (CSV)</h3>
                  <p className="text-xs text-gray-500">Descarga datos individuales en formato CSV para Excel.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Productos', endpoint: '/inventory/stock', filename: 'productos', transform: (d: any[]) => 'Nombre,SKU,Categoría,Stock,Min,Unidad,Costo\n' + d.map(p => `"${p.name}","${p.sku || ''}","${p.category_name || ''}",${p.current_stock},${p.min_stock},"${p.unit}",${p.cost || 0}`).join('\n') },
                      { label: 'Clientes', endpoint: '/customers', filename: 'clientes', transform: (d: any[]) => 'Nombre,Email,Teléfono,RUC/CI,Dirección\n' + d.map(c => `"${c.name || c.firstName + ' ' + (c.lastName || '')}","${c.email || ''}","${c.phone || ''}","${c.taxId || ''}","${c.address || ''}"`).join('\n') },
                      { label: 'Proveedores', endpoint: '/suppliers', filename: 'proveedores', transform: (d: any[]) => 'Nombre,Contacto,Email,Teléfono\n' + d.map(s => `"${s.name}","${s.contactName || ''}","${s.email || ''}","${s.phone || ''}"`).join('\n') },
                      { label: 'Auditoría', endpoint: '/audit/logs?limit=2000', filename: 'auditoria', transform: (d: any) => { const rows = d.data || d; return 'Fecha,Usuario,Acción,Entidad,Descripción\n' + rows.map((l: any) => `"${l.created_at || l.createdAt}","${l.user_name || l.userName || ''}","${l.action}","${l.entity}","${(l.description || '').replace(/"/g, '""')}"`).join('\n'); } },
                    ].map(exp => (
                      <button key={exp.filename}
                        onClick={async () => {
                          try {
                            const d = await get<any>(exp.endpoint);
                            const csv = exp.transform(Array.isArray(d) ? d : (d.data || d.records || []));
                            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
                            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                            a.download = `${exp.filename}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
                          } catch (e: any) { alert('Error: ' + e.message); }
                        }}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Download size={14} /> {exp.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <p className="text-xs text-amber-700"><strong>Nota:</strong> La importación de datos se gestiona desde el panel de Super Admin. Si necesitas restaurar un backup, contacta al administrador del sistema.</p>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  PIN de acceso rápido
                  <span className="text-gray-400 font-normal ml-1">(4-6 dígitos{editUser?.hasPin ? ' · activo' : ''})</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                    value={userForm.pin}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setUserForm({ ...userForm, pin: v });
                    }}
                    placeholder={editUser?.hasPin ? '••••' : 'Ej: 1234'}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 tracking-widest font-mono"
                  />
                  {editUser?.hasPin && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('¿Eliminar el PIN de este usuario?')) {
                          try {
                            await put<any>(`/tenants/users/${editUser.id}`, { pin: null });
                            loadUsers();
                            setEditUser({ ...editUser, hasPin: false });
                            alert('✅ PIN eliminado');
                          } catch { alert('Error al eliminar PIN'); }
                        }
                      }}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition whitespace-nowrap"
                    >
                      Quitar PIN
                    </button>
                  )}
                </div>
                {userForm.pin && userForm.pin.length > 0 && userForm.pin.length < 4 && (
                  <p className="text-[10px] text-amber-500 mt-1">Mínimo 4 dígitos</p>
                )}
              </div>
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