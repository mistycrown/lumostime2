/**
 * @file imageManifest.ts
 * @input Legacy flat image lists and grouped image manifest payloads
 * @output Normalized content/theme image groups and cloud manifest payloads
 * @pos Service (Image Management)
 * @description Defines the versioned image manifest format shared by local indexing, cloud sync, and cleanup.
 * @updated 2026-09-25: Added version 2 content/theme image groups with legacy flat-list compatibility.
 */

export type ImageReferenceGroup = 'content' | 'theme';

export interface ImageManifestGroups {
  content: string[];
  theme: string[];
}

export interface CloudImageManifest {
  version: '2.0.0';
  timestamp: number;
  images: string[];
  groups: ImageManifestGroups;
}

export type ImageManifestUpload = string[] | ImageManifestGroups;

const normalizeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => (
    typeof item === 'string' && item.trim().length > 0
  )))];
};

export const createEmptyImageManifestGroups = (): ImageManifestGroups => ({
  content: [],
  theme: []
});

export const normalizeImageManifestGroups = (value: unknown): ImageManifestGroups => {
  if (!value || typeof value !== 'object') {
    return createEmptyImageManifestGroups();
  }

  const candidate = value as Partial<ImageManifestGroups>;
  const theme = normalizeList(candidate.theme);
  const themeSet = new Set(theme);

  return {
    content: normalizeList(candidate.content).filter((filename) => !themeSet.has(filename)),
    theme
  };
};

export const flattenImageManifestGroups = (groups: ImageManifestGroups): string[] => (
  [...new Set([...groups.content, ...groups.theme])]
);

export const normalizeCloudImageManifest = (value: unknown): {
  groups: ImageManifestGroups;
  images: string[];
  hasGroups: boolean;
  timestamp: number;
} => {
  if (!value || typeof value !== 'object') {
    return {
      groups: createEmptyImageManifestGroups(),
      images: [],
      hasGroups: false,
      timestamp: 0
    };
  }

  const candidate = value as {
    groups?: unknown;
    images?: unknown;
    timestamp?: unknown;
  };
  const hasGroups = !!candidate.groups && typeof candidate.groups === 'object';
  const groups = normalizeImageManifestGroups(candidate.groups);
  const groupedImages = flattenImageManifestGroups(groups);
  const legacyImages = normalizeList(candidate.images);

  return {
    groups,
    images: hasGroups ? [...new Set([...groupedImages, ...legacyImages])] : legacyImages,
    hasGroups,
    timestamp: typeof candidate.timestamp === 'number' ? candidate.timestamp : 0
  };
};

export const buildCloudImageManifest = (
  manifest: ImageManifestUpload,
  timestamp = Date.now()
): CloudImageManifest => {
  const groups = Array.isArray(manifest)
    ? { content: normalizeList(manifest), theme: [] }
    : normalizeImageManifestGroups(manifest);

  return {
    version: '2.0.0',
    timestamp,
    images: flattenImageManifestGroups(groups),
    groups
  };
};
