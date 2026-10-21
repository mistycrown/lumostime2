/**
 * @file navigationBackgroundService.test.ts
 * @input Persisted navigation background IDs and custom background records
 * @output Regression coverage for removed built-in background fallback
 * @pos Test (UI Customization)
 * @updated 2026-09-28: Covers persisted vertical stretch settings.
 * @updated 2026-10-21: Covers independent background text tones and position tuning compatibility.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigationBackgroundService } from './navigationBackgroundService';

const createLocalStorageMock = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear()
  };
};

describe('navigation background service', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  });

  it('falls back from the removed built-in background to no background', () => {
    localStorage.setItem('navigation_new_background', 'new-default');

    expect(navigationBackgroundService.getCurrentBackground()).toBe('new-none');
    expect(navigationBackgroundService.getAllBackgrounds().map((background) => background.id)).toEqual(['new-none']);
  });

  it('preserves an imported or user-added background selection', () => {
    localStorage.setItem('navigation_new_background_custom_list', JSON.stringify([
      { id: 'theme:rabbit:navigation-background', name: '兔子云朵', type: 'custom', url: 'blob:rabbit' }
    ]));
    navigationBackgroundService.setCurrentBackground('theme:rabbit:navigation-background');

    expect(navigationBackgroundService.getCurrentBackground()).toBe('theme:rabbit:navigation-background');
  });

  it('defaults vertical stretching to 100% and persists a saved value', () => {
    localStorage.setItem('navigation_new_background_custom_list', JSON.stringify([
      { id: 'custom-background', name: 'Custom', type: 'custom', url: 'blob:custom' }
    ]));

    expect(navigationBackgroundService.getBackgroundById('custom-background')?.verticalStretch).toBe(1);

    navigationBackgroundService.saveCustomSettings('custom-background', { verticalStretch: 1.25 });

    expect(navigationBackgroundService.getBackgroundById('custom-background')?.verticalStretch).toBe(1.25);
  });

  it('persists text tones per background without losing them when tuning position', () => {
    localStorage.setItem('navigation_new_background_custom_list', JSON.stringify([
      { id: 'dark-image', name: 'Dark', type: 'custom', url: 'blob:dark', textTone: 'light' },
      { id: 'light-image', name: 'Light', type: 'custom', url: 'blob:light' }
    ]));
    expect(navigationBackgroundService.getBackgroundById('dark-image')?.textTone).toBe('light');
    expect(navigationBackgroundService.getBackgroundById('light-image')?.textTone).toBe('dark');

    navigationBackgroundService.saveCustomSettings('dark-image', { textTone: 'dark' });
    navigationBackgroundService.saveCustomSettings('dark-image', { offsetY: '13px', verticalStretch: 1.15 });
    expect(navigationBackgroundService.getBackgroundById('dark-image')).toMatchObject({
      textTone: 'dark', offsetY: '13px', verticalStretch: 1.15
    });
    navigationBackgroundService.setCurrentBackground('light-image');
    expect(navigationBackgroundService.getBackgroundById('light-image')?.textTone).toBe('dark');
    navigationBackgroundService.saveCustomSettings('light-image', { textTone: 'light' });
    navigationBackgroundService.setCurrentBackground('dark-image');
    expect(navigationBackgroundService.getBackgroundById('dark-image')?.textTone).toBe('dark');
    expect(JSON.parse(localStorage.getItem('navigation_new_background_settings') || '{}')).toMatchObject({
      'light-image': { textTone: 'light' }, 'dark-image': { textTone: 'dark' }
    });
  });
});
