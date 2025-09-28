'use client';

import { useMemo } from 'react';
import type { Tier } from '@/lib/tier/limits';

/**
 * Day bitmask uses 0=Sun,1=Mon,...,6=Sat
 */
const DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as const;

const maskBit = (d: number) => (1 << d);
const MASK_ALL_DAYS = Object.values(DAY).reduce((m, d) => m | maskBit(d), 0); // 127
const MASK_WEEKENDS = maskBit(DAY.Sun) | maskBit(DAY.Sat);                      // 65

export type DaysPrefId = 'all' | 'weekends';
export interface DaysPref {
  id: DaysPrefId;
  label: string;
  mask: number; // 7-bit mask, 0=Sun...6=Sat
}

/** Public days-preference options used by the form */
export const DAYS_PREFS: Record<DaysPrefId, DaysPref> = {
  all: { id: 'all', label: 'All days', mask: MASK_ALL_DAYS },
  weekends: { id: 'weekends', label: 'Weekends only', mask: MASK_WEEKENDS },
};

export type WindowValue = 5 | 10 | 16;
export interface WindowCategory {
  id: 'hc' | 'sw' | 'lw';
  label: string;
  subtitle: string; // e.g., "0–5 days"
  value: WindowValue; // stored in alert_rules.forecast_window
  fromDay: number; // inclusive
  toDay: number;   // inclusive
  proOnly?: boolean;
}

/** Canonical list (matches current UI copy) */
const ALL_WINDOWS: WindowCategory[] = [
  { id: 'hc', label: 'High Confidence', subtitle: '0–5 days',  value: 5,  fromDay: 0,  toDay: 5,  proOnly: false },
  { id: 'sw', label: 'Swell Watch',     subtitle: '6–10 days', value: 10, fromDay: 6,  toDay: 10, proOnly: true  },
  { id: 'lw', label: 'Long Watch',      subtitle: '11–16 days',value: 16, fromDay: 11, toDay: 16, proOnly: true  },
];

/** Get allowed windows for a given tier (Free → only 5; Pro/Unlimited → all) */
export function getWindowCategories(tier: Tier): WindowCategory[] {
  const isFree = tier === 'free';
  return isFree ? ALL_WINDOWS.filter(w => !w.proOnly) : ALL_WINDOWS;
}

/** Default selection (keeps your UI behavior: High Confidence) */
export function getDefaultWindowValue(_tier: Tier): WindowValue {
  return 5;
}

/** React hook wrapper used by the /alerts/new page */
export function useWindowCategories(tier: Tier): {
  options: WindowCategory[];
  defaultValue: WindowValue;
} {
  const options = useMemo(() => getWindowCategories(tier), [tier]);
  const defaultValue = useMemo(() => getDefaultWindowValue(tier), [tier]);
  return { options, defaultValue };
}

/** Utilities if you need them in the form logic */
export const daysMask = {
  all: MASK_ALL_DAYS,
  weekends: MASK_WEEKENDS,
};
