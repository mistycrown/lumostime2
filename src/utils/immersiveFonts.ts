/**
 * @file immersiveFonts.ts
 * @input Persisted immersive timer font ids
 * @output Immersive timer font options and storage normalization helpers
 * @pos Utility
 * @description Centralizes the immersive timer typeface presets so the timer and style selector share one source of truth.
 */

import { SETTINGS_KEYS } from '../constants/storageKeys';

export type ImmersiveTimerFontId =
  | 'rubik-mono-one'
  | 'lahlit'
  | 'montserrat-black'
  | 'kode-mono'
  | 'ibm-plex-mono';

export interface ImmersiveTimerFontOption {
  id: ImmersiveTimerFontId;
  name: string;
  fontFamily: string;
  fontWeight: number;
  separatorSlotWidth?: string;
}

export const DEFAULT_IMMERSIVE_TIMER_FONT_ID: ImmersiveTimerFontId = 'kode-mono';
export const IMMERSIVE_TIMER_FONT_STORAGE_KEY = SETTINGS_KEYS.IMMERSIVE_TIMER_FONT;

export const IMMERSIVE_TIMER_FONT_OPTIONS: ImmersiveTimerFontOption[] = [
  {
    id: 'kode-mono',
    name: 'Kode Mono',
    fontFamily: '"Kode Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace',
    fontWeight: 700,
  },
  {
    id: 'rubik-mono-one',
    name: 'Rubik Mono One',
    fontFamily: '"Rubik Mono One", "Lahlit Font", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontWeight: 400,
    separatorSlotWidth: '0.12ch',
  },
  {
    id: 'lahlit',
    name: 'Lahlit',
    fontFamily: '"Lahlit Font", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontWeight: 800,
  },
  {
    id: 'montserrat-black',
    name: 'Montserrat',
    fontFamily: '"Montserrat", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontWeight: 900,
  },
  {
    id: 'ibm-plex-mono',
    name: 'IBM Plex Mono',
    fontFamily: '"IBM Plex Mono", "Noto Sans Mono CJK SC", "Microsoft YaHei", monospace',
    fontWeight: 700,
  },
];

export const normalizeImmersiveTimerFontId = (
  value: string | null | undefined
): ImmersiveTimerFontId =>
  IMMERSIVE_TIMER_FONT_OPTIONS.some((option) => option.id === value)
    ? (value as ImmersiveTimerFontId)
    : DEFAULT_IMMERSIVE_TIMER_FONT_ID;

export const readStoredImmersiveTimerFontId = (
  storage: Pick<Storage, 'getItem'>
): ImmersiveTimerFontId => normalizeImmersiveTimerFontId(storage.getItem(IMMERSIVE_TIMER_FONT_STORAGE_KEY));

export const getImmersiveTimerFontOptionById = (
  fontId: ImmersiveTimerFontId
): ImmersiveTimerFontOption =>
  IMMERSIVE_TIMER_FONT_OPTIONS.find((option) => option.id === fontId) ?? IMMERSIVE_TIMER_FONT_OPTIONS[0];
