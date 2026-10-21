/**
 * @file navigationIconService.test.ts
 * @input Persisted and user-created navigation icon schemes
 * @output Regression coverage for icon-scheme persistence and legacy fallback
 * @pos Test (UI Customization)
 * @updated 2026-09-28: Covers migration from the removed built-in pink icon mode.
 * @updated 2026-09-30: Covers image icon size normalization and persistence.
 * @updated 2026-10-21: Covers scheme-specific scales, migration, editing and deletion fallback.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NAVIGATION_ICON_CHANGE_EVENT,
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

  it('normalizes missing and invalid icon scale values', () => {
    expect(navigationIconService.getSelection().iconScale).toBe(100);

    [
      [69, 70],
      [141, 140],
      [100.5, 101],
      ['large', 100]
    ].forEach(([iconScale, expected]) => {
      localStorage.setItem('navigation_icon_selection_v1', JSON.stringify({ iconScale }));
      expect(navigationIconService.getSelection().iconScale).toBe(expected);
    });
  });

  it('restores each scheme scale when switching schemes and text mode', () => {
    const first = navigationIconService.createCustomScheme('First');
    navigationIconService.setIconScale(125);
    const second = navigationIconService.createCustomScheme('Second');
    expect(navigationIconService.getSelection().iconScale).toBe(100);
    navigationIconService.setIconScale(80);

    navigationIconService.setActiveScheme(first.id);
    expect(navigationIconService.getSelection().iconScale).toBe(125);
    navigationIconService.setMode('text');
    navigationIconService.setMode('custom');
    expect(navigationIconService.getSelection().iconScale).toBe(125);
    navigationIconService.setActiveScheme(second.id);
    expect(navigationIconService.getSelection().iconScale).toBe(80);
    expect(JSON.parse(localStorage.getItem(NAVIGATION_ICON_SCHEMES_KEY) || '[]')).toMatchObject([
      { id: first.id, iconScale: 125 },
      { id: second.id, iconScale: 80 }
    ]);
  });

  it('migrates legacy global scales once without changing existing per-scheme scales', () => {
    localStorage.setItem('navigation_icon_selection_v1', JSON.stringify({
      mode: 'custom', schemeId: 'first', iconScale: 115
    }));
    localStorage.setItem(NAVIGATION_ICON_SCHEMES_KEY, JSON.stringify([
      { id: 'first', name: 'First', type: 'custom', mapping: {} },
      { id: 'second', name: 'Second', type: 'custom', mapping: {} },
      { id: 'third', name: 'Third', type: 'custom', mapping: {}, iconScale: 90 }
    ]));

    navigationIconService.setIconScale(130);
    navigationIconService.setActiveScheme('second');
    expect(navigationIconService.getSelection().iconScale).toBe(115);
    navigationIconService.setActiveScheme('third');
    expect(navigationIconService.getSelection().iconScale).toBe(90);
    navigationIconService.setActiveScheme('first');
    expect(navigationIconService.getSelection().iconScale).toBe(130);
  });

  it('edits an inactive scheme scale without changing the active scale', () => {
    const first = navigationIconService.createCustomScheme('First');
    const second = navigationIconService.createCustomScheme('Second');
    navigationIconService.setSchemeMapping(second.id, 'record', 'second-icon');
    navigationIconService.setIconScale(80);
    navigationIconService.updateCustomScheme(first.id, { iconScale: 200 });
    expect(navigationIconService.getSelection().iconScale).toBe(80);
    navigationIconService.setActiveScheme(first.id);
    expect(navigationIconService.getSelection().iconScale).toBe(140);
    navigationIconService.deleteCustomScheme(first.id);
    expect(navigationIconService.getSelection()).toMatchObject({
      schemeId: second.id, iconScale: 80, customMapping: { record: 'second-icon' }
    });
  });

  it('persists icon scale and notifies mounted navigation', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('CustomEvent', class {
      constructor(public type: string) {}
    });
    vi.stubGlobal('window', { dispatchEvent });

    navigationIconService.setIconScale(125);

    expect(navigationIconService.getSelection()).toMatchObject({ iconScale: 125 });
    expect(JSON.parse(localStorage.getItem('navigation_icon_selection_v1') || '{}')).toMatchObject({ iconScale: 125 });
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: NAVIGATION_ICON_CHANGE_EVENT }));
    vi.unstubAllGlobals();
  });

  it('falls back to text for the removed built-in pink icon mode', () => {
    localStorage.setItem('navigation_icon_selection_v1', JSON.stringify({ mode: 'pink' }));

    expect(navigationIconService.getSelection()).toMatchObject({ mode: 'text' });
  });
});
