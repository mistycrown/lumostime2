/**
 * @file uiIconAssetService.ts
 * @input UI icon theme downloads and local asset storage
 * @output Downloaded-theme state and local object/data URLs
 * @pos Service (Local Asset Packs)
 * @description Downloads optional UI icon themes on demand and serves only locally stored assets to the renderer.
 *
 * @updated 2026-09-23: Added persistent UI icon theme downloads for IndexedDB and Capacitor Filesystem.
 * @updated 2026-09-23: Verifies local theme files and repairs incomplete downloads without changing the selected theme.
 */

import { imageService } from './imageService';
import { remoteUiIconAssetService } from './remoteUiIconAssetService';

const DOWNLOADED_THEMES_KEY = 'lumostime_ui_icon_downloaded_themes';
const STORAGE_PREFIX = 'uiicon';

type DownloadProgress = (progress: number) => void;

const getStorageKey = (theme: string, filename: string): string => (
  `${STORAGE_PREFIX}/${theme}/${filename}`
);

const readDownloadedThemes = (): string[] => {
  try {
    const stored = localStorage.getItem(DOWNLOADED_THEMES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((theme): theme is string => typeof theme === 'string') : [];
  } catch (error) {
    console.warn('[UiIconAssetService] Failed to read downloaded theme metadata', error);
    return [];
  }
};

const writeDownloadedThemes = (themes: string[]): void => {
  localStorage.setItem(DOWNLOADED_THEMES_KEY, JSON.stringify(Array.from(new Set(themes)).sort()));
};

class UiIconAssetService {
  private readonly objectUrlCache = new Map<string, string>();
  private readonly downloads = new Map<string, Promise<void>>();

  listDownloadedThemes(): string[] {
    return readDownloadedThemes();
  }

  isThemeDownloaded(theme: string): boolean {
    return this.listDownloadedThemes().includes(theme);
  }

  async ensureThemeAvailable(theme: string): Promise<void> {
    if (this.isThemeDownloaded(theme) && await this.activateTheme(theme)) {
      return;
    }
    await this.downloadTheme(theme);
  }

  getCachedIconUrl(theme: string, filename: string): string | null {
    return this.objectUrlCache.get(getStorageKey(theme, filename)) || null;
  }

  async downloadTheme(theme: string, onProgress?: DownloadProgress): Promise<void> {
    const existingDownload = this.downloads.get(theme);
    if (existingDownload) {
      await existingDownload;
      onProgress?.(100);
      return;
    }

    const download = this.downloadThemeFiles(theme, onProgress);
    this.downloads.set(theme, download);
    try {
      await download;
    } finally {
      this.downloads.delete(theme);
    }
  }

  private async downloadThemeFiles(theme: string, onProgress?: DownloadProgress): Promise<void> {
    const filenames = remoteUiIconAssetService.getDownloadFileNames();

    try {
      for (let index = 0; index < filenames.length; index += 1) {
        const filename = filenames[index];
        const response = await remoteUiIconAssetService.fetchIcon(theme, filename);
        if (!response.ok) {
          throw new Error(`UI icon download failed: ${theme}/${filename} (${response.status})`);
        }

        const blob = await response.blob();
        const storageKey = getStorageKey(theme, filename);
        await imageService.writeImage(storageKey, blob);
        onProgress?.(Math.round(((index + 1) / filenames.length) * 100));
      }

      writeDownloadedThemes([...this.listDownloadedThemes(), theme]);
      await this.activateTheme(theme);
    } catch (error) {
      throw error;
    }
  }

  async activateTheme(theme: string): Promise<boolean> {
    if (!this.isThemeDownloaded(theme)) {
      return false;
    }

    const filenames = remoteUiIconAssetService.getDownloadFileNames();
    const urls = await Promise.all(filenames.map((filename) => this.loadLocalIconUrl(theme, filename)));
    if (urls.some((url) => !url)) {
      return false;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ui-icon-assets-ready', { detail: { theme } }));
    }
    return true;
  }

  private async loadLocalIconUrl(theme: string, filename: string): Promise<string | null> {
    const storageKey = getStorageKey(theme, filename);
    const cached = this.objectUrlCache.get(storageKey);
    if (cached) {
      return cached;
    }

    try {
      const storedData = await imageService.readImage(storageKey);
      if (storedData === undefined || storedData === null) {
        throw new Error(`Local UI icon is missing: ${storageKey}`);
      }
      const url = storedData instanceof Blob
        ? URL.createObjectURL(storedData)
        : typeof storedData === 'string'
          ? `data:image/webp;base64,${storedData}`
          : URL.createObjectURL(new Blob([storedData], { type: 'image/webp' }));
      this.objectUrlCache.set(storageKey, url);
      return url;
    } catch (error) {
      console.warn('[UiIconAssetService] Failed to load local UI icon', { storageKey, error });
      return null;
    }
  }
}

export const uiIconAssetService = new UiIconAssetService();
