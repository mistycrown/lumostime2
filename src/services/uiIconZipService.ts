/**
 * @file uiIconZipService.ts
 * @input ZIP Blob/File containing numbered UI icon images
 * @output Validated UI icon images ordered from 01 through 96
 * @pos Service (UI Icon Import)
 * @description Parses UI icon ZIP archives and strictly requires one PNG or WebP image for every numbered UI icon.
 * @updated 2026-09-28: Added strict 96-image UI icon ZIP validation.
 */
import JSZip from 'jszip';

const REQUIRED_ICON_NUMBERS = Array.from({ length: 96 }, (_, index) => String(index + 1).padStart(2, '0'));
const SUPPORTED_IMAGE_EXTENSION = /\.(png|webp)$/i;
const IMAGE_EXTENSION = /\.(?:png|webp|jpe?g|gif|bmp|svg)$/i;

export interface ParsedUIIconZipImage {
  number: string;
  archivePath: string;
  blob: Blob;
}

export interface ParsedUIIconZip {
  images: ParsedUIIconZipImage[];
}

const getMimeType = (filename: string): string => (
  filename.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png'
);

const getBaseFilename = (path: string): string => path.replace(/\\/g, '/').split('/').pop() || '';

/**
 * Parses a ZIP archive containing exactly one image named 01 through 96.
 * Non-image support files are ignored; every image file must be a correctly numbered PNG or WebP.
 */
export const parseUIIconZip = async (source: Blob | File): Promise<ParsedUIIconZip> => {
  const zip = await JSZip.loadAsync(await source.arrayBuffer());
  const entriesByNumber = new Map<string, { entry: JSZip.JSZipObject; archivePath: string }>();

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;

    const archivePath = entry.name.replace(/\\/g, '/');
    const segments = archivePath.split('/');
    if (segments.some((segment) => segment === '__MACOSX' || segment.startsWith('._'))) continue;

    const filename = getBaseFilename(archivePath);
    if (!IMAGE_EXTENSION.test(filename)) continue;

    if (!SUPPORTED_IMAGE_EXTENSION.test(filename)) {
      throw new Error(`仅支持 PNG 或 WebP 图片：${archivePath}`);
    }

    const match = filename.match(/^(\d{2})\.(?:png|webp)$/i);
    if (!match || !REQUIRED_ICON_NUMBERS.includes(match[1])) {
      throw new Error(`图片必须按 01 至 96 编号：${archivePath}`);
    }

    if (entriesByNumber.has(match[1])) {
      throw new Error(`编号 ${match[1]} 存在重复图片`);
    }

    entriesByNumber.set(match[1], { entry, archivePath });
  }

  const missingNumbers = REQUIRED_ICON_NUMBERS.filter((number) => !entriesByNumber.has(number));
  if (missingNumbers.length > 0) {
    throw new Error(`压缩包必须包含 01 至 96 共 96 张编号图片，缺少：${missingNumbers.join('、')}`);
  }

  const images = await Promise.all(REQUIRED_ICON_NUMBERS.map(async (number) => {
    const { entry, archivePath } = entriesByNumber.get(number)!;
    const extracted = await entry.async('blob');
    return {
      number,
      archivePath,
      blob: extracted.type ? extracted : new Blob([extracted], { type: getMimeType(archivePath) })
    };
  }));

  return { images };
};
