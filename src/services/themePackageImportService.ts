/**
 * @file themePackageImportService.ts
 * @input Valid LumoTime theme ZIP files
 * @output Persisted theme package metadata, synchronized image resources, and local-only font resources
 * @pos Service (Theme Package Import)
 * @description Imports validated theme package resources transactionally while keeping fonts local to the current device.
 * @updated 2026-09-26: Added transactional image and local-font persistence for versioned theme packages.
 * @updated 2026-09-26: Preserves a package's local font when an update omits the font section.
 * @updated 2026-09-26: Replaces matching package IDs directly and removes package-owned resources on deletion.
 * @updated 2026-09-27: Resolves the first packaged UI icon from both declared and archived asset paths for theme-card previews.
 * @updated 2026-09-27: Registers a package-owned card-background group on import so it shares the image sync lifecycle.
 * @updated 2026-09-27: Migrates stable theme sticker IDs to replacement image filenames during package updates.
 * @updated 2026-09-28: Retains package images that remain referenced by independent user settings during deletion or replacement.
 * @updated 2026-09-28: Supports retaining package resources after deleting a theme and resolving same-package reimports.
 */

import { THEME_KEYS, TIMEPAL_KEYS, storage } from '../constants/storageKeys';
import { DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK } from './achievementBottleIconPackService';
import { fontService } from './fontService';
import { imageService } from './imageService';
import { getSettingsReferencedImages } from './settingsImageReferenceService';
import {
  parseThemePackage,
  type ThemePackageManifest
} from './themePackageService';
import { APPEARANCE_RESTORED_EVENT } from './appearanceBackupService';
import { CARD_BACKGROUND_CHANGED_EVENT, CARD_BACKGROUND_CURRENT_KEY, CARD_BACKGROUND_GROUPS_KEY } from './cardBackgroundService';
import { dataRepository, REVIEW_ENTRIES_UPDATED_EVENT } from '../repositories/dataRepository';

const LOCAL_THEME_PACKAGE_ASSETS_KEY = 'lumostime_theme_package_local_assets_v1';
const RETAINED_THEME_PACKAGE_RESOURCES_KEY = 'lumostime_retained_theme_package_resources_v1';
const THEME_PACKAGE_IMPORTED_EVENT = 'lumostime:theme-package-imported';
const CUSTOM_STICKER_SETS_KEY = 'lumostime_custom_sticker_sets_v2';
const CUSTOM_STICKERS_KEY = 'lumostime_custom_stickers_v2';
const STICKER_SELECTOR_CONFIG_KEY = 'lumostime_sticker_selector_config';
const DEFAULT_SELECTOR_PAGE_KEY = 'lumostime_default_selector_page';

const IMAGE_EXTENSIONS = new Set(['bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);
const FONT_EXTENSIONS = new Set(['woff', 'woff2', 'ttf', 'otf']);

export interface ImportedThemePackageRecord {
  id: string;
  /** Original manifest package ID when this is a separately imported copy. */
  sourcePackageId?: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  manifest: ThemePackageManifest;
  imageAssets: Record<string, string>;
  previewImageFilename?: string;
  importedAt: number;
  updatedAt: number;
}

const UI_ICON_FIRST_IMAGE_PATTERN = /(?:^|\/)01\.(?:bmp|gif|jpe?g|png|svg|webp)$/i;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const registerPackageCardBackgroundGroup = (record: ImportedThemePackageRecord): boolean => {
  const cardBackgroundGroups = record.manifest.resources?.cardBackgroundGroups;
  if (!Array.isArray(cardBackgroundGroups) || cardBackgroundGroups.length !== 1 || !isRecord(cardBackgroundGroups[0])) {
    return false;
  }

  const group = cardBackgroundGroups[0];
  const groupId = typeof group.id === 'string' ? group.id.trim() : '';
  const files = Array.isArray(group.files) ? group.files : [];
  const imageFilenames = files
    .filter((file): file is string => typeof file === 'string')
    .map((file) => record.imageAssets[file])
    .filter((filename): filename is string => typeof filename === 'string' && filename.length > 0);
  if (!groupId || imageFilenames.length === 0) return false;

  const id = `theme:${record.id}:card-background-${groupId}`;
  let existingGroups: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CARD_BACKGROUND_GROUPS_KEY) || '[]');
    if (Array.isArray(parsed)) existingGroups = parsed.filter(isRecord);
  } catch { /* Preserve malformed user settings instead of replacing them. */ }

  const alignment = group.alignment === 'right-top' || group.alignment === 'right-bottom'
    ? group.alignment
    : 'right';
  localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify([
    ...existingGroups.filter((item) => item.id !== id),
    {
      id,
      name: typeof group.name === 'string' && group.name.trim() ? group.name.trim() : record.name,
      imageFilenames,
      alignment
    }
  ]));
  return true;
};

