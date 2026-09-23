/**
 * @file remoteUiIconAssetService.ts
 * @input UI icon theme and icon file names
 * @output Remote UI icon URLs and downloadable file lists
 * @pos Service (Remote Static Assets)
 * @description Resolves optional UI icon assets from the hosted static repository while leaving bundled fallback assets available.
 *
 * @updated 2026-09-23: Adds GitHub/Gitee failover and uses CapacitorHttp for native binary downloads.
 */

import { UI_ICON_ASSET_BASE_URLS, UI_ICON_ASSET_ROOT } from '../config/uiIconAssets';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const AVAILABILITY_TIMEOUT_MS = 8000;
const UI_ICON_FILE_NAMES = Array.from({ length: 96 }, (_, index) => `${String(index + 1).padStart(2, '0')}.webp`);

const buildRemotePath = (baseUrl: string, theme: string, filename: string): string => (
  `${baseUrl}/${UI_ICON_ASSET_ROOT}/${encodeURIComponent(theme)}/${encodeURIComponent(filename)}`
);

const fetchWithTimeout = async (url: string): Promise<Response> => {
  if (Capacitor.isNativePlatform()) {
    const result = await CapacitorHttp.get({
      url,
      responseType: 'blob',
      connectTimeout: AVAILABILITY_TIMEOUT_MS,
      readTimeout: AVAILABILITY_TIMEOUT_MS
    });
    const body = result.data instanceof Blob
      ? result.data
      : new Blob([result.data as BlobPart], { type: 'image/webp' });
    return new Response(body, { status: result.status });
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? globalThis.setTimeout(() => controller.abort(), AVAILABILITY_TIMEOUT_MS)
    : undefined;

  try {
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal
    });
  } finally {
    if (timeoutId !== undefined) {
      globalThis.clearTimeout(timeoutId);
    }
  }
};

class RemoteUiIconAssetService {
  getIconPath(theme: string, filename: string): string {
    return buildRemotePath(UI_ICON_ASSET_BASE_URLS[0], theme, filename);
  }

  getDownloadFileNames(): string[] {
    return UI_ICON_FILE_NAMES.slice(4);
  }

  async fetchIcon(theme: string, filename: string): Promise<Response> {
    let lastResponse: Response | null = null;
    const sourceUrls = UI_ICON_ASSET_BASE_URLS.slice();
    if (Capacitor.isNativePlatform()) {
      const giteeIndex = sourceUrls.findIndex((url) => url.includes('gitee.com'));
      if (giteeIndex > 0) {
        sourceUrls.unshift(sourceUrls.splice(giteeIndex, 1)[0]);
      }
    }

    for (const baseUrl of sourceUrls) {
      try {
        const response = await fetchWithTimeout(buildRemotePath(baseUrl, theme, filename));
        lastResponse = response;
        if (response.ok) {
          return response;
        }
      } catch (error) {
        console.warn('[RemoteUiIconAssetService] Asset source failed', { baseUrl, theme, filename, error });
      }
    }

    if (lastResponse) {
      return lastResponse;
    }

    throw new Error(`No UI icon asset source is reachable: ${theme}/${filename}`);
  }

}

export const remoteUiIconAssetService = new RemoteUiIconAssetService();
