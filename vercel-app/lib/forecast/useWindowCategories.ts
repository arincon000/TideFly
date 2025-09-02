import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export type WindowCategory = {
  key: string;
  label: string;
  range: [number, number];
  freeAllowed: boolean;
  value: number;
};

export function useWindowCategories() {
  const [categories, setCategories] = useState<WindowCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('forecast_window_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      const mappedCategories: WindowCategory[] = (data || []).map(row => {
        const key = row.category;
        let label = '';
        let freeAllowed = false;
        
        if (key === 'confident') {
          label = 'High Confidence';
          freeAllowed = true;
        } else if (key === 'swell') {
          label = 'Swell Watch';
          freeAllowed = false;
        } else if (key === 'long') {
          label = 'Long Watch';
          freeAllowed = false;
        }
        
        return {
          key,
          label,
          range: [row.days_min, row.days_max],
          freeAllowed,
          value: row.days_max
        };
      });
      
      setCategories(mappedCategories);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching forecast window categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const refresh = () => {
    fetchCategories();
  };

  return { 
    categories, 
    loading, 
    error,
    refresh 
  };
}
