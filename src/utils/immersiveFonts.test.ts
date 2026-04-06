import { describe, expect, test } from 'vitest';
import {
  DEFAULT_IMMERSIVE_TIMER_FONT_ID,
  IMMERSIVE_TIMER_FONT_OPTIONS,
  IMMERSIVE_TIMER_FONT_STORAGE_KEY,
  normalizeImmersiveTimerFontId,
  readStoredImmersiveTimerFontId,
} from './immersiveFonts';

describe('immersiveFonts', () => {
  test('exposes the bundled immersive timer fonts including the newly added mono options', () => {
    expect(IMMERSIVE_TIMER_FONT_OPTIONS.map((option) => option.id)).toEqual([
      'kode-mono',
      'rubik-mono-one',
      'lahlit',
      'montserrat-black',
      'ibm-plex-mono',
    ]);
  });

  test('falls back to the default immersive timer font when persisted values are invalid', () => {
    expect(normalizeImmersiveTimerFontId('missing-font')).toBe(DEFAULT_IMMERSIVE_TIMER_FONT_ID);
  });

  test('hydrates the persisted immersive timer font selection', () => {
    const storage = {
      getItem: (key: string) => key === IMMERSIVE_TIMER_FONT_STORAGE_KEY ? 'kode-mono' : null,
    } as Pick<Storage, 'getItem'>;

    expect(readStoredImmersiveTimerFontId(storage)).toBe('kode-mono');
  });
});
