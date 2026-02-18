'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useTranslation } from '@/lib/i18n';
import { LanguageSelector } from '@/components/language-selector';
import { api } from '@/lib/api';

type View = 'login' | 'pin' | 'forgot' | 'reset';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading, error, clearError } = usePosStore();
  const { t } = useTranslation();

  // ── State ──
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  // PIN state
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinTenant, setPinTenant] = useState<{ id: string; name: string } | null>(null);
  const [pinTenants, setPinTenants] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [pinTenantsLoading, setPinTenantsLoading] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Reset password state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // ── Init ──
  useEffect(() => {
    // Check for reset token in URL
    const token = searchParams.get('reset');
    if (token) {
      setResetToken(token);
      setView('reset');
    }
    // Restore remembered email
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tsh_remember_email');
      if (saved) {
        setEmail(saved);
        setRememberEmail(true);
      }
      // Load tenant for PIN login
      const tenantJson = localStorage.getItem('pos_tenant');
      if (tenantJson) {
        try {
          const t = JSON.parse(tenantJson);
          if (t.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id)) {
            setPinTenant({ id: t.id, name: t.name });
          } else {
            localStorage.removeItem('pos_tenant');
          }
        } catch {
          localStorage.removeItem('pos_tenant');
        }
      }
      // Always fetch available tenants for PIN (fallback if no localStorage)
      loadPinTenants();
    }
  }, [searchParams]);

  // ── Navigate after login by role ──
  const loadPinTenants = async () => {
    try {
      setPinTenantsLoading(true);
      const data = await api.get<any[]>('/auth/pin-tenants');
      setPinTenants(data || []);
      // Auto-select if only one tenant and no tenant selected yet
      if (data && data.length === 1 && !pinTenant) {
        setPinTenant({ id: data[0].id, name: data[0].name });
      }
    } catch { /* ignore */ }
    setPinTenantsLoading(false);
  };

  const navigateByRole = useCallback((role: string) => {
    if (role === 'kitchen') router.push('/kitchen');
    else if (role === 'waiter') router.push('/tables');
    else router.push('/pos');
  }, [router]);

  // ── Handlers ──
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (rememberEmail && typeof window !== 'undefined') {
      localStorage.setItem('tsh_remember_email', email);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('tsh_remember_email');
    }
    try {
      const data = await login(email, password);
      navigateByRole(data?.user?.role);
    } catch {}
  };

  const handlePinDigit = useCallback((digit: string) => {
    setPinError('');
    setPin(prev => {
      if (prev.length >= 6) return prev;
      return prev + digit;
    });
  }, []);

  const handlePinClear = useCallback(() => {
    setPin('');
    setPinError('');
  }, []);

  const handlePinBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setPinError('');
  }, []);

  // Auto-submit PIN when 4 digits
  useEffect(() => {
    if (pin.length === 4) {
      const submitPin = async () => {
        setPinLoading(true);
        setPinError('');
        try {
          if (!pinTenant?.id) {
            setPinError('Inicia sesión con email primero para configurar este dispositivo');
            setPin('');
            setPinLoading(false);
            return;
          }
          const data = await api.pinLogin(pinTenant.id, pin);
          // Sync Zustand store (same as email login)
          usePosStore.setState({
            user: data.user,
            tenant: data.tenant,
            isAuthenticated: true,
          });
          navigateByRole(data.user.role);
        } catch (err: any) {
          setPinError(err.message || 'PIN inválido');
          setPin('');
        } finally {
          setPinLoading(false);
        }
      };
      submitPin();
    }
  }, [pin, pinTenant, navigateByRole]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      await api.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err.message || 'Error al enviar instrucciones');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetError(t('login.reset_mismatch'));
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      await api.resetPassword(resetToken, newPassword);
      setResetSuccess(true);
      // Clean URL
      window.history.replaceState({}, '', '/login');
    } catch (err: any) {
      setResetError(err.message || 'Error al restablecer');
    } finally {
      setResetLoading(false);
    }
  };

  const quickAccessUsers = useMemo(() => [
    { email: 'admin@cevicheria.com', label: 'Gerente', role: 'owner', icon: '👔' },
    { email: 'cajero@cevicheria.com', label: 'Cajero', role: 'cashier', icon: '💰' },
    { email: 'mesero1@cevicheria.com', label: 'Mesero', role: 'waiter', icon: '🍽️' },
    { email: 'cocina@cevicheria.com', label: 'Cocina', role: 'kitchen', icon: '🔥' },
  ], []);

  // ── PIN Pad Digits ──
  const pinPadKeys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2847 40%, #0f3460 70%, #1a5c3a 100%)' }}>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #4ade80 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }} />
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full opacity-[0.02]"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
      </div>

      {/* Language selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector compact />
      </div>

      {/* Main card */}
      <div className="w-full max-w-[420px] mx-4 relative z-10">

        {/* Logo + Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 w-20 h-20 rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/40 border border-white/10 bg-[#0a1628] flex items-center justify-center">
            <img src="/tsh-logo.png" alt="TSH" className="w-16 h-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {view === 'forgot' ? t('login.forgot_title') :
             view === 'reset' ? t('login.reset_title') :
             view === 'pin' ? t('login.pin_title') :
             t('login.title')}
          </h1>
          <p className="mt-1 text-sm text-blue-200/60">
            {view === 'forgot' ? t('login.forgot_subtitle') :
             view === 'reset' ? t('login.reset_subtitle') :
             view === 'pin' ? t('login.pin_subtitle') :
             t('login.subtitle')}
          </p>
        </div>

        {/* Card container */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden">

          {/* ═══════════════ EMAIL LOGIN VIEW ═══════════════ */}
          {view === 'login' && (
            <div className="p-6">
              {/* Tab switcher */}
              <div className="flex mb-6 bg-white/[0.06] rounded-xl p-1 border border-white/[0.06]">
                <button
                  onClick={() => setView('login')}
                  className="flex-1 py-2 text-sm font-semibold rounded-lg bg-white/[0.12] text-white shadow-sm transition-all">
                  {t('login.tab_email')}
                </button>
                <button
                  onClick={() => { setView('pin'); setPin(''); setPinError(''); }}
                  className="flex-1 py-2 text-sm font-medium rounded-lg text-blue-200/50 hover:text-white/80 transition-all">
                  {t('login.tab_pin')}
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-blue-200/50 uppercase tracking-wider">
                    {t('login.email')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-blue-300/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-3 text-sm text-white placeholder-blue-200/25 transition-all focus:border-blue-400/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-blue-400/10"
                      placeholder="tu@email.com" required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-blue-200/50 uppercase tracking-wider">
                    {t('login.password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-blue-300/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-10 py-3 text-sm text-white placeholder-blue-200/25 transition-all focus:border-blue-400/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-blue-400/10"
                      placeholder="••••••" required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-blue-300/30 hover:text-blue-200/60 transition"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember email + Forgot password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox" checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-blue-400 focus:ring-blue-400/30 focus:ring-offset-0"
                    />
                    <span className="text-xs text-blue-200/40 group-hover:text-blue-200/60 transition">
                      {t('login.remember_email')}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setForgotEmail(email); setForgotSent(false); setForgotError(''); }}
                    className="text-xs text-blue-300/50 hover:text-blue-300/80 transition font-medium"
                  >
                    {t('login.forgot_password')}
                  </button>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full rounded-xl py-3 font-semibold text-sm text-white transition-all disabled:opacity-40 relative overflow-hidden group"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #0d9488)' }}
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
                  <span className="relative">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t('common.loading')}
                      </span>
                    ) : t('login.submit')}
                  </span>
                </button>
              </form>

              {/* Quick access demo */}
              <div className="mt-5 pt-5 border-t border-white/[0.06]">
                <p className="text-center text-[10px] font-semibold text-blue-200/30 uppercase tracking-widest mb-3">
                  {t('login.quick_access')}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {quickAccessUsers.map(u => (
                    <button
                      key={u.email} type="button"
                      onClick={() => { setEmail(u.email); setPassword('demo123'); }}
                      className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-center transition-all hover:bg-white/[0.08] hover:border-white/[0.12] group"
                    >
                      <span className="text-lg">{u.icon}</span>
                      <span className="text-[10px] font-semibold text-blue-200/50 group-hover:text-blue-200/80 transition">
                        {u.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ PIN LOGIN VIEW ═══════════════ */}
          {view === 'pin' && (
            <div className="p-6">
              {/* Tab switcher */}
              <div className="flex mb-6 bg-white/[0.06] rounded-xl p-1 border border-white/[0.06]">
                <button
                  onClick={() => setView('login')}
                  className="flex-1 py-2 text-sm font-medium rounded-lg text-blue-200/50 hover:text-white/80 transition-all">
                  {t('login.tab_email')}
                </button>
                <button
                  onClick={() => setView('pin')}
                  className="flex-1 py-2 text-sm font-semibold rounded-lg bg-white/[0.12] text-white shadow-sm transition-all">
                  {t('login.tab_pin')}
                </button>
              </div>

              {!pinTenant ? (
                /* Tenant selector for PIN login */
                <div className="py-4">
                  {pinTenantsLoading ? (
                    <div className="flex justify-center py-8">
                      <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : pinTenants.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-blue-200/60 mb-3">No hay restaurantes con PIN configurado.</p>
                      <button type="button" onClick={() => setView('login')}
                        className="text-sm font-semibold text-blue-300/70 hover:text-blue-300 transition">
                        ← Ir a login con email
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-center text-xs text-blue-200/40 mb-3 font-medium uppercase tracking-wider">Selecciona tu restaurante</p>
                      <div className="space-y-2">
                        {pinTenants.map(t => (
                          <button key={t.id} type="button"
                            onClick={() => setPinTenant({ id: t.id, name: t.name })}
                            className="w-full flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-left transition-all hover:bg-white/[0.10] hover:border-white/[0.15] group">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold text-sm shrink-0">
                              {t.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-white/80 group-hover:text-white truncate">{t.name}</p>
                              <p className="text-[10px] text-blue-200/30">{t.slug}</p>
                            </div>
                            <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Restaurant name badge */}
                  <div className="flex justify-center mb-5">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-medium text-blue-200/60">{pinTenant.name}</span>
                    </div>
                  </div>

                  {/* PIN dots */}
                  <div className="flex justify-center gap-3 mb-6">
                    {[0,1,2,3].map(i => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                          pin.length > i
                            ? 'bg-blue-400 border-blue-400 shadow-lg shadow-blue-400/30 scale-110'
                            : 'border-white/20 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {pinError && (
                    <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 text-center">
                      {pinError}
                    </div>
                  )}

                  {pinLoading && (
                    <div className="mb-4 flex justify-center">
                      <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}

                  {/* PIN Pad */}
                  <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
                    {pinPadKeys.map((key, i) => (
                      key === '' ? <div key={i} /> :
                      key === '⌫' ? (
                        <button
                          key={i} type="button"
                          onClick={handlePinBackspace}
                          disabled={pinLoading}
                          className="aspect-square rounded-xl border border-white/[0.06] bg-white/[0.03] flex items-center justify-center text-blue-200/50 hover:bg-white/[0.08] hover:text-white transition-all active:scale-95 disabled:opacity-30"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H21a1 1 0 011 1v12a1 1 0 01-1 1H10.828a2 2 0 01-1.414-.586L3 12z" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          key={i} type="button"
                          onClick={() => handlePinDigit(key)}
                          disabled={pinLoading}
                          className="aspect-square rounded-xl border border-white/[0.06] bg-white/[0.03] flex items-center justify-center text-xl font-semibold text-white/80 hover:bg-white/[0.10] hover:text-white transition-all active:scale-95 disabled:opacity-30"
                        >
                          {key}
                        </button>
                      )
                    ))}
                  </div>

                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={handlePinClear}
                      className="text-xs text-blue-300/40 hover:text-blue-300/70 transition font-medium"
                    >
                      {t('login.pin_clear')}
                    </button>
                    <span className="text-white/10 mx-2">·</span>
                    <button
                      type="button"
                      onClick={() => { setPinTenant(null); setPin(''); setPinError(''); }}
                      className="text-xs text-blue-300/40 hover:text-blue-300/70 transition font-medium"
                    >
                      Cambiar restaurante
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════ FORGOT PASSWORD VIEW ═══════════════ */}
          {view === 'forgot' && (
            <div className="p-6">
              {forgotSent ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-200/60 mb-6 leading-relaxed">
                    {t('login.forgot_success')}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setView('login'); setForgotSent(false); }}
                    className="text-sm font-semibold text-blue-300/70 hover:text-blue-300 transition"
                  >
                    ← {t('login.forgot_back')}
                  </button>
                </div>
              ) : (
                <>
                  {forgotError && (
                    <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
                      {forgotError}
                    </div>
                  )}
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-blue-200/50 uppercase tracking-wider">
                        {t('login.email')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-blue-300/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input
                          type="email" value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-3 text-sm text-white placeholder-blue-200/25 transition-all focus:border-blue-400/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-blue-400/10"
                          placeholder="tu@email.com" required
                        />
                      </div>
                    </div>
                    <button
                      type="submit" disabled={forgotLoading}
                      className="w-full rounded-xl py-3 font-semibold text-sm text-white transition-all disabled:opacity-40 relative overflow-hidden group"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #0d9488)' }}
                    >
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
                      <span className="relative">
                        {forgotLoading ? t('common.loading') : t('login.forgot_send')}
                      </span>
                    </button>
                  </form>
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      className="text-xs text-blue-300/50 hover:text-blue-300/80 transition font-medium"
                    >
                      ← {t('login.forgot_back')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════ RESET PASSWORD VIEW ═══════════════ */}
          {view === 'reset' && (
            <div className="p-6">
              {resetSuccess ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-200/60 mb-6">{t('login.reset_success')}</p>
                  <button
                    type="button"
                    onClick={() => { setView('login'); setResetSuccess(false); }}
                    className="w-full rounded-xl py-3 font-semibold text-sm text-white transition-all relative overflow-hidden group"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #0d9488)' }}
                  >
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
                    <span className="relative">{t('login.submit')}</span>
                  </button>
                </div>
              ) : (
                <>
                  {resetError && (
                    <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
                      {resetError}
                    </div>
                  )}
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-blue-200/50 uppercase tracking-wider">
                        {t('login.reset_new_password')}
                      </label>
                      <input
                        type="password" value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-blue-200/25 transition-all focus:border-blue-400/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-blue-400/10"
                        placeholder="Mínimo 6 caracteres" required minLength={6}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-blue-200/50 uppercase tracking-wider">
                        {t('login.reset_confirm')}
                      </label>
                      <input
                        type="password" value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-blue-200/25 transition-all focus:border-blue-400/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-blue-400/10"
                        placeholder="Repite la contraseña" required minLength={6}
                      />
                    </div>
                    <button
                      type="submit" disabled={resetLoading}
                      className="w-full rounded-xl py-3 font-semibold text-sm text-white transition-all disabled:opacity-40 relative overflow-hidden group"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #0d9488)' }}
                    >
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
                      <span className="relative">
                        {resetLoading ? t('common.loading') : t('login.reset_submit')}
                      </span>
                    </button>
                  </form>
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => { setView('login'); window.history.replaceState({}, '', '/login'); }}
                      className="text-xs text-blue-300/50 hover:text-blue-300/80 transition font-medium"
                    >
                      ← {t('login.forgot_back')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-[10px] text-blue-200/25">
          {t('login.powered_by')} · twidoo.co
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
