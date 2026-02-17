'use client';
import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('./app-shell').then(m => ({ default: m.AppShell })), {
  ssr: false,
});

export { AppShell as AppShellWrapper };