export const getThemePackageUiIconPreviewFallbackFilename = (
  record: ImportedThemePackageRecord
): string | undefined => {
  const uiIcon = record.manifest.config.uiIcon;
  const files = uiIcon && typeof uiIcon === 'object' && !Array.isArray(uiIcon)
    ? (uiIcon as Record<string, unknown>).files
    : undefined;
  const declaredPaths = files && typeof files === 'object' && !Array.isArray(files)
    ? Object.values(files).filter((path): path is string => typeof path === 'string')
    : [];
  const archivedUiIconPaths = Object.keys(record.imageAssets)
    .filter((path) => /(?:^|\/)uiicon(?:\/|$)/i.test(path));
  const paths = Array.from(new Set([...declaredPaths, ...archivedUiIconPaths]));
  const firstPath = paths.find((path) => UI_ICON_FIRST_IMAGE_PATTERN.test(path)) || paths[0];
  return firstPath ? record.imageAssets[firstPath] : undefined;
};

export interface LocalThemePackageAssets {
  packageId: string;
  version: string;
  fontId?: string;
}

export interface RetainedThemePackageResources {
  sourcePackageId: string;
  record: ImportedThemePackageRecord;
  localAssets?: LocalThemePackageAssets;
  retainedAt: number;
}

export type ThemePackageResourceResolution = 'overwrite' | 'keep';

export interface ThemePackageImportOptions {
  retainedResourceResolution?: ThemePackageResourceResolution;
}

export interface ThemePackageDeleteOptions {
  deleteResources?: boolean;
}

export interface ThemePackageImportResult {
  record: ImportedThemePackageRecord;
  localAssets: LocalThemePackageAssets;
  replacedVersion?: string;
}

export type ThemePackageImportErrorCode =
  | 'DUPLICATE_NAME'
  | 'FONT_IMPORT_FAILED'
  | 'PERSISTENCE_FAILED'
  | 'RETAINED_RESOURCES_CONFLICT';

export class ThemePackageImportError extends Error {
  readonly code: ThemePackageImportErrorCode;

  readonly packageId?: string;
  readonly packageName?: string;

  constructor(code: ThemePackageImportErrorCode, message: string, packageInfo?: { packageId: string; packageName: string }) {
    super(message);
    this.name = 'ThemePackageImportError';
    this.code = code;
    this.packageId = packageInfo?.packageId;
    this.packageName = packageInfo?.packageName;
  }
}

const getExtension = (path: string): string => {
  const filename = path.split('/').pop() || '';
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex < 0 ? '' : filename.slice(dotIndex + 1).toLowerCase();
};

const getFilename = (path: string): string => path.split('/').pop() || path;

const readImportedThemePackages = (): ImportedThemePackageRecord[] => {
  const records = storage.getJSON<ImportedThemePackageRecord[]>(THEME_KEYS.IMPORTED_THEME_PACKAGES, []);
  return Array.isArray(records) ? records : [];
};

