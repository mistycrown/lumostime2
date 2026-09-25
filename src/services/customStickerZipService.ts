/**
 * @file customStickerZipService.ts
 * @input ZIP Blob/File containing sticker folders and image files
 * @output Parsed sticker groups with typed image Blobs and truncation metadata
 * @pos Service (Custom Sticker Import)
 * @description Reads sticker ZIP archives in the browser and converts direct parent folders into importable sticker groups.
 * @updated 2026-09-25: Added ZIP sticker group parsing with deterministic ordering and 16-image truncation.
 */
import JSZip from 'jszip';

export const MAX_CUSTOM_STICKER_IMAGES_PER_GROUP = 16;

const IMAGE_MIME_TYPES: Record<string, string> = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp'
};

export interface ParsedStickerZipImage {
  archivePath: string;
  label: string;
  blob: Blob;
}

export interface ParsedStickerZipGroup {
  name: string;
  images: ParsedStickerZipImage[];
  truncatedCount: number;
}

const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex < 0) {
    return '';
  }

  return filename.slice(lastDotIndex + 1).toLowerCase();
};

const getImageMimeType = (filename: string): string | null => (
  IMAGE_MIME_TYPES[getFileExtension(filename)] || null
);

const getImageLabel = (filename: string): string => {
  const baseName = filename.split('/').pop() || filename;
  return baseName.replace(/\.[^.]+$/, '') || baseName;
};

const compareArchivePaths = (first: string, second: string): number => (
  first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' })
);

/**
 * Parse an archive into groups keyed by each image's direct parent folder.
 * Images without a parent folder and non-image files are intentionally ignored.
 */
export const parseCustomStickerZip = async (source: Blob | File): Promise<ParsedStickerZipGroup[]> => {
  const zip = await JSZip.loadAsync(await source.arrayBuffer());
  const entriesByFolder = new Map<string, {
    name: string;
    entries: Array<{ archivePath: string; entry: JSZip.JSZipObject; mimeType: string }>;
  }>();

  Object.values(zip.files).forEach((entry) => {
    if (entry.dir) {
      return;
    }

    const archivePath = entry.name.replace(/\\/g, '/');
    const pathSegments = archivePath.split('/').filter(Boolean);
    if (pathSegments.length < 2 || pathSegments.includes('__MACOSX')) {
      return;
    }

    const mimeType = getImageMimeType(archivePath);
    if (!mimeType) {
      return;
    }

    const folderPath = pathSegments.slice(0, -1).join('/');
    const folderName = pathSegments[pathSegments.length - 2];
    const folder = entriesByFolder.get(folderPath) || { name: folderName, entries: [] };
    folder.entries.push({ archivePath, entry, mimeType });
    entriesByFolder.set(folderPath, folder);
  });

  const groups: ParsedStickerZipGroup[] = [];

  for (const { name, entries } of entriesByFolder.values()) {
    entries.sort((first, second) => compareArchivePaths(first.archivePath, second.archivePath));
    const selectedEntries = entries.slice(0, MAX_CUSTOM_STICKER_IMAGES_PER_GROUP);
    const images = await Promise.all(selectedEntries.map(async ({ archivePath, entry, mimeType }) => {
      const extractedBlob = await entry.async('blob');
      const blob = extractedBlob.type ? extractedBlob : new Blob([extractedBlob], { type: mimeType });

      return {
        archivePath,
        label: getImageLabel(archivePath),
        blob
      };
    }));

    groups.push({
      name,
      images,
      truncatedCount: entries.length - selectedEntries.length
    });
  }

  return groups.sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
};
