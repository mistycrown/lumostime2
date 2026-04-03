import { describe, expect, test, vi } from 'vitest';
import {
  applyAndroidEdgeToEdgeBackgroundColor,
  getImmersiveStatusBarTransition,
} from './statusBarTransitions';

describe('getImmersiveStatusBarTransition', () => {
  test('hides the status bar when immersive mode starts on mobile', () => {
    expect(getImmersiveStatusBarTransition('android', 'enter')).toEqual({
      hide: true,
      show: false,
      restoreManagedStatusBar: false,
    });

    expect(getImmersiveStatusBarTransition('ios', 'enter')).toEqual({
      hide: true,
      show: false,
      restoreManagedStatusBar: false,
    });
  });

  test('shows and restores the managed status bar when immersive mode ends', () => {
    expect(getImmersiveStatusBarTransition('android', 'exit')).toEqual({
      hide: false,
      show: true,
      restoreManagedStatusBar: true,
    });
  });

  test('does nothing on non-mobile platforms', () => {
    expect(getImmersiveStatusBarTransition('web', 'enter')).toEqual({
      hide: false,
      show: false,
      restoreManagedStatusBar: false,
    });
  });
});

describe('applyAndroidEdgeToEdgeBackgroundColor', () => {
  test('uses the plugin background API that actually exists', async () => {
    const setBackgroundColor = vi.fn().mockResolvedValue(undefined);

    await applyAndroidEdgeToEdgeBackgroundColor(
      { setBackgroundColor },
      '#00000000'
    );

    expect(setBackgroundColor).toHaveBeenCalledWith({ color: '#00000000' });
  });

  test('silently skips when the plugin is unavailable', async () => {
    await expect(
      applyAndroidEdgeToEdgeBackgroundColor(null, '#00000000')
    ).resolves.toBe(false);
  });
});
