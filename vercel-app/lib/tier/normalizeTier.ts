export type Tier = 'free' | 'pro';

export function normalizeTier(input?: string | null): Tier {
  if (!input) return 'free';
  const t = input.toLowerCase();
  if (t === 'premium') return 'pro'; // legacy safety
  return t === 'pro' ? 'pro' : 'free';
}
