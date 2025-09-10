// vercel-app/lib/tier/limits.ts
export type Tier = 'free' | 'pro';

export const LIMITS: Record<Tier, { createdMax: number; activeMax: number }> = {
  free: { createdMax: 3, activeMax: 1 },
  pro:  { createdMax: 10, activeMax: 5 },
} as const;
