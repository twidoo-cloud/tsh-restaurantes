'use client';

import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '@/lib/use-theme';
import { PLAN_LABELS } from '@/lib/use-permissions';
import { getIcon, NAV_ACCENT, BOTTOM_NAV_PRIORITY, type NavSection } from '@/components/app-shell';
import {
  Settings, LogOut, User, Lock, MoreHorizontal,
} from 'lucide-react';

interface MobileBottomNavProps {
  visibleSections: NavSection[];
  pathname: string;
  role: string | null;
  navigateTo: (path: string) => void;
  onLogout: () => void;
}

export function MobileBottomNav({
  visibleSections,
  pathname,
  role,
  navigateTo,
  onLogout,
}: MobileBottomNavProps) {
  const branding = useThemeStore(s => s.branding);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const allVisibleItems = visibleSections.flatMap(s => s.items);

  const bottomPrimary = BOTTOM_NAV_PRIORITY
    .map(p => allVisibleItems.find(i => i.path === p))
    .filter(Boolean) as typeof allVisibleItems;

  const handleNavigate = (path: string) => {
    setShowMoreMenu(false);
    navigateTo(path);
  };

  return (
    <nav className="lg:hidden flex items-center justify-around border-t bg-white shrink-0 safe-area-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {bottomPrimary.map(item => {
        const Icon = getIcon(item.icon);
        const isActive = pathname === item.path || (item.path !== '/pos' && item.path !== '/dashboard' && pathname.startsWith(item.path));
        const accent = NAV_ACCENT[item.path] || branding.accentColor;
        return (
          <button key={item.path} onClick={() => handleNavigate(item.path)}
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
          <div className="absolute bottom-full right-0 mb-2 w-60 rounded-xl border bg-white shadow-xl z-50 max-h-[70vh] overflow-y-auto scrollbar-hide">
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
                    const isLocked = item.locked;
                    return (
                      <button key={item.path} onClick={() => !isLocked && handleNavigate(item.path)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition ${
                          isLocked ? 'text-gray-300 cursor-not-allowed' :
                          isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}>
                        <Icon size={18} /> {item.label}
                        {isLocked && <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[8px] font-bold text-gray-400 uppercase">{PLAN_LABELS[item.requiredPlan || ''] || 'PRO'}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            <div className="border-t py-1">
              <button onClick={() => handleNavigate('/profile')}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <User size={18} /> Mi Perfil
              </button>
              {(role === 'owner' || role === 'admin') && (
                <button onClick={() => handleNavigate('/settings')}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings size={18} /> Configuración
                </button>
              )}
              {role === 'owner' && (
                <button onClick={() => handleNavigate('/admin')}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <Lock size={18} /> Super Admin
                </button>
              )}
              <button onClick={onLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut size={18} /> Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
