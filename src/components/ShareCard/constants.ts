/**
 * @file constants.ts
 * @description Constants for ShareCard themes and templates
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
    primaryColor: '#111111',
    backgroundColor: '#FFFFFF',
    fontFamily: 'font-sans',
  },
];

export const SHARE_TEMPLATES: ShareTemplate[] = [
  {
    id: 'magazine-classic',
    name: '经典杂志',
    description: '优雅的居中排版',
  },
  {
    id: 'vertical-poetry',
    name: '竖排古韵',
    description: '传统竖排文字',
  },
  {
    id: 'modern-split',
    name: '现代分割',
    description: '左文右图',
  },
  {
    id: 'film-story',
    name: '胶片时刻',
    description: '大留白与阴影',
  },
  {
    id: 'minimal-note',
    name: '留白便签',
    description: '极简风格',
  }
];
