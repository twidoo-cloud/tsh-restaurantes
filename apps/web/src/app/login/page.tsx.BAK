'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useTranslation } from '@/lib/i18n';
import { LanguageSelector } from '@/components/language-selector';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, clearError } = usePosStore();
  const { t } = useTranslation();
  const [email, setEmail] = useState('carlos@lacosta.ec');
  const [password, setPassword] = useState('demo123');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      const data = await login(email, password);
      const role = data?.user?.role;
      if (role === 'kitchen') router.push('/kitchen');
      else if (role === 'waiter') router.push('/tables');
      else router.push('/pos');
    } catch {}
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700">
      {/* Language selector - top right */}
      <div className="absolute top-4 right-4">
        <LanguageSelector compact />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-lg">
            P
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('login.subtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('login.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="tu@email.com" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('login.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="••••••" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {loading ? t('common.loading') : t('login.submit')}
          </button>
        </form>

        <div className="mt-6 space-y-2">
          <p className="text-center text-xs font-medium text-gray-400 uppercase">{t('login.quick_access')}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { email: 'carlos@lacosta.ec', label: 'Dueño', role: 'owner', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { email: 'cajera@lacosta.ec', label: 'Cajera', role: 'cashier', color: 'bg-green-50 text-green-700 border-green-200' },
              { email: 'mesero@lacosta.ec', label: 'Mesero', role: 'waiter', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { email: 'cocina@lacosta.ec', label: 'Cocina', role: 'kitchen', color: 'bg-orange-50 text-orange-700 border-orange-200' },
            ].map(u => (
              <button key={u.email} type="button"
                onClick={() => { setEmail(u.email); setPassword('demo123'); }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition hover:shadow-sm ${u.color}`}>
                {u.label} <span className="text-[10px] opacity-60">({u.role})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
