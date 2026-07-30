/**
 * @file TimelineReviewStack.test.ts
 * @input Timeline review entry labels
 * @output Regression coverage for compact sidebar review labels
 * @pos Test
 * @updated 2026-07-30: Covers compact daily, weekly, and monthly review labels.
 */
import { describe, expect, test } from 'vitest';
import { TIMELINE_REVIEW_TITLES } from './TimelineReviewStack';

describe('TIMELINE_REVIEW_TITLES', () => {
  test('uses compact labels without repeating the review suffix', () => {
    expect(TIMELINE_REVIEW_TITLES).toEqual({
      daily: '每日回顾',
      weekly: '本周',
      monthly: '本月'
    });
  });
});
