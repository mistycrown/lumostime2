/**
 * @file remoteUiIconAssetService.ts
 * @input UI icon theme and icon file names
 * @output Remote UI icon URLs and availability checks
 * @pos Service (Remote Static Assets)
 * @description Resolves optional UI icon assets from the hosted static repository while leaving bundled fallback assets available.
 *
 * @updated 2026-09-23: Added GitHub-hosted UI icon probing for the first remote asset delivery test.
 */

import { UI_ICON_ASSET_BASE_URL, UI_ICON_ASSET_ROOT } from '../config/uiIconAssets';

const AVAILABILITY_TIMEOUT_MS = 8000;

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

export type RemoteUiIconThemeCheckResult = {
  theme: string;
  available: boolean;
  url: string;
  status?: number;
};

class RemoteUiIconAssetService {
  getIconPath(theme: string, filename: string): string {
    return buildRemotePath(theme, filename);
  }

  async checkThemeAvailability(theme: string): Promise<RemoteUiIconThemeCheckResult> {
    const url = this.getIconPath(theme, '01.webp');

    try {
      const response = await fetchWithTimeout(url);
      return {
        theme,
        available: response.ok,
        url,
        status: response.status
      };
    } catch (error) {
      console.warn('[RemoteUiIconAssetService] Remote UI icon probe failed', {
        theme,
        url,
        error
      });
      return {
        theme,
        available: false,
        url
      };
    }
  }
}

export const remoteUiIconAssetService = new RemoteUiIconAssetService();
