/**
 * @file achievementBottleIconPackZipService.ts
 * @input ZIP archives containing PNG and WebP images
 * @output Achievement bottle icon-pack name and ordered image blobs
 * @pos Service (Achievement Bottle Assets)
 * @description Extracts supported animation frames from user-provided ZIP archives.
 */
import JSZip from 'jszip';

export interface ParsedAchievementBottleIconPack {
  name: string;
  images: Array<{ archivePath: string; blob: Blob }>;
}

const getImageMimeType = (path: string): string | null => {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return null;
};

export const parseAchievementBottleIconPackZip = async (
  source: Blob | File
): Promise<ParsedAchievementBottleIconPack> => {
  const zip = await JSZip.loadAsync(await source.arrayBuffer());
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map((entry) => ({ entry, archivePath: entry.name.replace(/\\/g, '/') }))
    .filter(({ archivePath }) => !archivePath.split('/').some((segment) => segment === '__MACOSX' || segment.startsWith('._')))
    .map((item) => ({ ...item, mimeType: getImageMimeType(item.archivePath) }))
    .filter((item): item is typeof item & { mimeType: string } => !!item.mimeType)
    .sort((first, second) => first.archivePath.localeCompare(second.archivePath, undefined, {
      numeric: true,
      sensitivity: 'base'
    }));

  if (entries.length === 0) {
    throw new Error('ZIP 中没有 PNG 或 WebP 图片');
  }

  const images = await Promise.all(entries.map(async ({ entry, archivePath, mimeType }) => {
    const extracted = await entry.async('blob');
    return {
      archivePath,
      blob: extracted.type ? extracted : new Blob([extracted], { type: mimeType })
    };
  }));

  const sourceName = 'name' in source && typeof source.name === 'string' ? source.name : '自定义图标包.zip';
  const name = sourceName.replace(/\.zip$/i, '').trim() || '自定义图标包';
  return { name, images };
};
