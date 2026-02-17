'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useThemeStore } from '@/lib/use-theme';
import { usePermissions } from '@/lib/use-permissions';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';
import { Users, Clock, Plus, X, Utensils, LayoutGrid, Wifi, WifiOff, Timer, Hash, User, Receipt, Merge, Search, Settings, Pencil, Trash2, Check, Circle, Square, Copy } from 'lucide-react';
import { useSocket, WS_EVENTS } from '@/lib/use-socket';

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string; cardBg: string; cardBorder: string; dot: string }> = {
  available: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', label: 'Disponible', cardBg: 'bg-emerald-100/70', cardBorder: 'border-emerald-300', dot: 'bg-emerald-500' },
  occupied: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', label: 'Ocupada', cardBg: 'bg-rose-100/70', cardBorder: 'border-rose-400', dot: 'bg-rose-500' },
  reserved: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', label: 'Reservada', cardBg: 'bg-amber-100/70', cardBorder: 'border-amber-300', dot: 'bg-amber-500' },
  cleaning: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', label: 'Limpieza', cardBg: 'bg-gray-200/70', cardBorder: 'border-gray-300', dot: 'bg-gray-400' },
};
type ViewMode = 'duration' | 'ticket' | 'staff' | 'guests' | 'amount';
interface TableData { id: string; number: string; capacity: number; shape: string; position_x: number; position_y: number; width: number; height: number; status: string; current_order_id: string | null; order?: any; opened_at?: string; waiter_name?: string; guest_count?: number; merged_with?: string | null; }
interface Zone { id: string; name: string; color: string; tables: TableData[]; table_count?: number; }
interface FloorPlan { id: string; name: string; zones: Zone[] | null; }
const ZONE_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#6366F1'];
function formatDuration(s: string) { const d=Date.now()-new Date(s).getTime(), m=Math.floor(d/60000), h=Math.floor(m/60); return h>0?`${h}h${String(m%60).padStart(2,'0')}`:`${m}:${String(Math.floor((d%60000)/1000)).padStart(2,'0')}`; }
function getDurationMinutes(s: string) { return Math.floor((Date.now()-new Date(s).getTime())/60000); }
function getDurationColor(m: number) { return m<30?'text-emerald-600':m<60?'text-amber-600':'text-red-600'; }

