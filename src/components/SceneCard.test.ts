/**
 * @file SceneCard.test.ts
 * @input Scene-card flip state and surface styles with and without a configured background image
 * @output Regression coverage for flip behavior and the conditional scene-card outline
 * @updated 2026-09-27: Ensures active card backgrounds suppress the inset border without reducing flip coverage.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useCardBackground', () => ({
  useCardBackground: vi.fn(() => ({ active: false, style: {} }))
}));

import { getSceneCardSurfaceStyle } from './SceneCard';
import { getSceneCardFlipInteractionState } from '../utils/sceneCardFlipUtils';

describe('SceneCard flip interaction state', () => {
  it('keeps manual timer flips swipe-reversible', () => {
    expect(
      getSceneCardFlipInteractionState({
        cardType: 'timer',
        persistedFlipped: true,
        forceBackSide: false,
      })
    ).toEqual({
      isFlipped: true,
      swipeBackDisabled: false,
    });
  });

  it('locks swipe-back when a timer card is forced to the back side by timeline matching', () => {
    expect(
      getSceneCardFlipInteractionState({
        cardType: 'timer',
        persistedFlipped: false,
        forceBackSide: true,
      })
    ).toEqual({
      isFlipped: true,
      swipeBackDisabled: true,
    });
  });

  it('does not lock non-timer cards even if a force flag is passed', () => {
    expect(
      getSceneCardFlipInteractionState({
        cardType: 'checklist',
        persistedFlipped: true,
        forceBackSide: true,
      })
    ).toEqual({
      isFlipped: true,
      swipeBackDisabled: false,
    });
  });
});

describe('SceneCard surface style', () => {
  it('removes the inset outline while retaining the shadow for active card backgrounds', () => {
    const inactiveStyle = getSceneCardSurfaceStyle('#aabbcc');
    const activeStyle = getSceneCardSurfaceStyle('#aabbcc', true);

    expect(inactiveStyle.boxShadow).toContain('inset 0 0 0 1px #aabbcc');
    expect(activeStyle.boxShadow).toBe('0 1px 2px rgba(0, 0, 0, 0.06)');
  });
});
