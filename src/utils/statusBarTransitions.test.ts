import { describe, expect, test, vi } from 'vitest';
import {
  applyAndroidEdgeToEdgeBackgroundColor,
  getImmersiveStatusBarTransition,
} from './statusBarTransitions';

describe('getImmersiveStatusBarTransition', () => {
  test('lets Android immersive mode own system-bar visibility when immersive mode starts', () => {
    expect(getImmersiveStatusBarTransition('android', 'enter')).toEqual({
      hide: false,
      show: false,
      restoreManagedStatusBar: false,
      backgroundColor: '#000000',
      hideSystemBars: true,
      restoreSystemBars: false,
    });
  });

  test('keeps the status bar visible with a black background when immersive mode starts on ios', () => {
    expect(getImmersiveStatusBarTransition('ios', 'enter')).toEqual({
      hide: false,
      show: true,
      restoreManagedStatusBar: false,
      backgroundColor: '#000000',
      hideSystemBars: true,
      restoreSystemBars: false,
    });
  });

  test('restores Android immersive mode without extra status-bar visibility toggles', () => {
    expect(getImmersiveStatusBarTransition('android', 'exit')).toEqual({
      hide: false,
      show: false,
      restoreManagedStatusBar: true,
      hideSystemBars: false,
      restoreSystemBars: true,
    });
  });

  test('shows and restores the managed status bar when immersive mode ends on ios', () => {
    expect(getImmersiveStatusBarTransition('ios', 'exit')).toEqual({
      hide: false,
      show: true,
      restoreManagedStatusBar: true,
      hideSystemBars: false,
      restoreSystemBars: true,
    });
  });

  test('does nothing on non-mobile platforms', () => {
    expect(getImmersiveStatusBarTransition('web', 'enter')).toEqual({
      hide: false,
      show: false,
      restoreManagedStatusBar: false,
      hideSystemBars: false,
      restoreSystemBars: false,
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
