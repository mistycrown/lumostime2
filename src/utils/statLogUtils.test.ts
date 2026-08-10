/**
 * @file statLogUtils.test.ts
 * @input Minimal timeline log-like objects
 * @output Regression coverage for planned-log filtering and backfill time inference
 * @description Verifies the shared rule used by statistics, summaries, and backfill time inference.
 * @updated 2026-08-10: Added backfill end-time regression coverage for planned timeline blocks.
 * @updated 2026-08-09: Added planned-log filtering regression coverage.
 */
import { describe, expect, it } from 'vitest';
import { filterActualLogs, filterCountableLogs, getLatestActualLogEndTime, getLatestActualLogEndTimeInRange, isActualLog, isCountableLog } from './statLogUtils';

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

  it('uses only actual records when inferring the latest log end time', () => {
    const logs = [
      { id: 'actual-earlier', endTime: 100, isPlanned: false },
      { id: 'plan-latest', endTime: 300, isPlanned: true },
      { id: 'actual-latest', endTime: 200 }
    ];

    expect(isActualLog(logs[0])).toBe(true);
    expect(filterActualLogs(logs)).toEqual([logs[0], logs[2]]);
    expect(getLatestActualLogEndTime(logs)).toBe(200);
  });

  it('returns no inferred end time when all records are planned', () => {
    expect(getLatestActualLogEndTime([
      { id: 'plan-first', endTime: 100, isPlanned: true },
      { id: 'plan-last', endTime: 200, isPlanned: true }
    ])).toBeUndefined();
  });

  it('ignores planned records when finding the latest end time in a day range', () => {
    expect(getLatestActualLogEndTimeInRange([
      { id: 'actual', endTime: 200, isPlanned: false },
      { id: 'planned-latest', endTime: 300, isPlanned: true },
      { id: 'outside', endTime: 500, isPlanned: false }
    ], 100, 400)).toBe(200);
  });
});
