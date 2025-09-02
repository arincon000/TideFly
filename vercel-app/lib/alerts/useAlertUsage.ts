import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PlanTier } from '../tier/useTier';

export function useAlertUsage(tier: PlanTier) {
  const [used, setUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cap = tier === 'free' ? 2 : 10;
  const atCap = used >= cap;

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { count, error: countError } = await supabase
        .from('alert_rules')
        .select('*', { head: true, count: 'exact' })
        .eq('is_active', true);
      
      if (countError) throw countError;
      
      setUsed(count ?? 0);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching alert usage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [tier]);

  const refresh = () => {
    fetchUsage();
  };

  return { 
    used, 
    cap, 
    atCap, 
    loading, 
    error,
    refresh 
  };
}
