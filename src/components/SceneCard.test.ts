/**
 * @file SceneCard.test.ts
 * @input SceneCard flip interaction helpers
 * @output Regression coverage for scene-card manual and timeline-forced back-side behavior
 * @pos Test
 * @description Ensures manual flips remain swipe-reversible while timeline-forced timer/todo backs stay locked until the forcing condition clears.
 */

import { describe, expect, it } from 'vitest';
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
