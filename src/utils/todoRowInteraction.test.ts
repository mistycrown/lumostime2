/**
 * @file todoRowInteraction.test.ts
 * @input Todo row gesture helpers
 * @output Regression coverage for tap-vs-swipe classification in the todo list
 * @pos Test
 * @description Verifies that small drifts still open quick actions while diagonal scrolling no longer triggers accidental completion toggles.
 * @updated 2026-05-05: Added coverage for completed-row left-swipe undo while keeping right-swipe detail and deeper duplicate pulls.
 * @updated 2026-05-05: Added coverage for the no-op tap dead zone and for directional quick-toggle swipes.
 * @updated 2026-05-05: Added regression tests for swallowed taps and scroll-locked diagonal gestures.
 */

import { describe, expect, test } from 'vitest';
import { getTodoRowGestureIntent, getTodoRowReleaseAction } from './todoRowInteraction';

describe('todoRowInteraction', () => {
  test('keeps light pointer drift inside the tap path', () => {
    expect(getTodoRowReleaseAction({
      diffX: 12,
      diffY: 13,
      canQuickToggle: true,
      gestureIntent: 'pending',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('openQuickActions');
  });

  test('treats ambiguous light drifts outside the old distance gap as taps', () => {
    expect(getTodoRowReleaseAction({
      diffX: 19,
      diffY: 11,
      canQuickToggle: true,
      gestureIntent: 'pending',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('openQuickActions');
  });

  test('locks clear vertical movement into scroll mode', () => {
    expect(getTodoRowGestureIntent({
      diffX: -6,
      diffY: 22,
      canQuickToggle: true
    })).toBe('scroll');
  });

  test('keeps scroll-locked short drags from opening quick actions', () => {
    expect(getTodoRowReleaseAction({
      diffX: 4,
      diffY: 16,
      canQuickToggle: true,
      gestureIntent: 'scroll',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('none');
  });

  test('keeps a scroll-locked diagonal release from toggling completion', () => {
    expect(getTodoRowReleaseAction({
      diffX: -120,
      diffY: 110,
      canQuickToggle: true,
      gestureIntent: 'scroll',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('none');
  });

  test('does not allow release-only drift to trigger swipe actions before swipe intent is established', () => {
    expect(getTodoRowReleaseAction({
      diffX: -140,
      diffY: 4,
      canQuickToggle: true,
      gestureIntent: 'pending',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('none');
  });

  test('preserves deliberate right-swipe shortcuts', () => {
    expect(getTodoRowReleaseAction({
      diffX: 44,
      diffY: 10,
      canQuickToggle: true,
      quickToggleDirection: 'left',
      gestureIntent: 'swipe',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('openDetail');

    expect(getTodoRowReleaseAction({
      diffX: 118,
      diffY: 12,
      canQuickToggle: true,
      quickToggleDirection: 'left',
      gestureIntent: 'swipe',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('duplicate');
  });

  test('preserves deliberate left-swipe completion for incomplete todos', () => {
    expect(getTodoRowReleaseAction({
      diffX: -118,
      diffY: 8,
      canQuickToggle: true,
      quickToggleDirection: 'left',
      gestureIntent: 'swipe',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('toggleComplete');
  });

  test('keeps completed-row right swipe on detail/duplicate and restores left-swipe undo', () => {
    expect(getTodoRowReleaseAction({
      diffX: 44,
      diffY: 8,
      canQuickToggle: true,
      quickToggleDirection: 'left',
      gestureIntent: 'swipe',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('openDetail');

    expect(getTodoRowReleaseAction({
      diffX: 118,
      diffY: 8,
      canQuickToggle: true,
      quickToggleDirection: 'left',
      gestureIntent: 'swipe',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('duplicate');

    expect(getTodoRowReleaseAction({
      diffX: -118,
      diffY: 8,
      canQuickToggle: true,
      quickToggleDirection: 'left',
      gestureIntent: 'swipe',
      detailSwipeDistance: 36,
      duplicateSwipeDistance: 100,
      completeSwipeDistance: 100
    })).toBe('toggleComplete');
  });
});
