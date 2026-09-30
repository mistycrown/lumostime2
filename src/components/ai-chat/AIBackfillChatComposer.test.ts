/**
 * @file AIBackfillChatComposer.test.ts
 * @input Composer focus-scroll scheduling helper
 * @output Regression coverage for Android keyboard layout settling
 * @pos Component Support Test (AI Integration)
 * @description Verifies the composer scrolls once in the focus frame and once after the next layout frame so Android keyboard resize cannot leave the newest message hidden.
 * @updated 2026-09-29: Added keyboard-resize focus-scroll regression coverage.
 * @updated 2026-09-30: Ensures older-message reading positions do not queue focus scrolling.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { queueComposerFocusScroll } from './AIBackfillChatComposer';

describe('queueComposerFocusScroll', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('scrolls again after the next animation frame has settled the keyboard layout', () => {
    const animationFrames: Array<(time: number) => void> = [];
    const requestAnimationFrame = vi.fn((callback: (time: number) => void) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    const scrollToLatestMessage = vi.fn();
    vi.stubGlobal('window', { requestAnimationFrame });

    queueComposerFocusScroll(scrollToLatestMessage);

    expect(scrollToLatestMessage).not.toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    animationFrames.shift()?.(0);

    expect(scrollToLatestMessage).toHaveBeenCalledTimes(1);
    expect(scrollToLatestMessage).toHaveBeenLastCalledWith('auto');
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);

    animationFrames.shift()?.(16);

    expect(scrollToLatestMessage).toHaveBeenCalledTimes(2);
    expect(scrollToLatestMessage).toHaveBeenLastCalledWith('auto');
  });

  test('does not schedule scrolling when focus starts away from the bottom', () => {
    const requestAnimationFrame = vi.fn();
    const scrollToLatestMessage = vi.fn();
    vi.stubGlobal('window', { requestAnimationFrame });

    queueComposerFocusScroll(scrollToLatestMessage, false);

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(scrollToLatestMessage).not.toHaveBeenCalled();
  });
});
