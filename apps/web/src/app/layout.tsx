import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAProvider } from './pwa-provider';

export const metadata: Metadata = {
  title: 'TSH Restaurantes',
  description: 'Sistema POS Multi-Vertical',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TSH Restaurantes',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-100 antialiased">
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
