/**
 * @file constants.ts
 * @description Constants for ShareCard themes and templates
 * @updated 2026-10-12: Describes the refined text-only film-story as an editorial page.
 * @updated 2026-10-12: Registers a text-only graph-paper journal template.
 * @updated 2026-10-12: Registers the single-photo circular portrait and centered book-page layout.
 * @updated 2026-10-12: Separates existing text templates from the editorial photography collection.
 * @updated 2026-10-12: Renames seamless stacking and describes the photo-backed and photo-first framed layouts.
 * @updated 2026-10-12: Adds a framed long-photo layout alongside seamless stacking.
 * @updated 2026-10-12: Registers the full-width stacked photo template for multi-image records.
 */

import { ShareTheme, ShareTemplate } from './types';

export const SHARE_THEMES: ShareTheme[] = [
  {
    id: 'ink-black',
    name: '水墨黑',
    primaryColor: '#2C2C2C',
    backgroundColor: '#F5F5F0',
    fontFamily: 'font-serif',
  },
  {
    id: 'cinnabar-red',
    name: '朱砂红',
    primaryColor: '#8E2800',
    backgroundColor: '#FFF9F5',
    fontFamily: 'font-serif',
  },
  {
    id: 'bamboo-green',
    name: '竹青',
    primaryColor: '#385E3C',
    backgroundColor: '#F0F5F2',
    fontFamily: 'font-serif',
  },
  {
    id: 'indigo-blue',
    name: '靛蓝',
    primaryColor: '#2B4C7E',
    backgroundColor: '#F2F6F9',
    fontFamily: 'font-serif',
  },
  {
    id: 'pure-white',
    name: '极简白',
    primaryColor: '#6B6B6B',
    backgroundColor: '#FFFFFF',
    fontFamily: 'font-serif',
  },
  {
    id: 'rouge-pink',
    name: '胭脂粉',
    primaryColor: '#9D2933',
    backgroundColor: '#FFF5F7',
    fontFamily: 'font-serif',
  },
  {
    id: 'amber-yellow',
    name: '琥珀黄',
    primaryColor: '#8B5A00',
    backgroundColor: '#FFFBF0',
    fontFamily: 'font-serif',
  },
  {
    id: 'wisteria-purple',
    name: '紫藤',
    primaryColor: '#5D3A7A',
    backgroundColor: '#F8F5FA',
    fontFamily: 'font-serif',
  },
  {
    id: 'slate-gray',
    name: '青灰',
    primaryColor: '#4A5568',
    backgroundColor: '#F7F8FA',
    fontFamily: 'font-serif',
  },
];

export const TEXT_SHARE_TEMPLATES: ShareTemplate[] = [
  {
    id: 'magazine-classic',
    name: '经典',
    description: '优雅的居中排版',
  },
  {
    id: 'vertical-poetry',
    name: '古韵',
    description: '传统竖排文字',
  },
  {
    id: 'minimal-note',
    name: '现代',
    description: '极简风格',
  },
  {
    id: 'modern-split',
    name: '分割',
    description: '分割线与正文排版',
  },
  {
    id: 'film-story',
    name: '变迁',
    description: '深色书页与轻文字排版',
  },
  {
    id: 'glass-morphism',
    name: '玻璃',
    description: '毛玻璃质感',
  },
  {
    id: 'grid-journal',
    name: '方格手帐',
    description: '淡方格纸与日记式文字排版',
  }
];

export const PHOTO_SHARE_TEMPLATES: ShareTemplate[] = [
  {
    id: 'photo-diary',
    name: '摄影日记',
    description: '相纸留白与照片下方的日记',
  },
  {
    id: 'film-story',
    name: '变迁',
    description: '虚化照片背景与深色卡片',
  },
  {
    id: 'circle-note',
    name: '圆影书页',
    description: '圆形照片与居中的书页文字',
    minImages: 1,
    maxImages: 1,
  },
  {
    id: 'long-image',
    name: '无缝长图',
    description: '照片原比例纵向拼接',
    minImages: 2,
  },
  {
    id: 'framed-long-image',
    name: '边框长图',
    description: '拍立得相纸边框与底部文字排版',
    minImages: 2,
  },
  {
    id: 'film-strip',
    name: '胶片长图',
    description: '暗色底片与细小帧号',
    minImages: 2,
  }
];
