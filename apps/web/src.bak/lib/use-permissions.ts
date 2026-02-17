'use client';

import { useMemo } from 'react';
import { usePosStore } from '@/store/pos-store';

/**
 * Role-based access configuration.
 * Maps each route/feature to the roles that can access it.
 */
export const ROLE_ACCESS: Record<string, string[]> = {
  // Pages
  '/pos':          ['owner', 'admin', 'cashier', 'waiter'],
  '/tables':       ['owner', 'admin', 'cashier', 'waiter'],
  '/kitchen':      ['owner', 'admin', 'kitchen'],
  '/dashboard':    ['owner', 'admin'],
  '/inventory':    ['owner', 'admin'],
  '/invoices':     ['owner', 'admin', 'cashier'],
  '/customers':    ['owner', 'admin', 'cashier'],
  '/shifts':       ['owner', 'admin', 'cashier'],
  '/recipes':      ['owner', 'admin'],
  '/suppliers':    ['owner', 'admin'],
  '/sri':          ['owner', 'admin'],
  '/reports':      ['owner', 'admin'],
  '/promotions':   ['owner', 'admin'],
  '/reservations': ['owner', 'admin', 'cashier'],
  '/delivery':     ['owner', 'admin', 'cashier'],
  '/loyalty':      ['owner', 'admin'],
  '/staff':        ['owner', 'admin'],
  '/qr-menu':     ['owner', 'admin'],
  '/settings':     ['owner', 'admin'],

  // Actions
  'orders.create':     ['owner', 'admin', 'cashier', 'waiter'],
  'orders.void':       ['owner', 'admin', 'cashier'],
  'orders.cancel':     ['owner', 'admin'],
  'orders.discount':   ['owner', 'admin'],
  'payments.process':  ['owner', 'admin', 'cashier'],
  'shifts.open':       ['owner', 'admin', 'cashier'],
  'shifts.close':      ['owner', 'admin', 'cashier'],
  'products.edit':     ['owner', 'admin'],
  'inventory.adjust':  ['owner', 'admin'],
  'kitchen.manage':    ['owner', 'admin', 'kitchen'],
};

/**
 * Navigation items with role-based visibility
 */
export const NAV_ITEMS = [
  { path: '/tables',       label: 'Mesas',        icon: 'Utensils',    roles: ['owner', 'admin', 'cashier', 'waiter'] },
  { path: '/kitchen',      label: 'Cocina',       icon: 'ChefHat',     roles: ['owner', 'admin', 'kitchen'] },
  { path: '/shifts',       label: 'Caja',         icon: 'CreditCard',  roles: ['owner', 'admin', 'cashier'] },
  { path: '/dashboard',    label: 'Dashboard',    icon: 'BarChart3',   roles: ['owner', 'admin'] },
  { path: '/inventory',    label: 'Inventario',   icon: 'Package',     roles: ['owner', 'admin'] },
  { path: '/customers',    label: 'Clientes',     icon: 'User',        roles: ['owner', 'admin', 'cashier'] },
  { path: '/invoices',     label: 'Facturas',     icon: 'FileText',    roles: ['owner', 'admin', 'cashier'] },
  { path: '/reports',      label: 'Reportes',     icon: 'BarChart3',   roles: ['owner', 'admin'] },
  { path: '/promotions',   label: 'Promos',       icon: 'Tag',         roles: ['owner', 'admin'] },
  { path: '/reservations', label: 'Reservas',     icon: 'Calendar',    roles: ['owner', 'admin', 'cashier'] },
  { path: '/delivery',     label: 'Delivery',     icon: 'Truck',       roles: ['owner', 'admin', 'cashier'] },
  { path: '/loyalty',      label: 'Fidelidad',    icon: 'Star',        roles: ['owner', 'admin'] },
  { path: '/staff',        label: 'Personal',     icon: 'Users',       roles: ['owner', 'admin'] },
  { path: '/recipes',      label: 'Recetas',      icon: 'ChefHat',     roles: ['owner', 'admin'] },
  { path: '/suppliers',    label: 'Proveedores',  icon: 'Truck',       roles: ['owner', 'admin'] },
  { path: '/sri',          label: 'SRI',          icon: 'Zap',         roles: ['owner', 'admin'] },
  { path: '/qr-menu',     label: 'QR Menú',      icon: 'QrCode',      roles: ['owner', 'admin'] },
];

/**
 * Hook to check user permissions and role access
 */
export function usePermissions() {
  const user = usePosStore((s) => s.user);

  const role = useMemo(() => user?.role || 'waiter', [user]);
  const permissions = useMemo(() => user?.permissions || [], [user]);
  const isOwner = role === 'owner';

  /**
   * Check if user has access to a route or action
   */
  const hasAccess = (key: string): boolean => {
    if (isOwner) return true; // Owner has full access
    if (permissions.includes('*')) return true;

    const allowedRoles = ROLE_ACCESS[key];
    if (allowedRoles) {
      return allowedRoles.includes(role);
    }

    // Check wildcard permissions (e.g., "orders.*" matches "orders.create")
    const [module] = key.split('.');
    if (permissions.includes(`${module}.*`)) return true;
    if (permissions.includes(key)) return true;

    return false;
  };

  /**
   * Get navigation items visible to this user
   */
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      if (isOwner) return true;
      return item.roles.includes(role);
    });
  }, [role, isOwner]);

  return {
    role,
    permissions,
    isOwner,
    hasAccess,
    visibleNavItems,
    user,
  };
}
