/**
 * @file imagePreviewUtils.test.ts
 * @input Preview item source lists, requested initial indexes, and image/viewport dimensions
 * @output Regression coverage for grouped-image preview normalization and long-image detection
 * @updated 2026-10-01: Added coverage for the shared multi-image preview helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  getInitialPreviewIndex,
  isLongPreviewImage,
  normalizeImagePreviewItems
} from './imagePreviewUtils';

describe('normalizeImagePreviewItems', () => {
  it('keeps the legacy one-image URL and download filename available', () => {
    expect(normalizeImagePreviewItems('blob:legacy-preview', undefined, 'photo.jpg')).toEqual([
      { source: 'blob:legacy-preview', downloadFilename: 'photo.jpg' }
    ]);
  });

  it('uses the supplied ordered attachment group instead of the legacy URL', () => {
    expect(normalizeImagePreviewItems('blob:current', [
      { source: 'first.jpg', downloadFilename: 'first.jpg' },
      'https://example.com/second.jpg',
      { source: '' }
    ])).toEqual([
      { source: 'first.jpg', downloadFilename: 'first.jpg' },
      { source: 'https://example.com/second.jpg' }
    ]);
  });
});

describe('getInitialPreviewIndex', () => {
  it('clamps invalid selections while preserving a valid clicked attachment', () => {
    expect(getInitialPreviewIndex(undefined, 3)).toBe(0);
    expect(getInitialPreviewIndex(1, 3)).toBe(1);
    expect(getInitialPreviewIndex(-1, 3)).toBe(0);
    expect(getInitialPreviewIndex(9, 3)).toBe(2);
    expect(getInitialPreviewIndex(0, 0)).toBe(0);
  });
});

describe('isLongPreviewImage', () => {
  it('only marks images that overflow the viewport after fitting to width', () => {
    expect(isLongPreviewImage(1000, 1600, 360, 576)).toBe(false);
    expect(isLongPreviewImage(1000, 1601, 360, 576)).toBe(true);
    expect(isLongPreviewImage(0, 3000, 360, 576)).toBe(false);
  });
});
