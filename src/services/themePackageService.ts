/**
 * @file themePackageService.ts
 * @input ZIP Blob/File containing theme.json and optional theme assets
 * @output Validated theme package manifest and asset blobs
 * @pos Service (Theme Package Import)
 * @description Parses and validates LumoTime theme packages before any persistent resource or setting mutation.
 * @updated 2026-09-26: Added version-one theme package manifest parsing and archive safety validation.
 * @updated 2026-09-26: Ignores .gitkeep directory markers used by the editable package template.
 */

import JSZip from 'jszip';

export const THEME_PACKAGE_FORMAT = 'lumostime-theme-package';
export const SUPPORTED_THEME_PACKAGE_SCHEMA_VERSION = 1;

const PACKAGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const SAFE_ASSET_PATH_PATTERN = /^assets\/[A-Za-z0-9._/-]+$/;
const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;
const MAX_ASSET_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_ASSET_BYTES = 200 * 1024 * 1024;
const ALLOWED_ASSET_EXTENSIONS = new Set([
  'bmp',
  'gif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
  'woff',
  'woff2',
  'ttf',
  'otf'
]);

const ASSET_MIME_TYPES: Record<string, string> = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf'
};

export interface ThemePackageMetadata {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  preview?: string;
}

export interface ThemePackageManifest {
  format: typeof THEME_PACKAGE_FORMAT;
  schemaVersion: number;
  package: ThemePackageMetadata;
  config: Record<string, unknown>;
}

export interface ParsedThemePackage {
  manifest: ThemePackageManifest;
  assets: Map<string, Blob>;
}

export type ThemePackageValidationCode =
  | 'INVALID_ZIP'
  | 'MISSING_MANIFEST'
  | 'INVALID_MANIFEST_JSON'
  | 'UNSUPPORTED_FORMAT'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'INVALID_PACKAGE_METADATA'
  | 'UNSAFE_ARCHIVE_PATH'
  | 'UNSUPPORTED_ASSET_TYPE'
  | 'MISSING_ASSET'
  | 'INVALID_CONFIGURATION';

export class ThemePackageValidationError extends Error {
  readonly code: ThemePackageValidationCode;
  readonly path?: string;

  constructor(code: ThemePackageValidationCode, message: string, path?: string) {
    super(message);
    this.name = 'ThemePackageValidationError';
    this.code = code;
    this.path = path;
  }
}

const getExtension = (path: string): string => {
  const filename = path.split('/').pop() || '';
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex < 0 ? '' : filename.slice(dotIndex + 1).toLowerCase();
};

const isSafeArchivePath = (path: string): boolean => (
  Boolean(path)
  && !path.startsWith('/')
  && !path.includes('\\')
  && !path.split('/').includes('..')
  && !path.split('/').includes('')
);

const isAssetPath = (value: string): boolean => SAFE_ASSET_PATH_PATTERN.test(value);

const collectAssetReferences = (value: unknown, path = 'config', references = new Map<string, string>()): Map<string, string> => {
  if (typeof value === 'string' && value.startsWith('assets/')) {
    references.set(value, path);
    return references;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectAssetReferences(item, `${path}[${index}]`, references));
    return references;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      collectAssetReferences(item, `${path}.${key}`, references);
    });
  }

  return references;
};

const assertManifestShape = (value: unknown): ThemePackageManifest => {
  if (!value || typeof value !== 'object') {
    throw new ThemePackageValidationError('INVALID_MANIFEST_JSON', 'theme.json 必须是 JSON 对象');
  }

  const manifest = value as Partial<ThemePackageManifest>;
  if (manifest.format !== THEME_PACKAGE_FORMAT) {
    throw new ThemePackageValidationError('UNSUPPORTED_FORMAT', 'theme.json 的 format 不受支持', 'format');
  }

  if (manifest.schemaVersion !== SUPPORTED_THEME_PACKAGE_SCHEMA_VERSION) {
    throw new ThemePackageValidationError(
      'UNSUPPORTED_SCHEMA_VERSION',
      `不支持的主题包 schemaVersion：${String(manifest.schemaVersion)}`,
      'schemaVersion'
    );
  }

  const metadata = manifest.package;
  if (!metadata || typeof metadata !== 'object') {
    throw new ThemePackageValidationError('INVALID_PACKAGE_METADATA', '缺少 package 元数据', 'package');
  }

  if (
    typeof metadata.id !== 'string'
    || !PACKAGE_ID_PATTERN.test(metadata.id)
    || typeof metadata.name !== 'string'
    || !metadata.name.trim()
    || typeof metadata.version !== 'string'
    || !VERSION_PATTERN.test(metadata.version)
  ) {
    throw new ThemePackageValidationError(
      'INVALID_PACKAGE_METADATA',
      'package.id、package.name 或 package.version 格式无效',
      'package'
    );
  }

  if (!manifest.config || typeof manifest.config !== 'object' || Array.isArray(manifest.config)) {
    throw new ThemePackageValidationError('INVALID_CONFIGURATION', 'config 必须是对象', 'config');
  }

  return manifest as ThemePackageManifest;
};

