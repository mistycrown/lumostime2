/**
 * @file displayMode.test.ts
 * @input Explicit and system-derived display modes
 * @output Regression coverage for the runtime custom-appearance fallback contract
 * @updated 2026-09-29: Added dark-mode custom-appearance state coverage.
 */

import { describe, expect, it } from 'vitest';
import {
  applyThemeMode,
  CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE
} from './displayMode';

const createRoot = () => {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute: (name: string, value: string) => attributes.set(name, value)
  };
};

describe('applyThemeMode', () => {
  it('disables custom appearance only for an effective dark mode', () => {
    const root = createRoot();

    expect(applyThemeMode(root, 'dark', false)).toBe('dark');
    expect(root.attributes.get('data-theme-mode')).toBe('dark');
    expect(root.attributes.get(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('false');

    expect(applyThemeMode(root, 'light', true)).toBe('light');
    expect(root.attributes.get(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('true');
  });

  it('tracks system appearance changes without changing the configured mode', () => {
    const root = createRoot();

    expect(applyThemeMode(root, 'system', true)).toBe('dark');
    expect(root.attributes.get(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('false');

    expect(applyThemeMode(root, 'system', false)).toBe('light');
    expect(root.attributes.get(CUSTOM_APPEARANCE_ENABLED_ATTRIBUTE)).toBe('true');
  });
});
