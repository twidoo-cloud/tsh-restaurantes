'use client';

import { useServiceWorker, useOnlineStatus } from '@/lib/use-offline';
import { OfflineIndicator, InstallBanner } from '@/components/offline-indicator';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  // Register service worker
  useServiceWorker();
  // Track online/offline status
  useOnlineStatus();

  return (
    <>
      <OfflineIndicator />
      {children}
      <InstallBanner />
    </>
  );
}
