/**
 * @file cardBackgroundService.ts
 * @input User-created card background groups and image files
 * @output Persisted card background settings, image references, and change events
 * @pos Service (UI Customization)
 * @description Stores card background groups independently and saves uploaded images in the synchronized theme image group.
 * @updated 2026-09-28: Adds a shared subtle shadow whenever a custom card background is active.
 */
import { imageService } from './imageService';
import { getSettingsReferencedImages } from './settingsImageReferenceService';
import type { CSSProperties } from 'react';

export type CardBackgroundAlignment = 'right' | 'right-top' | 'right-bottom';

export interface CardBackgroundGroup {
  id: string;
  name: string;
  imageFilenames: string[];
  alignment: CardBackgroundAlignment;
}

export const CARD_BACKGROUND_GROUPS_KEY = 'lumostime_card_background_groups_v1';
export const CARD_BACKGROUND_CURRENT_KEY = 'lumostime_card_background_current_v1';
export const CARD_BACKGROUND_OPACITY_KEY = 'lumostime_card_background_opacity_v1';
export const CARD_BACKGROUND_CHANGED_EVENT = 'lumostime:card-background-changed';
export const CARD_BACKGROUND_OPACITY_EVENT = 'lumostime:card-background-opacity-changed';

const DEFAULT_OPACITY = 0.4;
const ALIGNMENTS = new Set<CardBackgroundAlignment>(['right', 'right-top', 'right-bottom']);

const normalizeGroup = (value: unknown): CardBackgroundGroup | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CardBackgroundGroup>;
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !Array.isArray(candidate.imageFilenames)) return null;

  const imageFilenames = candidate.imageFilenames.filter((filename): filename is string => (
    typeof filename === 'string' && filename.trim().length > 0
  ));
  if (imageFilenames.length === 0) return null;

  return {
    id: candidate.id,
    name: candidate.name.trim().slice(0, 30) || '未命名分组',
    imageFilenames,
    alignment: ALIGNMENTS.has(candidate.alignment as CardBackgroundAlignment)
      ? candidate.alignment as CardBackgroundAlignment
      : 'right'
  };
};

export const getCardBackgroundPosition = (alignment: CardBackgroundAlignment): string => {
  if (alignment === 'right-top') return 'right top';
  if (alignment === 'right-bottom') return 'right bottom';
  return 'right center';
};

const getCardBackgroundImageSize = (alignment: CardBackgroundAlignment): string => (
  alignment === 'right' ? 'cover' : '100% auto'
);

export const getCardBackgroundStyle = (
  imageUrl: string,
  alignment: CardBackgroundAlignment,
  opacity: number
): CSSProperties => {
  const safeOpacity = Math.min(1, Math.max(0, Number.isFinite(opacity) ? opacity : DEFAULT_OPACITY));
  const safeUrl = imageUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return {
    backgroundImage: `linear-gradient(rgba(255, 255, 255, ${1 - safeOpacity}), rgba(255, 255, 255, ${1 - safeOpacity})), url("${safeUrl}")`,
    backgroundPosition: `center, ${getCardBackgroundPosition(alignment)}`,
    backgroundSize: `cover, ${getCardBackgroundImageSize(alignment)}`,
    backgroundRepeat: 'no-repeat, no-repeat',
    backgroundColor: 'transparent',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.07)'
  };
};

class CardBackgroundService {
  getGroups(): CardBackgroundGroup[] {
    try {
      const raw = JSON.parse(localStorage.getItem(CARD_BACKGROUND_GROUPS_KEY) || '[]') as unknown;
      return Array.isArray(raw) ? raw.map(normalizeGroup).filter((group): group is CardBackgroundGroup => Boolean(group)) : [];
    } catch {
      return [];
    }
  }

  getCurrentGroupId(): string | null {
    const id = localStorage.getItem(CARD_BACKGROUND_CURRENT_KEY);
    return this.getGroups().some((group) => group.id === id) ? id : null;
  }

  getCurrentGroup(): CardBackgroundGroup | null {
    const id = this.getCurrentGroupId();
    return id ? this.getGroups().find((group) => group.id === id) || null : null;
  }

  getBackgroundAt(index: number): { filename: string; alignment: CardBackgroundAlignment } | null {
    const group = this.getCurrentGroup();
    if (!group || group.imageFilenames.length === 0) return null;
    const imageIndex = ((Math.trunc(index) % group.imageFilenames.length) + group.imageFilenames.length) % group.imageFilenames.length;
    return { filename: group.imageFilenames[imageIndex], alignment: group.alignment };
  }

  getOpacity(): number {
    const value = Number(localStorage.getItem(CARD_BACKGROUND_OPACITY_KEY));
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_OPACITY;
  }

  setCurrentGroup(id: string | null): void {
    const nextId = id && this.getGroups().some((group) => group.id === id) ? id : '';
    if (nextId) localStorage.setItem(CARD_BACKGROUND_CURRENT_KEY, nextId);
    else localStorage.removeItem(CARD_BACKGROUND_CURRENT_KEY);
    this.notifyChanged();
  }

