/**
 * @file customColorGroupService.ts
 * @input HEX color string (e.g. #AABBCC / #AABBCCDD)
 * @output Custom color group CRUD with normalized persistence
 * @pos Service
 * @description 自定义色组存储服务，负责自定义色的归一化、去重、清洗与本地持久化。
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { THEME_KEYS, storage } from '../constants/storageKeys';
import type { CustomColorGroup, CustomColorItem } from '../types';

export const CUSTOM_COLOR_GROUP_UPDATED_EVENT = 'lumostime:custom-color-group-updated';

const DEFAULT_GROUP: CustomColorGroup = {
  version: 1,
  colors: [],
  updatedAt: Date.now(),
};

type AddCustomColorResult = {
  success: boolean;
  error?: 'INVALID_HEX' | 'DUPLICATE';
};

type CustomColorGroupLike = Partial<CustomColorGroup> & {
  colors?: unknown;
  updatedAt?: unknown;
};

export const normalizeCustomColorHex = (input: string): string | null => {
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const raw = withHash.slice(1);

  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(raw)) {
    return null;
  }

  if (raw.length === 3) {
    const expanded = raw
      .split('')
      .map((char) => `${char}${char}`)
      .join('');

    return `#${expanded.toUpperCase()}`;
  }

  return `#${raw.toUpperCase()}`;
};

export const isCustomColorDuplicate = (
  input: string,
  colors: CustomColorItem[]
): boolean => {
  const normalized = normalizeCustomColorHex(input);
  if (!normalized) return false;

  return colors.some((item) => item.color.toUpperCase() === normalized);
};

const sanitizeColorItems = (items: unknown[]): CustomColorItem[] => {
  const seen = new Set<string>();

  return items
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;

      const candidate = item as Partial<CustomColorItem>;
      const normalized = normalizeCustomColorHex(String(candidate.color ?? ''));
      if (!normalized || seen.has(normalized)) return null;

      seen.add(normalized);

      const createdAt =
        typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now() + index;
      const id =
        typeof candidate.id === 'string' && candidate.id.trim()
          ? candidate.id
          : `custom_color_${createdAt}_${index}`;

      return {
        id,
        color: normalized,
        createdAt,
      } satisfies CustomColorItem;
    })
    .filter(Boolean) as CustomColorItem[];
};

const sanitizeGroup = (groupLike: unknown): CustomColorGroup => {
  if (!groupLike || typeof groupLike !== 'object') {
    return {
      ...DEFAULT_GROUP,
      updatedAt: Date.now(),
    };
  }

  const candidate = groupLike as CustomColorGroupLike;

  return {
    version: 1,
    colors: sanitizeColorItems(Array.isArray(candidate.colors) ? candidate.colors : []),
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
  };
};

const serializeGroup = (group: unknown): string => {
  try {
    return JSON.stringify(group);
  } catch {
    return '';
  }
};

export const customColorGroupService = {
  getGroup(): CustomColorGroup {
    const rawGroup = storage.getJSON<unknown>(THEME_KEYS.CUSTOM_COLOR_GROUP, DEFAULT_GROUP);
    const sanitizedGroup = sanitizeGroup(rawGroup);

    if (rawGroup && serializeGroup(rawGroup) !== serializeGroup(sanitizedGroup)) {
      customColorGroupService.saveGroup(sanitizedGroup);
    }

    return sanitizedGroup;
  },

  saveGroup(group: CustomColorGroup): void {
    const sanitizedGroup = sanitizeGroup(group);

    storage.setJSON(THEME_KEYS.CUSTOM_COLOR_GROUP, {
      ...sanitizedGroup,
      version: 1,
      updatedAt: Date.now(),
    } satisfies CustomColorGroup);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CUSTOM_COLOR_GROUP_UPDATED_EVENT));
    }
  },

  addColor(input: string): AddCustomColorResult {
    const normalized = normalizeCustomColorHex(input);
    if (!normalized) {
      return { success: false, error: 'INVALID_HEX' };
    }

    const group = customColorGroupService.getGroup();
    if (isCustomColorDuplicate(normalized, group.colors)) {
      return { success: false, error: 'DUPLICATE' };
    }

    const timestamp = Date.now();
    const newItem: CustomColorItem = {
      id: `custom_color_${timestamp}_${Math.random().toString(16).slice(2)}`,
      color: normalized,
      createdAt: timestamp,
    };

    customColorGroupService.saveGroup({
      version: 1,
      colors: [...group.colors, newItem],
      updatedAt: timestamp,
    });

    return { success: true };
  },

  deleteColor(colorId: string): void {
    const group = customColorGroupService.getGroup();

    customColorGroupService.saveGroup({
      version: 1,
      colors: group.colors.filter((item) => item.id !== colorId),
      updatedAt: Date.now(),
    });
  },

  setColors(colors: CustomColorItem[]): void {
    customColorGroupService.saveGroup({
      version: 1,
      colors,
      updatedAt: Date.now(),
    });
  },
};
