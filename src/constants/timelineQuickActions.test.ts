/**
 * @file timelineQuickActions.test.ts
 * @input Shared timeline quick-action definitions and defaults
 * @output Regression coverage for optional timeline shortcut registrations
 * @updated 2026-08-26: Added coverage for the optional review-overview action.
 * @updated 2026-10-07: Covers the node directory shortcut registration.
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

  it('registers the node directory as an optional action without pinning it by default', () => {
    expect(TIMELINE_QUICK_ACTION_OPTIONS.some((option) => option.key === 'nodes')).toBe(true);
    expect(DEFAULT_TIMELINE_QUICK_ACTIONS).not.toContain('nodes');
    expect(normalizeTimelineQuickActions(['nodes'])).toEqual(['nodes']);
  });
});
