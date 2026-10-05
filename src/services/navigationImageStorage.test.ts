/**
 * @file navigationImageStorage.test.ts
 * @input Navigation images, legacy Base64 settings, and constrained localStorage
 * @output Regression coverage for quota-safe uploads, hydration, and concurrent edits
 * @pos Test (Image Storage)
 * @updated 2026-10-05: Covers navigation icons, modern backgrounds, and legacy decorations.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const images = vi.hoisted(() => ({ getImageUrl: vi.fn(), saveImage: vi.fn(), deleteImage: vi.fn() }));
vi.mock('./imageService', () => ({ imageService: images }));

import { navigationIconService } from './navigationIconService';
import { navigationBackgroundService } from './navigationBackgroundService';
import { navigationDecorationService } from './navigationDecorationService';
import { ImageAssetListStorage } from './imageAssetListStorage';

const services = [
  {
    key: 'navigation_icon_custom_list_v1',
    hydrate: () => navigationIconService.hydrateCustomIcons(),
    add: (file: File) => navigationIconService.addCustomIcon(file),
    list: () => navigationIconService.getCustomIcons()
  },
  {
    key: 'navigation_new_background_custom_list',
    hydrate: () => navigationBackgroundService.hydrateCustomBackgrounds(),
    add: (file: File) => navigationBackgroundService.addCustomBackground(file),
    list: () => navigationBackgroundService.getAllBackgrounds().filter((asset) => asset.type === 'custom')
  },
  {
    key: 'navigation_decoration_custom_list',
    hydrate: () => navigationDecorationService.hydrateImageBackedCustomDecorations(),
    add: (file: File) => navigationDecorationService.addCustomDecoration(file),
    list: () => navigationDecorationService.getCustomDecorations()
  }
];

beforeEach(() => {
  vi.resetAllMocks();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: (key: string) => values.delete(key)
  });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.stubGlobal('CustomEvent', class { constructor(public type: string, public detail?: unknown) {} });
  vi.stubGlobal('FileReader', class {
    result = 'data:image/png;base64,upload';
    onload?: () => void;
    readAsDataURL() { this.onload?.(); }
  });
  services.forEach((service) => service.list());
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(services)('$key', (service) => {
  it('loads large native images while persisting only metadata', async () => {
    const url = `data:image/png;base64,${'A'.repeat(10000)}`;
    localStorage.setItem(service.key, JSON.stringify([
      { id: 'native', name: 'Native', type: 'custom', url: '', thumbnail: '', imageFilename: 'native.png' }
    ]));
    const original = localStorage.setItem;
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (value.length > 1000) throw new DOMException('Storage full', 'QuotaExceededError');
      original(key, value);
    });
    images.getImageUrl.mockResolvedValue(url);

    await expect(service.hydrate()).resolves.toBeUndefined();
    expect(service.list()[0].url).toBe(url);
    expect(localStorage.getItem(service.key)).not.toContain('data:');
    expect(localStorage.getItem(service.key)).toContain('native.png');
  });

  it('keeps uploaded images usable without storing their bytes', async () => {
    images.saveImage.mockResolvedValue('upload.png');
    images.getImageUrl.mockResolvedValue('data:image/png;base64,upload');
    const asset = await service.add({ name: 'upload.png' } as File);

    expect(service.list().find((item) => item.id === asset.id)?.url).toBe('data:image/png;base64,upload');
    expect(localStorage.getItem(service.key)).not.toContain('data:');
    expect(localStorage.getItem(service.key)).not.toContain('blob:');
    expect(localStorage.getItem(service.key)).toContain('upload.png');
  });

  it('preserves legacy Base64 until an unavailable image file can be loaded again', async () => {
    localStorage.setItem(service.key, JSON.stringify([
      { id: 'legacy', name: 'Legacy', type: 'custom', imageFilename: 'legacy.png', url: 'data:image/png;base64,legacy' }
    ]));
    images.getImageUrl.mockRejectedValueOnce(new Error('File unavailable')).mockResolvedValue('blob:restored');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(service.hydrate()).resolves.toBeUndefined();
    expect(localStorage.getItem(service.key)).toContain('data:image/png;base64,legacy');
    expect(service.list()[0].url).toBe('data:image/png;base64,legacy');

    await service.hydrate();
    expect(service.list()[0].url).toBe('blob:restored');
    expect(localStorage.getItem(service.key)).not.toContain('data:');
  });

  it('handles quota failures during legacy compaction and still displays the loaded image', async () => {
    localStorage.setItem(service.key, JSON.stringify([
      { id: 'quota', name: 'Quota', type: 'custom', imageFilename: 'quota.png', url: 'data:image/png;base64,old' }
    ]));
    images.getImageUrl.mockResolvedValue('blob:fresh');
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError'); });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(service.hydrate()).resolves.toBeUndefined();
    expect(service.list()[0].url).toBe('blob:fresh');
  });
});

describe('concurrent image hydration', () => {
  it('preserves legacy URL-only assets until they are migrated to image files', async () => {
    const store = new ImageAssetListStorage('legacy-url-only');
    const asset = { id: 'legacy', url: 'data:image/png;base64,only-copy' };
    store.save([asset]);
    await store.hydrate(vi.fn());
    expect(store.load()).toEqual([asset]);
    expect(JSON.parse(localStorage.getItem('legacy-url-only') || '[]')).toEqual([asset]);
    expect(images.getImageUrl).not.toHaveBeenCalled();
  });

  it('deduplicates requests and preserves additions, replacements, deletions, and metadata edits', async () => {
    type Asset = { id: string; name: string; imageFilename: string; url: string };
    const store = new ImageAssetListStorage<Asset>('concurrent');
    const original = { id: 'same', name: 'Original', imageFilename: 'old.png', url: '' };
    const removed = { id: 'removed', name: 'Removed', imageFilename: 'removed.png', url: '' };
    store.save([original, removed]);
    let resolveOld: (url: string) => void = () => undefined;
    images.getImageUrl.mockImplementation((filename: string) => filename === 'old.png'
      ? new Promise<string>((resolve) => { resolveOld = resolve; })
      : Promise.resolve(`blob:${filename}`));
    const onChange = vi.fn();
    const first = store.hydrate(onChange);
    expect(store.hydrate(onChange)).toBe(first);
    store.save([
      { ...original, name: 'Renamed', imageFilename: 'new.png' },
      { id: 'added', name: 'Added', imageFilename: 'added.png', url: '' }
    ]);
    resolveOld('blob:old');
    await first;

    expect(store.load()).toEqual([
      { id: 'same', name: 'Renamed', imageFilename: 'new.png', url: 'blob:new.png' },
      { id: 'added', name: 'Added', imageFilename: 'added.png', url: 'blob:added.png' }
    ]);
    expect(localStorage.getItem('concurrent')).not.toContain('blob:');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not write unchanged metadata on repeated hydration', async () => {
    const store = new ImageAssetListStorage('unchanged');
    store.save([{ id: 'same', imageFilename: 'same.png', url: '' }]);
    images.getImageUrl.mockResolvedValue('blob:same');
    vi.mocked(localStorage.setItem).mockClear();

    await store.hydrate(vi.fn());
    await store.hydrate(vi.fn());
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(images.getImageUrl).toHaveBeenCalledTimes(1);
  });
});
