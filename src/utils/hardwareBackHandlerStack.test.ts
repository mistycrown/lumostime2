/**
 * @file hardwareBackHandlerStack.test.ts
 * @input Registered hardware-back handlers
 * @output Regression coverage for shared Android back-handler stack ordering
 * @pos Test
 * @description Verifies that the shared hardware-back stack gives the most recently registered overlay first chance to consume back, while allowing lower layers to handle it when a top layer returns false.
 * @updated 2026-07-11: Added coverage for top-layer fallthrough so collection-detail handlers can safely defer to log and todo overlays.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { registerHardwareBackHandler, runRegisteredHardwareBackHandler } from './hardwareBackHandlerStack';

const cleanups: Array<() => void> = [];

const registerTrackedHandler = (handler: () => boolean) => {
  const cleanup = registerHardwareBackHandler(handler);
  cleanups.push(cleanup);
  return cleanup;
};

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

describe('hardwareBackHandlerStack', () => {
  test('runs the most recently registered handler first', () => {
    const lowerHandler = vi.fn(() => true);
    const topHandler = vi.fn(() => true);

    registerTrackedHandler(lowerHandler);
    registerTrackedHandler(topHandler);

    expect(runRegisteredHardwareBackHandler()).toBe(true);
    expect(topHandler).toHaveBeenCalledTimes(1);
    expect(lowerHandler).not.toHaveBeenCalled();
  });

  test('falls through to lower handlers when the top handler does not consume back', () => {
    const lowerHandler = vi.fn(() => true);
    const topHandler = vi.fn(() => false);

    registerTrackedHandler(lowerHandler);
    registerTrackedHandler(topHandler);

    expect(runRegisteredHardwareBackHandler()).toBe(true);
    expect(topHandler).toHaveBeenCalledTimes(1);
    expect(lowerHandler).toHaveBeenCalledTimes(1);
  });
});
