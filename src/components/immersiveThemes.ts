/**
 * @file immersiveThemes.ts
 * @input None
 * @output Shared immersive timer theme catalog
 * @pos Component Config
 * @description Central theme definitions for the immersive timer so the UI and tests share the same source of truth.
 */

export interface ImmersiveTheme {
  id: string;
  name: string;
  gradient: string;
  glow1: string;
  glow2: string;
  isDark: boolean;
  buttonBg: string;
  buttonBorder: string;
  buttonText: string;
  buttonHoverBg: string;
  modalBg: string;
  modalBorder: string;
  clockStyle: {
    fontFamily: string;
    fontWeight: string;
    color: string;
    fontSize: string;
    letterSpacing: string;
    textShadow: string;
  };
}

export const IMMERSIVE_THEMES: ImmersiveTheme[] = [
  {
    id: 'zen',
    name: '禅意',
    gradient: 'from-stone-100 via-stone-50 to-zinc-100',
    glow1: 'bg-stone-200/20',
    glow2: 'bg-zinc-200/20',
    isDark: false,
    buttonBg: 'rgba(68,64,60,0.1)',
    buttonBorder: 'rgba(68,64,60,0.2)',
    buttonText: '#44403c',
    buttonHoverBg: 'rgba(68,64,60,0.15)',
    modalBg: 'rgba(250,250,249,0.95)',
    modalBorder: 'rgba(68,64,60,0.15)',
    clockStyle: {
      fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
      fontWeight: '300',
      color: '#2d2d2d',
      fontSize: 'min(16vh, 20vw)',
      letterSpacing: '0.05em',
      textShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
  },
  {
    id: 'retro',
    name: '复古',
    gradient: 'from-orange-100 via-amber-50 to-yellow-100',
    glow1: 'bg-orange-300/30',
    glow2: 'bg-amber-300/30',
    isDark: false,
    buttonBg: 'rgba(217,119,6,0.15)',
    buttonBorder: 'rgba(217,119,6,0.3)',
    buttonText: '#d97706',
    buttonHoverBg: 'rgba(217,119,6,0.25)',
    modalBg: 'rgba(255,251,235,0.95)',
    modalBorder: 'rgba(217,119,6,0.2)',
    clockStyle: {
      fontFamily: '"Bebas Neue", Impact, sans-serif',
      fontWeight: '400',
      color: '#d97706',
      fontSize: 'min(20vh, 24vw)',
      letterSpacing: '0.04em',
      textShadow: '4px 4px 0px rgba(0,0,0,0.1), 8px 8px 0px rgba(0,0,0,0.05)',
    },
  },
  {
    id: 'midnight',
    name: '午夜',
    gradient: 'from-slate-900 via-blue-900 to-slate-900',
    glow1: 'bg-blue-500/20',
    glow2: 'bg-indigo-500/20',
    isDark: true,
    buttonBg: 'rgba(255,255,255,0.1)',
    buttonBorder: 'rgba(255,255,255,0.2)',
    buttonText: '#e0e7ff',
    buttonHoverBg: 'rgba(255,255,255,0.2)',
    modalBg: 'rgba(30,41,59,0.95)',
    modalBorder: 'rgba(255,255,255,0.1)',
    clockStyle: {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: '300',
      color: '#e0e7ff',
      fontSize: 'min(18vh, 22vw)',
      letterSpacing: '0.04em',
      textShadow: '0 0 60px rgba(224,231,255,0.4), 0 0 120px rgba(147,197,253,0.3)',
    },
  },
  {
    id: 'forest',
    name: '森林',
    gradient: 'from-emerald-900 via-green-900 to-teal-900',
    glow1: 'bg-emerald-500/20',
    glow2: 'bg-teal-500/20',
    isDark: true,
    buttonBg: 'rgba(255,255,255,0.1)',
    buttonBorder: 'rgba(209,250,229,0.2)',
    buttonText: '#d1fae5',
    buttonHoverBg: 'rgba(209,250,229,0.15)',
    modalBg: 'rgba(6,78,59,0.95)',
    modalBorder: 'rgba(209,250,229,0.15)',
    clockStyle: {
      fontFamily: '"Quicksand", sans-serif',
      fontWeight: '400',
      color: '#d1fae5',
      fontSize: 'min(18vh, 22vw)',
      letterSpacing: '0.05em',
      textShadow: '0 0 40px rgba(209,250,229,0.3)',
    },
  },
  {
    id: 'sunset',
    name: '日落',
    gradient: 'from-orange-900 via-red-900 to-pink-900',
    glow1: 'bg-orange-500/25',
    glow2: 'bg-pink-500/25',
    isDark: true,
    buttonBg: 'rgba(255,255,255,0.1)',
    buttonBorder: 'rgba(255,228,230,0.2)',
    buttonText: '#ffe4e6',
    buttonHoverBg: 'rgba(255,228,230,0.15)',
    modalBg: 'rgba(127,29,29,0.95)',
    modalBorder: 'rgba(255,228,230,0.15)',
    clockStyle: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontWeight: '600',
      color: '#ffe4e6',
      fontSize: 'min(16vh, 20vw)',
      letterSpacing: '0.03em',
      textShadow: '0 0 50px rgba(255,228,230,0.4), 0 4px 20px rgba(0,0,0,0.3)',
    },
  },
  {
    id: 'graphite',
    name: '石墨',
    gradient: 'from-zinc-900 via-neutral-900 to-black',
    glow1: 'bg-stone-400/10',
    glow2: 'bg-zinc-300/5',
    isDark: true,
    buttonBg: 'rgba(245,245,244,0.08)',
    buttonBorder: 'rgba(245,245,244,0.14)',
    buttonText: '#f5f5f4',
    buttonHoverBg: 'rgba(245,245,244,0.14)',
    modalBg: 'rgba(24,24,27,0.96)',
    modalBorder: 'rgba(245,245,244,0.12)',
    clockStyle: {
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      fontWeight: '400',
      color: '#f5f5f4',
      fontSize: 'min(17vh, 21vw)',
      letterSpacing: '0.05em',
      textShadow: '0 0 28px rgba(245,245,244,0.08), 0 4px 24px rgba(0,0,0,0.45)',
    },
  },
];