const readLocalThemePackageAssets = (): LocalThemePackageAssets[] => {
  try {
    const raw = localStorage.getItem(LOCAL_THEME_PACKAGE_ASSETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalThemePackageAssets = (records: LocalThemePackageAssets[]): void => {
  localStorage.setItem(LOCAL_THEME_PACKAGE_ASSETS_KEY, JSON.stringify(records));
};

const readRetainedThemePackageResources = (): RetainedThemePackageResources[] => {
  try {
    const raw = localStorage.getItem(RETAINED_THEME_PACKAGE_RESOURCES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is RetainedThemePackageResources => (
      isRecord(item)
      && typeof item.sourcePackageId === 'string'
      && isRecord(item.record)
      && typeof item.record.id === 'string'
    )) : [];
  } catch {
    return [];
  }
};

const writeRetainedThemePackageResources = (records: RetainedThemePackageResources[]): void => {
  localStorage.setItem(RETAINED_THEME_PACKAGE_RESOURCES_KEY, JSON.stringify(records));
};

const getSourcePackageId = (record: ImportedThemePackageRecord): string => record.sourcePackageId || record.id;

const getPackageUiIconThemeId = (record: ImportedThemePackageRecord, configuredThemeId?: string): string => {
  const themeId = configuredThemeId || record.id;
  return record.sourcePackageId ? `theme:${record.id}:uiicon-${themeId}` : themeId;
};

const createRetainedCopyId = (sourcePackageId: string, records: ImportedThemePackageRecord[]): string => {
  const seed = Date.now().toString(36);
  let sequence = 0;
  let candidate = `${sourcePackageId}--${seed}`;
  const usedIds = new Set(records.map((record) => record.id));
  while (usedIds.has(candidate)) {
    sequence += 1;
    candidate = `${sourcePackageId}--${seed}-${sequence}`;
  }
  return candidate;
};

const parseVersion = (version: string): [number, number, number] => {
  const [major = '0', minor = '0', patch = '0'] = version.split(/[+-]/, 1)[0].split('.');
  return [Number(major), Number(minor), Number(patch)];
};

export const compareThemePackageVersions = (first: string, second: string): number => {
  const firstParts = parseVersion(first);
  const secondParts = parseVersion(second);

  for (let index = 0; index < firstParts.length; index += 1) {
    if (firstParts[index] !== secondParts[index]) {
      return firstParts[index] > secondParts[index] ? 1 : -1;
    }
  }

  return first.localeCompare(second);
};

const getThemeFontConfig = (manifest: ThemePackageManifest): {
  file: string;
  displayName?: string;
} | null => {
  const font = manifest.config.font;
  if (!font || typeof font !== 'object' || Array.isArray(font)) {
    return null;
  }

  const candidate = font as Record<string, unknown>;
  if (candidate.source !== 'asset' || typeof candidate.file !== 'string') {
    return null;
  }

  return {
    file: candidate.file,
    displayName: typeof candidate.displayName === 'string' ? candidate.displayName : undefined
  };
};

const rollbackSavedImages = async (filenames: string[]): Promise<void> => {
  for (const filename of [...filenames].reverse()) {
    imageService.removeFromReferencedList(filename);
    await imageService.deleteImageLocalOnly(filename).catch(() => undefined);
    await imageService.deleteImageLocalOnly(`thumb_${filename}`).catch(() => undefined);
  }
};

const deleteUnreferencedPackageImages = async (filenames: string[]): Promise<void> => {
  const retained = new Set([
    ...getSettingsReferencedImages(),
    ...imageService.getReferencedImageManifest().content
  ]);
  for (const filename of new Set(filenames)) {
    if (retained.has(filename) || retained.has(`thumb_${filename}`)) continue;
    await imageService.deleteImage(filename).catch(() => undefined);
  }
};

const getPackageStickerImageMap = (record: ImportedThemePackageRecord): {
  setIds: Set<string>;
  imageFilenamesByStickerId: Map<string, string>;
} => {
  const prefix = `theme:${record.id}:`;
  const setIds = new Set<string>();
  const imageFilenamesByStickerId = new Map<string, string>();
  const stickerSets = record.manifest.config.stickers;
  if (!Array.isArray(stickerSets)) return { setIds, imageFilenamesByStickerId };

  stickerSets.forEach((rawSet, setIndex) => {
    if (!isRecord(rawSet)) return;
    const setKey = String(rawSet.id || setIndex);
    const setId = `${prefix}sticker-set-${setKey}`;
    setIds.add(setId);
    const items = Array.isArray(rawSet.items) ? rawSet.items : [];
    items.forEach((rawItem, itemIndex) => {
      if (!isRecord(rawItem) || typeof rawItem.file !== 'string') return;
      const imageFilename = record.imageAssets[rawItem.file];
      if (!imageFilename) return;
      imageFilenamesByStickerId.set(
        `${prefix}sticker-${setKey}-${String(rawItem.id || itemIndex)}`,
        imageFilename
      );
    });
  });
  return { setIds, imageFilenamesByStickerId };
};

const migratePackageStickerMoodReferences = async (
  previousImageFilenamesByStickerId: Map<string, string>,
  nextImageFilenamesByStickerId: Map<string, string>
): Promise<boolean> => {
  const replacementFilenames = new Map<string, string>();
  previousImageFilenamesByStickerId.forEach((previousFilename, stickerId) => {
    const nextFilename = nextImageFilenamesByStickerId.get(stickerId);
    if (nextFilename && nextFilename !== previousFilename) {
      replacementFilenames.set(previousFilename, nextFilename);
    }
  });
  if (replacementFilenames.size === 0) return false;

  const snapshot = await dataRepository.loadReviewEntriesSnapshot();
  let changed = false;
  const dailyReviews = snapshot.dailyReviews.map((review) => {
    const moodEmoji = review.moodEmoji;
    if (typeof moodEmoji !== 'string' || !moodEmoji.startsWith('image:')) return review;
    const nextFilename = replacementFilenames.get(moodEmoji.slice('image:'.length));
    if (!nextFilename) return review;
    changed = true;
    return { ...review, moodEmoji: `image:${nextFilename}` };
  });
  if (changed) {
    await dataRepository.saveDailyReviews(dailyReviews);
  }
  return changed;
};

const migratePackageStickers = async (
  previousRecord: ImportedThemePackageRecord,
  nextRecord: ImportedThemePackageRecord
): Promise<boolean> => {
  const prefix = `theme:${previousRecord.id}:`;
  const { imageFilenamesByStickerId: previousImageFilenamesByStickerId } = getPackageStickerImageMap(previousRecord);
  const { setIds, imageFilenamesByStickerId: nextImageFilenamesByStickerId } = getPackageStickerImageMap(nextRecord);
  const migratedMoodReferences = await migratePackageStickerMoodReferences(
    previousImageFilenamesByStickerId,
    nextImageFilenamesByStickerId
  );
  try {
    const rawSets = JSON.parse(localStorage.getItem(CUSTOM_STICKER_SETS_KEY) || '[]');
    const rawStickers = JSON.parse(localStorage.getItem(CUSTOM_STICKERS_KEY) || '[]');
    if (!Array.isArray(rawSets) || !Array.isArray(rawStickers)) return migratedMoodReferences;

    const now = Date.now();
    const stickers = rawStickers.flatMap((rawSticker) => {
      if (!isRecord(rawSticker)) return [];
      const stickerId = String(rawSticker.id || '');
      if (!stickerId.startsWith(`${prefix}sticker-`)) return [rawSticker];
      const imageFilename = nextImageFilenamesByStickerId.get(stickerId);
      if (!imageFilename) return [];
      return [{
        ...rawSticker,
        imageFilename,
        thumbnailFilename: `thumb_${imageFilename}`,
        updatedAt: now
      }];
    });
    const stickerIdsBySet = new Map<string, string[]>();
    stickers.forEach((sticker) => {
      if (!isRecord(sticker)) return;
      const setId = String(sticker.setId || '');
      const stickerIds = stickerIdsBySet.get(setId) || [];
      stickerIds.push(String(sticker.id || ''));
      stickerIdsBySet.set(setId, stickerIds);
    });
    const sets = rawSets.flatMap((rawSet) => {
      if (!isRecord(rawSet)) return [];
      const setId = String(rawSet.id || '');
      if (!setId.startsWith(`${prefix}sticker-set-`)) return [rawSet];
      const stickerIds = stickerIdsBySet.get(setId) || [];
      if (!setIds.has(setId) || stickerIds.length === 0) return [];
      return [{ ...rawSet, stickerIds, updatedAt: now }];
    });
    localStorage.setItem(CUSTOM_STICKER_SETS_KEY, JSON.stringify(sets));
    localStorage.setItem(CUSTOM_STICKERS_KEY, JSON.stringify(stickers));

    const availableSetIds = new Set(sets.filter(isRecord).map((set) => String(set.id || '')));
    const selector = JSON.parse(localStorage.getItem(STICKER_SELECTOR_CONFIG_KEY) || '{"enabled":false,"groups":[]}');
    if (isRecord(selector) && Array.isArray(selector.groups)) {
      const groups = selector.groups.flatMap((rawGroup) => {
        if (!isRecord(rawGroup)) return [];
        const sourceSetIds = Array.isArray(rawGroup.sourceSetIds)
          ? rawGroup.sourceSetIds.filter((id): id is string => (
            typeof id === 'string' && (!id.startsWith(`${prefix}sticker-set-`) || availableSetIds.has(id))
          ))
          : [];
        return sourceSetIds.length > 0 ? [{ ...rawGroup, sourceSetIds }] : [];
      });
      localStorage.setItem(STICKER_SELECTOR_CONFIG_KEY, JSON.stringify({
        enabled: selector.enabled === true && groups.length > 0,
        groups
      }));
    }

    const currentPage = localStorage.getItem(DEFAULT_SELECTOR_PAGE_KEY) || '';
    if (currentPage.startsWith(`${prefix}sticker-set-`) && !availableSetIds.has(currentPage)) {
      localStorage.setItem(DEFAULT_SELECTOR_PAGE_KEY, 'emoji');
    }
  } catch { /* Preserve malformed user settings for manual recovery. */ }
  return migratedMoodReferences;
};

const removePackageDerivedState = (
  record: ImportedThemePackageRecord,
  options: { preserveStickers?: boolean } = {}
): void => {
  const prefix = `theme:${record.id}:`;
  const removeArrayItems = (key: string, idOf: (item: Record<string, unknown>) => string): void => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) {
        localStorage.setItem(key, JSON.stringify(parsed.filter((item) => !idOf(item || {}).startsWith(prefix))));
      }
    } catch { /* Preserve malformed user data for manual recovery. */ }
  };
  const removeObjectKey = (key: string, objectKey: string): void => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        delete parsed[objectKey];
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch { /* Preserve malformed user data for manual recovery. */ }
  };

  removeArrayItems('lumos_custom_backgrounds', (item) => String(item.id || ''));
  removeArrayItems('navigation_new_background_custom_list', (item) => String(item.id || ''));
  removeArrayItems('navigation_decoration_custom_list', (item) => String(item.id || ''));
  removeArrayItems('navigation_icon_custom_list_v1', (item) => String(item.id || ''));
  removeArrayItems('navigation_icon_schemes_v1', (item) => String(item.id || ''));
  removeArrayItems(TIMEPAL_KEYS.CUSTOM_ITEMS, (item) => String(item.id || ''));
  removeArrayItems(CARD_BACKGROUND_GROUPS_KEY, (item) => String(item.id || ''));

  if (!options.preserveStickers) {
    const setIds = new Set<string>();
    try {
      const sets = JSON.parse(localStorage.getItem(CUSTOM_STICKER_SETS_KEY) || '[]');
      if (Array.isArray(sets)) {
        sets.forEach((item) => {
          const id = String(item?.id || '');
          if (id.startsWith(`${prefix}sticker-set-`)) setIds.add(id);
        });
        localStorage.setItem(CUSTOM_STICKER_SETS_KEY, JSON.stringify(sets.filter((item) => !setIds.has(String(item?.id || '')))));
      }
      const stickers = JSON.parse(localStorage.getItem(CUSTOM_STICKERS_KEY) || '[]');
      if (Array.isArray(stickers)) {
        localStorage.setItem(CUSTOM_STICKERS_KEY, JSON.stringify(stickers.filter((item) => !setIds.has(String(item?.setId || '')))));
      }
    } catch { /* Preserve malformed user data for manual recovery. */ }
  }

  removeArrayItems('mood_calendar_fill_background_custom_list', (item) => String(item.id || ''));
  removeObjectKey('navigation_new_background_settings', `${prefix}navigation-background`);

  const clearNamespacedSelection = (key: string, fallback: string): void => {
    const current = localStorage.getItem(key) || '';
    if (current.startsWith(prefix)) localStorage.setItem(key, fallback);
  };
  clearNamespacedSelection(THEME_KEYS.CURRENT_BACKGROUND, 'default');
  clearNamespacedSelection(THEME_KEYS.NAVIGATION_DECORATION, 'default');
  clearNamespacedSelection('navigation_new_background', 'default');
  clearNamespacedSelection('mood_calendar_fill_background', 'none');
  clearNamespacedSelection(CARD_BACKGROUND_CURRENT_KEY, '');

  const navigationSelectionKey = 'navigation_icon_selection_v1';
  try {
    const selection = JSON.parse(localStorage.getItem(navigationSelectionKey) || '{}');
    if (typeof selection.schemeId === 'string' && selection.schemeId.startsWith(prefix)) {
      localStorage.setItem(navigationSelectionKey, JSON.stringify({ ...selection, mode: 'text', schemeId: undefined, customMapping: {} }));
    }
  } catch { /* Preserve malformed user data for manual recovery. */ }

  const uiIconConfig = record.manifest.config.uiIcon;
  const uiIconThemeId = getPackageUiIconThemeId(
    record,
    uiIconConfig && typeof uiIconConfig === 'object' && !Array.isArray(uiIconConfig)
      && typeof (uiIconConfig as Record<string, unknown>).themeId === 'string'
      ? String((uiIconConfig as Record<string, unknown>).themeId)
      : undefined
  );
  if (localStorage.getItem(THEME_KEYS.UI_ICON_THEME) === uiIconThemeId) {
    localStorage.setItem(THEME_KEYS.UI_ICON_THEME, 'default');
  }
  const currentIconPack = localStorage.getItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK) || '';
  if (currentIconPack.startsWith(prefix)) {
    localStorage.setItem(THEME_KEYS.ACHIEVEMENT_BOTTLE_ICON_PACK, DEFAULT_ACHIEVEMENT_BOTTLE_ICON_PACK);
  }

  const uiIcon = record.manifest.config.uiIcon;
  if (uiIcon && typeof uiIcon === 'object' && !Array.isArray(uiIcon)) {
    const uiIconConfig = uiIcon as Record<string, unknown>;
    if (uiIconConfig.source === 'asset') {
      removeObjectKey(
        'lumostime_ui_icon_custom_assets_v1',
        getPackageUiIconThemeId(record, typeof uiIconConfig.themeId === 'string' ? uiIconConfig.themeId : undefined)
      );
    }
  }

  const removeNamespacedObjectKeys = (key: string, keyPrefix: string): void => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.keys(parsed).filter((id) => id.startsWith(keyPrefix)).forEach((id) => delete parsed[id]);
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch { /* Preserve malformed user data for manual recovery. */ }
  };
  removeNamespacedObjectKeys('lumostime_achievement_bottle_custom_icon_packs_v1', prefix);

  if (localStorage.getItem(THEME_KEYS.CURRENT_PRESET) === `package:${record.id}`) {
    localStorage.setItem(THEME_KEYS.CURRENT_PRESET, 'default');
  }
  if (!options.preserveStickers) {
    const defaultStickerPage = localStorage.getItem(DEFAULT_SELECTOR_PAGE_KEY) || '';
    if (defaultStickerPage.startsWith(`${prefix}sticker-set-`)) {
      localStorage.setItem(DEFAULT_SELECTOR_PAGE_KEY, 'emoji');
    }
    try {
      const selector = JSON.parse(localStorage.getItem(STICKER_SELECTOR_CONFIG_KEY) || '{"enabled":false,"groups":[]}');
      if (selector && Array.isArray(selector.groups)) {
        const groups = selector.groups.map((group: Record<string, unknown>) => ({
          ...group,
          sourceSetIds: Array.isArray(group.sourceSetIds)
            ? group.sourceSetIds.filter((id: unknown) => typeof id === 'string' && !id.startsWith(`${prefix}sticker-set-`))
            : []
        })).filter((group: Record<string, unknown>) => Array.isArray(group.sourceSetIds) && group.sourceSetIds.length > 0);
        localStorage.setItem(STICKER_SELECTOR_CONFIG_KEY, JSON.stringify({ enabled: selector.enabled === true && groups.length > 0, groups }));
      }
    } catch { /* Preserve malformed user data for manual recovery. */ }
  }

  const currentTimePal = localStorage.getItem(TIMEPAL_KEYS.TYPE) || '';
  if (currentTimePal.includes(prefix)) localStorage.setItem(TIMEPAL_KEYS.TYPE, 'none');
};

