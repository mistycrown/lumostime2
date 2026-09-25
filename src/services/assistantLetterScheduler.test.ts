/**
 * @file assistantLetterScheduler.test.ts
 * @input Assistant-letter retry and scheduling configuration
 * @output Regression coverage for bounded failure retries and schedule advancement
 * @pos Test (Assistant Letter Scheduling)
 */

import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_LETTER_MAX_DISPATCH_ATTEMPTS,
  ASSISTANT_LETTER_RETRY_DELAY_MS,
  assistantLetterScheduler
} from './assistantLetterScheduler';

describe('assistantLetterScheduler retry policy', () => {
  const baseConfig = {
    letterFrequencyDays: 2,
    letterWindowStart: '2000',
    letterWindowEnd: '2200',
    lastLetterSentAt: '2026-09-25T12:00:00.000Z'
  };

  it('allows the first attempt and blocks retries during the cooldown', () => {
    const attemptedAt = '2026-09-25T12:00:00.000Z';
    expect(assistantLetterScheduler.isDispatchAllowed({
      letterDispatchAttemptCount: 1,
      lastLetterDispatchAttemptAt: attemptedAt
    }, new Date(attemptedAt))).toBe(false);
    expect(assistantLetterScheduler.isDispatchAllowed({
      letterDispatchAttemptCount: 1,
      lastLetterDispatchAttemptAt: attemptedAt
    }, new Date(Date.parse(attemptedAt) + ASSISTANT_LETTER_RETRY_DELAY_MS))).toBe(true);
  });

  it('advances to a new schedule after the final failed attempt', () => {
    const patch = assistantLetterScheduler.buildFailurePatch({
      ...baseConfig,
      letterDispatchAttemptCount: ASSISTANT_LETTER_MAX_DISPATCH_ATTEMPTS - 1
    }, {
      now: new Date('2026-09-25T12:00:00.000Z'),
      attemptedAt: '2026-09-25T12:00:00.000Z'
    });

    expect(patch.letterDispatchAttemptCount).toBe(0);
    expect(patch.nextLetterAt).toBeTruthy();
    expect(Date.parse(patch.nextLetterAt || '')).toBeGreaterThan(Date.parse('2026-09-25T12:00:00.000Z'));
  });
});
