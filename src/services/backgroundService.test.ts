/**
 * @file backgroundService.test.ts
 * @input Custom background metadata with runtime image URLs
 * @output Regression coverage for localStorage-safe background persistence
 * @description Verifies that image bytes are never serialized into the background metadata record.
 * @updated 2026-09-20: Added coverage for Base64 and image-backed background sanitization.
 * @updated 2026-09-28: Covers full-range main-background opacity persistence and clamping.
 */

import { describe, expect, it } from 'vitest';
import { backgroundService, sanitizeBackgroundForStorage } from './backgroundService';

describe('sanitizeBackgroundForStorage', () => {
  it('removes runtime URLs when an image reference is available', () => {
    const result = sanitizeBackgroundForStorage({
      id: 'custom-1',
      name: 'Photo',
      type: 'custom',
      url: 'data:image/jpeg;base64,large-image',
      thumbnail: 'data:image/jpeg;base64,large-thumbnail',
      imageFilename: 'photo.jpg',
    });

    expect(result.url).toBe('');
    expect(result.thumbnail).toBeUndefined();
    expect(result.imageFilename).toBe('photo.jpg');
  });

  it('removes legacy Base64 URLs even before an image reference is available', () => {
    const result = sanitizeBackgroundForStorage({
      id: 'legacy-1',
      name: 'Legacy',
      type: 'custom',
      url: 'data:image/png;base64,legacy-image',
      thumbnail: 'data:image/png;base64,legacy-thumbnail',
    });

    expect(result.url).toBe('');
    expect(result.thumbnail).toBeUndefined();
  });

  it('keeps lightweight non-data URLs for non-image-backed records', () => {
    const result = sanitizeBackgroundForStorage({
      id: 'custom-2',
      name: 'File URL',
      type: 'custom',
      url: 'capacitor://localhost/_capacitor_file_/background.jpg',
      thumbnail: 'capacitor://localhost/_capacitor_file_/background.jpg',
    });

    expect(result.url).toContain('capacitor://');
    expect(result.thumbnail).toContain('capacitor://');
  });
});

describe('background opacity', () => {
  it('persists the full 0–100% range and clamps invalid values', () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      },
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { getElementById: () => null },
    });

    backgroundService.setBackgroundOpacity(1);
    expect(backgroundService.getBackgroundOpacity()).toBe(1);

    backgroundService.setBackgroundOpacity(1.5);
    expect(backgroundService.getBackgroundOpacity()).toBe(1);

    backgroundService.setBackgroundOpacity(-0.2);
    expect(backgroundService.getBackgroundOpacity()).toBe(0);
  });
});