const deletePackageResources = async (
  record: ImportedThemePackageRecord,
  localAssets?: LocalThemePackageAssets
): Promise<void> => {
  removePackageDerivedState(record);

  const currentFontId = localStorage.getItem('lumostime_font_family');
  if (localAssets?.fontId) {
    if (localAssets.fontId === currentFontId) fontService.setFont('default');
    await fontService.removeCustomFont(localAssets.fontId).catch(() => undefined);
  }

  await deleteUnreferencedPackageImages(Object.values(record.imageAssets));
};

export const themePackageImportService = {
  getImportedPackages(): ImportedThemePackageRecord[] {
    return readImportedThemePackages();
  },

  getLocalAssets(packageId: string): LocalThemePackageAssets | undefined {
    return readLocalThemePackageAssets().find((item) => item.packageId === packageId);
  },

  getRetainedResources(sourcePackageId: string): RetainedThemePackageResources[] {
    return readRetainedThemePackageResources().filter((item) => item.sourcePackageId === sourcePackageId);
  },

  async deletePackage(packageId: string, options: ThemePackageDeleteOptions = {}): Promise<boolean> {
    const packages = readImportedThemePackages();
    const record = packages.find((item) => item.id === packageId);
    if (!record) return false;

    const nextPackages = packages.filter((item) => item.id !== packageId);
    if (!storage.setJSON(THEME_KEYS.IMPORTED_THEME_PACKAGES, nextPackages)) {
      throw new ThemePackageImportError('PERSISTENCE_FAILED', '主题记录删除失败');
    }
    const localAssets = readLocalThemePackageAssets();
    const deletedLocalAssets = localAssets.find((item) => item.packageId === packageId);
    writeLocalThemePackageAssets(localAssets.filter((item) => item.packageId !== packageId));
    const deleteResources = options.deleteResources !== false;
    if (deleteResources) {
      await deletePackageResources(record, deletedLocalAssets);
    } else {
      const retained = readRetainedThemePackageResources();
      writeRetainedThemePackageResources([
        ...retained,
        {
          sourcePackageId: getSourcePackageId(record),
          record,
          localAssets: deletedLocalAssets,
          retainedAt: Date.now()
        }
      ]);
      if (localStorage.getItem(THEME_KEYS.CURRENT_PRESET) === `package:${record.id}`) {
        localStorage.setItem(THEME_KEYS.CURRENT_PRESET, 'default');
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(THEME_PACKAGE_IMPORTED_EVENT, {
        detail: { packageId, deleted: true, resourcesDeleted: deleteResources }
      }));
      window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
      window.dispatchEvent(new Event('stickerSetsChanged'));
      window.dispatchEvent(new Event('imageListChanged'));
      window.dispatchEvent(new Event('timepal-custom-changed'));
      window.dispatchEvent(new Event(CARD_BACKGROUND_CHANGED_EVENT));
    }
    return true;
  },

  async importPackage(source: Blob | File, options: ThemePackageImportOptions = {}): Promise<ThemePackageImportResult> {
    const parsedPackage = await parseThemePackage(source);
    const { manifest, assets } = parsedPackage;
    const existingPackages = readImportedThemePackages();
    const sourcePackageId = manifest.package.id;
    const retainedResources = readRetainedThemePackageResources()
      .filter((item) => item.sourcePackageId === sourcePackageId);
    if (retainedResources.length > 0 && !options.retainedResourceResolution) {
      throw new ThemePackageImportError(
        'RETAINED_RESOURCES_CONFLICT',
        `“${manifest.package.name.trim()}” 的旧主题资源仍保留在本机。请选择覆盖旧资源或保留旧资源。`,
        { packageId: sourcePackageId, packageName: manifest.package.name.trim() }
      );
    }
    const recordId = options.retainedResourceResolution === 'keep' && retainedResources.length > 0
      ? createRetainedCopyId(sourcePackageId, existingPackages)
      : sourcePackageId;
    const existingRecord = existingPackages.find((record) => record.id === recordId);
    const conflictingName = existingPackages.find((record) => (
      record.id !== recordId
      && getSourcePackageId(record) !== sourcePackageId
      && record.name.trim().toLocaleLowerCase() === manifest.package.name.trim().toLocaleLowerCase()
    ));
    if (conflictingName) {
      throw new ThemePackageImportError('DUPLICATE_NAME', `已有同名主题「${conflictingName.name}」，请使用原主题包 ID 覆盖它`);
    }
    const existingLocalAssets = readLocalThemePackageAssets();
    const existingLocalRecord = existingLocalAssets.find((record) => record.packageId === recordId);

    const previousPackagesRaw = localStorage.getItem(THEME_KEYS.IMPORTED_THEME_PACKAGES);
    const previousLocalAssetsRaw = localStorage.getItem(LOCAL_THEME_PACKAGE_ASSETS_KEY);
    const previousRetainedResourcesRaw = localStorage.getItem(RETAINED_THEME_PACKAGE_RESOURCES_KEY);
    const savedImageFilenames: string[] = [];
    const imageAssets: Record<string, string> = {};
    let importedFontId: string | undefined;

    try {
      for (const [archivePath, blob] of assets) {
        if (!IMAGE_EXTENSIONS.has(getExtension(archivePath))) {
          continue;
        }

        const imageFilename = await imageService.saveImage(blob, 'theme');
        savedImageFilenames.push(imageFilename);
        imageAssets[archivePath] = imageFilename;
      }

      const fontConfig = getThemeFontConfig(manifest);
      if (fontConfig) {
        const fontBlob = assets.get(fontConfig.file);
        if (!fontBlob || !FONT_EXTENSIONS.has(getExtension(fontConfig.file))) {
          throw new ThemePackageImportError('FONT_IMPORT_FAILED', '主题字体资源不存在或格式不受支持');
        }

        const fontFile = new File([fontBlob], getFilename(fontConfig.file), { type: fontBlob.type });
        const fontResult = await fontService.addCustomFont(fontFile, fontConfig.displayName);
        if (!fontResult.success || !fontResult.fontId) {
          throw new ThemePackageImportError('FONT_IMPORT_FAILED', fontResult.message || '主题字体导入失败');
        }
        importedFontId = fontResult.fontId;
      }

      const now = Date.now();
      const record: ImportedThemePackageRecord = {
        id: recordId,
        ...(recordId !== sourcePackageId ? { sourcePackageId } : {}),
        name: manifest.package.name.trim(),
        version: manifest.package.version,
        author: manifest.package.author,
        description: manifest.package.description,
        manifest,
        imageAssets,
        previewImageFilename: manifest.package.preview
          ? imageAssets[manifest.package.preview]
          : undefined,
        importedAt: existingRecord?.importedAt || now,
        updatedAt: now
      };
      const localRecord: LocalThemePackageAssets = {
        packageId: recordId,
        version: manifest.package.version,
        fontId: importedFontId
      };

      const nextPackages = [
        ...existingPackages.filter((item) => item.id !== record.id),
        record
      ];
      const nextLocalAssets = [
        ...existingLocalAssets.filter((item) => item.packageId !== record.id),
        localRecord
      ];

      if (!storage.setJSON(THEME_KEYS.IMPORTED_THEME_PACKAGES, nextPackages)) {
        throw new ThemePackageImportError('PERSISTENCE_FAILED', '主题包元数据保存失败');
      }
      writeLocalThemePackageAssets(nextLocalAssets);

      let migratedMoodReferences = false;
      if (existingRecord) {
        migratedMoodReferences = await migratePackageStickers(existingRecord, record);
        removePackageDerivedState(existingRecord, { preserveStickers: true });
        await deleteUnreferencedPackageImages(Object.values(existingRecord.imageAssets));
      }

      if (existingLocalRecord?.fontId && existingLocalRecord.fontId !== localRecord.fontId) {
        if (localStorage.getItem('lumostime_font_family') === existingLocalRecord.fontId) {
          fontService.setFont('default');
        }
        await fontService.removeCustomFont(existingLocalRecord.fontId).catch(() => undefined);
      }

      if (options.retainedResourceResolution === 'overwrite' && retainedResources.length > 0) {
        writeRetainedThemePackageResources(readRetainedThemePackageResources().filter((item) => (
          item.sourcePackageId !== sourcePackageId
        )));
        for (const retained of retainedResources) {
          await deletePackageResources(retained.record, retained.localAssets);
        }
      }

      const registeredCardBackground = registerPackageCardBackgroundGroup(record);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(THEME_PACKAGE_IMPORTED_EVENT, {
          detail: { packageId: record.id, version: record.version }
        }));
        if (existingRecord) {
          window.dispatchEvent(new Event(APPEARANCE_RESTORED_EVENT));
          window.dispatchEvent(new Event('stickerSetsChanged'));
          window.dispatchEvent(new Event('imageListChanged'));
          if (migratedMoodReferences) window.dispatchEvent(new Event(REVIEW_ENTRIES_UPDATED_EVENT));
        }
        if (existingRecord || registeredCardBackground) window.dispatchEvent(new Event(CARD_BACKGROUND_CHANGED_EVENT));
      }

      return {
        record,
        localAssets: localRecord,
        replacedVersion: existingRecord?.version
      };
    } catch (error) {
      await rollbackSavedImages(savedImageFilenames);

      if (importedFontId) {
        await fontService.removeCustomFont(importedFontId).catch(() => undefined);
      }

      if (previousPackagesRaw === null) {
        localStorage.removeItem(THEME_KEYS.IMPORTED_THEME_PACKAGES);
      } else {
        localStorage.setItem(THEME_KEYS.IMPORTED_THEME_PACKAGES, previousPackagesRaw);
      }

      if (previousLocalAssetsRaw === null) {
        localStorage.removeItem(LOCAL_THEME_PACKAGE_ASSETS_KEY);
      } else {
        localStorage.setItem(LOCAL_THEME_PACKAGE_ASSETS_KEY, previousLocalAssetsRaw);
      }

      if (previousRetainedResourcesRaw === null) {
        localStorage.removeItem(RETAINED_THEME_PACKAGE_RESOURCES_KEY);
      } else {
        localStorage.setItem(RETAINED_THEME_PACKAGE_RESOURCES_KEY, previousRetainedResourcesRaw);
      }

      throw error;
    }
  }
};

export const THEME_PACKAGE_LOCAL_ASSETS_STORAGE_KEY = LOCAL_THEME_PACKAGE_ASSETS_KEY;
export const RETAINED_THEME_PACKAGE_RESOURCES_STORAGE_KEY = RETAINED_THEME_PACKAGE_RESOURCES_KEY;
export const THEME_PACKAGE_CHANGE_EVENT = THEME_PACKAGE_IMPORTED_EVENT;
