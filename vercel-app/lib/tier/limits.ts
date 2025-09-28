export type Tier = 'free' | 'pro' | 'unlimited';
export const TIER_LIMITS: Record<Tier, { createdMax: number; activeMax: number }> = {
  free: { createdMax: 3, activeMax: 1 },
  pro:  { createdMax: 10, activeMax: 5 },
  unlimited: { createdMax: 999999, activeMax: 999999 },
};
export const getTierLimits = (tier: Tier) => TIER_LIMITS[tier];
