import { describe, expect, it } from 'vitest';
import { getLogDurationSeconds, getNormalizedScopeIds, summarizeScopeDurations } from './scopeStatsUtils';

describe('scopeStatsUtils', () => {
  it('counts full duration for every linked scope', () => {
    const summary = summarizeScopeDurations([
      {
        duration: 40 * 60,
        startTime: 0,
        endTime: 40 * 60 * 1000,
        scopeIds: ['scope-a', 'scope-b']
      }
    ]);

    expect(summary.totalAttributedDuration).toBe(80 * 60);
    expect(summary.scopeDurations.get('scope-a')).toBe(40 * 60);
    expect(summary.scopeDurations.get('scope-b')).toBe(40 * 60);
  });

  it('deduplicates repeated scope ids inside one log', () => {
    const summary = summarizeScopeDurations([
      {
        duration: 15 * 60,
        startTime: 0,
        endTime: 15 * 60 * 1000,
        scopeIds: ['scope-a', 'scope-a', 'scope-b']
      }
    ]);

    expect(summary.totalAttributedDuration).toBe(30 * 60);
    expect(summary.scopeDurations.get('scope-a')).toBe(15 * 60);
    expect(summary.scopeDurations.get('scope-b')).toBe(15 * 60);
  });

  it('falls back to timestamps when duration is unavailable', () => {
    expect(
      getLogDurationSeconds({
        duration: Number.NaN,
        startTime: 1_000,
        endTime: 31_000
      })
    ).toBe(30);
  });

  it('normalizes missing and duplicated scope ids', () => {
    expect(getNormalizedScopeIds(undefined)).toEqual([]);
    expect(getNormalizedScopeIds(['scope-a', '', 'scope-a', 'scope-b'])).toEqual(['scope-a', 'scope-b']);
  });
});
