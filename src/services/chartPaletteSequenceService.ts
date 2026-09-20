/**
 * @file chartPaletteSequenceService.ts
 * @input Named multi-color sequences and HEX values.
 * @output Persisted CRUD for custom activity statistic palettes.
 * @pos Service
 * @description Stores user-created chart color sequences shared by sponsorship settings and activity analytics.
 */
import { THEME_KEYS, storage } from '../constants/storageKeys';
import type { CustomChartPaletteSequence } from '../types';
import { normalizeCustomColorHex } from './customColorGroupService';

export const CHART_PALETTE_SEQUENCES_UPDATED_EVENT = 'lumostime:chart-palette-sequences-updated';
const MIN_COLORS = 3;
const MAX_COLORS = 8;

const sanitize = (value: unknown): CustomChartPaletteSequence[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') return null;
    const candidate = item as Partial<CustomChartPaletteSequence>;
    const id = typeof candidate.id === 'string' && candidate.id.startsWith('custom:')
      ? candidate.id as `custom:${string}`
      : `custom:palette_${Date.now()}_${index}` as `custom:${string}`;
    const colors = Array.isArray(candidate.colors)
      ? candidate.colors.map((color) => normalizeCustomColorHex(String(color))).filter(Boolean).slice(0, MAX_COLORS) as string[]
      : [];
    const name = typeof candidate.name === 'string' ? candidate.name.trim().slice(0, 32) : '';
    if (!name || colors.length < MIN_COLORS) return null;
    const timestamp = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now();
    return {
      id,
      name,
      colors,
      createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : timestamp,
      updatedAt: timestamp,
    };
  }).filter(Boolean) as CustomChartPaletteSequence[];
};

const notify = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHART_PALETTE_SEQUENCES_UPDATED_EVENT));
};

export const chartPaletteSequenceService = {
  getAll(): CustomChartPaletteSequence[] {
    return sanitize(storage.getJSON(THEME_KEYS.CUSTOM_CHART_PALETTE_SEQUENCES, []));
  },
  save(sequence: CustomChartPaletteSequence): void {
    const current = chartPaletteSequenceService.getAll().filter((item) => item.id !== sequence.id);
    const sanitized = sanitize([sequence])[0];
    if (!sanitized) return;
    storage.setJSON(THEME_KEYS.CUSTOM_CHART_PALETTE_SEQUENCES, [...current, sanitized]);
    notify();
  },
  delete(id: `custom:${string}`): void {
    storage.setJSON(THEME_KEYS.CUSTOM_CHART_PALETTE_SEQUENCES, chartPaletteSequenceService.getAll().filter((item) => item.id !== id));
    notify();
  },
};
