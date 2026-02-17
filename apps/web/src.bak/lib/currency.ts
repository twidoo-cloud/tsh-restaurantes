/**
 * Formats currency based on tenant settings.
 * Reads from localStorage tenant data.
 */
export function getCurrencySymbol(): string {
  if (typeof window === 'undefined') return '$';
  try {
    const tenant = JSON.parse(localStorage.getItem('pos_tenant') || '{}');
    return tenant.settings?.currency_symbol || (tenant.currencyCode === 'PEN' ? 'S/' : '$');
  } catch { return '$'; }
}

export function getTaxName(): string {
  if (typeof window === 'undefined') return 'IVA';
  try {
    const tenant = JSON.parse(localStorage.getItem('pos_tenant') || '{}');
    return tenant.settings?.tax_name || 'IVA';
  } catch { return 'IVA'; }
}

export function getTaxRate(): number {
  if (typeof window === 'undefined') return 0.15;
  try {
    const tenant = JSON.parse(localStorage.getItem('pos_tenant') || '{}');
    return tenant.settings?.tax_rate || 0.15;
  } catch { return 0.15; }
}

export function formatMoney(amount: number): string {
  return `${getCurrencySymbol()} ${amount.toFixed(2)}`;
}

export function getCurrencyCode(): string {
  if (typeof window === 'undefined') return 'USD';
  try {
    const tenant = JSON.parse(localStorage.getItem('pos_tenant') || '{}');
    return tenant.currencyCode || 'USD';
  } catch { return 'USD'; }
}
