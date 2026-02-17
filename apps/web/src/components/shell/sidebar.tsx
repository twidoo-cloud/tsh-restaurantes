'use client';

import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '@/lib/use-theme';
import { PLAN_LABELS } from '@/lib/use-permissions';
import { getIcon, NAV_ACCENT, type NavSection } from '@/components/app-shell';
import {
  Settings, LogOut, User, Lock, ChevronDown, ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  visibleSections: NavSection[];
  pathname: string;
  role: string | null;
  navigateTo: (path: string) => void;
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({
  visibleSections,
  pathname,
  role,
  navigateTo,
  onLogout,
  userName,
  userEmail,
}: SidebarProps) {
  const branding = useThemeStore(s => s.branding);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sectionHasActive = (section: NavSection) =>
    section.items.some(i => pathname === i.path || (i.path !== '/pos' && i.path !== '/dashboard' && pathname.startsWith(i.path)));

  return (
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
            {(branding.appName || 'T')[0]}
          </div>
        )}
        {sidebarExpanded && (
          <span className="ml-3 text-sm font-semibold truncate">
            {branding.appName || 'TSH Restaurantes'}
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-1.5 px-2 scrollbar-hide">
        {visibleSections.map((section, sIdx) => {
          const isCollapsed = collapsedSections[section.id] && sidebarExpanded;

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
                    onClick={() => !item.locked && navigateTo(item.path)}
                    className={`group relative flex items-center w-full rounded-lg transition-all duration-150 ${
                      sidebarExpanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'
                    } ${
                      item.locked
                        ? 'text-white/25 cursor-not-allowed'
                        : isActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/8'
                    }`}
                    title={!sidebarExpanded ? (item.locked ? `${item.label} — Plan ${PLAN_LABELS[item.requiredPlan || ''] || ''}` : item.label) : undefined}
                  >
                    {isActive && !item.locked && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ backgroundColor: accent }} />
                    )}
                    <Icon size={18} className="shrink-0" />
                    {sidebarExpanded && (
                      <>
                        <span className="ml-3 text-[13px] font-medium truncate">{item.label}</span>
                        {item.locked && (
                          <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/40 uppercase shrink-0">
                            {PLAN_LABELS[item.requiredPlan || ''] || 'PRO'}
                          </span>
                        )}
                      </>
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
              {(userName || 'U')[0]}
            </div>
            {sidebarExpanded && (
              <>
                <div className="ml-3 min-w-0 text-left">
                  <p className="text-[13px] font-medium truncate text-white">{userName}</p>
                  <p className="text-[10px] text-white/50 uppercase">{role}</p>
                </div>
                <ChevronDown size={14} className="ml-auto shrink-0 text-white/40" />
              </>
            )}
          </button>

          {showProfile && (
            <div className={`absolute ${sidebarExpanded ? 'left-0 bottom-full mb-2' : 'left-full bottom-0 ml-2'} w-64 rounded-xl border bg-white shadow-xl z-50`}>
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-bold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">{role}</span>
              </div>
              <div className="py-1">
                <button onClick={() => { setShowProfile(false); navigateTo('/profile'); }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <User size={16} /> Mi Perfil
                </button>
                {(role === 'owner' || role === 'admin') && (
                  <button onClick={() => { setShowProfile(false); navigateTo('/settings'); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings size={16} /> Configuración
                  </button>
                )}
                {role === 'owner' && (
                  <button onClick={() => { setShowProfile(false); navigateTo('/admin'); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Lock size={16} /> Super Admin
                  </button>
                )}
              </div>
              <div className="border-t py-1">
                <button onClick={onLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                  <LogOut size={16} /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
