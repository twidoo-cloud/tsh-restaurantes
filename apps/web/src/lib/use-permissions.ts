'use client';

import { useMemo } from 'react';
import { usePosStore } from '@/store/pos-store';

/**
 * Plan → Module mapping.
 * Each plan includes all modules from lower plans + its own.
 * Routes map to module keys.
 */
const PLAN_MODULES: Record<string, string[]> = {
  basic: [
    'pos', 'tables', 'kitchen', 'shifts', 'products', 'inventory',
    'customers', 'dashboard', 'staff', 'settings', 'roles', 'profile',
    'waiter', 'audit',
  ],
  standard: [
    'invoices', 'reports', 'recipes', 'suppliers', 'sri',
    'promotions', 'credit', 'delivery',
  ],
  premium: [
    'loyalty', 'reservations', 'qr-menu',
  ],
  enterprise: [
    'admin', // tenant management
  ],
};

/** Get all modules available for a given plan */
function getModulesForPlan(plan: string): Set<string> {
  // Trial gets premium access (all modules except enterprise admin)
  if (plan === 'trial') return getModulesForPlan('premium');

  const tiers = ['basic', 'standard', 'premium', 'enterprise'];
  const planIndex = tiers.indexOf(plan);
  if (planIndex === -1) return new Set(PLAN_MODULES.basic);
  const modules = new Set<string>();
  for (let i = 0; i <= planIndex; i++) {
    PLAN_MODULES[tiers[i]]?.forEach(m => modules.add(m));
  }
  return modules;
}

