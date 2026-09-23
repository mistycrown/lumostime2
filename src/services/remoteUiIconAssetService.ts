/**
 * @file remoteUiIconAssetService.ts
 * @input UI icon theme and icon file names
 * @output Remote UI icon URLs and downloadable file lists
 * @pos Service (Remote Static Assets)
 * @description Resolves optional UI icon assets from the hosted static repository while leaving bundled fallback assets available.
 *
 * @updated 2026-09-23: Added GitHub-hosted UI icon probing for the first remote asset delivery test.
 */

import { UI_ICON_ASSET_BASE_URL, UI_ICON_ASSET_ROOT } from '../config/uiIconAssets';

const AVAILABILITY_TIMEOUT_MS = 8000;
const UI_ICON_FILE_NAMES = Array.from({ length: 96 }, (_, index) => `${String(index + 1).padStart(2, '0')}.webp`);

const buildRemotePath = (theme: string, filename: string): string => (
  `${UI_ICON_ASSET_BASE_URL}/${UI_ICON_ASSET_ROOT}/${encodeURIComponent(theme)}/${encodeURIComponent(filename)}`
);

const fetchWithTimeout = async (url: string): Promise<Response> => {
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
    return buildRemotePath(theme, filename);
  }

  getDownloadFileNames(): string[] {
    return UI_ICON_FILE_NAMES.slice(4);
  }

  async fetchIcon(theme: string, filename: string): Promise<Response> {
    return fetchWithTimeout(this.getIconPath(theme, filename));
  }

}

export const remoteUiIconAssetService = new RemoteUiIconAssetService();
