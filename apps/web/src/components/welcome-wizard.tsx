'use client';

import { useState, useEffect } from 'react';
import { usePosStore } from '@/store/pos-store';
import { api } from '@/lib/api';
import {
  ShoppingCart, Utensils, ChefHat, Package, Users, FileText,
  Settings, ArrowRight, Check, Sparkles, X, Rocket
} from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: '¡Bienvenido a TSH Restaurantes!',
    desc: 'Tu sistema POS está listo. Te guiaremos por los primeros pasos para configurar tu negocio.',
    color: '#2563eb',
  },
  {
    id: 'products',
    icon: Package,
    title: 'Agrega tus productos',
    desc: 'Crea categorías y agrega tus productos con precios. Es lo primero que necesitas para empezar a vender.',
    action: '/products',
    actionLabel: 'Ir a Productos',
    tip: 'Puedes importar productos después o agregarlos uno por uno.',
  },
  {
    id: 'tables',
    icon: Utensils,
    title: 'Configura tus mesas',
    desc: 'Crea zonas (salón, terraza, barra) y agrega las mesas de tu local con su capacidad.',
    action: '/tables',
    actionLabel: 'Ir a Mesas',
    tip: 'Las mesas se asignan automáticamente al crear órdenes en el POS.',
  },
  {
    id: 'staff',
    icon: Users,
    title: 'Agrega tu personal',
    desc: 'Crea usuarios para meseros, cajeros y cocineros. Cada rol tiene permisos diferentes.',
    action: '/staff',
    actionLabel: 'Ir a Personal',
    tip: 'Cada usuario puede tener un PIN de 4 dígitos para acceso rápido.',
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Personaliza tu negocio',
    desc: 'Configura el nombre, logo, colores, impuestos y datos fiscales de tu restaurante.',
    action: '/settings',
    actionLabel: 'Ir a Configuración',
    tip: 'Puedes cambiar estos datos en cualquier momento desde Configuración.',
  },
  {
    id: 'ready',
    icon: Rocket,
    title: '¡Todo listo!',
    desc: 'Tu sistema está configurado. Abre el POS para crear tu primera orden.',
    action: '/pos',
    actionLabel: 'Abrir POS',
    color: '#16a34a',
  },
];

const STORAGE_KEY = 'tsh-onboarding-dismissed';

export function WelcomeWizard() {
  const store = usePosStore();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const tenant = store.tenant;
    if (!tenant || !store.isAuthenticated) return;

    // Show wizard if not dismissed and tenant is new (trial or created recently)
    if (!dismissed) {
      setVisible(true);
      checkProgress();
    }
  }, [store.tenant, store.isAuthenticated]);

  const checkProgress = async () => {
    try {
      const [products, tables, users] = await Promise.all([
        api.get<any>('/products?limit=1').catch(() => ({ data: [] })),
        api.get<any[]>('/tables').catch(() => []),
        api.get<any[]>('/tenants/users').catch(() => []),
      ]);
      const done = new Set<string>();
      const prodCount = Array.isArray(products) ? products.length : (products?.data?.length || products?.total || 0);
      if (prodCount > 0) done.add('products');
      const tableCount = Array.isArray(tables) ? tables.length : 0;
      if (tableCount > 0) done.add('tables');
      const userCount = Array.isArray(users) ? users.length : 0;
      if (userCount > 1) done.add('staff'); // >1 because owner exists
      done.add('settings'); // always "done" since tenant exists
      setCompletedSteps(done);
    } catch {}
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const progress = ((step) / (STEPS.length - 1)) * 100;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        {/* Close button */}
        <button onClick={dismiss} className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <X size={18} />
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6">
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: `${current.color || '#2563eb'}15` }}>
            <Icon size={28} style={{ color: current.color || '#2563eb' }} />
          </div>

          {/* Step indicator */}
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {isFirst ? 'Inicio' : isLast ? '¡Listo!' : `Paso ${step} de ${STEPS.length - 2}`}
          </p>

          <h2 className="text-xl font-bold text-gray-900">{current.title}</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">{current.desc}</p>

          {current.tip && (
            <p className="mt-3 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
              💡 {current.tip}
            </p>
          )}

          {/* Step checklist for middle steps */}
          {!isFirst && !isLast && (
            <div className="mt-4 flex items-center gap-2">
              {completedSteps.has(current.id) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  <Check size={12} /> Completado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Pendiente
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between border-t px-8 py-4 bg-gray-50">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-600' : i < step ? 'w-1.5 bg-blue-300' : 'w-1.5 bg-gray-300'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={() => setStep(step - 1)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 transition">
                Atrás
              </button>
            )}

            {isFirst && (
              <button onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
                Empezar <ArrowRight size={16} />
              </button>
            )}

            {!isFirst && !isLast && (
              <>
                {current.action && (
                  <a href={current.action} onClick={dismiss}
                    className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition">
                    {current.actionLabel}
                  </a>
                )}
                <button onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                  {completedSteps.has(current.id) ? 'Siguiente' : 'Omitir'} <ArrowRight size={14} />
                </button>
              </>
            )}

            {isLast && (
              <a href={current.action} onClick={dismiss}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition">
                <ShoppingCart size={16} /> {current.actionLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small banner for dashboard to re-open wizard */
export function SetupProgressBanner() {
  const store = usePosStore();
  const [dismissed, setDismissed] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 4 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasDismissed = localStorage.getItem(STORAGE_KEY);
    if (wasDismissed) {
      setDismissed(true);
      // Still check progress for the banner
      checkSetupProgress();
    }
  }, [store.tenant]);

  const checkSetupProgress = async () => {
    try {
      const [products, tables, users] = await Promise.all([
        api.get<any>('/products?limit=1').catch(() => ({ data: [] })),
        api.get<any[]>('/tables').catch(() => []),
        api.get<any[]>('/tenants/users').catch(() => []),
      ]);
      let done = 0;
      const prodCount = Array.isArray(products) ? products.length : (products?.data?.length || 0);
      if (prodCount > 0) done++;
      if ((Array.isArray(tables) ? tables.length : 0) > 0) done++;
      if ((Array.isArray(users) ? users.length : 0) > 1) done++;
      done++; // settings always done
      setProgress({ done, total: 4 });
    } catch {}
  };

  const reopen = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  if (!dismissed || progress.done >= progress.total) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-bold text-blue-900">Configuración inicial</p>
        <p className="text-xs text-blue-600 mt-0.5">{progress.done} de {progress.total} pasos completados</p>
        <div className="mt-2 h-1.5 w-40 rounded-full bg-blue-200 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      </div>
      <button onClick={reopen}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        Continuar setup
      </button>
    </div>
  );
}
