/**
 * @file todoScheduleColorService.ts
 * @input Schedule-type color setting payloads
 * @output Shared persisted schedule-type color settings plus resolved colors
 * @pos Service
 * @description Persists the shared default/custom color mapping used when Todo schedule views color entries by Arrange / Due / Repeat / Done / Trace type.
 * @updated 2026-05-11: Added shared default/custom schedule-type colors so week and month schedule views can reuse one editable five-color palette.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import { SETTINGS_KEYS, storage } from '../constants/storageKeys';
import { normalizeHexColor } from '../utils/colorUtils';

export const TODO_SCHEDULE_TYPE_COLOR_SETTINGS_UPDATED_EVENT = 'lumostime:todo-schedule-type-colors-updated';

export type TodoScheduleTypeColorKey = 'scheduled' | 'deadline' | 'recurring' | 'completed' | 'inProgress';
export type TodoScheduleTypeColorMode = 'default' | 'custom';

export interface TodoScheduleTypeColorSettings {
  version: 1;
  mode: TodoScheduleTypeColorMode;
  colors: Partial<Record<TodoScheduleTypeColorKey, string>>;
  updatedAt: number;
}

export const TODO_SCHEDULE_TYPE_COLOR_ITEMS: Array<{ key: TodoScheduleTypeColorKey; label: string }> = [
  { key: 'scheduled', label: '安排' },
  { key: 'deadline', label: '截止' },
  { key: 'recurring', label: '重复' },
  { key: 'completed', label: '完成' },
  { key: 'inProgress', label: '追踪' }
];

export const DEFAULT_TODO_SCHEDULE_TYPE_COLORS: Record<TodoScheduleTypeColorKey, string> = {
  scheduled: '#141414',
  deadline: '#C86A4C',
  recurring: '#768252',
  completed: '#A4A09A',
  inProgress: '#60758B'
};

const DEFAULT_SETTINGS: TodoScheduleTypeColorSettings = {
  version: 1,
  mode: 'default',
  colors: {},
  updatedAt: Date.now()
};

type TodoScheduleTypeColorSettingsLike = Partial<TodoScheduleTypeColorSettings> & {
  colors?: unknown;
  updatedAt?: unknown;
};

const isScheduleTypeColorKey = (value: string): value is TodoScheduleTypeColorKey => (
  TODO_SCHEDULE_TYPE_COLOR_ITEMS.some((item) => item.key === value)
);

const sanitizeColors = (colorsLike: unknown): Partial<Record<TodoScheduleTypeColorKey, string>> => {
  if (!colorsLike || typeof colorsLike !== 'object') {
    return {};
  }

  const nextColors: Partial<Record<TodoScheduleTypeColorKey, string>> = {};

  Object.entries(colorsLike as Record<string, unknown>).forEach(([key, value]) => {
    if (!isScheduleTypeColorKey(key)) {
      return;
    }

    const normalized = typeof value === 'string' ? normalizeHexColor(value) : null;
    if (!normalized) {
      return;
    }

    nextColors[key] = normalized;
  });

  return nextColors;
};

const sanitizeSettings = (settingsLike: unknown): TodoScheduleTypeColorSettings => {
  if (!settingsLike || typeof settingsLike !== 'object') {
    return {
      ...DEFAULT_SETTINGS,
      updatedAt: Date.now()
    };
  }

  const candidate = settingsLike as TodoScheduleTypeColorSettingsLike;
  const mode: TodoScheduleTypeColorMode = candidate.mode === 'custom' ? 'custom' : 'default';

  return {
    version: 1,
    mode,
    colors: sanitizeColors(candidate.colors),
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now()
  };
};

export const getTodoScheduleTypePreviewColors = (
  settings: TodoScheduleTypeColorSettings
): Record<TodoScheduleTypeColorKey, string> => ({
  ...DEFAULT_TODO_SCHEDULE_TYPE_COLORS,
  ...settings.colors
});

export const getResolvedTodoScheduleTypeColors = (
  settings: TodoScheduleTypeColorSettings
): Record<TodoScheduleTypeColorKey, string> => (
  settings.mode === 'custom'
    ? getTodoScheduleTypePreviewColors(settings)
    : DEFAULT_TODO_SCHEDULE_TYPE_COLORS
);

export const todoScheduleColorService = {
  getSettings(): TodoScheduleTypeColorSettings {
    const raw = storage.getJSON<unknown>(SETTINGS_KEYS.TODO_SCHEDULE_TYPE_COLORS, DEFAULT_SETTINGS);
    const sanitized = sanitizeSettings(raw);

    if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
      todoScheduleColorService.saveSettings(sanitized);
    }

    return sanitized;
  },

  saveSettings(settings: TodoScheduleTypeColorSettings): void {
    const sanitized = sanitizeSettings(settings);

    storage.setJSON(SETTINGS_KEYS.TODO_SCHEDULE_TYPE_COLORS, {
      ...sanitized,
      version: 1,
      updatedAt: Date.now()
    } satisfies TodoScheduleTypeColorSettings);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TODO_SCHEDULE_TYPE_COLOR_SETTINGS_UPDATED_EVENT));
    }
  }
};
