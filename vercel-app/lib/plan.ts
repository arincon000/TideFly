import { normalizeTier, type Tier } from './tier/normalizeTier';

export type Plan = Tier;

export function getUserPlan(session: any): Plan {
  const p = session?.user?.user_metadata?.plan as string | undefined;
  return normalizeTier(p);
}
