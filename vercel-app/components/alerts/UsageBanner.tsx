'use client';

import { useTier } from '@/lib/tier/useTier'; // should return 'free' | 'pro'
import { useAlertUsage } from '@/lib/alerts/useAlertUsage';

export default function UsageBanner() {
  const { tier } = useTier();
  const { created, active, createdMax, activeMax, loading, error } = useAlertUsage(tier);

  if (loading || error) return null;

  return (
    <div className="rounded-2xl border p-3 text-sm">
      <span className="font-medium">
        Active {active}/{activeMax} • Created {created}/{createdMax}
      </span>
    </div>
  );
}
