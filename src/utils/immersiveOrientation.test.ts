import { describe, expect, test } from 'vitest';
import {
  getScreenOrientationLockValue,
  shouldManageImmersiveOrientationLock,
  shouldSilenceImmersiveOrientationError,
  normalizeImmersiveTimerOrientation,
  resolveImmersiveTimerOrientation,
  toggleImmersiveTimerOrientation
} from './immersiveOrientation';

describe('immersiveOrientation', () => {
  test('falls back to landscape for invalid storage values', () => {
    expect(normalizeImmersiveTimerOrientation('landscape')).toBe('landscape');
    expect(normalizeImmersiveTimerOrientation('portrait')).toBe('portrait');
    expect(normalizeImmersiveTimerOrientation('')).toBe('landscape');
    expect(normalizeImmersiveTimerOrientation('auto')).toBe('landscape');
    expect(normalizeImmersiveTimerOrientation(null)).toBe('landscape');
  });

  test('prefers the session override when resolving the effective orientation', () => {
    expect(resolveImmersiveTimerOrientation('landscape', null)).toBe('landscape');
    expect(resolveImmersiveTimerOrientation('portrait', null)).toBe('portrait');
    expect(resolveImmersiveTimerOrientation('landscape', 'portrait')).toBe('portrait');
    expect(resolveImmersiveTimerOrientation('portrait', 'landscape')).toBe('landscape');
    expect(resolveImmersiveTimerOrientation('portrait', null)).toBe('portrait');
  });

  test('toggles between landscape and portrait', () => {
    expect(toggleImmersiveTimerOrientation('landscape')).toBe('portrait');
    expect(toggleImmersiveTimerOrientation('portrait')).toBe('landscape');
  });

  test('uses landscape as the persisted default orientation', () => {
    expect(normalizeImmersiveTimerOrientation(undefined)).toBe('landscape');
  });

  test('maps preferences to the correct screen-orientation lock values', () => {
    expect(getScreenOrientationLockValue('landscape')).toBe('landscape-primary');
    expect(getScreenOrientationLockValue('portrait')).toBe('portrait-primary');
  });

  test('only manages system orientation lock on native platforms', () => {
    expect(shouldManageImmersiveOrientationLock('android')).toBe(true);
    expect(shouldManageImmersiveOrientationLock('ios')).toBe(true);
    expect(shouldManageImmersiveOrientationLock('web')).toBe(false);
  });

  test('silences abort and unsupported orientation lock errors', () => {
    expect(shouldSilenceImmersiveOrientationError({ name: 'AbortError' })).toBe(true);
    expect(shouldSilenceImmersiveOrientationError({ name: 'NotSupportedError' })).toBe(true);
    expect(shouldSilenceImmersiveOrientationError({ name: 'SecurityError' })).toBe(false);
    expect(shouldSilenceImmersiveOrientationError(new Error('boom'))).toBe(false);
  });
});
