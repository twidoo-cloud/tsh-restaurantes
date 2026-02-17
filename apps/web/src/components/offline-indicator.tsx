'use client';

import { useOfflineStore, useInstallPrompt } from '@/lib/use-offline';
import { Wifi, WifiOff, CloudOff, RefreshCw, Download, X } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Floating offline indicator — shows at top of screen when offline
 * or when there are queued actions pending sync.
 */
export function OfflineIndicator() {
  const { isOnline, queuedActions, isSyncing } = useOfflineStore();
  const queueCount = queuedActions.length;
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || (isOnline && queueCount === 0)) return null;

  return (
    <div className={`fixed top-14 left-0 right-0 z-[90] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
      !isOnline
        ? 'bg-red-600 text-white'
        : isSyncing
          ? 'bg-blue-600 text-white'
          : 'bg-amber-500 text-white'
    }`}>
      {!isOnline ? (
        <>
          <WifiOff size={16} />
          <span>Sin conexión — trabajando offline</span>
          {queueCount > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {queueCount} pendiente{queueCount !== 1 ? 's' : ''}
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw size={16} className="animate-spin" />
          <span>Sincronizando datos...</span>
        </>
      ) : (
        <>
          <CloudOff size={16} />
          <span>{queueCount} acción{queueCount !== 1 ? 'es' : ''} pendiente{queueCount !== 1 ? 's' : ''} de sincronizar</span>
        </>
      )}
    </div>
  );
}

/**
 * Compact online/offline badge for headers.
 */
export function ConnectionBadge() {
  const { isOnline } = useOfflineStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
      isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
    }`}>
      {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}

/**
 * Install PWA banner — shows when app is installable.
 */
export function InstallBanner() {
  const { isInstallable, isInstalled, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl border bg-white p-4 shadow-xl md:left-auto md:right-4 md:max-w-sm">
      <button onClick={() => setDismissed(true)} className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-100">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700">
          <svg width="24" height="24" viewBox="0 0 192 192" fill="none"><rect width="192" height="192" rx="32" fill="#1e3a8a"/><text x="96" y="72" textAnchor="middle" fill="white" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="48">TSH</text><text x="96" y="132" textAnchor="middle" fill="#93c5fd" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="24">RESTO</text></svg>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Instalar TSH Restaurantes</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Accede más rápido y trabaja sin conexión instalando la app.
          </p>
          <button
            onClick={install}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Download size={14} /> Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
