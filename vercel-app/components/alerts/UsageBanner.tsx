import { PlanTier } from '@/lib/tier/useTier';

interface UsageBannerProps {
  tier: PlanTier;
  used: number;
  cap: number;
  atCap: boolean;
}

export default function UsageBanner({ tier, used, cap, atCap }: UsageBannerProps) {
  if (tier === 'pro') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{used}</span> of {cap} alerts used
          </div>
          <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            PRO
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${
      atCap 
        ? 'border-amber-200 bg-amber-50' 
        : 'border-slate-200 bg-white'
    }`}>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          {atCap ? (
            <span className="text-amber-800">
              You're using {used}/{cap} alerts on Free. Upgrade to create more.
            </span>
          ) : (
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900">{used}</span> of {cap} alerts used
            </span>
          )}
        </div>
        
        {atCap && (
          <a
            href="/upgrade"
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors duration-200"
          >
            Upgrade to Pro
          </a>
        )}
      </div>
    </div>
  );
}
