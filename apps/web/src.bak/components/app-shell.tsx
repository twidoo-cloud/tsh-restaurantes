'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePosStore } from '@/store/pos-store';
import { useThemeStore, useLoadBranding, useThemeProvider } from '@/lib/use-theme';
import { usePermissions } from '@/lib/use-permissions';
import {
  Utensils, ChefHat, CreditCard, BarChart3, Package, FileText, User, Truck, Zap,
  Settings, LogOut, Bell, Tag, Calendar, Star, Users,
  QrCode, Lock, X, ShoppingCart, Home, MoreHorizontal, ChevronDown, ChevronRight, Wallet, Shield,
} from 'lucide-react';

// ─── Icon registry ───
const ICON_MAP: Record<string, any> = {
  Utensils, ChefHat, CreditCard, BarChart3, Package, FileText, User, Truck, Zap,
  Tag, Calendar, Star, Users, QrCode, Settings, Wallet, Shield, Lock,
};

// ─── Nav sections with grouped items ───
interface NavSection {
  id: string;
  label: string;
  icon: any;
  items: { path: string; label: string; icon: string; roles: string[] }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'main',
    label: 'Principal',
    icon: Home,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'BarChart3', roles: ['owner', 'admin'] },
      { path: '/pos',       label: 'POS',       icon: 'ShoppingCart', roles: ['owner', 'admin', 'cashier', 'waiter'] },
      { path: '/tables',    label: 'Mesas',     icon: 'Utensils', roles: ['owner', 'admin', 'cashier', 'waiter'] },
      { path: '/kitchen',   label: 'Cocina',    icon: 'ChefHat', roles: ['owner', 'admin', 'kitchen'] },
      { path: '/shifts',    label: 'Caja',      icon: 'CreditCard', roles: ['owner', 'admin', 'cashier'] },
    ],
  },
  {
    id: 'sales',
    label: 'Ventas',
    icon: ShoppingCart,
    items: [
      { path: '/customers',    label: 'Clientes',    icon: 'User', roles: ['owner', 'admin', 'cashier'] },
      { path: '/invoices',     label: 'Facturas',    icon: 'FileText', roles: ['owner', 'admin', 'cashier'] },
      { path: '/promotions',   label: 'Promos',      icon: 'Tag', roles: ['owner', 'admin'] },
      { path: '/reservations', label: 'Reservas',    icon: 'Calendar', roles: ['owner', 'admin', 'cashier'] },
      { path: '/delivery',     label: 'Delivery',    icon: 'Truck', roles: ['owner', 'admin', 'cashier'] },
      { path: '/loyalty',      label: 'Fidelidad',   icon: 'Star', roles: ['owner', 'admin'] },
      { path: '/credit',       label: 'Crédito',     icon: 'Wallet', roles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'ops',
    label: 'Operaciones',
    icon: Package,
    items: [
      { path: '/inventory', label: 'Inventario',   icon: 'Package', roles: ['owner', 'admin'] },
      { path: '/recipes',   label: 'Recetas',      icon: 'ChefHat', roles: ['owner', 'admin'] },
      { path: '/suppliers',  label: 'Proveedores', icon: 'Truck', roles: ['owner', 'admin'] },
      { path: '/staff',      label: 'Personal',    icon: 'Users', roles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: Settings,
    items: [
      { path: '/reports',  label: 'Reportes',   icon: 'BarChart3', roles: ['owner', 'admin'] },
      { path: '/sri',      label: 'SRI',        icon: 'Zap', roles: ['owner', 'admin'] },
      { path: '/audit',    label: 'Auditoría',  icon: 'Shield', roles: ['owner', 'admin'] },
      { path: '/roles',    label: 'Roles',      icon: 'Lock', roles: ['owner'] },
      { path: '/qr-menu',  label: 'QR Menú',    icon: 'QrCode', roles: ['owner', 'admin'] },
    ],
  },
];

// ─── Color accents per path ───
const NAV_ACCENT: Record<string, string> = {
  '/dashboard': '#0ea5e9', '/pos': '#2563eb', '/tables': '#10b981',
  '/kitchen': '#f97316', '/shifts': '#8b5cf6', '/inventory': '#84cc16',
  '/recipes': '#ec4899', '/suppliers': '#06b6d4', '/sri': '#eab308',
  '/invoices': '#6366f1', '/reports': '#d946ef', '/promotions': '#ef4444',
  '/reservations': '#3b82f6', '/delivery': '#f43f5e', '/loyalty': '#f59e0b',
  '/staff': '#14b8a6', '/qr-menu': '#06b6d4', '/customers': '#0d9488',
  '/credit': '#7c3aed', '/audit': '#f97316', '/roles': '#d946ef',
  '/settings': '#6b7280',
};

// ─── Bottom nav priority ───
const BOTTOM_NAV_PRIORITY = ['/dashboard', '/pos', '/tables', '/kitchen'];

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
  headerRight?: React.ReactNode;
}

export function AppShell({ children, hideNav, headerRight }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const store = usePosStore();
  const branding = useThemeStore(s => s.branding);
  const { refreshBranding } = useLoadBranding();
  useThemeProvider();
  const { role } = usePermissions();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const profileRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    store.restoreSession();
    if (!localStorage.getItem('pos_token')) router.replace('/login');
    refreshBranding();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      if (!token) return;
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setUnreadCount(d.count || 0); }
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      if (!token) return;
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const r = await fetch(`${API}/notifications?limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setNotifications(d.data || []); setUnreadCount(d.unreadCount || 0); }
    } catch {}
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('pos_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${API}/notifications/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${API}/notifications/read-all`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const toggleNotifications = () => {
    if (!showNotifications) fetchNotifications();
    setShowNotifications(!showNotifications);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Filter sections by role
  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.includes(role || '')),
  })).filter(section => section.items.length > 0);

  // Flat list of all visible items (for bottom nav)
  const allVisibleItems = visibleSections.flatMap(s => s.items);

  // Bottom nav
  const bottomPrimary = BOTTOM_NAV_PRIORITY
    .map(p => allVisibleItems.find(i => i.path === p))
    .filter(Boolean) as typeof allVisibleItems;
  const bottomMore = allVisibleItems.filter(i => !BOTTOM_NAV_PRIORITY.includes(i.path));

  const getIcon = (iconName: string) => {
    if (iconName === 'ShoppingCart') return ShoppingCart;
    if (iconName === 'Home') return Home;
    return ICON_MAP[iconName] || User;
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setShowMoreMenu(false);
  };

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Check if a section has the active item
  const sectionHasActive = (section: NavSection) =>
    section.items.some(i => pathname === i.path || (i.path !== '/pos' && i.path !== '/dashboard' && pathname.startsWith(i.path)));

  if (hideNav) return <>{children}</>;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* ═══ SIDEBAR — Desktop ═══ */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r transition-all duration-200 ease-in-out z-30 ${
          sidebarExpanded ? 'w-56' : 'w-16'
        }`}
        style={{ backgroundColor: branding.sidebarColor, color: branding.sidebarTextColor }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo */}
        <div className="flex h-12 items-center px-3 border-b border-white/10 shrink-0">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded-lg shrink-0" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: branding.primaryColor }}>
              {(branding.appName || 'P')[0]}
            </div>
          )}
          {sidebarExpanded && (
            <span className="ml-3 text-sm font-semibold truncate">
              {branding.appName || store.tenant?.name || 'POS SaaS'}
            </span>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-1.5 px-2">
          {visibleSections.map((section, sIdx) => {
            const isCollapsed = collapsedSections[section.id] && sidebarExpanded;
            const hasActive = sectionHasActive(section);

            return (
              <div key={section.id} className={sIdx > 0 ? 'mt-1' : ''}>
                {/* Section header — only visible when expanded */}
                {sidebarExpanded ? (
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition"
                  >
                    <span>{section.label}</span>
                    <ChevronRight
                      size={12}
                      className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    />
                  </button>
                ) : (
                  /* Collapsed: show a thin divider between groups */
                  sIdx > 0 && <div className="mx-2 my-1.5 border-t border-white/10" />
                )}

                {/* Items */}
                {!isCollapsed && section.items.map(item => {
                  const Icon = getIcon(item.icon);
                  const isActive = pathname === item.path || (item.path !== '/pos' && item.path !== '/dashboard' && pathname.startsWith(item.path));
                  const accent = NAV_ACCENT[item.path] || '#6b7280';

                  return (
                    <button
                      key={item.path}
                      onClick={() => navigateTo(item.path)}
                      className={`group relative flex items-center w-full rounded-lg transition-all duration-150 ${
                        sidebarExpanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'
                      } ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/8'
                      }`}
                      title={!sidebarExpanded ? item.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                          style={{ backgroundColor: accent }} />
                      )}
                      <Icon size={18} className="shrink-0" />
                      {sidebarExpanded && (
                        <span className="ml-3 text-[13px] font-medium truncate">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom: Settings + Profile */}
        <div className="border-t border-white/10 p-2 space-y-0.5 shrink-0">
          {(role === 'owner' || role === 'admin') && (
            <button
              onClick={() => navigateTo('/settings')}
              className={`group flex items-center w-full rounded-lg transition-all duration-150 ${
                sidebarExpanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'
              } ${
                pathname === '/settings' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
              title={!sidebarExpanded ? 'Configuración' : undefined}
            >
              <Settings size={18} className="shrink-0" />
              {sidebarExpanded && <span className="ml-3 text-[13px] font-medium">Configuración</span>}
            </button>
          )}

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); }}
              className={`flex items-center w-full rounded-lg transition-all duration-150 ${
                sidebarExpanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'
              } text-white/60 hover:text-white hover:bg-white/8`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                {(store.user?.firstName || 'U')[0]}
              </div>
              {sidebarExpanded && (
                <>
                  <div className="ml-3 min-w-0 text-left">
                    <p className="text-[13px] font-medium truncate text-white">{store.user?.firstName}</p>
                    <p className="text-[10px] text-white/50 uppercase">{role}</p>
                  </div>
                  <ChevronDown size={14} className="ml-auto shrink-0 text-white/40" />
                </>
              )}
            </button>

            {showProfile && (
              <div className={`absolute ${sidebarExpanded ? 'left-0 bottom-full mb-2' : 'left-full bottom-0 ml-2'} w-64 rounded-xl border bg-white shadow-xl z-50`}>
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-bold text-gray-900">{store.user?.firstName} {store.user?.lastName}</p>
                  <p className="text-xs text-gray-500">{store.user?.email}</p>
                  <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">{role}</span>
                </div>
                <div className="py-1">
                  <button onClick={() => { setShowProfile(false); navigateTo('/settings?tab=profile'); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <User size={16} /> Mi Perfil
                  </button>
                  {(role === 'owner' || role === 'admin') && (
                    <button onClick={() => { setShowProfile(false); navigateTo('/settings'); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Lock size={16} /> Configuración
                    </button>
                  )}
                </div>
                <div className="border-t py-1">
                  <button onClick={() => { store.logout(); router.push('/login'); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={16} /> Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {/* Top header */}
        <header
          className="flex h-11 items-center justify-between px-3 md:px-4 shrink-0 border-b"
          style={{ backgroundColor: branding.sidebarColor, color: branding.sidebarTextColor }}
        >
          <div className="flex items-center gap-2 min-w-0 lg:hidden">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="h-7 object-contain" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                style={{ backgroundColor: branding.primaryColor }}>
                {(branding.appName || 'P')[0]}
              </div>
            )}
            <span className="text-sm font-semibold truncate">{branding.appName || 'POS SaaS'}</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="font-medium text-white/60">{store.tenant?.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {headerRight}
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
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border bg-white shadow-2xl z-50 max-h-[70vh] flex flex-col">
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
                  <div className="flex-1 overflow-y-auto">
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
                            <button key={n.id} onClick={() => { if (isUnread) markAsRead(n.id); if (n.action_url) { navigateTo(n.action_url); setShowNotifications(false); } }}
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

        {/* Page content */}
        <main className="flex-1 overflow-hidden">{children}</main>

        {/* ═══ BOTTOM NAV — Mobile ═══ */}
        <nav className="lg:hidden flex items-center justify-around border-t bg-white shrink-0 safe-area-bottom"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {bottomPrimary.map(item => {
            const Icon = getIcon(item.icon);
            const isActive = pathname === item.path || (item.path !== '/pos' && item.path !== '/dashboard' && pathname.startsWith(item.path));
            const accent = NAV_ACCENT[item.path] || branding.accentColor;
            return (
              <button key={item.path} onClick={() => navigateTo(item.path)}
                className={`flex flex-col items-center py-2 px-3 min-w-[60px] transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className="relative">
                  <Icon size={22} />
                  {isActive && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full" style={{ backgroundColor: accent }} />}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* More */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
              className={`flex flex-col items-center py-2 px-3 min-w-[60px] transition-colors ${showMoreMenu ? 'text-blue-600' : 'text-gray-400'}`}>
              <MoreHorizontal size={22} />
              <span className="text-[10px] mt-0.5 font-medium">Más</span>
            </button>

            {showMoreMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-60 rounded-xl border bg-white shadow-xl z-50 max-h-[70vh] overflow-y-auto">
                {/* Group items by section in the "More" menu too */}
                {visibleSections.map(section => {
                  const sectionMore = section.items.filter(i => !BOTTOM_NAV_PRIORITY.includes(i.path));
                  if (sectionMore.length === 0) return null;
                  return (
                    <div key={section.id}>
                      <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {section.label}
                      </div>
                      {sectionMore.map(item => {
                        const Icon = getIcon(item.icon);
                        const isActive = pathname === item.path;
                        return (
                          <button key={item.path} onClick={() => navigateTo(item.path)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition ${
                              isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                            }`}>
                            <Icon size={18} /> {item.label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
                <div className="border-t py-1">
                  {(role === 'owner' || role === 'admin') && (
                    <button onClick={() => navigateTo('/settings')}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings size={18} /> Configuración
                    </button>
                  )}
                  <button onClick={() => { store.logout(); router.push('/login'); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={18} /> Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
