'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { QrCode, ExternalLink, Copy, Check, X, Download, Eye } from 'lucide-react';

export default function QrMenuPage() {
  const router = useRouter();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => { refreshBranding(); load(); }, []);

  const load = async () => {
    try {
      const c = await api.request<any>('/menu/admin/qr-config');
      setConfig(c);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(`${baseUrl}${url}`);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const qrApiUrl = (text: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=000000&margin=10`;

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">      {/* Page toolbar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Menú Digital & QR</h1>
      </div>

      <div className="mx-auto max-w-4xl p-4 space-y-6">
        {error && <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}

        {loading ? (
          <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
        ) : config && (
          <>
            {/* General menu QR */}
            <div className="rounded-xl border bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900">QR del Menú General</h2>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="rounded-xl border-2 border-gray-200 p-2">
                  <img src={qrApiUrl(`${baseUrl}/menu/${config.slug}`)} alt="QR Menu" className="h-48 w-48" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">URL del menú</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800 break-all">{baseUrl}/menu/{config.slug}</code>
                      <button onClick={() => copyUrl(`/menu/${config.slug}`, 'menu')}
                        className="shrink-0 rounded-lg border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                        {copied === 'menu' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Los clientes escanean este QR para ver tu menú completo. Imprímelo en la entrada o en las mesas.</p>
                  <a href={qrApiUrl(`${baseUrl}/menu/${config.slug}`)} download={`menu-qr-${config.slug}.png`}
                    className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Download size={16} /> Descargar QR
                  </a>
                </div>
              </div>
            </div>

            {/* Table-specific QRs */}
            <div className="rounded-xl border bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900">QR por Mesa</h2>
              <p className="mb-4 text-sm text-gray-500">Cada mesa tiene su propio QR que muestra el número de mesa al cliente</p>
              {config.tables?.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No hay mesas configuradas</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {config.tables?.map((t: any) => (
                    <div key={t.id} className="rounded-xl border p-4 text-center">
                      <img src={qrApiUrl(`${baseUrl}${t.qrUrl}`)} alt={`Mesa ${t.number}`} className="mx-auto h-32 w-32" />
                      <p className="mt-2 text-sm font-bold text-gray-900">Mesa {t.number}</p>
                      <p className="text-xs text-gray-500">{t.zone_name} · {t.capacity} personas</p>
                      <div className="mt-2 flex justify-center gap-1">
                        <button onClick={() => copyUrl(t.qrUrl, t.number)}
                          className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
                          {copied === t.number ? <Check size={12} className="inline text-green-500" /> : <Copy size={12} className="inline" />} Copiar
                        </button>
                        <a href={qrApiUrl(`${baseUrl}${t.qrUrl}`)} download={`mesa-${t.number}-qr.png`}
                          className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
                          <Download size={12} className="inline" /> Descargar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </AppShell>
  );
}
