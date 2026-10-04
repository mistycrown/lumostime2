/**
 * @file imageService.test.ts
 * @input Image formats, stored manifests, and persisted theme image references
 * @output Regression coverage for image formats and theme manifest rebuilding
 * @pos Test (Image Management)
 * @updated 2026-10-04: Protects modern navigation backgrounds during manifest rebuild and cleanup.
 */
import { describe, expect, it, vi } from 'vitest';

import { imageService } from './imageService';

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
    values.set('lumos_referenced_images', JSON.stringify(['theme.png', 'log.jpg']));
    expect(imageService.getReferencedImageManifest()).toEqual({
      content: ['log.jpg'],
      theme: ['theme.png']
    });

    vi.unstubAllGlobals();
  });

  it('retains modern navigation originals and thumbnails in the theme manifest and cleanup', async () => {
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
      expect(imageService.getReferencedImageManifest()).toEqual({ content: [], theme: images });
      expect(await imageService.rebuildReferencedListFromLogs([])).toEqual(images);
      expect(imageService.getReferencedImageManifest()).toEqual({ content: [], theme: images });
      expect(await imageService.cleanupUnreferencedImages([])).toEqual({ cleaned: 0, kept: 2 });
    } finally {
      listImages.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
