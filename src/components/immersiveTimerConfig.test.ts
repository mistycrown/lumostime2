import { describe, expect, test } from 'vitest';
import {
  IMMERSIVE_TIMER_COLORS,
  IMMERSIVE_TIMER_CONTROL_IDS,
  IMMERSIVE_TIMER_FONT_FAMILY,
  IMMERSIVE_TIMER_FONT_WEIGHT,
  IMMERSIVE_TIMER_LANDSCAPE_SIZE,
  IMMERSIVE_TIMER_PORTRAIT_DIGIT_SIZE,
  IMMERSIVE_TIMER_TOP_INSET,
} from './immersiveTimerConfig';

describe('immersiveTimerConfig', () => {
  test('locks immersive timer controls to back submit and white-noise only', () => {
    expect(IMMERSIVE_TIMER_CONTROL_IDS).toEqual(['back', 'submit', 'noise']);
  });

  test('locks immersive timer visuals to black background and white text', () => {
    expect(IMMERSIVE_TIMER_COLORS).toEqual({
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
    });
    expect(IMMERSIVE_TIMER_FONT_FAMILY).toContain('Lahlit Font');
    expect(IMMERSIVE_TIMER_FONT_WEIGHT).toBe(800);
    expect(IMMERSIVE_TIMER_TOP_INSET).toContain('--status-bar-height');
    expect(IMMERSIVE_TIMER_PORTRAIT_DIGIT_SIZE).toBe('min(36vw, 22vh)');
    expect(IMMERSIVE_TIMER_LANDSCAPE_SIZE).toEqual({
      widthRatio: 0.24,
      heightRatio: 0.5,
      finalScale: 1,
    });
  });
});
