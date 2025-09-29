export type Tier = 'free' | 'pro' | 'unlimited';
export const TIER_LIMITS: Record<Tier, { createdMax: number; activeMax: number }> = {
  free: { createdMax: 3, activeMax: 1 },
  pro:  { createdMax: 10, activeMax: 5 },
  unlimited: { createdMax: 999999, activeMax: 999999 },
};
export const getTierLimits = (tier: Tier | undefined | null) => {
  try {
    // Handle all possible invalid states
    if (!tier || typeof tier !== 'string' || !TIER_LIMITS[tier as Tier]) {
      console.warn('getTierLimits: Invalid tier provided:', tier, 'falling back to free');
      return { createdMax: 3, activeMax: 1 }; // Return free tier limits directly
    }
    
    const limits = TIER_LIMITS[tier as Tier];
    if (!limits || typeof limits !== 'object' || typeof limits.createdMax !== 'number' || typeof limits.activeMax !== 'number') {
      console.warn('getTierLimits: Invalid limits object for tier:', tier, 'falling back to free');
      return { createdMax: 3, activeMax: 1 }; // Return free tier limits directly
    }
    
    return limits;
  } catch (error) {
    console.error('getTierLimits: Unexpected error:', error, 'falling back to free');
    return { createdMax: 3, activeMax: 1 }; // Return free tier limits directly
  }
};
