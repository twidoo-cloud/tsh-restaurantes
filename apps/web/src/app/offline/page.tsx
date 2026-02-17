'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Smartphone } from 'lucide-react';

export default function OfflinePage() {
  const [retrying, setRetrying] = useState(false);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const handler = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) window.location.href = '/pos';
    };
    window.addEventListener('online', handler);
    setOnline(navigator.onLine);
    return () => window.removeEventListener('online', handler);
  }, []);

  const retry = () => {
    setRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = '/pos';
      } else {
        setRetrying(false);
      }
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur">
          <WifiOff size={36} className="text-white/80" />
        </div>
        <h1 className="text-2xl font-bold text-white">Sin conexión</h1>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          No hay conexión a internet. Algunas funciones no están disponibles sin conexión.
        </p>
        <button
          onClick={retry}
          disabled={retrying}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
          {retrying ? 'Verificando...' : 'Reintentar conexión'}
        </button>
        <div className="mt-8 rounded-xl bg-white/5 p-4 text-left">
          <p className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5"><Smartphone size={12} /> Mientras tanto puedes:</p>
          <ul className="space-y-1.5 text-xs text-white/50">
            <li>• Ver datos que ya se cargaron previamente</li>
            <li>• Las acciones se guardarán y sincronizarán al reconectar</li>
            <li>• Consultar órdenes y productos en caché</li>
          </ul>
        </div>
        <p className="mt-6 text-[10px] text-white/30">TSH Restaurantes</p>
      </div>
    </div>
  );
}
