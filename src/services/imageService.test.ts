/**
 * @file imageService.test.ts
 * @input Image formats, stored manifests, and persisted theme image references
 * @output Regression coverage for image formats and theme manifest rebuilding
 * @pos Test (Image Management)
 * @updated 2026-10-04: Protects modern navigation backgrounds during manifest rebuild and cleanup.
 * @updated 2026-10-11: Covers original-only theme saves, legacy manifests, and retained content thumbnails.
 */
import { describe, expect, it, vi } from 'vitest';
import { Filesystem } from '@capacitor/filesystem';

import { imageService } from './imageService';

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { readFile: vi.fn() },
  Directory: { Data: 'DATA' }
}));

describe('imageService format preservation', () => {
  it('preserves transparent-friendly formats for stored files and thumbnails', () => {
    expect(imageService.getStorageExtensionForTest('image/png')).toBe('png');
    expect(imageService.getThumbnailMimeTypeForTest('image/png')).toBe('image/png');
    expect(imageService.getStorageExtensionForTest('image/webp')).toBe('webp');
    expect(imageService.getThumbnailMimeTypeForTest('image/webp')).toBe('image/webp');
    expect(imageService.getThumbnailMimeTypeForTest('image/gif')).toBe('image/png');
  });

  it('keeps opaque formats on the jpeg path', () => {
    expect(imageService.getStorageExtensionForTest('image/jpeg')).toBe('jpg');
    expect(imageService.getThumbnailMimeTypeForTest('image/jpeg')).toBe('image/jpeg');
    expect(imageService.getStorageExtensionForTest('')).toBe('jpg');
  });

  it('persists grouped content and theme manifests with a legacy migration path', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });

    imageService.updateReferencedImageManifest({
      content: ['log.jpg'],
      theme: ['theme.png']
    });

    expect(imageService.getReferencedImageManifest()).toEqual({
      content: ['log.jpg'],
      theme: ['theme.png']
    });

    values.set('lumos_custom_backgrounds', JSON.stringify([{ imageFilename: 'theme.png' }]));
    values.set('lumos_referenced_images', JSON.stringify(['theme.png', 'thumb_theme.png', 'log.jpg']));
    expect(imageService.getReferencedImageManifest()).toEqual({
      content: ['log.jpg'],
      theme: ['theme.png']
    });

    vi.unstubAllGlobals();
  });

  it('retains navigation originals while dropping obsolete thumbnails from the theme manifest', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    });
    const images = ['navigation.webp', 'thumb_navigation.webp'];
    const listImages = vi.spyOn(imageService, 'listImages').mockResolvedValue(images);
    try {
      values.set('navigation_new_background_custom_list', JSON.stringify([{ imageFilename: images[0] }]));
      values.set('lumos_referenced_images', JSON.stringify(images));
      expect(imageService.getReferencedImageManifest()).toEqual({ content: [], theme: [images[0]] });
      expect(await imageService.rebuildReferencedListFromLogs([])).toEqual([images[0]]);
      expect(imageService.getReferencedImageManifest()).toEqual({ content: [], theme: [images[0]] });
      expect(await imageService.cleanupUnreferencedImages([])).toEqual({ cleaned: 1, kept: 1 });
    } finally {
      listImages.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it.each(['theme', 'content'] as const)('creates thumbnails only when saving %s images requires them', async group => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    const writeImage = vi.spyOn(imageService, 'writeImage').mockResolvedValue(undefined);
    vi.spyOn(imageService, 'checkFileExists').mockResolvedValue(true);
    const generateThumbnail = vi.spyOn(imageService as any, 'generateThumbnail').mockResolvedValue(new Blob(['thumb']));
    try {
      const filename = await imageService.saveImage(new Blob(['image'], { type: 'image/webp' }), group);
      const expected = group === 'theme' ? [filename] : [filename, `thumb_${filename}`];
      expect(writeImage.mock.calls.map(([name]) => name)).toEqual(expected);
      expect(generateThumbnail).toHaveBeenCalledTimes(group === 'theme' ? 0 : 1);
      expect(imageService.getReferencedImageManifest()[group]).toEqual(expected);
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it.each(['theme', 'content'] as const)('keeps native camera thumbnail handling consistent for %s images', async group => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    vi.spyOn(Filesystem, 'readFile').mockResolvedValue({ data: 'aW1hZ2U=' });
    const writeImage = vi.spyOn(imageService, 'writeImage').mockResolvedValue(undefined);
    vi.spyOn(imageService, 'checkFileExists').mockResolvedValue(true);
    const generateThumbnail = vi.spyOn(imageService as any, 'generateThumbnail').mockResolvedValue(new Blob(['thumb']));
    try {
      const filename = await imageService.saveNativeCameraImage('camera/photo.png', 'png', group);
      const expected = group === 'theme' ? [filename] : [filename, `thumb_${filename}`];
      expect(writeImage.mock.calls.map(([name]) => name)).toEqual(expected);
      expect(generateThumbnail).toHaveBeenCalledTimes(group === 'theme' ? 0 : 1);
      expect(imageService.getReferencedImageManifest()[group]).toEqual(expected);
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
