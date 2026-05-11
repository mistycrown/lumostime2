/**
 * @file sceneCardStoredFlipUtils.ts
 * @input Scene card type plus legacy/manual storage payloads
 * @output Resolved stored flip state and shared storage keys for scene cards
 * @pos Utils
 * @description Separates manual timer/todo flip persistence from legacy auto-flip booleans so current-slot timeline forcing does not resurrect stale back-side state.
 * @updated 2026-05-11: Added storage-key and migration helpers so timer/todo cards ignore legacy auto-flip booleans and only restore manual flips.
 */

import type { SceneCardData } from '../types';

export const getSceneCardLegacyFlipStorageKey = (cardId: string): string =>
  `scene_card_flipped_${cardId}`;

export const getSceneCardManualFlipStorageKey = (cardId: string): string =>
  `scene_card_manual_flipped_${cardId}`;

export const resolveStoredSceneCardFlipState = ({
  cardType,
  legacyStoredValue,
  manualStoredValue,
  checklistCompletedByDefault = false,
}: {
  cardType: SceneCardData['type'];
  legacyStoredValue: string | null;
  manualStoredValue?: string | null;
  checklistCompletedByDefault?: boolean;
}): boolean => {
  if (cardType === 'timer' || cardType === 'todo') {
    return manualStoredValue === 'true';
  }

  if (legacyStoredValue !== null) {
    return legacyStoredValue === 'true';
  }

  if (cardType === 'checklist') {
    return checklistCompletedByDefault;
  }

  return false;
};
