'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type Tier = 'free' | 'pro' | 'unlimited';
type TierState = { tier: Tier; loading: boolean; error?: string | null };

export function useTier(): TierState {
  const [state, setState] = useState<TierState>({ tier: 'free', loading: true, error: null });

  useEffect(() => {
    const sb = supabase;
    let cancelled = false;

    (async () => {
      const { data, error } = await sb.schema('api').from('v_tier_me').select('*').single();
      if (cancelled) return;
      if (error) return setState({ tier: 'free', loading: false, error: error.message });
      const tier = (data?.tier as Tier) ?? 'free';
      // Ensure tier is always a valid value
      const safeTier = tier && ['free', 'pro', 'unlimited'].includes(tier) ? tier : 'free';
      setState({ tier: safeTier, loading: false, error: null });
    })();

    return () => { cancelled = true; };
  }, []);

  // Always return a valid tier, even during loading
  return {
    tier: state.tier || 'free', // Ensure tier is never undefined
    loading: state.loading,
    error: state.error
  };
}
