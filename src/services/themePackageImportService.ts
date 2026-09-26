/**
 * @file themePackageImportService.ts
 * @input Valid LumoTime theme ZIP files
 * @output Persisted theme package metadata, synchronized image resources, and local-only font resources
 * @pos Service (Theme Package Import)
 * @description Imports validated theme package resources transactionally while keeping fonts local to the current device.
 * @updated 2026-09-26: Added transactional image and local-font persistence for versioned theme packages.
 * @updated 2026-09-26: Preserves a package's local font when an update omits the font section.
 * @updated 2026-09-26: Adds package deletion with namespaced state cleanup and reference-aware asset removal.
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

const LOCAL_THEME_PACKAGE_ASSETS_KEY = 'lumostime_theme_package_local_assets_v1';
const THEME_PACKAGE_IMPORTED_EVENT = 'lumostime:theme-package-imported';

const IMAGE_EXTENSIONS = new Set(['bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']);
const FONT_EXTENSIONS = new Set(['woff', 'woff2', 'ttf', 'otf']);

export interface ImportedThemePackageRecord {
  id: string;
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

export interface LocalThemePackageAssets {
  packageId: string;
  version: string;
  fontId?: string;
}

export interface ThemePackageImportOptions {
  allowSameVersionOverwrite?: boolean;
  allowDowngrade?: boolean;
}

export interface ThemePackageImportResult {
  record: ImportedThemePackageRecord;
  localAssets: LocalThemePackageAssets;
  replacedVersion?: string;
}

export type ThemePackageImportErrorCode =
  | 'SAME_VERSION_EXISTS'
  | 'DOWNGRADE_NOT_ALLOWED'
  | 'FONT_IMPORT_FAILED'
  | 'PERSISTENCE_FAILED';

export class ThemePackageImportError extends Error {
  readonly code: ThemePackageImportErrorCode;

  constructor(code: ThemePackageImportErrorCode, message: string) {
    super(message);
    this.name = 'ThemePackageImportError';
    this.code = code;
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

const removePackageDerivedState = (record: ImportedThemePackageRecord): void => {
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

  const setIds = new Set<string>();
  try {
    const sets = JSON.parse(localStorage.getItem('lumostime_custom_sticker_sets_v2') || '[]');
    if (Array.isArray(sets)) {
      sets.forEach((item) => {
        const id = String(item?.id || '');
        if (id.startsWith(`${prefix}sticker-set-`)) setIds.add(id);
      });
      localStorage.setItem('lumostime_custom_sticker_sets_v2', JSON.stringify(sets.filter((item) => !setIds.has(String(item?.id || '')))));
    }
    const stickers = JSON.parse(localStorage.getItem('lumostime_custom_stickers_v2') || '[]');
    if (Array.isArray(stickers)) {
      localStorage.setItem('lumostime_custom_stickers_v2', JSON.stringify(stickers.filter((item) => !setIds.has(String(item?.setId || '')))));
    }
  } catch { /* Preserve malformed user data for manual recovery. */ }

  removeArrayItems('mood_calendar_background_custom_list', (item) => String(item.id || ''));
  removeArrayItems('mood_calendar_fill_background_custom_list', (item) => String(item.id || ''));
  removeObjectKey('navigation_new_background_settings', `${prefix}navigation-background`);

  const clearNamespacedSelection = (key: string, fallback: string): void => {
    const current = localStorage.getItem(key) || '';
    if (current.startsWith(prefix)) localStorage.setItem(key, fallback);
  };
  clearNamespacedSelection(THEME_KEYS.CURRENT_BACKGROUND, 'default');
  clearNamespacedSelection(THEME_KEYS.NAVIGATION_DECORATION, 'default');
  clearNamespacedSelection('navigation_new_background', 'default');
  clearNamespacedSelection('mood_calendar_background', 'none');
  clearNamespacedSelection('mood_calendar_fill_background', 'none');

  const navigationSelectionKey = 'navigation_icon_selection_v1';
  try {
    const selection = JSON.parse(localStorage.getItem(navigationSelectionKey) || '{}');
    if (typeof selection.schemeId === 'string' && selection.schemeId.startsWith(prefix)) {
      localStorage.setItem(navigationSelectionKey, JSON.stringify({ ...selection, mode: 'text', schemeId: undefined, customMapping: {} }));
    }
  } catch { /* Preserve malformed user data for manual recovery. */ }

  const uiIconConfig = record.manifest.config.uiIcon;
  const uiIconThemeId = uiIconConfig && typeof uiIconConfig === 'object' && !Array.isArray(uiIconConfig)
    && typeof (uiIconConfig as Record<string, unknown>).themeId === 'string'
    ? String((uiIconConfig as Record<string, unknown>).themeId)
    : record.id;
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
      removeObjectKey('lumostime_ui_icon_custom_assets_v1', typeof uiIconConfig.themeId === 'string' ? uiIconConfig.themeId : record.id);
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

  const currentTimePal = localStorage.getItem(TIMEPAL_KEYS.TYPE) || '';
  if (currentTimePal.includes(prefix)) localStorage.setItem(TIMEPAL_KEYS.TYPE, 'none');
};

