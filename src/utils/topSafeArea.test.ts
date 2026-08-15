/**
 * @file topSafeArea.test.ts
 * @input Top safe-area ownership decisions
 * @output Regression coverage for native Android detection
 * @pos Unit Test
 * @description Verifies that only Android inside a native Capacitor container disables the web top safe-area inset.
 * @updated 2026-08-15: Added initial Android status-bar inset compatibility coverage.
 */

import { describe, expect, test } from 'vitest';
import { shouldUseNativeAndroidTopInset } from './topSafeArea';

describe('shouldUseNativeAndroidTopInset', () => {
  test('uses the native WebView inset on Android', () => {
    expect(shouldUseNativeAndroidTopInset(true, 'android')).toBe(true);
  });

  test('keeps the web safe-area inset outside native Android', () => {
    expect(shouldUseNativeAndroidTopInset(false, 'android')).toBe(false);
    expect(shouldUseNativeAndroidTopInset(true, 'ios')).toBe(false);
    expect(shouldUseNativeAndroidTopInset(false, 'web')).toBe(false);
  });
});
