import { describe, expect, test } from 'vitest';
import {
  IMMERSIVE_TIMER_COLORS,
  IMMERSIVE_TIMER_CONTROL_IDS,
  IMMERSIVE_TIMER_FONT_FAMILY,
  IMMERSIVE_TIMER_FONT_WEIGHT,
  IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH,
  IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH_PER_CHARACTER,
  IMMERSIVE_TIMER_HORIZONTAL_PADDING,
  IMMERSIVE_TIMER_LANDSCAPE_DIGIT_WIDTH_SCALE,
  IMMERSIVE_TIMER_LANDSCAPE_SIZE,
  IMMERSIVE_TIMER_LANDSCAPE_VIEWPORT,
  IMMERSIVE_TIMER_MODAL_THEME,
  IMMERSIVE_TIMER_PORTRAIT_DIGIT_SIZE,
  IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH,
  IMMERSIVE_TIMER_TOP_INSET,
  IMMERSIVE_TIMER_CONTROL_SURFACE,
} from './immersiveTimerConfig';

describe('immersiveTimerConfig', () => {
  test('locks immersive timer controls to the fixed black theme plus display toggles', () => {
    expect(IMMERSIVE_TIMER_CONTROL_IDS).toEqual([
      'back',
      'submit',
      'orientation',
      'format',
      'source',
      'noise',
      'visual',
    ]);
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
    expect(IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH).toBe('2.45ch');
    expect(IMMERSIVE_TIMER_DIGIT_SLOT_WIDTH_PER_CHARACTER).toBe(1.12);
    expect(IMMERSIVE_TIMER_SEPARATOR_SLOT_WIDTH).toBe('0.01ch');
    expect(IMMERSIVE_TIMER_LANDSCAPE_DIGIT_WIDTH_SCALE).toBe(0.84);
    expect(IMMERSIVE_TIMER_HORIZONTAL_PADDING).toBe('0.1rem');
    expect(IMMERSIVE_TIMER_PORTRAIT_DIGIT_SIZE).toBe('min(46vw, 30vh)');
    expect(IMMERSIVE_TIMER_LANDSCAPE_SIZE).toEqual({
      widthRatio: 0.34,
      heightRatio: 0.68,
      finalScale: 1,
    });
    expect(IMMERSIVE_TIMER_LANDSCAPE_VIEWPORT).toEqual({
      width: 0.995,
      height: 0.94,
      maxWidth: '99vw',
    });
    expect(IMMERSIVE_TIMER_MODAL_THEME.modalBg).toBe('rgba(12,12,12,0.96)');
    expect(IMMERSIVE_TIMER_CONTROL_SURFACE.backgroundColor).toBe('rgba(255,255,255,0.08)');
  });
});
