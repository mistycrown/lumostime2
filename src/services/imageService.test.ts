import { describe, expect, it } from 'vitest';

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
});
