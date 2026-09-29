/**
 * @file floatingButtonBackgroundService.ts
 * @input Uploaded floating-button image schemes, scheme selection, and per-scheme scale
 * @output Persisted scheme library, image cleanup, and change notifications
 * @pos Service (UI Customization)
 * @description Stores reusable image schemes that replace the circular background of every FloatingButton when selected.
 * @updated 2026-09-29: Replaced the single image setting with a migration-safe selectable scheme library.
 */

import { THEME_KEYS } from '../constants/storageKeys';
import { imageService } from './imageService';
import { getSettingsReferencedImages } from './settingsImageReferenceService';

export interface FloatingButtonBackgroundScheme {
  id: string;
  imageFilename: string;
  scale: number;
  source?: 'user' | 'package';
}

export interface FloatingButtonBackgroundSettings {
  imageFilename: string | null;
  scale: number;
}

export const FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT = 'lumostime:floating-button-background-changed';
const DEFAULT_SCALE = 100;
const MIN_SCALE = 50;
const MAX_SCALE = 200;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const clampScale = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return DEFAULT_SCALE;
  const scale = Number(value);
  if (!Number.isFinite(scale)) return DEFAULT_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(scale)));
};

const normalizeScheme = (value: unknown): FloatingButtonBackgroundScheme | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<FloatingButtonBackgroundScheme>;
  if (typeof candidate.id !== 'string' || !candidate.id.trim() || typeof candidate.imageFilename !== 'string' || !candidate.imageFilename.trim()) return null;
  return {
    id: candidate.id,
    imageFilename: candidate.imageFilename,
    scale: clampScale(candidate.scale),
    source: candidate.source === 'package' ? 'package' : 'user'
  };
};

const createSchemeId = (): string => `floating-button-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

class FloatingButtonBackgroundService {
  getSchemes(): FloatingButtonBackgroundScheme[] {
    const raw = localStorage.getItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCHEMES);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(normalizeScheme).filter((scheme): scheme is FloatingButtonBackgroundScheme => Boolean(scheme)) : [];
      } catch {
        return [];
      }
    }
    return this.migrateLegacyScheme();
  }

  getCurrentSchemeId(): string | null {
    const schemes = this.getSchemes();
    const id = localStorage.getItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_CURRENT);
    return id && schemes.some((scheme) => scheme.id === id) ? id : null;
  }

  getCurrentScheme(): FloatingButtonBackgroundScheme | null {
    const id = this.getCurrentSchemeId();
    return id ? this.getSchemes().find((scheme) => scheme.id === id) || null : null;
  }

  getSettings(): FloatingButtonBackgroundSettings {
    const scheme = this.getCurrentScheme();
    return scheme ? { imageFilename: scheme.imageFilename, scale: scheme.scale } : { imageFilename: null, scale: DEFAULT_SCALE };
  }

  async addScheme(file: File): Promise<FloatingButtonBackgroundScheme> {
    if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('图片不能超过 10MB');
    const scheme: FloatingButtonBackgroundScheme = {
      id: createSchemeId(),
      imageFilename: await imageService.saveImage(file, 'theme'),
      scale: DEFAULT_SCALE,
      source: 'user'
    };
    this.writeSchemes([...this.getSchemes(), scheme]);
    this.selectScheme(scheme.id);
    return scheme;
  }

  selectScheme(id: string | null): void {
    const next = id && this.getSchemes().some((scheme) => scheme.id === id) ? id : null;
    if (next) localStorage.setItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_CURRENT, next);
    else localStorage.removeItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_CURRENT);
    this.notifyChanged();
  }

  setSchemeScale(id: string, scale: number): FloatingButtonBackgroundScheme | null {
    const schemes = this.getSchemes();
    const current = schemes.find((scheme) => scheme.id === id);
    if (!current) return null;
    const updated = { ...current, scale: clampScale(scale) };
    this.writeSchemes(schemes.map((scheme) => scheme.id === id ? updated : scheme));
    this.notifyChanged();
    return updated;
  }

  async deleteScheme(id: string): Promise<boolean> {
    const schemes = this.getSchemes();
    const target = schemes.find((scheme) => scheme.id === id);
    if (!target) return false;
    const wasCurrent = this.getCurrentSchemeId() === id;
    this.writeSchemes(schemes.filter((scheme) => scheme.id !== id));
    if (wasCurrent) localStorage.removeItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_CURRENT);
    this.notifyChanged();
    await this.deleteIfUnreferenced(target.imageFilename);
    return true;
  }

  replacePackageSchemes(packageId: string, schemes: FloatingButtonBackgroundScheme[], selectedId?: string | null): void {
    const prefix = `theme:${packageId}:floating-button-`;
    const normalized = schemes.map(normalizeScheme).filter((scheme): scheme is FloatingButtonBackgroundScheme => Boolean(scheme));
    const removed = this.getSchemes().filter((scheme) => scheme.id.startsWith(prefix));
    const currentId = this.getCurrentSchemeId();
    const nextSchemes = [...this.getSchemes().filter((scheme) => !scheme.id.startsWith(prefix)), ...normalized];
    this.writeSchemes(nextSchemes);
    if (selectedId !== undefined) this.selectScheme(selectedId);
    else {
      if (currentId && !nextSchemes.some((scheme) => scheme.id === currentId)) localStorage.removeItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_CURRENT);
      this.notifyChanged();
    }
    void Promise.all(removed.filter((scheme) => !normalized.some((next) => next.imageFilename === scheme.imageFilename)).map((scheme) => this.deleteIfUnreferenced(scheme.imageFilename)));
  }

  /** Compatibility adapter for v1 callers; creates/selects a reusable scheme. */
  setSettings(imageFilename: string | null, scale = DEFAULT_SCALE): FloatingButtonBackgroundSettings {
    if (!imageFilename?.trim()) {
      this.selectScheme(null);
      return this.getSettings();
    }
    const schemes = this.getSchemes();
    const existing = schemes.find((scheme) => scheme.imageFilename === imageFilename);
    const scheme = existing || { id: createSchemeId(), imageFilename, scale: clampScale(scale), source: 'user' as const };
    this.writeSchemes(existing ? schemes.map((item) => item.id === scheme.id ? { ...item, scale: clampScale(scale) } : item) : [...schemes, scheme]);
    this.selectScheme(scheme.id);
    return this.getSettings();
  }

  private migrateLegacyScheme(): FloatingButtonBackgroundScheme[] {
    const imageFilename = localStorage.getItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND)?.trim();
    const schemes = imageFilename ? [{ id: createSchemeId(), imageFilename, scale: clampScale(localStorage.getItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCALE)), source: 'user' as const }] : [];
    this.writeSchemes(schemes);
    if (schemes[0]) localStorage.setItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_CURRENT, schemes[0].id);
    localStorage.removeItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND);
    localStorage.removeItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCALE);
    return schemes;
  }

  private writeSchemes(schemes: FloatingButtonBackgroundScheme[]): void {
    localStorage.setItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCHEMES, JSON.stringify(schemes));
  }

  private async deleteIfUnreferenced(filename: string): Promise<void> {
    const references = getSettingsReferencedImages();
    if (references.has(filename) || references.has(`thumb_${filename}`)) return;
    await imageService.deleteImage(filename).catch(() => undefined);
  }

  private notifyChanged(): void {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT));
  }
}

export const floatingButtonBackgroundService = new FloatingButtonBackgroundService();
