/**
 * @file useAIBackfillChatViewport.test.ts
 * @input AI chat scroll metrics and keyboard-resize follow conditions
 * @output Regression coverage for bottom intent and guarded viewport following
 * @pos Component Support Test (AI Integration)
 * @description Verifies keyboard-driven layout changes keep the latest message visible only when the user was already at the bottom.
 * @updated 2026-09-30: Added bottom-threshold and keyboard-resize follow regression coverage.
 */

import { describe, expect, test, vi } from 'vitest';
import {
  AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX,
  isAIChatScrollNearBottom,
  queueAIChatViewportResizeScroll,
  shouldFollowAIChatViewportResize
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

describe('shouldFollowAIChatViewportResize', () => {
  test('requires both bottom intent and composer focus', () => {
    const composer = {} as HTMLTextAreaElement;
    const anotherElement = {} as Element;

    expect(shouldFollowAIChatViewportResize(true, composer, composer)).toBe(true);
    expect(shouldFollowAIChatViewportResize(false, composer, composer)).toBe(false);
    expect(shouldFollowAIChatViewportResize(true, anotherElement, composer)).toBe(false);
    expect(shouldFollowAIChatViewportResize(true, null, composer)).toBe(false);
    expect(shouldFollowAIChatViewportResize(true, composer, null)).toBe(false);
  });

  test('remains enabled across repeated keyboard resize notifications', () => {
    const composer = {} as HTMLTextAreaElement;

    expect(shouldFollowAIChatViewportResize(true, composer, composer)).toBe(true);
    expect(shouldFollowAIChatViewportResize(true, composer, composer)).toBe(true);
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
