import { describe, expect, test } from 'vitest';
import {
  DEFAULT_IMMERSIVE_ART_ID,
  DEFAULT_IMMERSIVE_MOTION_STYLE,
  IMMERSIVE_ART_OPTIONS,
  IMMERSIVE_MOTION_OPTIONS,
  normalizeImmersiveArtId,
  normalizeImmersiveMotionStyle,
  readStoredImmersiveArtId,
  readStoredImmersiveMotionStyle,
} from './immersiveVisuals';

describe('immersiveVisuals', () => {
  test('falls back to defaults when persisted visual values are invalid', () => {
    expect(normalizeImmersiveArtId('missing-art')).toBe(DEFAULT_IMMERSIVE_ART_ID);
    expect(normalizeImmersiveMotionStyle('missing-style')).toBe(DEFAULT_IMMERSIVE_MOTION_STYLE);
  });

  test('exposes all bundled timer_bak art options and motion presets', () => {
    expect(IMMERSIVE_ART_OPTIONS.map((option) => option.id)).toEqual([
      '640x0',
      'impression-sunrise',
      'moreno-garden',
      'three-cows',
      'starry-night',
      'van-gogh-127',
    ]);
    expect(IMMERSIVE_MOTION_OPTIONS.map((option) => option.id)).toEqual([
      'sweep',
      'orbit',
      'drift',
    ]);
  });

  test('hydrates persisted immersive visual selections for ImmersiveTimer', () => {
    const storage = {
      getItem: (key: string) => {
        if (key === 'immersiveTimerArt') {
          return 'three-cows';
        }

        if (key === 'immersiveTimerMotionStyle') {
          return 'orbit';
        }

        return null;
      },
    } as Pick<Storage, 'getItem'>;

    expect(readStoredImmersiveArtId(storage)).toBe('three-cows');
    expect(readStoredImmersiveMotionStyle(storage)).toBe('orbit');
  });
});
