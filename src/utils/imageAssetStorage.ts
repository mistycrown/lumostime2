/**
 * @file imageAssetStorage.ts
 * @input Image-backed settings records and appearance storage snapshots
 * @output Metadata-only records suitable for localStorage and backups
 * @pos Utility (Image Storage)
 * @updated 2026-10-05: Removes duplicate image URLs while preserving legacy assets without file references.
 */

interface StoredImageAsset {
  imageFilename?: string;
  url?: string;
  thumbnail?: string;
}

export const sanitizeImageAssetForStorage = <T extends StoredImageAsset>(asset: T): T => {
  // A legacy URL may be the only remaining copy until its image migration succeeds.
  if (!asset.imageFilename) return asset;
  return {
    ...asset,
    url: '',
    ...(Object.prototype.hasOwnProperty.call(asset, 'thumbnail') ? { thumbnail: '' } : {})
  };
};

const IMAGE_LIST_KEYS = [
  'lumos_custom_backgrounds',
  'navigation_decoration_custom_list',
  'navigation_new_background_custom_list',
  'navigation_icon_custom_list_v1',
  'mood_calendar_fill_background_custom_list'
];

export const sanitizeThemePresetsForStorage = <T extends { snapshot?: { storage: Record<string, string | null> } }>(
  presets: T[]
): T[] => presets.map((preset) => {
  const snapshot = preset?.snapshot;
  if (!snapshot?.storage || typeof snapshot.storage !== 'object' || Array.isArray(snapshot.storage)) return preset;
  return { ...preset, snapshot: { ...snapshot, storage: sanitizeAppearanceImageStorage(snapshot.storage) } };
});

export const sanitizeAppearanceImageStorage = (
  storage: Record<string, string | null>
): Record<string, string | null> => {
  const next = { ...storage };
  IMAGE_LIST_KEYS.forEach((key) => {
    const raw = next[key];
    if (!raw) return;
    try {
      const list: unknown = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      next[key] = JSON.stringify(list.map((asset) => (
        asset && typeof asset === 'object' ? sanitizeImageAssetForStorage(asset) : asset
      )));
    } catch { /* Leave malformed legacy settings for the existing readers to handle. */ }
  });

  // Saved themes can contain another copy of the same large image lists.
  const presets = next.lumostime_custom_presets;
  if (presets) {
    try {
      const list: unknown = JSON.parse(presets);
      if (Array.isArray(list)) {
        next.lumostime_custom_presets = JSON.stringify(sanitizeThemePresetsForStorage(list));
      }
    } catch { /* Preserve unreadable preset data. */ }
  }
  return next;
};
