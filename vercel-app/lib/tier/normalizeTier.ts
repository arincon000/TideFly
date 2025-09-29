export type Tier = 'free' | 'pro' | 'unlimited';

export function normalizeTier(input?: string | null): Tier {
  if (!input || typeof input !== 'string') return 'free';
  const t = input.toLowerCase();
  if (t === 'premium') return 'pro'; // legacy safety
  if (t === 'unlimited') return 'unlimited';
  return t === 'pro' ? 'pro' : 'free';
}
