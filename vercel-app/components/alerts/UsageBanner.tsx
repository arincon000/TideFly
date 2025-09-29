'use client';

import { useTier } from '@/lib/tier/useTier';
import { getTierLimits } from '@/lib/tier/limits';
import { useAlertUsage } from '@/lib/alerts/useAlertUsage';

export default function UsageBanner() {
  const { tier, loading: tierLoading, error: tierError } = useTier();
  const { created, active, loading, error } = useAlertUsage(tier);

  // Handle loading or invalid tier
  if (tierLoading || tierError) return null;
  
  if (loading || error) return null;

  // Only call getTierLimits after we know tier is valid, with additional safety
  const tierLimits = getTierLimits(tier || 'free');
  const createdMax = tierLimits?.createdMax || 3;
  const activeMax = tierLimits?.activeMax || 1;

  return (
    <div className="rounded-2xl border p-3 text-sm">
      <span className="font-medium">
        Active {active}/{activeMax} • Created {created}/{createdMax}
      </span>
    </div>
  );
}
