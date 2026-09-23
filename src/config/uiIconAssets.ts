/**
 * @file uiIconAssets.ts
 * @input UI icon asset host configuration
 * @output Remote and bundled asset roots used by the UI icon service
 * @pos Configuration
 * @description Keeps optional UI icon hosting separate from the application bundle.
 *
 * @updated 2026-09-23: Configures GitHub and Gitee mirrors for downloadable UI icon assets.
 */

const normalizeAssetBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const configuredRemoteBaseUrl = (import.meta.env.VITE_UI_ICON_ASSET_BASE_URL || '').trim();

/**
 * The repository should expose `uiicon/<theme>/<number>.<format>` from its root.
 * Set VITE_UI_ICON_ASSET_BASE_URL when the mirror or branch changes.
 */
export const UI_ICON_ASSET_BASE_URLS = Array.from(new Set([
  configuredRemoteBaseUrl,
  'https://raw.githubusercontent.com/mistycrown/lumostime_static/main',
  'https://gitee.com/jili_chuchuzheci/lumostime_static/raw/main'
].filter(Boolean).map(normalizeAssetBaseUrl)));

export const UI_ICON_ASSET_BASE_URL = UI_ICON_ASSET_BASE_URLS[0];

export const UI_ICON_ASSET_ROOT = 'uiicon';
