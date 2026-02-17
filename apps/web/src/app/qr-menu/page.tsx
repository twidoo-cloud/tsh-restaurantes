'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { api } from '@/lib/api';
import {
  QrCode, ExternalLink, Copy, Check, X, Download, Eye, Printer, Search,
  ChevronDown, Grid3X3, List, Loader2,
} from 'lucide-react';

const QR_API = (text: string, size = 300) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=000000&margin=10`;

export default function QrMenuPage() {
  const router = useRouter();
  const store = usePosStore();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    refreshBranding();
    load();
  }, []);

  const load = async () => {
    try {
      const c = await api.request<any>('/menu/admin/qr-config');
      setConfig(c);
    } catch {}
    setLoading(false);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(`${baseUrl}${url}`);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const toggleTable = (id: string) => {
    setSelectedTables(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const ids = filteredTables.map((t: any) => t.id);
    setSelectedTables(prev => {
      const allSelected = ids.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handlePrintSelected = () => {
    const tables = config.tables.filter((t: any) => selectedTables.has(t.id));
    if (!tables.length) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>QR Codes</title><style>
      body { font-family: system-ui, sans-serif; margin: 0; }
      .page { page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
      .page:last-child { page-break-after: auto; }
      img { width: 280px; height: 280px; }
      h2 { margin: 16px 0 4px; font-size: 28px; }
      p { margin: 0; color: #666; font-size: 14px; }
      .name { font-size: 18px; color: #333; margin-top: 8px; }
      @media print { @page { margin: 10mm; } }
    </style></head><body>`);
    tables.forEach((t: any) => {
      w.document.write(`<div class="page">
        <img src="${QR_API(`${baseUrl}${t.qrUrl}`, 400)}" />
        <h2>Mesa ${t.number}</h2>
        <p>${t.zone_name} · ${t.capacity} personas</p>
        <p class="name">${config.name}</p>
      </div>`);
    });
    w.document.write('</body></html>');
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  // Get unique zones from tables
  const zones = config?.tables ? [...new Set(config.tables.map((t: any) => t.zone_name))] : [];

  const filteredTables = config?.tables?.filter((t: any) => {
    if (selectedZone !== 'all' && t.zone_name !== selectedZone) return false;
    if (search && !`mesa ${t.number}`.toLowerCase().includes(search.toLowerCase()) && !t.zone_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) || [];

  if (loading) return <AppShell><div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-gray-400" /></div></AppShell>;

  return (
    <AppShell>
      <div className="flex h-full flex-col bg-gray-50">
        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
          <h1 className="text-lg font-bold text-gray-900">Menú Digital & QR</h1>
          <div className="flex items-center gap-2">
            {selectedTables.size > 0 && (
              <button onClick={handlePrintSelected} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                <Printer size={14} /> Imprimir {selectedTables.size} QR
              </button>
            )}
            <a href={`/menu/${config?.slug}`} target="_blank" rel="noopener"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <Eye size={14} /> Ver Menú
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-5xl mx-auto w-full">

          {/* ═══ GENERAL MENU QR ═══ */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">QR del Menú General</h2>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded-xl border-2 border-gray-200 p-2 shrink-0 bg-white">
                <img src={QR_API(`${baseUrl}/menu/${config?.slug}`, 300)} alt="QR" className="h-44 w-44" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">URL del menú público</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-gray-50 border px-3 py-2 text-sm text-gray-800 break-all font-mono">{baseUrl}/menu/{config?.slug}</code>
                    <button onClick={() => copyUrl(`/menu/${config?.slug}`, 'menu')}
                      className="shrink-0 rounded-lg border px-3 py-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition">
                      {copied === 'menu' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Escanear para ver el menú completo. Imprime en la entrada o en las mesas.</p>
                <div className="flex gap-2">
                  <a href={QR_API(`${baseUrl}/menu/${config?.slug}`, 600)} download={`menu-qr-${config?.slug}.png`}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <Download size={14} /> Descargar PNG
                  </a>
                  <a href={`/menu/${config?.slug}`} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <ExternalLink size={14} /> Abrir Menú
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ TABLE QRS ═══ */}
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">QR por Mesa</h2>
                <p className="text-xs text-gray-500 mt-0.5">{config?.tables?.length || 0} mesas · Cada una lleva al menú con su número de mesa</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setViewMode('grid')} className={`rounded-lg p-1.5 ${viewMode === 'grid' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}><Grid3X3 size={16} /></button>
                <button onClick={() => setViewMode('list')} className={`rounded-lg p-1.5 ${viewMode === 'list' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}><List size={16} /></button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar mesa..."
                  className="w-full rounded-lg border bg-gray-50 py-2 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              {zones.length > 1 && (
                <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)}
                  className="rounded-lg border bg-gray-50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                  <option value="all">Todas las zonas</option>
                  {zones.map((z: any) => <option key={z} value={z}>{z}</option>)}
                </select>
              )}
              <button onClick={selectAllFiltered} className="shrink-0 rounded-lg border px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                {filteredTables.every((t: any) => selectedTables.has(t.id)) && filteredTables.length > 0 ? 'Deseleccionar' : 'Seleccionar'} todo
              </button>
            </div>

            {filteredTables.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No hay mesas{search ? ' con ese nombre' : ' configuradas'}</p>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredTables.map((t: any) => (
                  <div key={t.id} onClick={() => toggleTable(t.id)}
                    className={`cursor-pointer rounded-xl border-2 p-3 text-center transition ${selectedTables.has(t.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <img src={QR_API(`${baseUrl}${t.qrUrl}`, 200)} alt={`Mesa ${t.number}`} className="mx-auto h-28 w-28" loading="lazy" />
                    <p className="mt-2 text-sm font-bold text-gray-900">Mesa {t.number}</p>
                    <p className="text-[10px] text-gray-500">
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: t.zone_color || '#9ca3af' }} />
                      {t.zone_name} · {t.capacity}p
                    </p>
                    <div className="mt-2 flex justify-center gap-1">
                      <button onClick={e => { e.stopPropagation(); copyUrl(t.qrUrl, t.number); }}
                        className="rounded px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100">
                        {copied === t.number ? <Check size={10} className="inline text-green-500" /> : <Copy size={10} className="inline" />} Copiar
                      </button>
                      <a href={QR_API(`${baseUrl}${t.qrUrl}`, 400)} download={`mesa-${t.number}-qr.png`} onClick={e => e.stopPropagation()}
                        className="rounded px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-100">
                        <Download size={10} className="inline" /> PNG
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {filteredTables.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 py-2.5 px-1">
                    <input type="checkbox" checked={selectedTables.has(t.id)} onChange={() => toggleTable(t.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                    <img src={QR_API(`${baseUrl}${t.qrUrl}`, 100)} alt={`Mesa ${t.number}`} className="h-10 w-10 rounded" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Mesa {t.number}</p>
                      <p className="text-xs text-gray-500">{t.zone_name} · {t.capacity} personas</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => copyUrl(t.qrUrl, t.number)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        {copied === t.number ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                      <a href={QR_API(`${baseUrl}${t.qrUrl}`, 400)} download={`mesa-${t.number}-qr.png`}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
