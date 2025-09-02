import { useEffect, useState } from 'react';
import { api } from '../supabaseClient';
import { normalizeTier, type Tier } from './normalizeTier';

export type PlanTier = Tier;

export type TierMe = {
  id: string;
  email: string | null;
  home_airport: string | null;
  plan_tier: PlanTier;
  plan_expires_at: string | null;
  created_at: string;
};

export function useTier() {
  const [data, setData] = useState<TierMe | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTier = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: tierData, error: tierError } = await api()
        .from('v_tier_me')
        .select('*')
        .single();
      
      if (tierError) throw tierError;
      
      setData(tierData);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching tier:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTier();
  }, []);

  const refresh = () => {
    fetchTier();
  };

  return { 
    tier: normalizeTier(data?.plan_tier), 
    me: data, 
    loading, 
    error,
    refresh 
  };
}
