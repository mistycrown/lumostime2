/**
 * @file navigationBackgroundService.test.ts
 * @input Persisted navigation background IDs and custom background records
 * @output Regression coverage for removed built-in background fallback
 * @pos Test (UI Customization)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