  setOpacity(opacity: number): void {
    const nextOpacity = Math.min(1, Math.max(0, Number.isFinite(opacity) ? opacity : DEFAULT_OPACITY));
    localStorage.setItem(CARD_BACKGROUND_OPACITY_KEY, String(nextOpacity));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CARD_BACKGROUND_OPACITY_EVENT));
  }

  async addGroup(name: string, files: File[], alignment: CardBackgroundAlignment): Promise<CardBackgroundGroup> {
    const normalizedName = name.trim().slice(0, 30);
    if (!normalizedName) throw new Error('请输入分组名称');
    if (files.length === 0) throw new Error('请至少添加一张图片');
    if (!ALIGNMENTS.has(alignment)) throw new Error('对齐方式无效');
    if (files.some((file) => !file.type.startsWith('image/'))) throw new Error('请选择图片文件');
    if (files.some((file) => file.size > 10 * 1024 * 1024)) throw new Error('单张图片不能超过 10MB');

    const filenames: string[] = [];
    try {
      for (const file of files) filenames.push(await imageService.saveImage(file, 'theme'));
    } catch (error) {
      await Promise.all(filenames.map((filename) => imageService.deleteImage(filename).catch(() => undefined)));
      throw error;
    }

    const group: CardBackgroundGroup = {
      id: `card-background-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      imageFilenames: filenames,
      alignment
    };
    const groups = [...this.getGroups(), group];
    localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify(groups));
    localStorage.setItem(CARD_BACKGROUND_CURRENT_KEY, group.id);
    this.notifyChanged();
    return group;
  }

  async updateGroup(
    id: string,
    name: string,
    retainedFilenames: string[],
    files: File[],
    alignment: CardBackgroundAlignment
  ): Promise<CardBackgroundGroup> {
    const groups = this.getGroups();
    const target = groups.find((group) => group.id === id);
    if (!target) throw new Error('鍗＄墖鑳屾櫙缁勪笉瀛樺湪');

    const normalizedName = name.trim().slice(0, 30);
    if (!normalizedName) throw new Error('请输入分组名称');
    if (!ALIGNMENTS.has(alignment)) throw new Error('瀵归綈鏂瑰紡鏃犳晥');
    if (files.some((file) => !file.type.startsWith('image/'))) throw new Error('璇烽€夋嫨鍥剧墖鏂囦欢');
    if (files.some((file) => file.size > 10 * 1024 * 1024)) throw new Error('鍗曞紶鍥剧墖涓嶈兘瓒呰繃 10MB');

    const kept = Array.from(new Set(retainedFilenames.filter((filename) => target.imageFilenames.includes(filename))));
    if (kept.length === 0 && files.length === 0) throw new Error('请至少保留或添加一张图片');

    const addedFilenames: string[] = [];
    try {
      for (const file of files) addedFilenames.push(await imageService.saveImage(file, 'theme'));
      const updated: CardBackgroundGroup = {
        ...target,
        name: normalizedName,
        imageFilenames: [...kept, ...addedFilenames],
        alignment
      };
      localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify(groups.map((group) => group.id === id ? updated : group)));

      const retainedImages = getSettingsReferencedImages();
      await Promise.all(target.imageFilenames.filter((filename) => !updated.imageFilenames.includes(filename)).map(async (filename) => {
        if (!retainedImages.has(filename) && !retainedImages.has(`thumb_${filename}`)) {
          await imageService.deleteImage(filename).catch(() => undefined);
        }
      }));
      this.notifyChanged();
      return updated;
    } catch (error) {
      await Promise.all(addedFilenames.map((filename) => imageService.deleteImage(filename).catch(() => undefined)));
      throw error;
    }
  }

  async deleteGroup(id: string): Promise<boolean> {
    const groups = this.getGroups();
    const target = groups.find((group) => group.id === id);
    if (!target) return false;

    const remaining = groups.filter((group) => group.id !== id);
    localStorage.setItem(CARD_BACKGROUND_GROUPS_KEY, JSON.stringify(remaining));
    if (this.getCurrentGroupId() === id) {
      if (remaining.length > 0) localStorage.setItem(CARD_BACKGROUND_CURRENT_KEY, remaining[0].id);
      else localStorage.removeItem(CARD_BACKGROUND_CURRENT_KEY);
    }

    const retainedImages = getSettingsReferencedImages();
    await Promise.all(target.imageFilenames.map(async (filename) => {
      if (!retainedImages.has(filename) && !retainedImages.has(`thumb_${filename}`)) {
        await imageService.deleteImage(filename).catch(() => undefined);
      }
    }));
    this.notifyChanged();
    return true;
  }

  private notifyChanged(): void {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CARD_BACKGROUND_CHANGED_EVENT));
  }
}

export const cardBackgroundService = new CardBackgroundService();
