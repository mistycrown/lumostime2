/**
 * @file themePackageImportService.ts
 * @input Valid LumoTime theme ZIP files
 * @output Persisted theme package metadata, synchronized image resources, and local-only font resources
 * @pos Service (Theme Package Import)
 * @description Imports validated theme package resources transactionally while keeping fonts local to the current device.
 * @updated 2026-09-26: Added transactional image and local-font persistence for versioned theme packages.
 * @updated 2026-09-26: Preserves a package's local font when an update omits the font section.
 */

import { THEME_KEYS, storage } from '../constants/storageKeys';
import { fontService } from './fontService';
import { imageService } from './imageService';
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

export const themePackageImportService = {
  getImportedPackages(): ImportedThemePackageRecord[] {
    return readImportedThemePackages();
  },

  getLocalAssets(packageId: string): LocalThemePackageAssets | undefined {
    return readLocalThemePackageAssets().find((item) => item.packageId === packageId);
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
