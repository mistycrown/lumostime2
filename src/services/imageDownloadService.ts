/**
 * @file imageDownloadService.ts
 * @input Preview image URLs plus an optional preferred filename
 * @output Native gallery saves or browser download actions for a single image
 * @description Shared helper for saving previewed images from any full-screen image modal.
 * @updated 2026-05-21: Added a cross-platform image download/save helper for preview modals, reusing native Pictures writes on mobile and browser downloads on web/desktop.
 */
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

export interface SavedImageResult {
  filename: string;
  mode: 'native' | 'web';
  path?: string;
}

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg'
};

const sanitizeFilenamePart = (value: string): string => {
  return value
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const splitPreferredFilename = (preferredFilename?: string): { base: string; extension?: string } => {
  const normalized = (preferredFilename || '')
    .split(/[\\/]/)
    .pop()
    ?.split('?')[0]
    ?.split('#')[0]
    ?.trim() || '';

  if (!normalized) {
    return { base: '' };
  }

  const extensionIndex = normalized.lastIndexOf('.');
  if (extensionIndex <= 0 || extensionIndex === normalized.length - 1) {
    return { base: normalized };
  }

  return {
    base: normalized.slice(0, extensionIndex),
    extension: normalized.slice(extensionIndex + 1).toLowerCase()
  };
};

const getExtensionFromUrl = (imageUrl: string): string | undefined => {
  try {
    const pathname = new URL(imageUrl, window.location.href).pathname;
    const candidate = pathname.split('.').pop()?.toLowerCase();
    if (candidate && /^[a-z0-9]+$/.test(candidate)) {
      return candidate;
    }
  } catch (error) {
    console.warn('[imageDownloadService] Failed to infer file extension from URL', error);
  }
  return undefined;
};

const getExtensionForImage = (mimeType: string, imageUrl: string, preferredExtension?: string): string => {
  if (preferredExtension && /^[a-z0-9]+$/.test(preferredExtension)) {
    return preferredExtension;
  }

  const normalizedMimeType = mimeType.toLowerCase().trim();
  if (EXTENSION_BY_MIME_TYPE[normalizedMimeType]) {
    return EXTENSION_BY_MIME_TYPE[normalizedMimeType];
  }

  return getExtensionFromUrl(imageUrl) || 'png';
};

const buildFilename = (imageUrl: string, mimeType: string, preferredFilename?: string): string => {
  const preferred = splitPreferredFilename(preferredFilename);
  const safeBase = sanitizeFilenamePart(preferred.base) || `lumostime-image-${Date.now()}`;
  const extension = getExtensionForImage(mimeType, imageUrl, preferred.extension);
  return `${safeBase}.${extension}`;
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to convert image data to base64'));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read image data'));
    reader.readAsDataURL(blob);
  });
};

export const saveImageFromUrl = async (
  imageUrl: string,
  preferredFilename?: string
): Promise<SavedImageResult> => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`图片读取失败 (${response.status})`);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error('图片数据为空');
  }

  const filename = buildFilename(imageUrl, blob.type || 'image/png', preferredFilename);

  if (Capacitor.isNativePlatform()) {
    const base64DataUrl = await blobToBase64(blob);
    const base64Data = base64DataUrl.replace(/^data:.*;base64,/, '');
    const path = `Pictures/LumosTime/${filename}`;

    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.ExternalStorage,
      recursive: true
    });

    return {
      filename,
      mode: 'native',
      path
    };
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = objectUrl;
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  return {
    filename,
    mode: 'web'
  };
};
