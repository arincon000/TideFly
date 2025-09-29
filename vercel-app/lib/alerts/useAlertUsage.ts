// vercel-app/lib/alerts/useAlertUsage.ts
'use client';

import { useEffect, useState } from 'react';
import { TIER_LIMITS, Tier } from '@/lib/tier/limits';

// ---- SELECT ONE of these imports depending on what exists in the repo ----
// A) Split client file pattern:
let getClient: () => any;
try {
  // @ts-ignore - dynamic require to prefer the modern path
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@/lib/supabase/client');
  const supabase = mod.supabase ?? mod.default ?? mod;
  getClient = () => supabase;
} catch {
  // B) Legacy single file pattern:
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createBrowserSupabaseClient } = require('@/lib/supabaseClient');
  let cached: any;
  getClient = () => (cached ??= createBrowserSupabaseClient());
}
// -------------------------------------------------------------------------

type Usage = {
  created: number;
  active: number;
  createdMax: number;
  activeMax: number;
  atCreateCap: boolean;
  atActiveCap: boolean;
  loading: boolean;
  error?: string;
};

export function useAlertUsage(tier: Tier | undefined | null): Usage {
  const safeTier = tier || 'free';
  
  // Get safe limits with fallback
  const getSafeLimits = (t: string) => {
    try {
      const limits = TIER_LIMITS[t as Tier];
      if (limits && typeof limits === 'object' && typeof limits.createdMax === 'number' && typeof limits.activeMax === 'number') {
        return limits;
      }
    } catch (error) {
      console.error('getSafeLimits error:', error);
    }
    return { createdMax: 3, activeMax: 1 }; // Free tier fallback
  };
  
  const initialLimits = getSafeLimits(safeTier);
  
  const [state, setState] = useState<Usage>({
    created: 0,
    active: 0,
    createdMax: initialLimits.createdMax,
    activeMax: initialLimits.activeMax,
    atCreateCap: false,
    atActiveCap: false,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    const supabase = getClient();

    async function fetchUsage() {
      // supabase-js v2 supports .schema().from()
      const query = supabase?.schema ? supabase.schema('api').from('v1_usage_me') : supabase.from('v1_usage_me', { schema: 'api' });
      const { data, error } = await query.select('created_count, active_count').single();

      if (!mounted) return;

      if (error) {
        setState(s => ({ ...s, loading: false, error: error.message }));
        return;
      }

      const created = data?.created_count ?? 0;
      const active = data?.active_count ?? 0;
      const safeLimits = getSafeLimits(safeTier);
      const createdMax = safeLimits.createdMax || 3;
      const activeMax = safeLimits.activeMax || 1;

      setState({
        created,
        active,
        createdMax,
        activeMax,
        atCreateCap: created >= createdMax,
        atActiveCap: active >= activeMax,
        loading: false,
      });
    }

    fetchUsage();
    return () => { mounted = false; };
  }, [safeTier]);

  return state;
}