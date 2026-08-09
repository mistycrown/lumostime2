/**
 * @file statLogUtils.test.ts
 * @input Minimal timeline log-like objects
 * @output Regression coverage for planned-log statistics filtering
 * @description Verifies the shared rule used by statistics and summaries.
 * @updated 2026-08-09: Added planned-log filtering regression coverage.
 */
import { describe, expect, it } from 'vitest';
import { filterCountableLogs, isCountableLog } from './statLogUtils';

describe('statLogUtils', () => {
  it('excludes only logs explicitly marked as planned', () => {
    const plannedLog = { id: 'planned', isPlanned: true };
    const regularLog = { id: 'regular', isPlanned: false };
    const legacyLog = { id: 'legacy' };

    expect(isCountableLog(plannedLog)).toBe(false);
    expect(isCountableLog(regularLog)).toBe(true);
    expect(isCountableLog(legacyLog)).toBe(true);
    expect(filterCountableLogs([plannedLog, regularLog, legacyLog])).toEqual([regularLog, legacyLog]);
  });

  it('does not mutate the source log array', () => {
    const logs = [
      { id: 'planned', isPlanned: true },
      { id: 'regular', isPlanned: false }
    ];

    expect(filterCountableLogs(logs)).not.toBe(logs);
    expect(logs).toHaveLength(2);
  });
});
