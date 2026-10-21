/**
 * @file BottomNavigation.test.tsx
 * @input Saved navigation backgrounds, icon selections and custom-appearance state
 * @output Render regressions for readable active/inactive navigation text
 * @pos Test (Navigation)
 * @updated 2026-10-21: Covers light text, image labels and default-surface fallback.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppView } from '../types';
import { navigationBackgroundService } from '../services/navigationBackgroundService';
import { BottomNavigation } from './BottomNavigation';

const appearance = vi.hoisted(() => ({ enabled: true }));
vi.mock('../hooks/useCustomAppearanceEnabled', () => ({ useCustomAppearanceEnabled: () => appearance.enabled }));
vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    defaultIndexView: 'TAGS',
    navigationModuleVisibility: { record: true, todo: true, timeline: true, review: true, index: true }
  })
}));

const renderNavigation = () => renderToStaticMarkup(
  <BottomNavigation currentView={AppView.RECORD} onViewChange={() => {}} isVisible />
);

describe('navigation background text colors', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    appearance.enabled = true;
    localStorage.setItem('navigation_new_mode_enabled', 'true');
    localStorage.setItem('navigation_new_background', 'dark-image');
    localStorage.setItem('navigation_new_background_custom_list', JSON.stringify([
      { id: 'dark-image', name: 'Dark', type: 'custom', url: 'blob:dark', textTone: 'light' }
    ]));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders selected text white and other labels translucent white on a dark image', () => {
    const html = renderNavigation();
    expect(html).toContain('text-white"');
    expect(html.match(/text-white\/70/g)).toHaveLength(4);
    expect(html).not.toContain('text-stone-900');
    expect(html).toContain('记录');
  });

  it('keeps image-icon labels white when selected', () => {
    localStorage.setItem('navigation_icon_custom_list_v1', JSON.stringify([
      { id: 'record-icon', name: 'Record', type: 'custom', url: 'blob:record' }
    ]));
    localStorage.setItem('navigation_icon_schemes_v1', JSON.stringify([
      { id: 'icons', name: 'Icons', type: 'custom', mapping: { record: 'record-icon' }, iconScale: 100 }
    ]));
    localStorage.setItem('navigation_icon_selection_v1', JSON.stringify({
      mode: 'custom', schemeId: 'icons', showLabelWithIcon: true
    }));
    const html = renderNavigation();
    expect(html).toContain('src="blob:record"');
    expect(html).toMatch(/text-white">[\s\S]*?text-\[10px\][^>]*font-bold[^>]*>记录<\/span>/);
    expect(html).not.toContain('text-stone-900');
  });

  it.each(['no-background', 'legacy', 'custom-appearance-disabled', 'dark-text'])(
    'uses default colors for %s', (mode) => {
      if (mode === 'no-background') localStorage.setItem('navigation_new_background', 'new-none');
      if (mode === 'legacy') localStorage.setItem('navigation_new_mode_enabled', 'false');
      if (mode === 'custom-appearance-disabled') appearance.enabled = false;
      if (mode === 'dark-text') navigationBackgroundService.saveCustomSettings('dark-image', { textTone: 'dark' });
      const html = renderNavigation();
      expect(html).toContain('text-stone-900');
      expect(html).not.toContain('text-white/70');
    }
  );
});