/** Map a route path to its module key */
function routeToModule(path: string): string {
  const clean = path.replace(/^\//, '').split('/')[0].split('?')[0];
  return clean || 'pos';
}

/** Human-readable plan required for a module */
export function getPlanForModule(mod: string): string | null {
  if (PLAN_MODULES.basic.includes(mod)) return null; // included in all
  if (PLAN_MODULES.standard.includes(mod)) return 'standard';
  if (PLAN_MODULES.premium.includes(mod)) return 'premium';
  if (PLAN_MODULES.enterprise.includes(mod)) return 'enterprise';
  return null;
}

export const PLAN_LABELS: Record<string, string> = {
  basic: 'Básico', standard: 'Estándar', premium: 'Premium', enterprise: 'Enterprise',
};

/**
 * Role-based access configuration.
 */
export const ROLE_ACCESS: Record<string, string[]> = {
  '/pos':          ['owner', 'admin', 'cashier', 'waiter'],
  '/tables':       ['owner', 'admin', 'cashier', 'waiter'],
  '/kitchen':      ['owner', 'admin', 'kitchen'],
  '/dashboard':    ['owner', 'admin'],
  '/inventory':    ['owner', 'admin'],
  '/products':     ['owner', 'admin'],
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
  '/admin':        ['owner'],
  '/roles':        ['owner', 'admin'],
  '/profile':      ['owner', 'admin', 'cashier', 'waiter', 'kitchen'],

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

export const NAV_ITEMS = [
  { path: '/tables',       label: 'Mesas',        icon: 'Utensils',    roles: ['owner', 'admin', 'cashier', 'waiter'], module: 'tables' },
  { path: '/kitchen',      label: 'Cocina',       icon: 'ChefHat',     roles: ['owner', 'admin', 'kitchen'], module: 'kitchen' },
  { path: '/shifts',       label: 'Caja',         icon: 'CreditCard',  roles: ['owner', 'admin', 'cashier'], module: 'shifts' },
  { path: '/dashboard',    label: 'Dashboard',    icon: 'BarChart3',   roles: ['owner', 'admin'], module: 'dashboard' },
  { path: '/inventory',    label: 'Inventario',   icon: 'Package',     roles: ['owner', 'admin'], module: 'inventory' },
  { path: '/products',     label: 'Productos',    icon: 'Tag',         roles: ['owner', 'admin'], module: 'products' },
  { path: '/customers',    label: 'Clientes',     icon: 'User',        roles: ['owner', 'admin', 'cashier'], module: 'customers' },
  { path: '/invoices',     label: 'Facturas',     icon: 'FileText',    roles: ['owner', 'admin', 'cashier'], module: 'invoices' },
  { path: '/reports',      label: 'Reportes',     icon: 'BarChart3',   roles: ['owner', 'admin'], module: 'reports' },
  { path: '/promotions',   label: 'Promos',       icon: 'Tag',         roles: ['owner', 'admin'], module: 'promotions' },
  { path: '/reservations', label: 'Reservas',     icon: 'Calendar',    roles: ['owner', 'admin', 'cashier'], module: 'reservations' },
  { path: '/delivery',     label: 'Delivery',     icon: 'Truck',       roles: ['owner', 'admin', 'cashier'], module: 'delivery' },
  { path: '/loyalty',      label: 'Fidelidad',    icon: 'Star',        roles: ['owner', 'admin'], module: 'loyalty' },
  { path: '/staff',        label: 'Personal',     icon: 'Users',       roles: ['owner', 'admin'], module: 'staff' },
  { path: '/recipes',      label: 'Recetas',      icon: 'ChefHat',     roles: ['owner', 'admin'], module: 'recipes' },
  { path: '/suppliers',    label: 'Proveedores',  icon: 'Truck',       roles: ['owner', 'admin'], module: 'suppliers' },
  { path: '/sri',          label: 'SRI',          icon: 'Zap',         roles: ['owner', 'admin'], module: 'sri' },
  { path: '/qr-menu',     label: 'QR Menú',      icon: 'QrCode',      roles: ['owner', 'admin'], module: 'qr-menu' },
  { path: '/roles',        label: 'Roles',        icon: 'Users',       roles: ['owner', 'admin'], module: 'roles' },
  { path: '/admin',        label: 'Tenants',      icon: 'Settings',    roles: ['owner'], module: 'admin' },
];

/**
 * Hook to check user permissions, role access, and plan restrictions.
 */
export function usePermissions() {
  const user = usePosStore((s) => s.user);
  const tenant = usePosStore((s) => s.tenant);

  const role = useMemo(() => user?.role || 'waiter', [user]);
  const permissions: string[] = useMemo(() => {
    const p = user?.permissions;
    if (Array.isArray(p)) return p;
    return [];
  }, [user]);
  const isOwner = role === 'owner';

  const plan = useMemo(() => {
    const p = tenant?.subscriptionPlan || tenant?.subscription_plan || 'basic';
    const status = tenant?.subscriptionStatus || tenant?.subscription_status || 'active';
    // If trial expired, treat as basic
    if (status === 'trial' && tenant?.trialExpired) return 'basic';
    if (status === 'trial') return 'trial';
    return p;
  }, [tenant]);
  const planModules = useMemo(() => getModulesForPlan(plan), [plan]);

  const isTrial = plan === 'trial';
  const trialDaysRemaining = tenant?.trialDaysRemaining ?? tenant?.trial_days_remaining ?? null;
  const trialExpired = tenant?.trialExpired ?? tenant?.trial_expired ?? false;

  /** Check if a module is available in the current plan */
  const isModuleEnabled = (mod: string): boolean => planModules.has(mod);

  /** Check if user has access to a route or action (role + plan) */
  const hasAccess = (key: string): boolean => {
    if (isOwner) return true;
    if (permissions.includes('*')) return true;

    // Plan check for routes
    if (key.startsWith('/')) {
      const mod = routeToModule(key);
      if (!planModules.has(mod)) return false;
    }

    if (permissions.includes(key)) return true;
    const [module] = key.split('.');
    if (permissions.includes(`${module}.*`)) return true;

    const allowedRoles = ROLE_ACCESS[key];
    if (allowedRoles) return allowedRoles.includes(role);

    return false;
  };

  /** Get navigation items visible to this user (role + plan filtered) */
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      // Plan check
      if (!isOwner && item.module && !planModules.has(item.module)) return false;
      // Role check
      if (isOwner) return true;
      return item.roles.includes(role);
    });
  }, [role, isOwner, planModules]);

  /** Get nav items blocked by plan (for upgrade prompts) */
  const blockedByPlan = useMemo(() => {
    if (isOwner) return [];
    return NAV_ITEMS.filter(item => item.module && !planModules.has(item.module) && item.roles.includes(role));
  }, [role, isOwner, planModules]);

  return {
    role,
    permissions,
    isOwner,
    plan,
    isTrial,
    trialDaysRemaining,
    trialExpired,
    hasAccess,
    isModuleEnabled,
    visibleNavItems,
    blockedByPlan,
    user,
    tenant,
    PLAN_MODULES,
  };
}
