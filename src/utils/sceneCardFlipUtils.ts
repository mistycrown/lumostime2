/**
 * @file sceneCardFlipUtils.ts
 * @input Scene card type plus persisted/forced flip state
 * @output Resolved flip state and swipe-back availability for scene cards
 * @pos Utils
 * @description Centralizes timer/todo scene-card flip resolution so manual flips and timeline-forced backs stay easy to reason about and test.
 * @updated 2026-05-10: Added shared helpers for resolving scene-card back-side state and swipe-back locking.
 */

import type { SceneCardData } from '../types';

export const getSceneCardFlipInteractionState = ({
  cardType,
  persistedFlipped,
  forceBackSide = false,
}: {
  cardType: SceneCardData['type'];
  persistedFlipped: boolean;
  forceBackSide?: boolean;
}): { isFlipped: boolean; swipeBackDisabled: boolean } => {
  const swipeBackDisabled = (cardType === 'timer' || cardType === 'todo') && forceBackSide;
  return {
    isFlipped: persistedFlipped || forceBackSide,
    swipeBackDisabled,
  };
};
