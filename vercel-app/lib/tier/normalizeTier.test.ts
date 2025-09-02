import { normalizeTier } from './normalizeTier';

describe('normalizeTier', () => {
  test('maps premium→pro and defaults correctly', () => {
    expect(normalizeTier('premium')).toBe('pro');
    expect(normalizeTier('Pro')).toBe('pro');
    expect(normalizeTier('free')).toBe('free');
    expect(normalizeTier(undefined)).toBe('free');
    expect(normalizeTier('weird')).toBe('free');
    expect(normalizeTier(null)).toBe('free');
    expect(normalizeTier('')).toBe('free');
  });
});
