'use client';

import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '@/lib/use-theme';
import { ConnectionBadge } from '@/components/offline-indicator';
import { api } from '@/lib/api';
import { Bell, MapPin, ChevronDown } from 'lucide-react';

interface TopBarProps {
  pathname: string;
  headerRight?: React.ReactNode;
  tenantName?: string;
  branches: any[];
  currentBranch: any;
  switchBranch: (branch: any) => void;
  unreadCount: number;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
}

export function TopBar({
  pathname,
  headerRight,
  tenantName,
  branches,
  currentBranch,
  switchBranch,
  unreadCount,
  setUnreadCount,
}: TopBarProps) {
  const branding = useThemeStore(s => s.branding);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const branchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) setShowBranchPicker(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      if (!api.getToken()) return;
      const d = await api.get<any>('/notifications?limit=20');
      setNotifications(d.data || []);
      setUnreadCount(d.unreadCount || 0);
    } catch {}
  };

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const toggleNotifications = () => {
    if (!showNotifications) fetchNotifications();
    setShowNotifications(!showNotifications);
  };

  const handleSwitchBranch = (branch: any) => {
    setShowBranchPicker(false);
    switchBranch(branch);
  };

  return (
    <header
      className="flex h-11 items-center justify-between px-3 md:px-4 shrink-0 border-b"
      style={{ backgroundColor: branding.sidebarColor, color: branding.sidebarTextColor }}
    >
      {/* Mobile: Logo + App name */}
      <div className="flex items-center gap-2 min-w-0 lg:hidden">
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="Logo" className="h-7 object-contain" />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
            style={{ backgroundColor: branding.primaryColor }}>
            {(branding.appName || 'T')[0]}
          </div>
        )}
        <span className="text-sm font-semibold truncate">{branding.appName || 'TSH Restaurantes'}</span>
      </div>

      {/* Desktop: TSH + Tenant + Branch selector */}
      <div className="hidden lg:flex items-center gap-2 text-sm">
        <span className="font-semibold text-white/90">TSH Restaurantes</span>
        {tenantName && (
          <>
            <span className="text-white/30">|</span>
            <span className="font-medium text-white/60">{tenantName}</span>
          </>
        )}

        {/* Branch selector */}
        {branches.length > 1 && currentBranch && (
          <div className="relative" ref={branchRef}>
            <button onClick={(e) => { e.stopPropagation(); setShowBranchPicker(!showBranchPicker); }}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white transition">
              <MapPin size={12} />
              <span className="truncate max-w-[120px]">{currentBranch.name}</span>
              <ChevronDown size={12} className={`transition-transform ${showBranchPicker ? 'rotate-180' : ''}`} />
            </button>
            {showBranchPicker && (
              <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border bg-white shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 border-b bg-gray-50">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Cambiar sucursal</p>
                </div>
                {branches.filter(b => b.isActive).map(b => (
                  <button key={b.id} onClick={() => handleSwitchBranch(b)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition ${
                      b.id === currentBranch?.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    <MapPin size={14} className={b.id === currentBranch?.id ? 'text-blue-500' : 'text-gray-400'} />
                    <span className="truncate">{b.name}</span>
                    {b.isMain && <span className="ml-auto text-[9px] rounded bg-blue-100 px-1.5 py-0.5 text-blue-600 font-bold">PRINCIPAL</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: headerRight + Connection + Notifications */}
      <div className="flex items-center gap-1.5">
        {headerRight}
        <ConnectionBadge />
        <div className="relative" ref={notifRef}>
          <button onClick={(e) => { e.stopPropagation(); toggleNotifications(); }}
            className="relative rounded-lg p-2 hover:bg-white/10 text-white/70 hover:text-white transition">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border bg-white shadow-2xl z-50 max-h-[70vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-sm font-bold text-gray-900">Notificaciones</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Marcar todas leídas
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-400">Sin notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map(n => {
                      const isUnread = !n.is_read;
                      return (
                        <button key={n.id} onClick={() => { if (isUnread) markAsRead(n.id); if (n.action_url) setShowNotifications(false); }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${isUnread ? 'bg-blue-50/50' : ''}`}>
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            n.type === 'warning' || n.type === 'error' ? 'bg-amber-100' :
                            n.type === 'success' ? 'bg-green-100' :
                            n.type === 'order' ? 'bg-purple-100' :
                            n.type === 'inventory' ? 'bg-orange-100' :
                            'bg-blue-100'
                          }`}>
                            <Bell size={14} className={
                              n.type === 'warning' || n.type === 'error' ? 'text-amber-600' :
                              n.type === 'success' ? 'text-green-600' :
                              n.type === 'order' ? 'text-purple-600' :
                              n.type === 'inventory' ? 'text-orange-600' :
                              'text-blue-600'
                            } />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
