export type Tier = 'free' | 'pro';
export const TIER_LIMITS: Record<Tier, { createdMax: number; activeMax: number }> = {
  free: { createdMax: 3, activeMax: 1 },
  pro:  { createdMax: 10, activeMax: 5 },
};
export const getTierLimits = (tier: Tier) => TIER_LIMITS[tier];
