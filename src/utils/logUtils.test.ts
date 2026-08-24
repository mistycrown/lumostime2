/**
 * @file logUtils.test.ts
 * @input Local timestamps that finish on or after the next midnight
 * @output Regression coverage for same-day log end-time clamping
 * @pos Test (log time utility)
 * @description Verifies newly created records can end at the final millisecond of their start day but never at the following 00:00.
 * @updated 2026-08-24: Added coverage for same-day end-time clamping.
 */

import { describe, expect, it } from 'vitest';
import { clampEndTimeToStartDay, getEndOfStartDay } from './logUtils';

describe('same-day log bounds', () => {
  it('keeps an end time that is already within the start day', () => {
    const startTime = new Date('2026-08-24T12:00:00').getTime();
    const endTime = new Date('2026-08-24T18:00:00').getTime();

    expect(clampEndTimeToStartDay(startTime, endTime)).toBe(endTime);
  });

  it('converts next-day midnight to the final millisecond of the start day', () => {
    const startTime = new Date('2026-08-24T12:00:00').getTime();
    const nextMidnight = new Date('2026-08-25T00:00:00').getTime();
    const endOfDay = getEndOfStartDay(startTime);

    expect(clampEndTimeToStartDay(startTime, nextMidnight)).toBe(endOfDay);
    expect(new Date(endOfDay).getHours()).toBe(23);
    expect(new Date(endOfDay).getMinutes()).toBe(59);
    expect(new Date(endOfDay).getMilliseconds()).toBe(999);
  });
});
