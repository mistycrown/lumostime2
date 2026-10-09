/**
 * @file useAIBackfillChatViewport.test.ts
 * @input AI chat scroll metrics and keyboard-resize scheduling
 * @output Regression coverage for bottom intent and guarded viewport following
 * @pos Component Support Test (AI Integration)
 * @description Verifies layout-generated scroll events retain bottom intent while manual history scrolling cancels it.
 * @updated 2026-09-30: Added bottom-threshold and keyboard-resize follow regression coverage.
 * @updated 2026-10-09: Covers resize-before-scroll races, content growth, blur-independent following, and history reading.
 */

import { describe, expect, test, vi } from 'vitest';
import {
  AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX,
  getAIChatBottomFollowIntent,
  isAIChatScrollNearBottom,
  queueAIChatViewportResizeScroll
} from './useAIBackfillChatViewport';

const createScrollMetrics = (distanceFromBottom: number) => ({
  clientHeight: 400,
  scrollHeight: 1000,
  scrollTop: 600 - distanceFromBottom
});

describe('isAIChatScrollNearBottom', () => {
  test('includes the default bottom threshold and browser rounding overflow', () => {
    expect(isAIChatScrollNearBottom(createScrollMetrics(0))).toBe(true);
    expect(isAIChatScrollNearBottom(createScrollMetrics(AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX))).toBe(true);
    expect(isAIChatScrollNearBottom(createScrollMetrics(-2))).toBe(true);
  });

  test('does not treat older-message positions as the default layout', () => {
    expect(isAIChatScrollNearBottom(createScrollMetrics(AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX + 1))).toBe(false);
  });

  test('accepts an explicit threshold', () => {
    expect(isAIChatScrollNearBottom(createScrollMetrics(8), 8)).toBe(true);
    expect(isAIChatScrollNearBottom(createScrollMetrics(9), 8)).toBe(false);
  });
});

describe('getAIChatBottomFollowIntent', () => {
  test('preserves bottom intent when the keyboard shrinks the scroller before alignment', () => {
    const before = createScrollMetrics(0);
    const after = { ...before, clientHeight: 160 };

    expect(isAIChatScrollNearBottom(after)).toBe(false);
    expect(getAIChatBottomFollowIntent(before, after, true)).toBe(true);
    expect(getAIChatBottomFollowIntent(before, after, false)).toBe(false);
  });

  test('preserves bottom intent when reply parts or images increase content height', () => {
    const before = createScrollMetrics(0);
    const after = { ...before, scrollHeight: 1300 };

    expect(getAIChatBottomFollowIntent(before, after, true)).toBe(true);
    expect(getAIChatBottomFollowIntent(before, after, false)).toBe(false);
  });

  test('cancels following when the user scrolls upward without a layout change', () => {
    expect(getAIChatBottomFollowIntent(createScrollMetrics(0), createScrollMetrics(200), true)).toBe(false);
  });

  test('resumes following when the user returns to the bottom', () => {
    expect(getAIChatBottomFollowIntent(createScrollMetrics(200), createScrollMetrics(0), false)).toBe(true);
  });

  test('initializes intent from current metrics when no previous layout exists', () => {
    expect(getAIChatBottomFollowIntent(null, createScrollMetrics(0), false)).toBe(true);
    expect(getAIChatBottomFollowIntent(null, createScrollMetrics(200), true)).toBe(false);
  });
});

describe('queueAIChatViewportResizeScroll', () => {
  test('coalesces repeated resize notifications into the latest frame', () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextFrameId = 0;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      const frameId = ++nextFrameId;
      callbacks.set(frameId, callback);
      return frameId;
    });
    const cancelFrame = vi.fn((frameId: number) => callbacks.delete(frameId));
    const scrollToLatestMessage = vi.fn();

    const firstFrameId = queueAIChatViewportResizeScroll(
      () => true,
      scrollToLatestMessage,
      null,
      requestFrame,
      cancelFrame
    );
    const secondFrameId = queueAIChatViewportResizeScroll(
      () => true,
      scrollToLatestMessage,
      firstFrameId,
      requestFrame,
      cancelFrame
    );

    expect(cancelFrame).toHaveBeenCalledWith(firstFrameId);
    expect(callbacks.has(firstFrameId as number)).toBe(false);
    callbacks.get(secondFrameId as number)?.(16);
    expect(scrollToLatestMessage).toHaveBeenCalledTimes(1);
    expect(scrollToLatestMessage).toHaveBeenCalledWith('auto');
  });

  test('cancels pending scrolling when bottom intent is no longer active', () => {
    const requestFrame = vi.fn(() => 7);
    const cancelFrame = vi.fn();
    const scrollToLatestMessage = vi.fn();

    const frameId = queueAIChatViewportResizeScroll(
      () => false,
      scrollToLatestMessage,
      6,
      requestFrame,
      cancelFrame
    );

    expect(frameId).toBeNull();
    expect(cancelFrame).toHaveBeenCalledWith(6);
    expect(requestFrame).not.toHaveBeenCalled();
    expect(scrollToLatestMessage).not.toHaveBeenCalled();
  });

  test('rechecks bottom intent before the scheduled scroll executes', () => {
    let shouldFollow = true;
    let scheduledCallback: FrameRequestCallback | null = null;
    const scrollToLatestMessage = vi.fn();

    queueAIChatViewportResizeScroll(
      () => shouldFollow,
      scrollToLatestMessage,
      null,
      (callback) => {
        scheduledCallback = callback;
        return 1;
      },
      vi.fn()
    );
    shouldFollow = false;
    (scheduledCallback as FrameRequestCallback | null)?.(16);

    expect(scrollToLatestMessage).not.toHaveBeenCalled();
  });
});
