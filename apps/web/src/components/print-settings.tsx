'use client';

/**
 * TSH Restaurantes — Componente de Configuración de Impresora
 * Ubicación: apps/web/src/components/print-settings.tsx
 *
 * USO en settings/page.tsx:
 *   import { PrintSettings } from '@/components/print-settings';
 *   <PrintSettings />
 */

import { useState, useEffect } from 'react';
import { Printer, Wifi, Monitor, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { getPrintConfig, savePrintConfig, printTestPage, PrintConfig, PrintMethod } from '@/lib/print';

export function PrintSettings() {
  const [config, setConfig] = useState<PrintConfig>({
    method: 'browser',
    paperWidth: 40,
    businessName: '',
    businessRuc: '',
    businessAddress: '',
    businessPhone: '',
    footerMessage: '¡Gracias por su visita!',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(getPrintConfig());
  }, []);

  const handleSave = () => {
    savePrintConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await printTestPage(config);
      setTestResult({ ok: true, msg: 'Página de prueba enviada correctamente' });
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || 'Error al imprimir' });
    } finally {
      setTesting(false);
    }
  };

  const methodOptions: { value: PrintMethod; label: string; desc: string; icon: any }[] = [
    {
      value: 'browser',
      label: 'Navegador',
      desc: 'Usa el diálogo de impresión del sistema. Funciona con cualquier impresora.',
      icon: Monitor,
    },
    {
      value: 'network',
      label: 'Red Local (IP)',
      desc: 'Envía directo a la impresora via TCP/IP. Requiere IP fija en la red.',
      icon: Wifi,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <Printer size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Impresora Térmica</h3>
          <p className="text-sm text-gray-500">Configura la impresión de tickets y comandas</p>
        </div>
      </div>

      {/* Método de impresión */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Método de impresión</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {methodOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setConfig({ ...config, method: opt.value })}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                  config.method === opt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon size={20} className={config.method === opt.value ? 'text-blue-600 mt-0.5' : 'text-gray-400 mt-0.5'} />
                <div>
                  <p className={`text-sm font-semibold ${config.method === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Config de red */}
      {config.method === 'network' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
            <Wifi size={16} /> Configuración de red
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">IP de la impresora</label>
              <input
                type="text"
                value={config.printerIp || ''}
                onChange={(e) => setConfig({ ...config, printerIp: e.target.value })}
                placeholder="192.168.1.100"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Puerto TCP</label>
              <input
                type="number"
                value={config.printerPort || 9100}
                onChange={(e) => setConfig({ ...config, printerPort: parseInt(e.target.value) })}
                placeholder="9100"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-blue-600">
            💡 Para que la impresión directa funcione, el backend debe tener el módulo <code className="bg-blue-100 px-1 rounded">PrintModule</code> instalado.
          </p>
        </div>
      )}

      {/* Ancho de papel */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ancho de papel</label>
        <div className="flex gap-2">
          {([32, 40, 48] as const).map((w) => (
            <button
              key={w}
              onClick={() => setConfig({ ...config, paperWidth: w })}
              className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition ${
                config.paperWidth === w
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {w} cols
              <span className="block text-xs font-normal opacity-70">
                {w === 32 ? '58mm' : w === 40 ? '80mm' : '80mm+'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Datos del negocio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Settings size={14} className="inline mr-1" />
          Datos del negocio en tickets
        </label>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del negocio</label>
              <input
                type="text"
                value={config.businessName || ''}
                onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                placeholder="Mi Restaurante"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RUC</label>
              <input
                type="text"
                value={config.businessRuc || ''}
                onChange={(e) => setConfig({ ...config, businessRuc: e.target.value })}
                placeholder="0990000000001"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
            <input
              type="text"
              value={config.businessAddress || ''}
              onChange={(e) => setConfig({ ...config, businessAddress: e.target.value })}
              placeholder="Av. Principal 123, Guayaquil"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input
                type="text"
                value={config.businessPhone || ''}
                onChange={(e) => setConfig({ ...config, businessPhone: e.target.value })}
                placeholder="04-123-4567"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje al pie</label>
              <input
                type="text"
                value={config.footerMessage || ''}
                onChange={(e) => setConfig({ ...config, footerMessage: e.target.value })}
                placeholder="¡Gracias por su visita!"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
          testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {testResult.ok
            ? <CheckCircle2 size={16} />
            : <AlertCircle size={16} />
          }
          {testResult.msg}
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Printer size={16} />
          {testing ? 'Imprimiendo...' : 'Imprimir prueba'}
        </button>
        <button
          onClick={handleSave}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition ${
            saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {saved ? '✅ Guardado' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}
