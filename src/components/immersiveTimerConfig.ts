/**
 * @file immersiveTimerConfig.ts
 * @input None
 * @output Shared black-and-white immersive timer presentation constants
 * @pos Component Config
 * @description Centralizes the fixed immersive timer visual contract so the component and tests share the same source of truth.
 */

export const IMMERSIVE_TIMER_CONTROL_IDS = ['back', 'submit', 'noise'] as const;

export const IMMERSIVE_TIMER_FONT_FAMILY = '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';

export const IMMERSIVE_TIMER_COLORS = {
  background: '#000000',
  foreground: '#ffffff',
  buttonBackground: 'rgba(255,255,255,0.08)',
  buttonBorder: 'rgba(255,255,255,0.18)',
  buttonHover: 'rgba(255,255,255,0.14)',
  activeButtonBackground: 'rgba(255,255,255,0.16)',
  activeButtonBorder: 'rgba(255,255,255,0.3)',
  modalBackground: 'rgba(12,12,12,0.96)',
  modalBorder: 'rgba(255,255,255,0.12)',
  divider: 'rgba(255,255,255,0.24)',
  secondaryText: 'rgba(255,255,255,0.6)',
} as const;

export const IMMERSIVE_TIMER_CONTROL_SURFACE = {
  backgroundColor: IMMERSIVE_TIMER_COLORS.buttonBackground,
  borderColor: IMMERSIVE_TIMER_COLORS.buttonBorder,
  color: IMMERSIVE_TIMER_COLORS.foreground,
} as const;

export const IMMERSIVE_TIMER_MODAL_THEME = {
  isDark: true,
  buttonBg: IMMERSIVE_TIMER_COLORS.buttonBackground,
  buttonBorder: IMMERSIVE_TIMER_COLORS.buttonBorder,
  buttonText: IMMERSIVE_TIMER_COLORS.foreground,
  buttonHoverBg: IMMERSIVE_TIMER_COLORS.buttonHover,
  modalBg: IMMERSIVE_TIMER_COLORS.modalBackground,
  modalBorder: IMMERSIVE_TIMER_COLORS.modalBorder,
} as const;
