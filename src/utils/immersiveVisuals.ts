/**
 * @file immersiveVisuals.ts
 * @input Persisted immersive visual ids and bundled art asset metadata
 * @output Immersive timer art options, motion presets, and storage normalization helpers
 * @pos Utility
 * @description Centralizes immersive timer visual preset definitions so the timer, modal, and tests share one source of truth for bundled paintings and motion styles.
 */

import { SETTINGS_KEYS } from '../constants/storageKeys';

export type ImmersiveArtId =
  | '640x0'
  | 'impression-sunrise'
  | 'moreno-garden'
  | 'three-cows'
  | 'starry-night'
  | 'van-gogh-127';

export type ImmersiveMotionStyle = 'sweep' | 'orbit' | 'drift';

export interface ImmersiveArtOption {
  id: ImmersiveArtId;
  name: string;
  src: string;
  thumbnailSrc: string;
}

export interface ImmersiveMotionOption {
  id: ImmersiveMotionStyle;
  name: string;
  description: string;
}

export const DEFAULT_IMMERSIVE_ART_ID: ImmersiveArtId = 'starry-night';
export const DEFAULT_IMMERSIVE_MOTION_STYLE: ImmersiveMotionStyle = 'sweep';

export const IMMERSIVE_VISUAL_STORAGE_KEYS = {
  art: SETTINGS_KEYS.IMMERSIVE_TIMER_ART,
  motionStyle: SETTINGS_KEYS.IMMERSIVE_TIMER_MOTION_STYLE,
} as const;

export const IMMERSIVE_ART_OPTIONS: ImmersiveArtOption[] = [
  { id: '640x0', name: '海岸', src: '/timer_bak/640x0.jpg', thumbnailSrc: '/timer_bak/640x0.jpg' },
  {
    id: 'impression-sunrise',
    name: '日出印象',
    src: '/timer_bak/Monet_-_Impression,_Sunrise.jpg',
    thumbnailSrc: '/timer_bak/Monet_-_Impression,_Sunrise.jpg',
  },
  {
    id: 'moreno-garden',
    name: '花园',
    src: '/timer_bak/Moreno_Garden_Bordighera_1884_-_The_Norton_Museum_Miami_Florida.jpg',
    thumbnailSrc: '/timer_bak/Moreno_Garden_Bordighera_1884_-_The_Norton_Museum_Miami_Florida.jpg',
  },
  {
    id: 'three-cows',
    name: '三头牛',
    src: '/timer_bak/Three_Cows_Grazing_by_Claude_Monet.jpg',
    thumbnailSrc: '/timer_bak/Three_Cows_Grazing_by_Claude_Monet.jpg',
  },
  {
    id: 'starry-night',
    name: '星夜',
    src: '/timer_bak/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg.webp',
    thumbnailSrc: '/timer_bak/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg.webp',
  },
  {
    id: 'van-gogh-127',
    name: '梵高 127',
    src: '/timer_bak/Vincent_Willem_van_Gogh_127.jpg',
    thumbnailSrc: '/timer_bak/Vincent_Willem_van_Gogh_127.jpg',
  },
];

export const IMMERSIVE_MOTION_OPTIONS: ImmersiveMotionOption[] = [
  { id: 'sweep', name: '扫掠', description: '明显平移，带中等旋转' },
  { id: 'orbit', name: '轨道旋转', description: '轨道感更强，旋转更明显' },
  { id: 'drift', name: '分层漂移', description: '更稳，更耐看' },
];

export const normalizeImmersiveArtId = (value: string | null | undefined): ImmersiveArtId =>
  IMMERSIVE_ART_OPTIONS.some((option) => option.id === value)
    ? (value as ImmersiveArtId)
    : DEFAULT_IMMERSIVE_ART_ID;

export const normalizeImmersiveMotionStyle = (
  value: string | null | undefined
): ImmersiveMotionStyle =>
  IMMERSIVE_MOTION_OPTIONS.some((option) => option.id === value)
    ? (value as ImmersiveMotionStyle)
    : DEFAULT_IMMERSIVE_MOTION_STYLE;

export const readStoredImmersiveArtId = (
  storage: Pick<Storage, 'getItem'>
): ImmersiveArtId => normalizeImmersiveArtId(storage.getItem(IMMERSIVE_VISUAL_STORAGE_KEYS.art));

export const readStoredImmersiveMotionStyle = (
  storage: Pick<Storage, 'getItem'>
): ImmersiveMotionStyle =>
  normalizeImmersiveMotionStyle(storage.getItem(IMMERSIVE_VISUAL_STORAGE_KEYS.motionStyle));

export const getImmersiveArtOptionById = (artId: ImmersiveArtId): ImmersiveArtOption =>
  IMMERSIVE_ART_OPTIONS.find((option) => option.id === artId) ?? IMMERSIVE_ART_OPTIONS[0];
