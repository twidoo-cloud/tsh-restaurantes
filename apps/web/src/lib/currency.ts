/**
 * Formats currency based on tenant settings.
 * Reads from localStorage tenant data.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', PEN: 'S/', COP: '$', MXN: '$',
  ARS: '$', CLP: '$', BRL: 'R$', BOB: 'Bs', PYG: '₲', UYU: '$U',
  CRC: '₡', GTQ: 'Q', HNL: 'L', NIO: 'C$', PAB: 'B/', DOP: 'RD$',
};

function getTenant(): any {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('pos_tenant') || '{}'); }
  catch { return {}; }
}

export function getCurrencySymbol(): string {
  const tenant = getTenant();
  if (tenant.settings?.currency_symbol) return tenant.settings.currency_symbol;
  const code = tenant.currencyCode || 'USD';
  return CURRENCY_SYMBOLS[code] || '$';
}

export function getTaxName(): string {
  const tenant = getTenant();
  return tenant.settings?.tax_name || 'IVA';
}

export function getTaxRate(): number {
  const tenant = getTenant();
  return tenant.settings?.tax_rate || 0.15;
}

export function formatMoney(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${getCurrencySymbol()} ${n.toFixed(2)}`;
}

export function getCurrencyCode(): string {
  const tenant = getTenant();
  return tenant.currencyCode || 'USD';
}
