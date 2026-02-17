'use client';

import { create } from 'zustand';
import { useEffect } from 'react';

// ─── BRANDING TYPES ───

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  sidebarTextColor: string;
  accentColor: string;
  logoUrl: string | null;
  logoWidth: number;
  faviconUrl: string | null;
  appName: string;
  loginSubtitle: string;
  footerText: string;
  showPoweredBy: boolean;
  customCss: string | null;
}

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#1e3a8a',
  secondaryColor: '#0ea5e9',
  sidebarColor: '#1e293b',
  sidebarTextColor: '#ffffff',
  accentColor: '#2563eb',
  logoUrl: null,
  logoWidth: 120,
  faviconUrl: null,
  appName: 'POS SaaS',
  loginSubtitle: '',
  footerText: '',
  showPoweredBy: true,
  customCss: null,
};

// ─── THEME STORE ───

interface ThemeState {
  branding: BrandingConfig;
  tenantName: string;
  isLoaded: boolean;
  setBranding: (branding: Partial<BrandingConfig>) => void;
  setTenantName: (name: string) => void;
  loadFromTenant: (tenantData: any) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  branding: DEFAULT_BRANDING,
  tenantName: 'POS SaaS',
  isLoaded: false,
  setBranding: (branding) => set((s) => ({ branding: { ...s.branding, ...branding } })),
  setTenantName: (name) => set({ tenantName: name }),
  loadFromTenant: (tenantData) => {
    if (!tenantData) return;
    const branding = tenantData.branding || {};
    set({
      branding: { ...DEFAULT_BRANDING, appName: tenantData.name || 'POS SaaS', ...branding },
      tenantName: tenantData.name || 'POS SaaS',
      isLoaded: true,
    });
  },
}));

// ─── APPLY CSS VARIABLES ───

function applyCssVariables(branding: BrandingConfig) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', branding.primaryColor);
  root.style.setProperty('--color-secondary', branding.secondaryColor);
  root.style.setProperty('--color-sidebar', branding.sidebarColor);
  root.style.setProperty('--color-sidebar-text', branding.sidebarTextColor);
  root.style.setProperty('--color-accent', branding.accentColor);
  root.style.setProperty('--logo-width', `${branding.logoWidth}px`);

  // Update favicon dynamically
  if (branding.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.faviconUrl;
  }

  // Apply custom CSS
  let customStyle = document.getElementById('tenant-custom-css');
  if (branding.customCss) {
    if (!customStyle) {
      customStyle = document.createElement('style');
      customStyle.id = 'tenant-custom-css';
      document.head.appendChild(customStyle);
    }
    customStyle.textContent = branding.customCss;
  } else if (customStyle) {
    customStyle.remove();
  }
}

// ─── THEME PROVIDER HOOK ───

export function useThemeProvider() {
  const { branding } = useThemeStore();

  useEffect(() => {
    applyCssVariables(branding);
  }, [branding]);
}

// ─── LOAD BRANDING ON LOGIN ───

export function useLoadBranding() {
  const { loadFromTenant, isLoaded } = useThemeStore();

  useEffect(() => {
    if (isLoaded) return;
    // Try to load from cached tenant data
    if (typeof window === 'undefined') return;
    try {
      const tenantRaw = localStorage.getItem('pos_tenant');
      if (tenantRaw) {
        const tenant = JSON.parse(tenantRaw);
        loadFromTenant(tenant);
      }
    } catch { /* ignore */ }
  }, [isLoaded]);

  const refreshBranding = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      if (!token) return;
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/tenants/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        loadFromTenant(data);
        // Cache for offline/fast reload
        localStorage.setItem('pos_tenant_branding', JSON.stringify(data.branding));
      }
    } catch { /* ignore */ }
  };

  return { refreshBranding };
}
