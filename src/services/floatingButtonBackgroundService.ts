/**
 * @file floatingButtonBackgroundService.ts
 * @input Uploaded global floating-button background image and scale preference
 * @output Persisted selection, safe image replacement, and change notifications
 * @pos Service (UI Customization)
 * @description Stores one theme-synchronized image that replaces the circular background of all FloatingButton instances.
 * @updated 2026-09-29: Added global scalable floating-button background settings.
 */

import { THEME_KEYS } from '../constants/storageKeys';
import { imageService } from './imageService';
import { getSettingsReferencedImages } from './settingsImageReferenceService';

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

const getCurrentFilename = (): string | null => {
  const filename = localStorage.getItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND);
  return filename?.trim() || null;
};

class FloatingButtonBackgroundService {
  getSettings(): FloatingButtonBackgroundSettings {
    return {
      imageFilename: getCurrentFilename(),
      scale: clampScale(localStorage.getItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCALE))
    };
  }

  setScale(scale: number): FloatingButtonBackgroundSettings {
    const next = clampScale(scale);
    localStorage.setItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCALE, String(next));
    this.notifyChanged();
    return { ...this.getSettings(), scale: next };
  }

  setSettings(imageFilename: string | null, scale = DEFAULT_SCALE): FloatingButtonBackgroundSettings {
    if (imageFilename?.trim()) localStorage.setItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND, imageFilename);
    else localStorage.removeItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND);
    localStorage.setItem(THEME_KEYS.FLOATING_BUTTON_BACKGROUND_SCALE, String(clampScale(scale)));
    this.notifyChanged();
    return this.getSettings();
  }

  async setImage(file: File): Promise<FloatingButtonBackgroundSettings> {
    if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('图片不能超过 10MB');

    const previous = getCurrentFilename();
    const filename = await imageService.saveImage(file, 'theme');
    this.setSettings(filename, this.getSettings().scale);
    await this.deleteIfUnreferenced(previous);
    return this.getSettings();
  }

  async clearImage(): Promise<void> {
    const previous = getCurrentFilename();
    this.setSettings(null, DEFAULT_SCALE);
    await this.deleteIfUnreferenced(previous);
  }

  private async deleteIfUnreferenced(filename: string | null): Promise<void> {
    if (!filename) return;
    const references = getSettingsReferencedImages();
    if (references.has(filename) || references.has(`thumb_${filename}`)) return;
    await imageService.deleteImage(filename).catch(() => undefined);
  }

  private notifyChanged(): void {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(FLOATING_BUTTON_BACKGROUND_CHANGED_EVENT));
  }
}

export const floatingButtonBackgroundService = new FloatingButtonBackgroundService();
