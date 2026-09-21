/**
 * @file AIBackfillChatTheme.ts
 * @input Accent/default/dark theme flags
 * @output AI chat color tokens and accent blending helper
 * @pos Component Support (AI Integration)
 * @description Centralizes the visual token selection used by the AI chat shell and overlays.
 */

export const accentMix = (accentPercent: number, baseColor: string): string => (
  `color-mix(in srgb, var(--accent-color) ${accentPercent}%, ${baseColor})`
);

const ACCENT_AI_CHAT_THEME = {
  shellBg: accentMix(8, '#f4efe7'), shellLayerBg: accentMix(4, '#fbf8f2'), panelBg: accentMix(3, '#fffdf8'),
  panelBgStrong: accentMix(5, '#faf5ec'), panelBgSoft: accentMix(7, '#f8f2e8'), panelBgMuted: accentMix(9, '#f2eadf'),
  panelBorder: accentMix(16, '#ddd3c6'), panelBorderStrong: accentMix(26, '#d4c6b6'), chipBg: accentMix(8, '#fffaf4'),
  chipBorder: accentMix(18, '#ddd1c3'), chipBorderStrong: accentMix(28, '#d1c0ad'), inputBg: accentMix(6, '#f8f2e8'),
  inputBgStrong: accentMix(10, '#f1e7da'), activeBg: accentMix(12, '#fff8f0'), activeBorder: accentMix(30, '#d5c5b3'),
  avatarBg: accentMix(4, '#ffffff'), textPrimary: '#201c19', textSecondary: '#655d55', textMuted: '#8b8176', textFaint: '#a19386',
  primaryButtonBg: accentMix(56, '#2f2b28'), primaryButtonHoverBg: accentMix(64, '#2b2623'), primaryButtonBorder: accentMix(30, '#2f2b28'), primaryButtonText: '#fffaf3',
  successBg: '#edf3ea', successBorder: '#ced8ca', successText: '#556a52', undoneBg: accentMix(7, '#f1ebe3'), undoneBorder: accentMix(16, '#ddd2c4'), undoneText: '#7a7067',
  dangerBg: accentMix(8, '#f8e9e6'), dangerBorder: accentMix(20, '#e2b4ab'), dangerText: '#9d544d', pendingBg: accentMix(6, '#f3eee7'), pendingBorder: accentMix(12, '#ddd3c8'),
  codeBg: '#2d2926', codeBorder: '#433a34', codeText: '#efe7db', overlayDark: 'rgba(32, 25, 19, 0.18)', overlayLight: 'rgba(247, 241, 233, 0.94)',
  cardShadow: '0 4px 12px rgba(52, 38, 27, 0.025)', cardShadowStrong: '0 8px 18px rgba(52, 38, 27, 0.04)', avatarShadow: '0 2px 8px rgba(52, 38, 27, 0.035)'
} as const;

const DARK_AI_CHAT_THEME = {
  shellBg: '#1c1917', shellLayerBg: '#1c1917', panelBg: '#292524', panelBgStrong: '#292524', panelBgSoft: '#292524', panelBgMuted: '#44403c',
  panelBorder: '#57534e', panelBorderStrong: '#78716c', chipBg: '#292524', chipBorder: '#57534e', chipBorderStrong: '#78716c', inputBg: '#292524', inputBgStrong: '#44403c',
  activeBg: '#44403c', activeBorder: '#f5f5f4', avatarBg: '#292524', textPrimary: '#f5f5f4', textSecondary: '#d6d3d1', textMuted: '#a8a29e', textFaint: '#78716c',
  primaryButtonBg: '#292524', primaryButtonHoverBg: '#44403c', primaryButtonBorder: '#78716c', primaryButtonText: '#f5f5f4', successBg: '#1f3d2b', successBorder: '#4ade80', successText: '#bbf7d0',
  undoneBg: '#292524', undoneBorder: '#57534e', undoneText: '#a8a29e', dangerBg: '#3f1d1d', dangerBorder: '#991b1b', dangerText: '#fecaca', pendingBg: '#292524', pendingBorder: '#57534e',
  codeBg: '#171412', codeBorder: '#57534e', codeText: '#efe7db', overlayDark: 'rgba(0, 0, 0, 0.48)', overlayLight: 'rgba(41, 37, 36, 0.94)', cardShadow: 'none', cardShadowStrong: 'none', avatarShadow: 'none'
} as const;

const DEFAULT_AI_CHAT_THEME = {
  shellBg: '#f5f5f5', shellLayerBg: '#fafafa', panelBg: '#ffffff', panelBgStrong: '#fafafa', panelBgSoft: '#f5f5f5', panelBgMuted: '#f0f0f0',
  panelBorder: '#e7e5e4', panelBorderStrong: '#d6d3d1', chipBg: '#fafaf9', chipBorder: '#e7e5e4', chipBorderStrong: '#d6d3d1', inputBg: '#f5f5f4', inputBgStrong: '#f0f0ef',
  activeBg: '#f5f5f4', activeBorder: '#d6d3d1', avatarBg: '#ffffff', textPrimary: '#1c1917', textSecondary: '#57534e', textMuted: '#78716c', textFaint: '#a8a29e',
  primaryButtonBg: '#1c1917', primaryButtonHoverBg: '#292524', primaryButtonBorder: '#1c1917', primaryButtonText: '#ffffff', successBg: '#f5f5f4', successBorder: '#d6d3d1', successText: '#57534e',
  undoneBg: '#fafaf9', undoneBorder: '#e7e5e4', undoneText: '#78716c', dangerBg: '#f5f5f4', dangerBorder: '#d6d3d1', dangerText: '#57534e', pendingBg: '#fafaf9', pendingBorder: '#e7e5e4',
  codeBg: '#2d2926', codeBorder: '#433a34', codeText: '#efe7db', overlayDark: 'rgba(0, 0, 0, 0.18)', overlayLight: 'rgba(250, 250, 250, 0.94)', cardShadow: '0 4px 12px rgba(0, 0, 0, 0.025)', cardShadowStrong: '0 8px 18px rgba(0, 0, 0, 0.04)', avatarShadow: '0 2px 8px rgba(0, 0, 0, 0.035)'
} as const;

export const getAIChatTheme = (isDefaultTheme: boolean, isDarkTheme: boolean) => {
  if (isDarkTheme) return DARK_AI_CHAT_THEME;
  if (isDefaultTheme) return DEFAULT_AI_CHAT_THEME;
  return ACCENT_AI_CHAT_THEME;
};
