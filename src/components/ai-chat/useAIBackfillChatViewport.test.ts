/**
 * @file useAIBackfillChatViewport.test.ts
 * @input AI chat scroll metrics and keyboard-resize follow conditions
 * @output Regression coverage for bottom intent and guarded viewport following
 * @pos Component Support Test (AI Integration)
 * @description Verifies keyboard-driven layout changes keep the latest message visible only when the user was already at the bottom.
 * @updated 2026-09-30: Added bottom-threshold and keyboard-resize follow regression coverage.
 */

import { describe, expect, test } from 'vitest';
import {
  AI_CHAT_BOTTOM_FOLLOW_THRESHOLD_PX,
  isAIChatScrollNearBottom,
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