const validateConfigurationInvariants = (manifest: ThemePackageManifest): void => {
  const timePal = manifest.config.timePal;
  if (timePal && typeof timePal === 'object' && !Array.isArray(timePal)) {
    const items = (timePal as { items?: unknown }).items;
    if (items !== undefined) {
      if (!Array.isArray(items)) {
        throw new ThemePackageValidationError('INVALID_CONFIGURATION', 'timePal.items 必须是数组', 'config.timePal.items');
      }

      items.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          throw new ThemePackageValidationError('INVALID_CONFIGURATION', '时间小友条目必须是对象', `config.timePal.items[${index}]`);
        }

        const stages = (item as { stages?: unknown }).stages;
        if (!stages || typeof stages !== 'object' || Array.isArray(stages)) {
          throw new ThemePackageValidationError('INVALID_CONFIGURATION', '每个时间小友必须包含 stages 对象', `config.timePal.items[${index}].stages`);
        }

        for (const stage of ['1', '2', '3', '4', '5']) {
          if (typeof (stages as Record<string, unknown>)[stage] !== 'string') {
            throw new ThemePackageValidationError(
              'INVALID_CONFIGURATION',
              `时间小友缺少第 ${stage} 阶段图片`,
              `config.timePal.items[${index}].stages.${stage}`
            );
          }
        }
      });
    }
  }

  const memoirCalendar = manifest.config.memoirCalendar;
  if (memoirCalendar && typeof memoirCalendar === 'object' && !Array.isArray(memoirCalendar)) {
    const background = (memoirCalendar as { background?: unknown }).background;
    if (background && typeof background === 'object' && !Array.isArray(background)) {
      const backgroundRecord = background as Record<string, unknown>;
      const hasFiveWeek = typeof backgroundRecord.fiveWeek === 'string';
      const hasSixWeek = typeof backgroundRecord.sixWeek === 'string';
      if (hasFiveWeek !== hasSixWeek) {
        throw new ThemePackageValidationError(
          'INVALID_CONFIGURATION',
          'Memoir 背景必须同时提供 fiveWeek 和 sixWeek',
          'config.memoirCalendar.background'
        );
      }
    }
  }

  const achievementBottle = manifest.config.achievementBottle;
  if (achievementBottle && typeof achievementBottle === 'object' && !Array.isArray(achievementBottle)) {
    const iconPack = (achievementBottle as { iconPack?: unknown }).iconPack;
    if (iconPack && typeof iconPack === 'object' && !Array.isArray(iconPack)) {
      const iconPackRecord = iconPack as Record<string, unknown>;
      if (iconPackRecord.source === 'asset' && (!Array.isArray(iconPackRecord.frames) || iconPackRecord.frames.length === 0)) {
        throw new ThemePackageValidationError(
          'INVALID_CONFIGURATION',
          '自定义成就瓶图标包必须至少包含一张图片',
          'config.achievementBottle.iconPack.frames'
        );
      }
    }
  }
};

export const parseThemePackage = async (source: Blob | File): Promise<ParsedThemePackage> => {
  if (source.size > MAX_PACKAGE_BYTES) {
    throw new ThemePackageValidationError('INVALID_ZIP', '主题压缩包不能超过 100 MB');
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await source.arrayBuffer());
  } catch (error) {
    throw new ThemePackageValidationError('INVALID_ZIP', '无法读取主题压缩包');
  }

  const manifestEntry = zip.files['theme.json'];
  if (!manifestEntry || manifestEntry.dir) {
    throw new ThemePackageValidationError('MISSING_MANIFEST', '主题压缩包根目录缺少 theme.json');
  }

  let manifest: ThemePackageManifest;
  try {
    const manifestText = await manifestEntry.async('text');
    manifest = assertManifestShape(JSON.parse(manifestText) as unknown);
  } catch (error) {
    if (error instanceof ThemePackageValidationError) {
      throw error;
    }

    throw new ThemePackageValidationError('INVALID_MANIFEST_JSON', 'theme.json 不是有效 JSON');
  }

  validateConfigurationInvariants(manifest);

  const assets = new Map<string, Blob>();
  let totalAssetBytes = 0;
  for (const entry of Object.values(zip.files)) {
    const originalPath = (entry as typeof entry & { unsafeOriginalName?: string }).unsafeOriginalName || entry.name;
    const archivePath = entry.name.replace(/\\/g, '/');

    if (entry.dir) {
      continue;
    }

    if (originalPath.includes('\\') || !isSafeArchivePath(originalPath) || !isSafeArchivePath(archivePath)) {
      throw new ThemePackageValidationError('UNSAFE_ARCHIVE_PATH', `主题包包含不安全路径：${originalPath}`, originalPath);
    }

    if (archivePath === 'theme.json' || archivePath.startsWith('__MACOSX/') || archivePath.endsWith('/.gitkeep')) {
      continue;
    }

    if (!isAssetPath(archivePath)) {
      throw new ThemePackageValidationError('UNSAFE_ARCHIVE_PATH', `资源必须位于 assets/ 下：${archivePath}`, archivePath);
    }

    if (!ALLOWED_ASSET_EXTENSIONS.has(getExtension(archivePath))) {
      throw new ThemePackageValidationError('UNSUPPORTED_ASSET_TYPE', `不支持的主题资源类型：${archivePath}`, archivePath);
    }

    const extractedBlob = await entry.async('blob');
    totalAssetBytes += extractedBlob.size;
    if (extractedBlob.size > MAX_ASSET_BYTES || totalAssetBytes > MAX_TOTAL_ASSET_BYTES) {
      throw new ThemePackageValidationError('INVALID_CONFIGURATION', '主题资源体积超出限制', archivePath);
    }
    const mimeType = ASSET_MIME_TYPES[getExtension(archivePath)] || 'application/octet-stream';
    const blob = extractedBlob.type
      ? extractedBlob
      : new Blob([extractedBlob], { type: mimeType });
    assets.set(archivePath, blob);
  }

  const references = collectAssetReferences(manifest.config);
  if (manifest.package.preview) {
    references.set(manifest.package.preview, 'package.preview');
  }

  for (const [assetPath, configPath] of references) {
    if (!isAssetPath(assetPath) || !assets.has(assetPath)) {
      throw new ThemePackageValidationError('MISSING_ASSET', `找不到资源：${assetPath}`, configPath);
    }
  }

  return { manifest, assets };
};
