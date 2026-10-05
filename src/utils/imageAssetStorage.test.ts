/**
 * @file imageAssetStorage.test.ts
 * @input Legacy theme snapshots with embedded images and file references
 * @output Regression coverage for lossless metadata compaction
 * @pos Test (Image Storage)
 * @updated 2026-10-05: Covers saved snapshots and URL-only legacy image preservation.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeAppearanceImageStorage, sanitizeThemePresetsForStorage } from './imageAssetStorage';

describe('appearance image storage', () => {
  it('compacts every affected image list without changing selections or adjustment settings', () => {
    const asset = { id: 'custom', imageFilename: 'image.png', url: 'data:image/png;base64,large', thumbnail: 'blob:temporary', opacity: 0.8 };
    const lists = Object.fromEntries([
      'lumos_custom_backgrounds', 'navigation_decoration_custom_list', 'navigation_new_background_custom_list',
      'navigation_icon_custom_list_v1', 'mood_calendar_fill_background_custom_list'
    ].map((key) => [key, JSON.stringify([asset])]));
    const storage: Record<string, string> = { ...lists, navigation_new_background: 'custom', navigation_new_background_settings: '{"custom":{"scale":1.4}}' };
    const compacted = sanitizeAppearanceImageStorage(storage);

    Object.keys(lists).forEach((key) => {
      expect(JSON.parse(compacted[key]!)).toEqual([{ ...asset, url: '', thumbnail: '' }]);
    });
    expect(compacted.navigation_new_background).toBe('custom');
    expect(compacted.navigation_new_background_settings).toBe(storage.navigation_new_background_settings);
    expect(storage.navigation_icon_custom_list_v1).toContain('data:');
  });

  it('preserves the sole copy of URL-only legacy images inside saved themes', () => {
    const presets = [{ id: 'old-theme', name: 'Old theme', snapshot: { version: 1, storage: {
      navigation_decoration_custom_list: JSON.stringify([
        { id: 'legacy', url: 'data:image/png;base64,only-copy' },
        { id: 'migrated', imageFilename: 'saved.png', url: 'data:image/png;base64,duplicate' }
      ])
    } } }];
    const compacted = sanitizeThemePresetsForStorage(presets);

    expect(JSON.parse(compacted[0].snapshot.storage.navigation_decoration_custom_list)).toEqual([
      { id: 'legacy', url: 'data:image/png;base64,only-copy' },
      { id: 'migrated', imageFilename: 'saved.png', url: '' }
    ]);
    expect(compacted[0]).toMatchObject({ id: 'old-theme', name: 'Old theme', snapshot: { version: 1 } });
    expect(presets[0].snapshot.storage.navigation_decoration_custom_list).toContain('duplicate');
  });
});