export default function TablesPage() {
  const router = useRouter();
  const store = usePosStore();
  const branding = useThemeStore(s => s.branding);
  const { role } = usePermissions();
  const isAdmin = role==='owner'||role==='admin';
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [activeFloor, setActiveFloor] = useState(0);
  const [activeZone, setActiveZone] = useState<string|null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData|null>(null);
  const [tableOrder, setTableOrder] = useState<any>(null);
  const [guestCount, setGuestCount] = useState(2);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('duration');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [zoneForm, setZoneForm] = useState({ name: '', color: '#3B82F6' });
  const [tableForm, setTableForm] = useState({ number: '', zoneId: '', capacity: '4', shape: 'square' });
  const [bulkForm, setBulkForm] = useState({ zoneId: '', startNumber: '', count: '', capacity: '4', shape: 'square' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{type:'zone'|'table';id:string;label:string}|null>(null);
  const { connected: wsConnected, on: wsOn } = useSocket({ rooms: ['tables'] });

  useEffect(() => { store.restoreSession(); if (!localStorage.getItem('pos_token')){router.replace('/login');return;} loadFloorPlans(); const i=setInterval(()=>{if(!editMode)loadFloorPlans();},30000); return ()=>clearInterval(i); }, [editMode]);
  useEffect(() => { const t=setInterval(()=>setTick(v=>v+1),10000); return ()=>clearInterval(t); }, []);
  useEffect(() => { if(editMode)return; const u=[wsOn(WS_EVENTS.TABLE_STATUS_CHANGED,()=>loadFloorPlans()),wsOn(WS_EVENTS.ORDER_CREATED,()=>loadFloorPlans()),wsOn(WS_EVENTS.ORDER_PAID,()=>loadFloorPlans()),wsOn(WS_EVENTS.ORDER_CANCELLED,()=>loadFloorPlans())]; return ()=>u.forEach(fn=>fn()); }, [wsOn,editMode]);

  const loadFloorPlans = async () => { try { setFloorPlans(await api.request<FloorPlan[]>('/tables/floor-plans')); setLoading(false); } catch { setLoading(false); } };
  const loadZones = async () => { try { setZones(await api.request<Zone[]>('/tables/zones')); } catch {} };
  const enterEditMode = () => { setEditMode(true); setSelectedTable(null); setTableOrder(null); loadZones(); };
  const exitEditMode = () => { setEditMode(false); loadFloorPlans(); };

  const openZoneModal = (z?: any) => { setEditingZone(z||null); setZoneForm(z?{name:z.name,color:z.color||'#3B82F6'}:{name:'',color:ZONE_COLORS[zones.length%ZONE_COLORS.length]}); setShowZoneModal(true); };
  const saveZone = async () => { if(!zoneForm.name.trim())return; setSaving(true); try { const opts={method:editingZone?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(zoneForm)}; await api.request(editingZone?`/tables/zones/${editingZone.id}`:'/tables/zones',opts); setShowZoneModal(false); await loadZones(); await loadFloorPlans(); } catch(e:any){alert(e.message);} setSaving(false); };
  const doDeleteZone = async (id:string) => { setSaving(true); try { await api.request(`/tables/zones/${id}`,{method:'DELETE'}); setDeleteConfirm(null); await loadZones(); await loadFloorPlans(); } catch(e:any){alert(e.message);} setSaving(false); };

  const openTableModal = (t?: any, zId?: string) => { setEditingTable(t||null); setTableForm(t?{number:String(t.number),zoneId:t.zone_id||t.zoneId||zId||'',capacity:String(t.capacity),shape:t.shape||'square'}:{number:'',zoneId:zId||(zones[0]?.id||''),capacity:'4',shape:'square'}); setShowTableModal(true); };
  const saveTableFn = async () => { if(!tableForm.number||!tableForm.zoneId)return; setSaving(true); try { const p={number:parseInt(tableForm.number),zoneId:tableForm.zoneId,capacity:parseInt(tableForm.capacity)||4,shape:tableForm.shape}; await api.request(editingTable?`/tables/manage/${editingTable.id}`:'/tables/manage',{method:editingTable?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}); setShowTableModal(false); await loadZones(); await loadFloorPlans(); } catch(e:any){alert(e.message);} setSaving(false); };
  const saveBulk = async () => { if(!bulkForm.zoneId||!bulkForm.startNumber||!bulkForm.count)return; setSaving(true); try { await api.request('/tables/manage/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({zoneId:bulkForm.zoneId,startNumber:parseInt(bulkForm.startNumber),count:parseInt(bulkForm.count),capacity:parseInt(bulkForm.capacity)||4,shape:bulkForm.shape})}); setShowBulkModal(false); await loadZones(); await loadFloorPlans(); } catch(e:any){alert(e.message);} setSaving(false); };
  const doDeleteTable = async (id:string) => { setSaving(true); try { await api.request(`/tables/manage/${id}`,{method:'DELETE'}); setDeleteConfirm(null); await loadZones(); await loadFloorPlans(); } catch(e:any){alert(e.message);} setSaving(false); };

  const handleTableClick = async (table: TableData) => { if(editMode)return; setSelectedTable(table); setTableOrder(null); if(table.status==='occupied'&&table.current_order_id){try{setTableOrder((await api.request<any>(`/tables/${table.id}`)).order);}catch{}} };
  const handleOpenTable = async () => { if(!selectedTable)return; setActionLoading(true); try { const r=await api.request<any>(`/tables/${selectedTable.id}/open`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guestCount})}); setShowOpenDialog(false); setSelectedTable(null); await loadFloorPlans(); router.push(`/pos?orderId=${r.order.id}&tableId=${selectedTable.id}&tableNumber=${selectedTable.number}`); } catch(e:any){alert(e.message);} setActionLoading(false); };
  const handleCloseTable = async () => { if(!selectedTable)return; setActionLoading(true); try { await api.request(`/tables/${selectedTable.id}/close`,{method:'PATCH'}); setSelectedTable(null); setTableOrder(null); await loadFloorPlans(); } catch(e:any){alert(e.message);} setActionLoading(false); };
  const handleGoToOrder = () => { if(!selectedTable||!tableOrder)return; router.push(`/pos?orderId=${tableOrder.id}&tableId=${selectedTable.id}&tableNumber=${selectedTable.number}`); };

  const currentFloor = floorPlans[activeFloor]; const allZones = currentFloor?.zones||[];
  const filteredZones = activeZone ? allZones.filter(z=>z.id===activeZone) : allZones;
  const allTables = useMemo(()=>{ let t=filteredZones.flatMap(z=>z.tables); if(searchQuery){const q=searchQuery.toLowerCase();t=t.filter(tb=>tb.number.toString().toLowerCase().includes(q));} return t; },[filteredZones,searchQuery]);
  const allTablesInFloor = allZones.flatMap(z=>z.tables);
  const stats = { total:allTablesInFloor.length, available:allTablesInFloor.filter(t=>t.status==='available').length, occupied:allTablesInFloor.filter(t=>t.status==='occupied').length, reserved:allTablesInFloor.filter(t=>t.status==='reserved').length };
  const getInfo = (t: TableData) => { switch(viewMode){case 'duration':if(t.status==='occupied'&&t.opened_at){const m=getDurationMinutes(t.opened_at);return{text:formatDuration(t.opened_at),color:getDurationColor(m)};}return null;case 'ticket':return t.order?.orderNumber?{text:t.order.orderNumber,color:'text-gray-600'}:null;case 'staff':return t.waiter_name?{text:t.waiter_name,color:'text-blue-600'}:null;case 'guests':return t.guest_count?{text:`${t.guest_count}`,color:'text-purple-600',icon:Users}:null;case 'amount':return t.order?.total?{text:formatMoney(parseFloat(t.order.total)),color:'text-emerald-700'}:null;default:return null;} };
  const VIEW_MODES:{key:ViewMode;label:string;icon:any}[] = [{key:'duration',label:'Duración',icon:Timer},{key:'ticket',label:'Ticket',icon:Hash},{key:'staff',label:'Mesero',icon:User},{key:'guests',label:'Comensales',icon:Users},{key:'amount',label:'Monto',icon:Receipt}];

  // ═══════════ Modal component helper ═══════════
  const Modal = ({show,onClose,children}:{show:boolean;onClose:()=>void;children:React.ReactNode}) => show ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl mx-4" onClick={e=>e.stopPropagation()}>{children}</div>
    </div>
  ) : null;

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-3 bg-white border-b px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900 hidden sm:block">Mesas</h1>
            {!editMode && <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"/><span className="text-gray-600"><b className="text-gray-900">{stats.available}</b> <span className="hidden md:inline">libres</span></span></span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500"/><span className="text-gray-600"><b className="text-gray-900">{stats.occupied}</b> <span className="hidden md:inline">ocupadas</span></span></span>
              {stats.reserved>0&&<span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500"/><span className="text-gray-600"><b className="text-gray-900">{stats.reserved}</b> <span className="hidden md:inline">reservadas</span></span></span>}
            </div>}
            {editMode&&<span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"><Settings size={12} className="animate-spin" style={{animationDuration:'3s'}}/> Modo Edición</span>}
          </div>
          <div className="flex items-center gap-2">
            {!editMode&&<div className="relative hidden sm:block"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15}/><input type="text" placeholder="Buscar mesa..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-36 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none"/></div>}
            {isAdmin&&!editMode&&<button onClick={enterEditMode} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"><Pencil size={13}/> Editar</button>}
            {editMode&&<button onClick={exitEditMode} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"><Check size={13}/> Listo</button>}
            {!editMode&&<span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${wsConnected?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{wsConnected?<Wifi size={10}/>:<WifiOff size={10}/>}{wsConnected?'LIVE':'POLL'}</span>}
          </div>
        </div>

        {/* ZONE TABS - normal mode only */}
        {!editMode&&<div className="flex items-center gap-1 bg-white border-b px-3 py-1.5 overflow-x-auto shrink-0 scrollbar-hide">
          {floorPlans.length>1&&floorPlans.map((fp,i)=><button key={fp.id} onClick={()=>{setActiveFloor(i);setActiveZone(null);}} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${i===activeFloor?'text-white shadow-sm':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={i===activeFloor?{backgroundColor:branding.accentColor}:{}}>{fp.name}</button>)}
          {floorPlans.length>1&&allZones.length>0&&<div className="w-px h-5 bg-gray-300 mx-1 shrink-0"/>}
          <button onClick={()=>setActiveZone(null)} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${!activeZone?'bg-gray-900 text-white shadow-sm':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todas <span className="ml-1 text-xs opacity-70">{allTablesInFloor.length}</span></button>
          {allZones.map(z=><button key={z.id} onClick={()=>setActiveZone(z.id)} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${activeZone===z.id?'text-white shadow-sm':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={activeZone===z.id?{backgroundColor:z.color||branding.accentColor}:{}}><span className="h-2 w-2 rounded-full shrink-0" style={{backgroundColor:z.color||'#6b7280'}}/>{z.name}<span className="text-xs opacity-70">{z.tables.filter(t=>t.status==='occupied').length}/{z.tables.length}</span></button>)}
        </div>}

        {/* ══════════════ EDIT MODE ══════════════ */}
        {editMode ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 border-r bg-white flex flex-col shrink-0 overflow-hidden">
              <div className="border-b"><div className="flex items-center justify-between px-4 py-3"><h3 className="text-sm font-bold text-gray-900">Zonas</h3><button onClick={()=>openZoneModal()} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"><Plus size={12}/> Nueva</button></div>
                <div className="max-h-52 overflow-y-auto px-2 pb-2 space-y-1">
                  {zones.length===0&&<p className="text-center text-xs text-gray-400 py-4">No hay zonas. Crea una para empezar.</p>}
                  {zones.map(z=><div key={z.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 group"><span className="h-3 w-3 rounded-full shrink-0" style={{backgroundColor:z.color||'#3B82F6'}}/><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{z.name}</p><p className="text-[10px] text-gray-400">{z.table_count||0} mesas</p></div><div className="flex gap-0.5 opacity-0 group-hover:opacity-100"><button onClick={()=>openZoneModal(z)} className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={12}/></button><button onClick={()=>setDeleteConfirm({type:'zone',id:z.id,label:z.name})} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12}/></button></div></div>)}
                </div>
              </div>
              <div className="border-b px-4 py-3 space-y-2"><h3 className="text-sm font-bold text-gray-900">Agregar Mesas</h3>
                <button onClick={()=>openTableModal()} className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"><Plus size={16}/> Mesa Individual</button>
                <button onClick={()=>{setBulkForm({zoneId:zones[0]?.id||'',startNumber:'',count:'',capacity:'4',shape:'square'});setShowBulkModal(true);}} className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-300 py-2.5 text-sm font-semibold text-purple-600 hover:bg-purple-50"><Copy size={16}/> Crear Múltiples</button>
              </div>
              <div className="flex-1 overflow-y-auto"><div className="px-4 py-2"><h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mesas por Zona</h3></div>
                {allZones.map(zone=><div key={zone.id} className="mb-2"><div className="flex items-center gap-2 px-4 py-1.5"><span className="h-2 w-2 rounded-full" style={{backgroundColor:zone.color||'#6b7280'}}/><span className="text-xs font-semibold text-gray-500">{zone.name}</span></div>
                  {zone.tables.map(t=><div key={t.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-gray-50 group"><div className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold ${STATUS_CONFIG[t.status]?.cardBg} ${STATUS_CONFIG[t.status]?.cardBorder} ${STATUS_CONFIG[t.status]?.text}`}>{t.number}</div><div className="flex-1"><p className="text-xs text-gray-500">Cap: {t.capacity} · {t.shape==='circle'?'Circular':'Rect.'}</p></div><div className="flex gap-0.5 opacity-0 group-hover:opacity-100"><button onClick={()=>openTableModal(t,zone.id)} className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={12}/></button>{t.status!=='occupied'&&<button onClick={()=>setDeleteConfirm({type:'table',id:t.id,label:`Mesa ${t.number}`})} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12}/></button>}</div></div>)}
                  {zone.tables.length===0&&<p className="px-4 py-2 text-[10px] text-gray-300 italic">Sin mesas</p>}
                </div>)}
              </div>
            </div>
            {/* Grid preview */}
            <div className="flex-1 overflow-auto p-5 bg-gray-50">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {allZones.map(zone=>zone.tables.map(t=>{const cfg=STATUS_CONFIG[t.status]||STATUS_CONFIG.available;const isCircle=t.shape==='circle';return(
                  <div key={t.id} className={`relative flex flex-col items-center justify-center border-2 p-2 min-h-[90px] ${cfg.cardBg} ${cfg.cardBorder} ${isCircle?'rounded-full aspect-square':'rounded-xl'}`}>
                    <span className="absolute -top-1.5 -left-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm" style={{backgroundColor:zone.color||'#6b7280'}}>{zone.name.slice(0,3)}</span>
                    <span className={`text-lg font-bold ${cfg.text}`}>{t.number}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Users size={9}/> {t.capacity}</span>
                    <div className="absolute inset-0 rounded-xl bg-black/0 hover:bg-black/10 flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-all">
                      <button onClick={()=>openTableModal(t,zone.id)} className="rounded-full bg-white p-1.5 shadow-md text-blue-600 hover:bg-blue-50"><Pencil size={14}/></button>
                      {t.status!=='occupied'&&<button onClick={()=>setDeleteConfirm({type:'table',id:t.id,label:`Mesa ${t.number}`})} className="rounded-full bg-white p-1.5 shadow-md text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>}
                    </div>
                  </div>);}))}
                <button onClick={()=>openTableModal()} className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-2 min-h-[90px] text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition"><Plus size={24}/><span className="text-[10px] font-medium mt-1">Agregar</span></button>
              </div>
            </div>
          </div>
        ) : (
          /* ══════════════ NORMAL MODE ══════════════ */
          <>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 overflow-auto p-3 md:p-5">
                {loading?<div className="flex h-full items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4" style={{borderRightColor:branding.accentColor,borderBottomColor:branding.accentColor,borderLeftColor:branding.accentColor,borderTopColor:'transparent'}}/></div>
                :allTables.length===0?<div className="flex h-full flex-col items-center justify-center text-gray-400"><Utensils size={48} className="mb-3 opacity-30"/><p className="text-lg font-medium">No hay mesas</p><p className="text-sm mb-4">{searchQuery?'No se encontraron resultados':'Configura mesas para empezar'}</p>{isAdmin&&!searchQuery&&<button onClick={enterEditMode} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{backgroundColor:branding.accentColor}}><Plus size={16}/> Configurar Mesas</button>}</div>
                :<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2.5 md:gap-3">
                  {allTables.map(table=>{const cfg=STATUS_CONFIG[table.status]||STATUS_CONFIG.available;const sel=selectedTable?.id===table.id;const info=getInfo(table);const occ=table.status==='occupied';const lw=occ&&table.opened_at&&getDurationMinutes(table.opened_at)>60;const isCircle=table.shape==='circle';return(
                    <button key={table.id} onClick={()=>handleTableClick(table)} className={`relative flex flex-col items-center justify-center border-2 p-2 transition-all duration-150 min-h-[80px] md:min-h-[90px] ${cfg.cardBg} ${cfg.cardBorder} ${sel?'ring-2 ring-blue-500 ring-offset-1 scale-[1.03] shadow-lg':'hover:shadow-md hover:scale-[1.02]'} ${isCircle?'rounded-full aspect-square':'rounded-xl'}`}>
                      {lw&&<span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="absolute h-full w-full animate-ping rounded-full bg-red-400 opacity-75"/><span className="relative h-3 w-3 rounded-full bg-red-500"/></span>}
                      {occ&&table.guest_count&&<span className="absolute -top-1.5 -left-1.5 flex items-center gap-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm"><Users size={8}/> {table.guest_count}</span>}
                      <span className={`text-base md:text-lg font-bold ${cfg.text}`}>{table.number}</span>
                      {info?<span className={`text-[11px] md:text-xs font-semibold mt-0.5 ${info.color} flex items-center gap-0.5`}>{info.icon&&<info.icon size={10}/>}{info.text}</span>:<span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5"><Users size={9}/> {table.capacity}</span>}
                      {table.merged_with&&<span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-1.5 py-0 text-[8px] font-bold text-white"><Merge size={8} className="inline"/> M</span>}
                    </button>);})}
                </div>}
              </div>
              {/* Right panel */}
              {selectedTable&&<div className="w-80 xl:w-96 border-l bg-white flex-col shrink-0 hidden md:flex">
                <div className="flex items-center justify-between border-b px-4 py-3"><div className="flex items-center gap-2"><div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 font-bold ${STATUS_CONFIG[selectedTable.status]?.cardBg} ${STATUS_CONFIG[selectedTable.status]?.cardBorder} ${STATUS_CONFIG[selectedTable.status]?.text}`}>{selectedTable.number}</div><div><h2 className="font-semibold text-gray-900">Mesa {selectedTable.number}</h2><div className={`flex items-center gap-1 text-xs font-medium ${STATUS_CONFIG[selectedTable.status]?.text}`}><span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selectedTable.status]?.dot}`}/>{STATUS_CONFIG[selectedTable.status]?.label}</div></div></div><button onClick={()=>{setSelectedTable(null);setTableOrder(null);}} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={16}/></button></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] text-gray-500 uppercase tracking-wide">Capacidad</p><p className="text-lg font-bold text-gray-900 flex items-center gap-1"><Users size={16} className="text-gray-400"/> {selectedTable.capacity}</p></div>
                    <div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] text-gray-500 uppercase tracking-wide">Forma</p><p className="text-lg font-bold text-gray-900">{selectedTable.shape==='circle'?'Circular':'Rect.'}</p></div>
                    {selectedTable.status==='occupied'&&selectedTable.opened_at&&<div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] text-gray-500 uppercase tracking-wide">Duración</p><p className={`text-lg font-bold flex items-center gap-1 ${getDurationColor(getDurationMinutes(selectedTable.opened_at))}`}><Clock size={16}/> {formatDuration(selectedTable.opened_at)}</p></div>}
                    {selectedTable.guest_count&&<div className="rounded-lg bg-gray-50 p-3"><p className="text-[10px] text-gray-500 uppercase tracking-wide">Comensales</p><p className="text-lg font-bold text-gray-900">{selectedTable.guest_count}</p></div>}
                  </div>
                  {tableOrder&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold text-rose-900">{tableOrder.orderNumber}</h3><span className="rounded-full bg-rose-200 px-2 py-0.5 text-xs font-medium text-rose-800">{tableOrder.status}</span></div><div className="space-y-1 max-h-48 overflow-y-auto">{tableOrder.items?.filter((i:any)=>!i.isVoid).map((item:any)=><div key={item.id} className="flex justify-between text-sm"><span className="text-rose-800 truncate mr-2">{parseFloat(item.quantity)}x {item.product?.name||item.productName}</span><span className="font-medium text-rose-900 shrink-0">{formatMoney(parseFloat(item.subtotal))}</span></div>)}</div><div className="flex justify-between border-t border-rose-200 pt-2 text-base font-bold text-rose-900"><span>Total</span><span>{formatMoney(parseFloat(tableOrder.total))}</span></div></div>}
                </div>
                <div className="border-t p-4 space-y-2">
                  {selectedTable.status==='available'&&<button onClick={()=>setShowOpenDialog(true)} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white hover:opacity-90" style={{backgroundColor:branding.accentColor}}><Plus size={18}/> Abrir Mesa</button>}
                  {selectedTable.status==='occupied'&&tableOrder&&<><button onClick={handleGoToOrder} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white hover:opacity-90" style={{backgroundColor:branding.accentColor}}><LayoutGrid size={18}/> Ir a la Orden</button><button onClick={handleCloseTable} disabled={actionLoading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Liberar Mesa</button></>}
                  {(selectedTable.status==='reserved'||selectedTable.status==='cleaning')&&<button onClick={handleCloseTable} disabled={actionLoading} className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white bg-emerald-500 hover:bg-emerald-600">Marcar Disponible</button>}
                </div>
              </div>}
            </div>
            {/* Bottom view modes */}
            <div className="flex items-center justify-center gap-1 bg-white border-t px-3 py-1.5 shrink-0">{VIEW_MODES.map(mode=>{const Icon=mode.icon;const act=viewMode===mode.key;return(<button key={mode.key} onClick={()=>setViewMode(mode.key)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${act?'text-white shadow-sm':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`} style={act?{backgroundColor:branding.accentColor}:{}}><Icon size={14}/><span className="hidden sm:inline">{mode.label}</span></button>);})}</div>
            {/* Mobile bottom sheet */}
            {selectedTable&&<div className="md:hidden fixed inset-0 z-50 flex flex-col"><div className="absolute inset-0 bg-black/50" onClick={()=>{setSelectedTable(null);setTableOrder(null);}}/><div className="relative mt-auto rounded-t-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col"><div className="flex justify-center pt-2 pb-1"><div className="h-1 w-10 rounded-full bg-gray-300"/></div><div className="flex items-center justify-between px-4 pb-3"><div className="flex items-center gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-bold ${STATUS_CONFIG[selectedTable.status]?.cardBg} ${STATUS_CONFIG[selectedTable.status]?.cardBorder} ${STATUS_CONFIG[selectedTable.status]?.text}`}>{selectedTable.number}</div><div><h2 className="text-lg font-bold text-gray-900">Mesa {selectedTable.number}</h2><span className={`text-sm font-medium ${STATUS_CONFIG[selectedTable.status]?.text}`}>{STATUS_CONFIG[selectedTable.status]?.label}</span></div></div><button onClick={()=>{setSelectedTable(null);setTableOrder(null);}} className="rounded-full p-2 text-gray-400 hover:bg-gray-100"><X size={20}/></button></div>
              {tableOrder&&<div className="mx-4 mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3"><div className="flex justify-between items-center mb-2"><span className="font-semibold text-rose-900 text-sm">{tableOrder.orderNumber}</span><span className="font-bold text-rose-900">{formatMoney(parseFloat(tableOrder.total))}</span></div><p className="text-xs text-rose-700">{tableOrder.items?.filter((i:any)=>!i.isVoid).length} items</p></div>}
              <div className="px-4 pb-4 space-y-2">
                {selectedTable.status==='available'&&<button onClick={()=>setShowOpenDialog(true)} className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white" style={{backgroundColor:branding.accentColor}}><Plus size={18}/> Abrir Mesa</button>}
                {selectedTable.status==='occupied'&&tableOrder&&<><button onClick={handleGoToOrder} className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white" style={{backgroundColor:branding.accentColor}}><LayoutGrid size={18}/> Ir a la Orden</button><button onClick={handleCloseTable} disabled={actionLoading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-medium text-gray-600">Liberar Mesa</button></>}
                {(selectedTable.status==='reserved'||selectedTable.status==='cleaning')&&<button onClick={handleCloseTable} disabled={actionLoading} className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white bg-emerald-500">Marcar Disponible</button>}
              </div></div></div>}
          </>
        )}

        {/* ══════ MODALS ══════ */}
        <Modal show={showOpenDialog&&!!selectedTable} onClose={()=>setShowOpenDialog(false)}>
          <h3 className="text-lg font-bold text-gray-900">Abrir Mesa {selectedTable?.number}</h3>
          <p className="mt-1 text-sm text-gray-500">Se creará una nueva orden.</p>
          <div className="mt-4"><label className="mb-2 block text-sm font-medium text-gray-700">Comensales</label><div className="flex items-center gap-3 justify-center"><button onClick={()=>setGuestCount(Math.max(1,guestCount-1))} className="flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg text-gray-600 hover:bg-gray-50">-</button><span className="text-3xl font-bold text-gray-900 w-16 text-center">{guestCount}</span><button onClick={()=>setGuestCount(Math.min(20,guestCount+1))} className="flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg text-gray-600 hover:bg-gray-50">+</button></div></div>
          <div className="mt-6 flex gap-3"><button onClick={()=>setShowOpenDialog(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={handleOpenTable} disabled={actionLoading} className="flex-1 rounded-xl py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50" style={{backgroundColor:branding.accentColor}}>{actionLoading?'Abriendo...':'Abrir Mesa'}</button></div>
        </Modal>

        <Modal show={showZoneModal} onClose={()=>setShowZoneModal(false)}>
          <h3 className="text-lg font-bold text-gray-900">{editingZone?'Editar Zona':'Nueva Zona'}</h3>
          <div className="mt-4 space-y-4"><div><label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label><input type="text" value={zoneForm.name} onChange={e=>setZoneForm(p=>({...p,name:e.target.value}))} placeholder="Ej: Terraza, Salón..." className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none" autoFocus/></div>
            <div><label className="mb-2 block text-sm font-medium text-gray-700">Color</label><div className="flex flex-wrap gap-2">{ZONE_COLORS.map(c=><button key={c} onClick={()=>setZoneForm(p=>({...p,color:c}))} className={`h-8 w-8 rounded-full transition ${zoneForm.color===c?'ring-2 ring-offset-2 ring-blue-500 scale-110':'hover:scale-110'}`} style={{backgroundColor:c}}/>)}</div></div></div>
          <div className="mt-6 flex gap-3"><button onClick={()=>setShowZoneModal(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={saveZone} disabled={saving||!zoneForm.name.trim()} className="flex-1 rounded-xl py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50" style={{backgroundColor:branding.accentColor}}>{saving?'Guardando...':(editingZone?'Guardar':'Crear Zona')}</button></div>
        </Modal>

        <Modal show={showTableModal} onClose={()=>setShowTableModal(false)}>
          <h3 className="text-lg font-bold text-gray-900">{editingTable?`Editar Mesa ${editingTable.number}`:'Nueva Mesa'}</h3>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-medium text-gray-700">Número</label><input type="number" value={tableForm.number} onChange={e=>setTableForm(p=>({...p,number:e.target.value}))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none" autoFocus/></div><div><label className="mb-1 block text-sm font-medium text-gray-700">Capacidad</label><input type="number" value={tableForm.capacity} onChange={e=>setTableForm(p=>({...p,capacity:e.target.value}))} min="1" max="50" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"/></div></div>
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Zona</label><select value={tableForm.zoneId} onChange={e=>setTableForm(p=>({...p,zoneId:e.target.value}))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"><option value="">Seleccionar zona...</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
            <div><label className="mb-2 block text-sm font-medium text-gray-700">Forma</label><div className="flex gap-2">{[{key:'square',icon:Square,label:'Rectangular'},{key:'circle',icon:Circle,label:'Circular'}].map(s=><button key={s.key} onClick={()=>setTableForm(p=>({...p,shape:s.key}))} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-medium transition ${tableForm.shape===s.key?'border-blue-400 bg-blue-50 text-blue-700':'border-gray-200 text-gray-600 hover:border-gray-300'}`}><s.icon size={16}/> {s.label}</button>)}</div></div>
          </div>
          <div className="mt-6 flex gap-3"><button onClick={()=>setShowTableModal(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={saveTableFn} disabled={saving||!tableForm.number||!tableForm.zoneId} className="flex-1 rounded-xl py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50" style={{backgroundColor:branding.accentColor}}>{saving?'Guardando...':(editingTable?'Guardar':'Crear Mesa')}</button></div>
        </Modal>

        <Modal show={showBulkModal} onClose={()=>setShowBulkModal(false)}>
          <h3 className="text-lg font-bold text-gray-900">Crear Múltiples Mesas</h3>
          <p className="mt-1 text-sm text-gray-500">Números consecutivos.</p>
          <div className="mt-4 space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-gray-700">Zona</label><select value={bulkForm.zoneId} onChange={e=>setBulkForm(p=>({...p,zoneId:e.target.value}))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"><option value="">Seleccionar zona...</option>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-medium text-gray-700">Desde #</label><input type="number" value={bulkForm.startNumber} onChange={e=>setBulkForm(p=>({...p,startNumber:e.target.value}))} min="1" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"/></div><div><label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label><input type="number" value={bulkForm.count} onChange={e=>setBulkForm(p=>({...p,count:e.target.value}))} min="1" max="50" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-medium text-gray-700">Capacidad</label><input type="number" value={bulkForm.capacity} onChange={e=>setBulkForm(p=>({...p,capacity:e.target.value}))} min="1" max="50" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"/></div><div><label className="mb-1 block text-sm font-medium text-gray-700">Forma</label><select value={bulkForm.shape} onChange={e=>setBulkForm(p=>({...p,shape:e.target.value}))} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"><option value="square">Rectangular</option><option value="circle">Circular</option></select></div></div>
            {bulkForm.startNumber&&bulkForm.count&&<p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">Mesas #{bulkForm.startNumber} a #{parseInt(bulkForm.startNumber)+parseInt(bulkForm.count)-1}</p>}
          </div>
          <div className="mt-6 flex gap-3"><button onClick={()=>setShowBulkModal(false)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={saveBulk} disabled={saving||!bulkForm.zoneId||!bulkForm.startNumber||!bulkForm.count} className="flex-1 rounded-xl py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50" style={{backgroundColor:branding.accentColor}}>{saving?'Creando...':'Crear Mesas'}</button></div>
        </Modal>

        <Modal show={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)}>
          <div className="text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"><Trash2 size={24} className="text-red-600"/></div><h3 className="text-lg font-bold text-gray-900">Eliminar {deleteConfirm?.label}?</h3><p className="mt-1 text-sm text-gray-500">{deleteConfirm?.type==='zone'?'Se eliminarán también todas sus mesas.':'Esta acción no se puede deshacer.'}</p></div>
          <div className="mt-5 flex gap-3"><button onClick={()=>setDeleteConfirm(null)} className="flex-1 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={()=>deleteConfirm?.type==='zone'?doDeleteZone(deleteConfirm.id):doDeleteTable(deleteConfirm!.id)} disabled={saving} className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50">{saving?'Eliminando...':'Eliminar'}</button></div>
        </Modal>
      </div>
    </AppShell>
  );
}