export const themePackageImportService = {
  getImportedPackages(): ImportedThemePackageRecord[] {
    return readImportedThemePackages();
  },

  getLocalAssets(packageId: string): LocalThemePackageAssets | undefined {
    return readLocalThemePackageAssets().find((item) => item.packageId === packageId);
  },

  async deletePackage(packageId: string, protectedImageFilenames: string[] = []): Promise<boolean> {
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
    removePackageDerivedState(record);

    const otherFontIds = new Set([
      ...readImportedThemePackages().map((item) => readLocalThemePackageAssets().find((asset) => asset.packageId === item.id)?.fontId),
      ...(() => {
        try {
          const presets = JSON.parse(localStorage.getItem(THEME_KEYS.CUSTOM_PRESETS) || '[]');
          return Array.isArray(presets)
            ? presets.map((preset) => preset?.snapshot?.storage?.lumostime_font_family)
            : [];
        } catch { return []; }
      })()
    ].filter((fontId): fontId is string => typeof fontId === 'string'));
    const currentFontId = localStorage.getItem('lumostime_font_family');
    if (deletedLocalAssets?.fontId && deletedLocalAssets.fontId !== currentFontId && !otherFontIds.has(deletedLocalAssets.fontId)) {
      await fontService.removeCustomFont(deletedLocalAssets.fontId).catch(() => undefined);
    }

    const settingsReferences = getSettingsReferencedImages();
    const contentReferences = new Set(imageService.getReferencedImageManifest().content);
    protectedImageFilenames.forEach((filename) => {
      settingsReferences.add(filename);
      settingsReferences.add(`thumb_${filename}`);
    });
    const filenames = Array.from(new Set(Object.values(record.imageAssets)));
    for (const filename of filenames) {
      if (settingsReferences.has(filename) || contentReferences.has(filename)) continue;
      await imageService.deleteImage(filename).catch(() => undefined);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(THEME_PACKAGE_IMPORTED_EVENT, {
        detail: { packageId, deleted: true }
      }));
    }
    return true;
  },

  async importPackage(
    source: Blob | File,
    options: ThemePackageImportOptions = {}
  ): Promise<ThemePackageImportResult> {
    const parsedPackage = await parseThemePackage(source);
    const { manifest, assets } = parsedPackage;
    const existingPackages = readImportedThemePackages();
    const existingRecord = existingPackages.find((record) => record.id === manifest.package.id);
    const existingLocalAssets = readLocalThemePackageAssets();
    const existingLocalRecord = existingLocalAssets.find((record) => record.packageId === manifest.package.id);

    if (existingRecord) {
      const comparison = compareThemePackageVersions(manifest.package.version, existingRecord.version);
      if (comparison === 0 && !options.allowSameVersionOverwrite) {
        throw new ThemePackageImportError('SAME_VERSION_EXISTS', '相同版本的主题已经导入');
      }
      if (comparison < 0 && !options.allowDowngrade) {
        throw new ThemePackageImportError('DOWNGRADE_NOT_ALLOWED', '导入版本低于已安装版本');
      }
    }

    const previousPackagesRaw = localStorage.getItem(THEME_KEYS.IMPORTED_THEME_PACKAGES);
    const previousLocalAssetsRaw = localStorage.getItem(LOCAL_THEME_PACKAGE_ASSETS_KEY);
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
        id: manifest.package.id,
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
        packageId: manifest.package.id,
        version: manifest.package.version,
        fontId: importedFontId ?? (manifest.config.font === undefined ? existingLocalRecord?.fontId : undefined)
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

      if (existingLocalRecord?.fontId && existingLocalRecord.fontId !== localRecord.fontId) {
        await fontService.removeCustomFont(existingLocalRecord.fontId).catch(() => undefined);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(THEME_PACKAGE_IMPORTED_EVENT, {
          detail: { packageId: record.id, version: record.version }
        }));
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

      throw error;
    }
  }
};

export const THEME_PACKAGE_LOCAL_ASSETS_STORAGE_KEY = LOCAL_THEME_PACKAGE_ASSETS_KEY;
export const THEME_PACKAGE_CHANGE_EVENT = THEME_PACKAGE_IMPORTED_EVENT;
