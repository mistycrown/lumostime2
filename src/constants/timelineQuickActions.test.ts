/**
 * @file timelineQuickActions.test.ts
 * @input Shared timeline quick-action definitions and defaults
 * @output Regression coverage for the review-overview shortcut registration
 * @updated 2026-08-26: Added coverage for the optional review-overview action.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TIMELINE_QUICK_ACTIONS,
  TIMELINE_QUICK_ACTION_OPTIONS,
  normalizeTimelineQuickActions
} from './timelineQuickActions';

describe('timeline quick actions', () => {
  it('registers review overview as an optional action without pinning it by default', () => {
    expect(TIMELINE_QUICK_ACTION_OPTIONS.some((option) => option.key === 'review_overview')).toBe(true);
    expect(DEFAULT_TIMELINE_QUICK_ACTIONS).not.toContain('review_overview');
    expect(normalizeTimelineQuickActions(['review_overview'])).toEqual(['review_overview']);
  });
});
