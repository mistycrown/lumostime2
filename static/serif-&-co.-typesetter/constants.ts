import { CardContent, Theme, Template } from './types';

// Using a simple base64 placeholder to ensure 'Save Image' works out of the box without CORS issues.
const PLACEHOLDER_IMG_1 = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop"; 
const PLACEHOLDER_IMG_2 = "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=1000&auto=format&fit=crop";

export const INITIAL_CONTENT: CardContent = {
  body: "蝉鸣声里的午后，时间仿佛凝固了。煮一壶老白茶，看着茶叶在水中舒展，像是某种缓慢的苏醒。\n\n我们常说要寻找生活的意义，其实意义就藏在这些具体而微的瞬间里——光影在墙上的移动，茶汤入喉的回甘。静下来，万物皆有情。",
  images: [
    PLACEHOLDER_IMG_1,
    PLACEHOLDER_IMG_2
  ],
  date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
  author: "生活家",
  activity: "品茶",
  domain: "闲趣"
};

export const THEMES: Theme[] = [
  {
    id: 'ink-black',
    name: '水墨黑',
    primaryColor: '#2C2C2C',
    backgroundColor: '#F5F5F0', // Rice paper white
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

export const TEMPLATES: Template[] = [
  {
    id: 'magazine-classic',
    name: '经典杂志',
    description: '优雅的居中排版，适合大多数场景。',
  },
  {
    id: 'vertical-poetry',
    name: '竖排古韵',
    description: '传统竖排文字，适合诗歌与短文。',
  },
  {
    id: 'modern-split',
    name: '现代分割',
    description: '左文右图，理性与感性的平衡。',
  },
  {
    id: 'film-story',
    name: '胶片时刻',
    description: '大留白与阴影，类似拍立得的质感。',
  },
  {
    id: 'minimal-note',
    name: '留白便签',
    description: '极简风格，专注于文字本身。',
  }
];
