'use client';

import { useTier } from '@/lib/tier/useTier';
import { getTierLimits } from '@/lib/tier/limits';
import { useAlertUsage } from '@/lib/alerts/useAlertUsage';

export default function UsageBanner() {
  const { tier } = useTier();
  const { createdMax, activeMax } = getTierLimits(tier);
  const { created, active, loading, error } = useAlertUsage(tier);

  if (loading || error) return null;

  return (
    <div className="rounded-2xl border p-3 text-sm">
      <span className="font-medium">
        Active {active}/{activeMax} • Created {created}/{createdMax}
      </span>
    </div>
  );
}
