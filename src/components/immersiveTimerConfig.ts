/**
 * @file immersiveTimerConfig.ts
 * @input None
 * @output Shared black-and-white immersive timer presentation constants
 * @pos Component Config
 * @description Centralizes the fixed immersive timer visual contract so the component and tests share the same source of truth.
 */

export const IMMERSIVE_TIMER_CONTROL_IDS = ['back', 'submit', 'orientation', 'format', 'source', 'noise', 'visual'] as const;

export const IMMERSIVE_TIMER_FONT_FAMILY = '"Lahlit Font", "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';
export const IMMERSIVE_TIMER_FONT_WEIGHT = 800;
export const IMMERSIVE_TIMER_LETTER_SPACING = '0.01em';
export const IMMERSIVE_TIMER_TOP_INSET = 'max(env(safe-area-inset-top, 0px), var(--status-bar-height, 0px))';
export const IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH = '2.45ch';
export const IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH_PER_CHARACTER = 1.12;
export const IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH = '0';
export const IMMERSIVE_TIMER_LANDSCAPE_DIGIT_WIDTH_SCALE = 0.78;
export const IMMERSIVE_TIMER_HORIZONTAL_PADDING = '0';
export const IMMERSIVE_TIMER_LANDSCAPE_SIZE = {
  widthRatio: 0.38,
  heightRatio: 0.74,
  finalScale: 1,
} as const;
export const IMMERSIVE_TIMER_LANDSCAPE_VIEWPORT = {
  width: 0.995,
  height: 0.94,
  maxWidth: '99vw',
} as const;
export const IMMERSIVE_TIMER_PORTRAIT_DIGIT_SIZE = 'min(50vw, 33vh)';
export const IMMERSIVE_TIMER_PORTRAIT_TWO_SEGMENT_DIGIT_SIZE = 'min(58vw, 40vh)';

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
