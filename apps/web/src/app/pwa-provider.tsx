'use client';

import { useEffect } from 'react';
import { useServiceWorker, useOnlineStatus, useAutoPrecache, useOfflineStore } from '@/lib/use-offline';
import { OfflineIndicator, InstallBanner } from '@/components/offline-indicator';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useServiceWorker();
  useOnlineStatus();
  const { precacheEssentials } = useAutoPrecache();
  const { isServiceWorkerReady } = useOfflineStore();

  // Auto-precache when SW is ready and user is logged in
  useEffect(() => {
    if (!isServiceWorkerReady) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
    if (token) {
      // Slight delay to not compete with initial page load
      const timer = setTimeout(() => precacheEssentials(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isServiceWorkerReady, precacheEssentials]);

  return (
    <>
      <OfflineIndicator />
      {children}
      <InstallBanner />
    </>
  );
}
