'use client';

interface TrialBannerProps {
  tenant: any;
}

export function TrialBanner({ tenant }: TrialBannerProps) {
  if (!tenant || tenant.subscriptionStatus !== 'trial' || tenant.trialExpired || tenant.trialDaysRemaining == null) {
    return null;
  }

  return (
    <div className="shrink-0 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1.5 text-white text-xs">
      <span>
        🎉 Período de prueba — <strong>{tenant.trialDaysRemaining} día{tenant.trialDaysRemaining !== 1 ? 's' : ''}</strong> restante{tenant.trialDaysRemaining !== 1 ? 's' : ''}
        {' '}con acceso Premium
      </span>
      <a href="/settings?tab=business" className="rounded bg-white/20 px-2.5 py-0.5 text-[10px] font-bold hover:bg-white/30 transition">
        Ver planes
      </a>
    </div>
  );
}
