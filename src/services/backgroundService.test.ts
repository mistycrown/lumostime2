/**
 * @file backgroundService.test.ts
 * @input Custom background metadata with runtime image URLs
 * @output Regression coverage for localStorage-safe background persistence
 * @description Verifies that image bytes are never serialized into the background metadata record.
 * @updated 2026-09-20: Added coverage for Base64 and image-backed background sanitization.
 */

import { describe, expect, it } from 'vitest';
import { sanitizeBackgroundForStorage } from './backgroundService';

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
