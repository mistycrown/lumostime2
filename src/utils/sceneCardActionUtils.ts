/**
 * @file sceneCardActionUtils.ts
 * @input Scene card type and optional stored action
 * @output Safe action for scene-card editing, persistence and interaction
 * @description Keeps statistics cards display-only even when legacy data retains a timer action.
 * @updated 2026-10-17: Clears all actions and app-launch metadata from statistics cards.
 */
import type { SceneCardAction, SceneCardData } from '../types';

export const getSceneCardAction = (
  card: Partial<Pick<SceneCardData, 'type' | 'action'>>
): SceneCardAction => {
  return card.type === 'stats' ? { type: 'none' } : (card.action || { type: 'none' });
};
