'use client';
import { AppShellWrapper as AppShell } from '@/components/app-shell-wrapper';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Shield, Plus, X, Check, Edit2, Trash2, Copy, Users, ChevronDown, ChevronRight,
  Lock, ShoppingCart, Package, CreditCard, FileText, Settings, BarChart3,
  ChefHat, Utensils, Truck, Tag, Calendar, Star, Zap, User, Eye,
} from 'lucide-react';

const get = <T,>(p: string): Promise<T> => api.get<T>(p);
const post = <T,>(p: string, b?: any): Promise<T> => api.post<T>(p, b);
const put = <T,>(p: string, b: any): Promise<T> => api.put<T>(p, b);
const del = <T,>(p: string): Promise<T> => api.del<T>(p);

const ICON_MAP: Record<string, any> = {
  BarChart3, ShoppingCart, Utensils, ChefHat, CreditCard, Package, FileText,
  User, Truck, Tag, Calendar, Star, Zap, Shield, Settings, Users,
};

const COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#6b7280', '#f97316'];

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roleDetail, setRoleDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('#6b7280');
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // New role dialog
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [newPerms, setNewPerms] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        get<any[]>('/roles'),
        get<any[]>('/roles/permissions-catalog'),
      ]);
      setRoles(r);
      setCatalog(c);
      setLoading(false);
    } catch (e: any) { setError(e.message); setLoading(false); }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('pos_token')) { router.replace('/login'); return; }
    loadData();
  }, [loadData]);

  const loadRoleDetail = async (id: string) => {
    try {
      const detail = await get<any>(`/roles/${id}`);
      setRoleDetail(detail);
      setEditName(detail.name);
      setEditDesc(detail.description || '');
      setEditColor(detail.color || '#6b7280');
      setEditPerms(Array.isArray(detail.permissions) ? detail.permissions : []);
    } catch (e: any) { setError(e.message); }
  };

  const handleSave = async () => {
    if (!roleDetail) return;
    try {
      await put(`/roles/${roleDetail.id}`, { name: editName, description: editDesc, color: editColor, permissions: editPerms });
      setSuccess('Rol actualizado');
      setEditing(false);
      loadData();
      loadRoleDetail(roleDetail.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  const handleCreate = async () => {
    if (!newName) return;
    try {
      const role = await post<any>('/roles', { name: newName, description: newDesc, color: newColor, permissions: newPerms });
      setSuccess('Rol creado');
      setShowNew(false);
      setNewName(''); setNewDesc(''); setNewColor('#6b7280'); setNewPerms([]);
      loadData();
      loadRoleDetail(role.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este rol?')) return;
    try {
      await del(`/roles/${id}`);
      setSuccess('Rol eliminado');
      setRoleDetail(null);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const role = await post<any>(`/roles/${id}/duplicate`);
      setSuccess('Rol duplicado');
      loadData();
      loadRoleDetail(role.id);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { setError(e.message); setTimeout(() => setError(''), 4000); }
  };

  const togglePerm = (perms: string[], setPerms: (v: string[]) => void, key: string) => {
    setPerms(perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key]);
  };

  const toggleModule = (perms: string[], setPerms: (v: string[]) => void, modulePerms: string[]) => {
    const allSelected = modulePerms.every(p => perms.includes(p));
    if (allSelected) {
      setPerms(perms.filter(p => !modulePerms.includes(p)));
    } else {
      setPerms([...new Set([...perms, ...modulePerms])]);
    }
  };

  const toggleModuleExpand = (mod: string) => {
    setExpandedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  const hasWildcard = (perms: string[], module: string) => perms.includes('*') || perms.includes(`${module}.*`);

  const PermissionMatrix = ({ perms, setPerms, readOnly = false }: { perms: string[]; setPerms: (v: string[]) => void; readOnly?: boolean }) => (
    <div className="space-y-1">
      {catalog.map(mod => {
        const ModIcon = ICON_MAP[mod.icon] || Shield;
        const modPermKeys = mod.permissions.map((p: any) => p.key);
        const selectedCount = perms.includes('*') ? modPermKeys.length : modPermKeys.filter((k: string) => perms.includes(k) || perms.includes(`${mod.module}.*`)).length;
        const allSelected = selectedCount === modPermKeys.length;
        const isExpanded = expandedModules[mod.module];

        return (
          <div key={mod.module} className="rounded-lg border bg-white">
            <button onClick={() => toggleModuleExpand(mod.module)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition">
              <ModIcon size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-800 flex-1">{mod.label}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allSelected ? 'bg-green-100 text-green-700' : selectedCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {selectedCount}/{modPermKeys.length}
              </span>
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t bg-gray-50/50">
                {!readOnly && (
                  <button onClick={() => toggleModule(perms, setPerms, modPermKeys)}
                    className="mb-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {allSelected ? 'Desmarcar todos' : 'Seleccionar todos'}
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {mod.permissions.map((p: any) => {
                    const isChecked = perms.includes('*') || perms.includes(`${mod.module}.*`) || perms.includes(p.key);
                    return (
                      <label key={p.key}
                        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm cursor-pointer transition ${
                          readOnly ? 'cursor-default' : 'hover:bg-white'
                        } ${isChecked ? 'text-gray-900' : 'text-gray-500'}`}>
                        <input type="checkbox" checked={isChecked} disabled={readOnly || perms.includes('*')}
                          onChange={() => !readOnly && togglePerm(perms, setPerms, p.key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <AppShell>
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between bg-white border-b px-4 py-2.5 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Gestión de Roles</h1>
        <button onClick={() => { setShowNew(true); setNewPerms([]); setExpandedModules({}); }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          <Plus size={16} /> Nuevo Rol
        </button>
      </div>

      {error && <div className="mx-4 mt-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600"><span>{error}</span><button onClick={() => setError('')}><X size={14} /></button></div>}
      {success && <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-600"><Check size={16} />{success}</div>}

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left: Role list */}
        <div className="flex flex-col lg:w-[340px] border-r bg-white shrink-0 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
          ) : (
            <div className="divide-y">
              {roles.map(role => {
                const isActive = roleDetail?.id === role.id;
                const permCount = Array.isArray(role.permissions) ? (role.permissions.includes('*') ? 'Todos' : role.permissions.length) : 0;

                return (
                  <button key={role.id} onClick={() => { setSelectedRole(role); loadRoleDetail(role.id); setEditing(false); setExpandedModules({}); }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${isActive ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                      style={{ backgroundColor: role.color || '#6b7280' }}>
                      {role.is_system ? <Lock size={16} /> : <Shield size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                        {role.is_system && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">Sistema</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{role.description || `${permCount} permisos`}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <Users size={12} /> {role.user_count || 0}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Role detail */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {roleDetail ? (
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
              {/* Header */}
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold"
                      style={{ backgroundColor: editing ? editColor : (roleDetail.color || '#6b7280') }}>
                      {roleDetail.is_system ? <Lock size={20} /> : <Shield size={20} />}
                    </div>
                    <div>
                      {editing ? (
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                          className="text-xl font-bold text-gray-900 border-b border-blue-400 focus:outline-none pb-0.5" />
                      ) : (
                        <h2 className="text-xl font-bold text-gray-900">{roleDetail.name}</h2>
                      )}
                      {editing ? (
                        <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descripción..."
                          className="text-sm text-gray-500 border-b border-gray-200 focus:outline-none mt-1 w-full" />
                      ) : (
                        <p className="text-sm text-gray-500">{roleDetail.description || 'Sin descripción'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {editing ? (
                      <>
                        <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                        <button onClick={handleSave} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Guardar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditing(true)}
                          className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200" title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => handleDuplicate(roleDetail.id)}
                          className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200" title="Duplicar"><Copy size={16} /></button>
                        {!roleDetail.is_system && (
                          <button onClick={() => handleDelete(roleDetail.id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Eliminar"><Trash2 size={16} /></button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Color picker when editing */}
                {editing && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Color del rol</p>
                    <div className="flex gap-2">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setEditColor(c)}
                          className={`h-7 w-7 rounded-full transition-all ${editColor === c ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Users with this role */}
                {roleDetail.users?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Usuarios con este rol ({roleDetail.users.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {roleDetail.users.map((u: any) => (
                        <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                          <div className="h-4 w-4 rounded-full bg-gray-300 text-[8px] flex items-center justify-center font-bold text-white">
                            {(u.first_name || '?')[0]}
                          </div>
                          {u.first_name} {u.last_name}
                          {!u.is_active && <span className="text-red-400">(inactivo)</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Shield size={16} /> Permisos</h3>
                  {roleDetail.permissions?.includes('*') && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Acceso completo</span>
                  )}
                </div>
                <PermissionMatrix
                  perms={editing ? editPerms : (Array.isArray(roleDetail.permissions) ? roleDetail.permissions : [])}
                  setPerms={setEditPerms}
                  readOnly={!editing}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecciona un rol para ver sus permisos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ DIALOG: New Role ═══ */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Rol</h3>
              <button onClick={() => setShowNew(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre del Rol</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Supervisor"
                  className="w-full rounded-lg border py-2.5 px-3 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
                <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descripción del rol..."
                  className="w-full rounded-lg border py-2 px-3 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`h-7 w-7 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Permisos</label>
                <PermissionMatrix perms={newPerms} setPerms={setNewPerms} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4 shrink-0">
              <button onClick={() => setShowNew(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
              <button onClick={handleCreate} disabled={!newName}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
                Crear Rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppShell>
  );
}
