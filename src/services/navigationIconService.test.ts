/**
 * @file navigationIconService.test.ts
 * @input Persisted and user-created navigation icon schemes
 * @output Regression coverage for icon-scheme persistence and legacy fallback
 * @pos Test (UI Customization)
 * @updated 2026-09-28: Covers migration from the removed built-in pink icon mode.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  NAVIGATION_ICON_SCHEMES_KEY,
  navigationIconService,
  NavigationIconSlot
} from './navigationIconService';

const createLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
};

describe('navigationIconService custom schemes', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
  });

  it('creates multiple schemes and keeps the active scheme mapping', () => {
    const first = navigationIconService.createCustomScheme('第一套');
    const second = navigationIconService.createCustomScheme('第二套');

    navigationIconService.setSchemeMapping(second.id, 'record', 'custom-icon-1');
    navigationIconService.setActiveScheme(second.id);

    expect(navigationIconService.getCustomSchemes().map((scheme) => scheme.name)).toEqual(['第一套', '第二套']);
    expect(navigationIconService.getSelection()).toMatchObject({
      mode: 'custom',
      schemeId: second.id,
      customMapping: { record: 'custom-icon-1' }
    });
    expect(JSON.parse(localStorage.getItem(NAVIGATION_ICON_SCHEMES_KEY) || '[]')).toHaveLength(2);
  });

  it('deletes the active scheme and falls back to the next scheme or text', () => {
    const first = navigationIconService.createCustomScheme('第一套');
    const second = navigationIconService.createCustomScheme('第二套');
    navigationIconService.setActiveScheme(first.id);

    expect(navigationIconService.deleteCustomScheme(first.id)).toBe(true);
    expect(navigationIconService.getSelection()).toMatchObject({ mode: 'custom', schemeId: second.id });

    expect(navigationIconService.deleteCustomScheme(second.id)).toBe(true);
    expect(navigationIconService.getSelection()).toMatchObject({ mode: 'text' });
  });

  it('migrates the previous single custom mapping into one scheme', () => {
    localStorage.setItem('navigation_icon_selection_v1', JSON.stringify({
      mode: 'custom',
      customMapping: { index: 'custom-icon-5' }
    }));

    const slots = navigationIconService.getSlots();
    expect(slots).toContain('index' as NavigationIconSlot);
    expect(navigationIconService.getCustomSchemes()[0]).toMatchObject({
      id: 'custom-default',
      mapping: { index: 'custom-icon-5' }
    });
  });

  it('persists the optional label setting without changing the selected scheme', () => {
    const scheme = navigationIconService.createCustomScheme('带文字');

    navigationIconService.setShowLabelWithIcon(true);

    expect(navigationIconService.getSelection()).toMatchObject({
      mode: 'custom',
      schemeId: scheme.id,
      showLabelWithIcon: true
    });
    expect(JSON.parse(localStorage.getItem('navigation_icon_selection_v1') || '{}')).toMatchObject({
      showLabelWithIcon: true
    });
  });

  it('falls back to text for the removed built-in pink icon mode', () => {
    localStorage.setItem('navigation_icon_selection_v1', JSON.stringify({ mode: 'pink' }));

    expect(navigationIconService.getSelection()).toMatchObject({ mode: 'text' });
  });
});
