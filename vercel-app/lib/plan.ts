export type Plan = 'free' | 'premium';
export function getUserPlan(session: any): Plan {
  const p = session?.user?.user_metadata?.plan as string | undefined;
  return p === 'premium' ? 'premium' : 'free';
}
