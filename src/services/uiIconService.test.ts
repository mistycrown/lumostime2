/**
 * @file uiIconService.test.ts
 * @input Stored theme filenames and deferred image reads
 * @output Regression checks for theme hydration and concurrent updates
 * @pos Test (UI Icon System)
 * @updated 2026-10-05: Covers repeated imports, startup reads, deletion, and stale hydration.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getImageUrl } = vi.hoisted(() => ({ getImageUrl: vi.fn() }));
vi.mock('./imageService', () => ({ imageService: { getImageUrl } }));
const assetsKey = 'lumostime_ui_icon_custom_assets_v1';
let values: Map<string, string>;
const deferred = () => {
  let resolve!: (url: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
};

beforeEach(() => {
  vi.resetModules();
  values = new Map();
  getImageUrl.mockReset().mockImplementation(async (filename: string) => `data:image/png;base64,${filename}`);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  });
  vi.stubGlobal('window', new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

describe('UI icon theme hydration', () => {
  it('never exposes persisted filenames as image URLs during startup', async () => {
    values.set(assetsKey, JSON.stringify({ custom: { book: 'book.png' } }));
    const pending = deferred();
    getImageUrl.mockReturnValue(pending.promise);
    const { uiIconService } = await import('./uiIconService');
    expect(uiIconService.getIconPathForTheme('custom', 'book')).not.toBe('book.png');
    pending.resolve('data:image/png;base64,book');
    await vi.waitFor(() => expect(uiIconService.getIconPathForTheme('custom', 'book')).toBe('data:image/png;base64,book'));
  });

  it('rehydrates every theme from filenames when another theme is registered', async () => {
    const { uiIconService } = await import('./uiIconService');
    await uiIconService.registerCustomThemeAssets('first', { book: 'first.png' });
    await uiIconService.registerCustomThemeAssets('second', { book: 'second.png' });
    expect(uiIconService.getIconPathForTheme('first', 'book')).toBe('data:image/png;base64,first.png');
    expect(getImageUrl.mock.calls.flat().every((filename) => !filename.startsWith('data:'))).toBe(true);
    expect(JSON.parse(values.get(assetsKey)!)).toEqual({ first: { book: 'first.png' }, second: { book: 'second.png' } });
  });

  it('discards a slow hydration that finishes after a replacement', async () => {
    const { uiIconService } = await import('./uiIconService');
    const old = deferred();
    getImageUrl.mockImplementation((filename: string) => filename === 'old.png' ? old.promise : Promise.resolve('data:image/png;base64,new'));
    const slow = uiIconService.registerCustomThemeAssets('custom', { book: 'old.png' });
    await uiIconService.registerCustomThemeAssets('custom', { book: 'new.png' });
    old.resolve('data:image/png;base64,old');
    await slow;
    expect(uiIconService.getIconPathForTheme('custom', 'book')).toBe('data:image/png;base64,new');
  });

  it('does not restore a deleted theme when a pending read finishes', async () => {
    const { uiIconService } = await import('./uiIconService');
    const pending = deferred();
    getImageUrl.mockReturnValue(pending.promise);
    const loading = uiIconService.registerCustomThemeAssets('custom', { book: 'book.png' }, 'Custom');
    uiIconService.removeCustomThemeAssets('custom');
    pending.resolve('data:image/png;base64,deleted');
    await loading;
    expect(uiIconService.getCustomThemeEntries()).toEqual([]);
    expect(uiIconService.getIconPathForTheme('custom', 'book')).not.toContain('deleted');
  });

  it('notifies the active theme when its assets are replaced without changing its name', async () => {
    const { uiIconService } = await import('./uiIconService');
    uiIconService.setTheme('custom');
    const listener = vi.fn();
    window.addEventListener('ui-icon-theme-changed', listener);
    await uiIconService.registerCustomThemeAssets('custom', { book: 'book.png' });
    expect(listener).toHaveBeenCalled();
    expect(uiIconService.getCurrentTheme()).toBe('custom');
  });
});
