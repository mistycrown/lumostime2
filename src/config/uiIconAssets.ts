/**
 * @file uiIconAssets.ts
 * @input UI icon asset host configuration
 * @output Remote and bundled asset roots used by the UI icon service
 * @pos Configuration
 * @description Keeps optional UI icon hosting separate from the application bundle.
 *
 * @updated 2026-09-23: Added the first GitHub-hosted UI icon source for the remote asset test.
 */

const normalizeAssetBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const configuredRemoteBaseUrl = (import.meta.env.VITE_UI_ICON_ASSET_BASE_URL || '').trim();

/**
 * The repository should expose `uiicon/<theme>/<number>.<format>` from its root.
 * Set VITE_UI_ICON_ASSET_BASE_URL when the mirror or branch changes.
 */
export const UI_ICON_ASSET_BASE_URL = normalizeAssetBaseUrl(
  configuredRemoteBaseUrl || 'https://raw.githubusercontent.com/mistycrown/lumostime_static/main'
);

export const UI_ICON_ASSET_ROOT = 'uiicon';
