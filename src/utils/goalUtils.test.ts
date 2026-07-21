/**
 * @file goalUtils.test.ts
 * @input Goal date range keys
 * @output Regression coverage for inclusive local-calendar goal boundaries
 * @pos Test (goal utilities)
 * @description Verifies that goal ranges include the full local start and end dates.
 * @updated 2026-07-21: Added inclusive local-day boundary coverage.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import { describe, expect, test } from 'vitest';
import { getGoalDateRange } from './goalUtils';

describe('getGoalDateRange', () => {
  test('includes the full local start and end dates', () => {
    const { start, end } = getGoalDateRange('2026-07-21', '2026-07-25');

    expect(start).toBe(new Date(2026, 6, 21, 0, 0, 0, 0).getTime());
    expect(end).toBe(new Date(2026, 6, 25, 23, 59, 59, 999).getTime());
    expect(start).toBeLessThanOrEqual(new Date(2026, 6, 21, 0, 0, 0, 0).getTime());
    expect(end).toBeGreaterThanOrEqual(new Date(2026, 6, 25, 23, 59, 59, 999).getTime());
  });
});