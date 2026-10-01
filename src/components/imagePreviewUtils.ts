/**
 * @file imagePreviewUtils.ts
 * @input Legacy image URLs, grouped image sources, selected indexes, and image dimensions
 * @output Normalized preview items plus deterministic index and long-image helpers
 * @pos Component utility
 * @description Keeps image preview data handling independent from the modal UI so every preview entry point follows the same grouping rules.
 * @updated 2026-10-01: Added shared grouped-preview normalization and width-fit long-image detection.
 */

export interface ImagePreviewItem {
  source: string;
  downloadFilename?: string;
}

export type ImagePreviewInput = ImagePreviewItem | string;

const toImagePreviewItem = (item: ImagePreviewInput): ImagePreviewItem => (
  typeof item === 'string' ? { source: item } : item
);

export const normalizeImagePreviewItems = (
  imageUrl: string | null | undefined,
  images?: ImagePreviewInput[],
  downloadFilename?: string
): ImagePreviewItem[] => {
  const normalizedImages = images
    ?.map(toImagePreviewItem)
    .filter((item) => Boolean(item.source));

  if (normalizedImages && normalizedImages.length > 0) {
    return normalizedImages;
  }

  return imageUrl ? [{ source: imageUrl, downloadFilename }] : [];
};

export const getInitialPreviewIndex = (index: number | undefined, length: number): number => {
  if (length <= 0) {
    return 0;
  }

  return Math.min(Math.max(index ?? 0, 0), length - 1);
};

export const isLongPreviewImage = (
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number
): boolean => {
  if (naturalWidth <= 0 || naturalHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return false;
  }

  return (naturalHeight / naturalWidth) * viewportWidth > viewportHeight;
};
