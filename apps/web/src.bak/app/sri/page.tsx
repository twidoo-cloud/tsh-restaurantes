'use client';
import { AppShell } from '@/components/app-shell';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { formatMoney } from '@/lib/currency';
import {
  Settings, FileText, Send, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, Download, Zap, Upload, ShieldCheck, FileDown, Pen,
  Mail, Ban, FileMinus
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const headers = () => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('pos_token') : null;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const get = async <T,>(p: string): Promise<T> => { const r = await fetch(`${API}${p}`, { headers: headers() }); const t = await r.text(); return t ? JSON.parse(t) : null; };
const post = async <T,>(p: string, b?: any): Promise<T> => { const r = await fetch(`${API}${p}`, { method: 'POST', headers: headers(), body: b ? JSON.stringify(b) : undefined }); return r.json(); };
const put = async <T,>(p: string, b: any): Promise<T> => { const r = await fetch(`${API}${p}`, { method: 'PUT', headers: headers(), body: JSON.stringify(b) }); return r.json(); };

type Tab = 'invoices' | 'config';

const ESTADO_STYLE: Record<string, { bg: string; icon: any; label: string }> = {
  generado: { bg: 'bg-gray-100 text-gray-700', icon: FileText, label: 'Generado' },
  firmado: { bg: 'bg-blue-100 text-blue-700', icon: ShieldCheck, label: 'Firmado' },
  enviado: { bg: 'bg-yellow-100 text-yellow-700', icon: Send, label: 'Enviado' },
  autorizado: { bg: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Autorizado' },
  rechazado: { bg: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rechazado' },
  anulado: { bg: 'bg-gray-100 text-gray-500', icon: Ban, label: 'Anulado' },
};

const TIPO_DOC: Record<string, string> = { '01': 'FAC', '04': 'N/C' };

export default function SriPage() {
  const router = useRouter();
  const store = usePosStore();
  const [tab, setTab] = useState<Tab>('invoices');
  const [config, setConfig] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Emit dialog
  const [showEmitDialog, setShowEmitDialog] = useState(false);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [emitForm, setEmitForm] = useState({
    orderId: '', tipoIdentificacion: '07', identificacion: '9999999999999',
    razonSocial: 'CONSUMIDOR FINAL', email: '', direccion: '', telefono: '',
  });
  const [emitResult, setEmitResult] = useState<any>(null);

  // Certificate
  const certFileRef = useRef<HTMLInputElement>(null);
  const [certPassword, setCertPassword] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [certResult, setCertResult] = useState<any>(null);

  // Nota de Crédito dialog
  const [showNCDialog, setShowNCDialog] = useState(false);
  const [ncFacturaId, setNCFacturaId] = useState('');
  const [ncMotivo, setNCMotivo] = useState('');
  const [ncResult, setNCResult] = useState<any>(null);

  // Email dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailInvoiceId, setEmailInvoiceId] = useState('');
  const [emailTo, setEmailTo] = useState('');

  // Anular dialog
  const [showAnularDialog, setShowAnularDialog] = useState(false);
  const [anularId, setAnularId] = useState('');
  const [anularMotivo, setAnularMotivo] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [c, inv] = await Promise.all([get<any>('/sri/config'), get<any>('/sri/invoices')]);
      setConfig(c);
      setInvoices(inv?.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  // ═══ CONFIG ACTIONS ═══
  const saveConfig = async () => {
    if (!config) return;
    const payload: any = {
      ruc: config.ruc, razonSocial: config.razonSocial, nombreComercial: config.nombreComercial,
      direccionMatriz: config.direccionMatriz, obligadoContabilidad: config.obligadoContabilidad,
      contribuyenteEspecial: config.contribuyenteEspecial, regimenRimpe: config.regimenRimpe,
      ambiente: config.ambiente, establecimiento: config.establecimiento, puntoEmision: config.puntoEmision,
      emailNotificacion: config.emailNotificacion,
      smtpHost: config.smtpHost, smtpPort: config.smtpPort ? parseInt(config.smtpPort) : undefined,
      smtpUser: config.smtpUser, smtpFromName: config.smtpFromName, smtpSecure: config.smtpSecure,
    };
    if (config.smtpPassword && config.smtpPassword !== '********') {
      payload.smtpPassword = config.smtpPassword;
    }
    const saved = await put<any>('/sri/config', payload);
    setConfig(saved);
    alert('✅ Configuración guardada');
  };

  const uploadCertificate = async () => {
    const file = certFileRef.current?.files?.[0];
    if (!file) return alert('Seleccione un archivo .p12');
    if (!certPassword) return alert('Ingrese la contraseña');
    setCertUploading(true); setCertResult(null);
    try {
      const fd = new FormData(); fd.append('certificate', file); fd.append('password', certPassword);
      const token = localStorage.getItem('pos_token');
      const res = await fetch(`${API}/sri/certificate`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      const result = await res.json();
      setCertResult(res.ok ? { success: true, ...result } : { success: false, error: result.message });
      if (res.ok) { setCertPassword(''); if (certFileRef.current) certFileRef.current.value = ''; loadData(); }
    } catch (e: any) { setCertResult({ success: false, error: e.message }); }
    setCertUploading(false);
  };

  const deleteCertificate = async () => {
    if (!confirm('¿Eliminar el certificado? Las facturas ya no se firmarán automáticamente.')) return;
    try {
      const res = await post<any>('/sri/certificate/delete');
      if (res.success) { alert('✅ Certificado eliminado'); loadData(); setCertResult(null); }
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  // ═══ INVOICE ACTIONS ═══
  const openEmitDialog = async () => {
    try {
      const orders = await get<any>('/orders?status=completed&limit=50');
      setCompletedOrders((orders?.data || orders || []).filter((o: any) => o.status === 'completed'));
    } catch { setCompletedOrders([]); }
    setEmitResult(null);
    setShowEmitDialog(true);
  };

  const emitirFactura = async () => {
    if (!emitForm.orderId) return;
    setProcessing(true);
    try { setEmitResult(await post<any>('/sri/emitir', emitForm)); loadData(); }
    catch (e: any) { setEmitResult({ estado: 'error', message: e.message }); }
    setProcessing(false);
  };

  const firmarFactura = async (id: string) => {
    setProcessing(true);
    try { const r = await post<any>(`/sri/firmar/${id}`); alert(r.message || 'Firmado'); loadData(); }
    catch (e: any) { alert('Error: ' + e.message); }
    setProcessing(false);
  };

  const enviarAlSri = async (id: string) => {
    setProcessing(true);
    try { const r = await post<any>(`/sri/enviar/${id}`); alert(r.estado === 'autorizado' ? '✅ Autorizado por el SRI' : r.message || JSON.stringify(r)); loadData(); }
    catch (e: any) { alert('Error: ' + e.message); }
    setProcessing(false);
  };

  const consultarEstado = async (id: string) => {
    try { const r = await get<any>(`/sri/consultar/${id}`); alert(r.estado === 'autorizado' ? '✅ Autorizado' : r.message || JSON.stringify(r)); loadData(); }
    catch (e: any) { alert('Error: ' + e.message); }
  };

  const generarRide = async (id: string) => {
    setProcessing(true);
    try { await post<any>(`/sri/ride/${id}`); alert('✅ RIDE generado'); loadData(); }
    catch (e: any) { alert('Error: ' + e.message); }
    setProcessing(false);
  };

  const descargarRide = async (id: string) => {
    try {
      const token = localStorage.getItem('pos_token');
      const res = await fetch(`${API}/sri/ride/${id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `RIDE-${id.substring(0, 8)}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  // P4: Email
  const openEmailDialog = (id: string, buyerEmail?: string) => {
    setEmailInvoiceId(id);
    setEmailTo(buyerEmail || '');
    setShowEmailDialog(true);
  };

  const enviarEmail = async () => {
    if (!emailTo) return alert('Ingrese un email');
    setProcessing(true);
    try {
      const r = await post<any>(`/sri/email/${emailInvoiceId}`, { email: emailTo });
      alert(r.success ? `✅ Email enviado a ${emailTo}` : `❌ ${r.message}`);
      if (r.success) { setShowEmailDialog(false); loadData(); }
    } catch (e: any) { alert('Error: ' + e.message); }
    setProcessing(false);
  };

  // P5: Nota de Crédito
  const openNCDialog = (facturaId: string) => {
    setNCFacturaId(facturaId);
    setNCMotivo('');
    setNCResult(null);
    setShowNCDialog(true);
  };

  const emitirNC = async () => {
    if (!ncMotivo.trim()) return alert('Ingrese el motivo');
    setProcessing(true);
    try {
      const r = await post<any>('/sri/nota-credito', { facturaId: ncFacturaId, motivo: ncMotivo });
      setNCResult(r);
      loadData();
    } catch (e: any) { setNCResult({ estado: 'error', message: e.message }); }
    setProcessing(false);
  };

  // P6: Anular
  const openAnularDialog = (id: string) => {
    setAnularId(id);
    setAnularMotivo('');
    setShowAnularDialog(true);
  };

  const anularComprobante = async () => {
    if (!anularMotivo.trim()) return alert('Ingrese el motivo de anulación');
    setProcessing(true);
    try {
      const r = await post<any>(`/sri/anular/${anularId}`, { motivo: anularMotivo });
      alert(r.message || 'Comprobante procesado');
      setShowAnularDialog(false);
      loadData();
    } catch (e: any) { alert('Error: ' + e.message); }
    setProcessing(false);
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      {/* ═══ HEADER ═══ */}
        {/* Page toolbar */}

        <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">

          <h1 className="text-lg font-bold text-gray-900">Facturación Electrónica SRI</h1>

          <div className="flex items-center gap-2">

            <button onClick={() => setTab('invoices')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === 'invoices' ? 'bg-white text-blue-900' : 'bg-gray-100 hover:bg-gray-100'}`}>📄 Comprobantes</button>

            <button onClick={() => setTab('config')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === 'config' ? 'bg-white text-blue-900' : 'bg-gray-100 hover:bg-gray-100'}`}>⚙️ Configuración</button>

          </div>

        </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* ═══════════════════════════════ */}
        {/* INVOICES TAB                   */}
        {/* ═══════════════════════════════ */}
        {tab === 'invoices' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Comprobantes Electrónicos</h2>
              <button onClick={openEmitDialog} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <FileText size={18} /> Emitir Factura
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
              {['generado', 'firmado', 'enviado', 'autorizado', 'rechazado', 'anulado'].map(estado => {
                const count = invoices.filter(i => i.estado === estado).length;
                const style = ESTADO_STYLE[estado];
                const Icon = style.icon;
                return (
                  <div key={estado} className={`rounded-xl border p-3 ${style.bg}`}>
                    <div className="flex items-center gap-2"><Icon size={16} /><span className="text-xs font-semibold uppercase">{style.label}</span></div>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                );
              })}
            </div>

            {/* Invoice table */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th className="px-3 py-3 text-left">Tipo</th>
                    <th className="px-3 py-3 text-left">Secuencial</th>
                    <th className="px-3 py-3 text-left">Orden</th>
                    <th className="px-3 py-3 text-left">Comprador</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3 text-left">Fecha</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map(inv => {
                    const style = ESTADO_STYLE[inv.estado] || ESTADO_STYLE.generado;
                    const Icon = style.icon;
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${inv.tipoComprobante === '04' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                            {TIPO_DOC[inv.tipoComprobante] || inv.tipoComprobante}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{inv.secuencial}</td>
                        <td className="px-3 py-3 text-gray-600">{inv.order?.orderNumber || '-'}</td>
                        <td className="px-3 py-3 text-gray-900 max-w-[150px] truncate">{inv.razonSocialComprador}</td>
                        <td className="px-3 py-3 text-right font-semibold">{formatMoney(parseFloat(inv.total))}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg}`}>
                            <Icon size={10} /> {style.label}
                          </span>
                          {inv.emailEnviado && <span className="ml-1 text-[10px] text-violet-500" title="Email enviado">📧</span>}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{new Date(inv.createdAt).toLocaleDateString('es-EC')}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center gap-0.5 justify-end flex-wrap">
                            {/* Sign */}
                            {inv.estado === 'generado' && config?.hasCertificate && (
                              <button onClick={() => firmarFactura(inv.id)} disabled={processing} className="rounded p-1.5 text-indigo-500 hover:bg-indigo-50" title="Firmar"><Pen size={13} /></button>
                            )}
                            {/* Send to SRI */}
                            {['generado', 'firmado'].includes(inv.estado) && (
                              <button onClick={() => enviarAlSri(inv.id)} disabled={processing} className="rounded p-1.5 text-blue-500 hover:bg-blue-50" title="Enviar al SRI"><Send size={13} /></button>
                            )}
                            {/* Query status */}
                            {inv.estado === 'enviado' && (
                              <button onClick={() => consultarEstado(inv.id)} className="rounded p-1.5 text-yellow-500 hover:bg-yellow-50" title="Consultar"><RefreshCw size={13} /></button>
                            )}
                            {/* Generate RIDE */}
                            {!inv.rideUrl && inv.estado !== 'anulado' && (
                              <button onClick={() => generarRide(inv.id)} disabled={processing} className="rounded p-1.5 text-purple-500 hover:bg-purple-50" title="Generar RIDE"><FileDown size={13} /></button>
                            )}
                            {/* Download RIDE */}
                            {inv.rideUrl && (
                              <button onClick={() => descargarRide(inv.id)} className="rounded p-1.5 text-green-600 hover:bg-green-50" title="Descargar RIDE"><Download size={13} /></button>
                            )}
                            {/* Email */}
                            {config?.hasSmtp && inv.estado !== 'anulado' && (
                              <button onClick={() => openEmailDialog(inv.id)} className="rounded p-1.5 text-violet-500 hover:bg-violet-50" title="Enviar por email"><Mail size={13} /></button>
                            )}
                            {/* Nota de Crédito - only for authorized facturas */}
                            {inv.estado === 'autorizado' && inv.tipoComprobante === '01' && (
                              <button onClick={() => openNCDialog(inv.id)} className="rounded p-1.5 text-orange-500 hover:bg-orange-50" title="Nota de Crédito"><FileMinus size={13} /></button>
                            )}
                            {/* Anular - not for already voided or authorized NC */}
                            {!['anulado'].includes(inv.estado) && (
                              <button onClick={() => openAnularDialog(inv.id)} className="rounded p-1.5 text-red-400 hover:bg-red-50" title="Anular"><Ban size={13} /></button>
                            )}
                            {/* Download XML */}
                            {inv.xmlGenerado && (
                              <button onClick={() => {
                                const xml = inv.xmlAutorizado || inv.xmlFirmado || inv.xmlGenerado;
                                const blob = new Blob([xml], { type: 'text/xml' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = `${inv.claveAcceso}.xml`; a.click();
                              }} className="rounded p-1.5 text-gray-400 hover:bg-gray-100" title="Descargar XML"><Download size={13} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {invoices.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  <FileText size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No hay comprobantes electrónicos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ */}
        {/* CONFIG TAB                     */}
        {/* ═══════════════════════════════ */}
        {tab === 'config' && config && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Configuración del Emisor</h2>

            {/* Emisor info */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUC *</label>
                  <input value={config.ruc || ''} onChange={e => setConfig({ ...config, ruc: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="0912345678001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ambiente</label>
                  <select value={config.ambiente} onChange={e => setConfig({ ...config, ambiente: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                    <option value="1">🟡 Pruebas</option>
                    <option value="2">🟢 Producción</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social *</label>
                <input value={config.razonSocial || ''} onChange={e => setConfig({ ...config, razonSocial: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                <input value={config.nombreComercial || ''} onChange={e => setConfig({ ...config, nombreComercial: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Matriz *</label>
                <input value={config.direccionMatriz || ''} onChange={e => setConfig({ ...config, direccionMatriz: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Establecimiento</label>
                  <input value={config.establecimiento || ''} onChange={e => setConfig({ ...config, establecimiento: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" maxLength={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punto Emisión</label>
                  <input value={config.puntoEmision || ''} onChange={e => setConfig({ ...config, puntoEmision: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" maxLength={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Notificación</label>
                  <input value={config.emailNotificacion || ''} onChange={e => setConfig({ ...config, emailNotificacion: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={config.obligadoContabilidad || false} onChange={e => setConfig({ ...config, obligadoContabilidad: e.target.checked })} className="rounded" />
                  Obligado Contabilidad
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={config.regimenRimpe || false} onChange={e => setConfig({ ...config, regimenRimpe: e.target.checked })} className="rounded" />
                  Régimen RIMPE
                </label>
                <input value={config.contribuyenteEspecial || ''} onChange={e => setConfig({ ...config, contribuyenteEspecial: e.target.value })} placeholder="Contribuyente Especial #" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              </div>
            </div>

            {/* SMTP Config (P4) */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Mail size={20} className="text-violet-600" />
                Configuración SMTP (Envío de Email)
              </h3>
              {config.hasSmtp ? (
                <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-xs text-violet-700 flex items-center gap-2">
                  <CheckCircle size={14} /> SMTP configurado — los comprobantes se pueden enviar por email
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-center gap-2">
                  <AlertTriangle size={14} /> Configure SMTP para enviar comprobantes por email (Gmail: smtp.gmail.com:587, Outlook: smtp.office365.com:587)
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Servidor SMTP</label>
                  <input value={config.smtpHost || ''} onChange={e => setConfig({ ...config, smtpHost: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                  <input type="number" value={config.smtpPort || ''} onChange={e => setConfig({ ...config, smtpPort: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="587" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario SMTP</label>
                  <input value={config.smtpUser || ''} onChange={e => setConfig({ ...config, smtpUser: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="tu@gmail.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña SMTP</label>
                  <input type="password" value={config.smtpPassword || ''} onChange={e => setConfig({ ...config, smtpPassword: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Contraseña o App Password" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre remitente</label>
                  <input value={config.smtpFromName || ''} onChange={e => setConfig({ ...config, smtpFromName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Mi Restaurante" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
                  <input type="checkbox" checked={config.smtpSecure ?? true} onChange={e => setConfig({ ...config, smtpSecure: e.target.checked })} className="rounded" />
                  Conexión segura (TLS/SSL)
                </label>
              </div>
            </div>

            {/* Save config button */}
            <button onClick={saveConfig} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700">
              <Settings size={18} /> Guardar Configuración
            </button>

            {/* Certificate section */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-600" />
                Certificado de Firma Electrónica (.p12)
              </h3>
              {config.hasCertificate ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-emerald-800"><CheckCircle size={16} /><span className="text-sm font-semibold">Certificado configurado</span></div>
                    <button onClick={deleteCertificate} className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200">🗑️ Eliminar</button>
                  </div>
                  <p className="text-xs text-emerald-700">Las facturas se firmarán automáticamente.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-center gap-2 text-amber-800 mb-1"><AlertTriangle size={16} /><span className="text-sm font-semibold">Sin certificado</span></div>
                  <p className="text-xs text-amber-700">Se requiere certificado .p12 para firmar y enviar al SRI.</p>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Archivo .p12 / .pfx</label>
                  <input ref={certFileRef} type="file" accept=".p12,.pfx" className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del certificado</label>
                  <input type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder="Contraseña" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                </div>
                <button onClick={uploadCertificate} disabled={certUploading} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                  <Upload size={18} /> {certUploading ? 'Cargando...' : 'Cargar Certificado'}
                </button>
                {certResult && (
                  <div className={`rounded-xl p-4 text-sm ${certResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {certResult.success ? (
                      <div>
                        <p className="font-semibold">✅ {certResult.message}</p>
                        {certResult.certificate && (
                          <div className="mt-2 text-xs space-y-0.5">
                            <p><strong>Emisor:</strong> {certResult.certificate.issuer}</p>
                            <p><strong>Serie:</strong> {certResult.certificate.serialNumber}</p>
                            <p><strong>Válido:</strong> {new Date(certResult.certificate.validFrom).toLocaleDateString('es-EC')} — {new Date(certResult.certificate.validTo).toLocaleDateString('es-EC')}</p>
                          </div>
                        )}
                      </div>
                    ) : <p>❌ {certResult.error}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════ */}
      {/* EMIT FACTURA DIALOG            */}
      {/* ═══════════════════════════════ */}
      {showEmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Emitir Factura Electrónica</h3>
            {emitResult ? (
              <div className="space-y-4">
                <div className={`rounded-xl p-4 ${emitResult.estado === 'error' || emitResult.estado === 'rechazado' ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-lg font-bold">{emitResult.estado === 'firmado' ? '✅ Generado y Firmado' : emitResult.estado === 'generado' ? '✅ Generado' : emitResult.estado === 'autorizado' ? '✅ Autorizado' : `❌ ${emitResult.estado}`}</p>
                  {emitResult.claveAcceso && <p className="text-xs text-gray-500 mt-1 font-mono break-all">Clave: {emitResult.claveAcceso}</p>}
                  {emitResult.message && <p className="text-sm mt-2">{emitResult.message}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowEmitDialog(false); setEmitResult(null); }} className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cerrar</button>
                  {emitResult.id && ['generado', 'firmado'].includes(emitResult.estado) && (
                    <button onClick={() => { enviarAlSri(emitResult.id); }} disabled={processing} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">📤 Enviar al SRI</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden completada *</label>
                  <select value={emitForm.orderId} onChange={e => setEmitForm({ ...emitForm, orderId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                    <option value="">Seleccionar orden...</option>
                    {completedOrders.map((o: any) => <option key={o.id} value={o.id}>{o.orderNumber} — {formatMoney(parseFloat(o.total))}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo ID</label>
                    <select value={emitForm.tipoIdentificacion} onChange={e => setEmitForm({ ...emitForm, tipoIdentificacion: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                      <option value="07">Consumidor Final</option>
                      <option value="05">Cédula</option>
                      <option value="04">RUC</option>
                      <option value="06">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Identificación</label>
                    <input value={emitForm.identificacion} onChange={e => setEmitForm({ ...emitForm, identificacion: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                  <input value={emitForm.razonSocial} onChange={e => setEmitForm({ ...emitForm, razonSocial: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input value={emitForm.email} onChange={e => setEmitForm({ ...emitForm, email: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="cliente@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input value={emitForm.telefono} onChange={e => setEmitForm({ ...emitForm, telefono: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
                  </div>
                </div>
                {config?.hasCertificate && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1"><ShieldCheck size={12} /> Se firmará automáticamente</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setShowEmitDialog(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button onClick={emitirFactura} disabled={!emitForm.orderId || processing} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                    {processing ? 'Generando...' : '⚡ Generar Factura'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ */}
      {/* NOTA DE CRÉDITO DIALOG (P5)    */}
      {/* ═══════════════════════════════ */}
      {showNCDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileMinus size={22} className="text-orange-500" /> Emitir Nota de Crédito
            </h3>
            {ncResult ? (
              <div className="space-y-4">
                <div className={`rounded-xl p-4 ${ncResult.estado === 'error' ? 'bg-red-50' : 'bg-orange-50'}`}>
                  <p className="font-bold">{ncResult.estado === 'error' ? '❌ Error' : `✅ Nota de Crédito ${ncResult.secuencial}`}</p>
                  {ncResult.claveAcceso && <p className="text-xs text-gray-500 mt-1 font-mono break-all">{ncResult.claveAcceso}</p>}
                  <p className="text-sm mt-2">{ncResult.message}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowNCDialog(false); setNCResult(null); }} className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cerrar</button>
                  {ncResult.id && ['generado', 'firmado'].includes(ncResult.estado) && (
                    <button onClick={() => { enviarAlSri(ncResult.id); setShowNCDialog(false); setNCResult(null); }} disabled={processing} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">📤 Enviar al SRI</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Se generará una Nota de Crédito por el total de la factura seleccionada.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                  <textarea value={ncMotivo} onChange={e => setNCMotivo(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Ej: Devolución de producto, Error en facturación, etc." />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowNCDialog(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button onClick={emitirNC} disabled={!ncMotivo.trim() || processing} className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-40">
                    {processing ? 'Generando...' : '📝 Emitir N/C'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ */}
      {/* EMAIL DIALOG (P4)              */}
      {/* ═══════════════════════════════ */}
      {showEmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail size={22} className="text-violet-500" /> Enviar por Email
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Se enviará el XML y RIDE (PDF) como adjuntos.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email del destinatario *</label>
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="cliente@email.com" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowEmailDialog(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={enviarEmail} disabled={!emailTo || processing} className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40">
                  {processing ? 'Enviando...' : '📧 Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ */}
      {/* ANULAR DIALOG (P6)             */}
      {/* ═══════════════════════════════ */}
      {showAnularDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Ban size={22} className="text-red-500" /> Anular Comprobante
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Si la factura está <strong>autorizada</strong>, se generará una Nota de Crédito automáticamente. Si no fue enviada al SRI, se marcará como anulada.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de anulación *</label>
                <textarea value={anularMotivo} onChange={e => setAnularMotivo(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" placeholder="Motivo..." />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAnularDialog(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={anularComprobante} disabled={!anularMotivo.trim() || processing} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40">
                  {processing ? 'Procesando...' : '🗑️ Anular'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
