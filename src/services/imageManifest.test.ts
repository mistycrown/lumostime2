/**
 * @file imageManifest.test.ts
 * @input Legacy flat manifests and grouped content/theme manifests
 * @output Regression coverage for manifest normalization and cloud serialization
 * @pos Test
 * @description Verifies grouped image manifest behavior and compatibility with the old flat image-list format.
 * @updated 2026-09-25: Added coverage for group normalization, deduplication, and legacy fallback.
 */

import { describe, expect, it } from 'vitest';
import {
  buildCloudImageManifest,
  flattenImageManifestGroups,
  normalizeCloudImageManifest,
  normalizeImageManifestGroups
} from './imageManifest';

describe('image manifest groups', () => {
  it('deduplicates entries and gives theme ownership precedence', () => {
    const groups = normalizeImageManifestGroups({
      content: ['log.jpg', 'shared.jpg', 'log.jpg'],
      theme: ['theme.png', 'shared.jpg']
    });

    expect(groups).toEqual({
      content: ['log.jpg'],
      theme: ['theme.png', 'shared.jpg']
    });
    expect(flattenImageManifestGroups(groups)).toEqual(['log.jpg', 'theme.png', 'shared.jpg']);
  });

  it('reads legacy flat cloud manifests without losing files', () => {
    const normalized = normalizeCloudImageManifest({
      images: ['a.jpg', 'thumb_a.jpg'],
      timestamp: 42,
      version: '1.0.0'
    });

    expect(normalized.hasGroups).toBe(false);
    expect(normalized.images).toEqual(['a.jpg', 'thumb_a.jpg']);
  });

  it('serializes grouped manifests with a flattened compatibility field', () => {
    const manifest = buildCloudImageManifest({
      content: ['log.jpg'],
      theme: ['theme.png']
    }, 42);

    expect(manifest).toEqual({
      version: '2.0.0',
      timestamp: 42,
      images: ['log.jpg', 'theme.png'],
      groups: {
        content: ['log.jpg'],
        theme: ['theme.png']
      }
    });
  });
});
