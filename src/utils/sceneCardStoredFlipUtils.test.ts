/**
 * @file sceneCardStoredFlipUtils.test.ts
 * @input Scene-card stored flip helpers
 * @output Regression coverage for legacy timer/todo flip-state migration
 * @pos Test
 * @description Ensures timer/todo cards ignore legacy auto-flip booleans while checklist cards still respect the older persisted format.
 */

import { describe, expect, it } from 'vitest';
import { resolveStoredSceneCardFlipState } from './sceneCardStoredFlipUtils';

describe('sceneCardStoredFlipUtils', () => {
  it('ignores legacy timer flip booleans when no manual flip has been stored', () => {
    expect(
      resolveStoredSceneCardFlipState({
        cardType: 'timer',
        legacyStoredValue: 'true',
        manualStoredValue: null,
      })
    ).toBe(false);
  });

  it('restores manual timer flips from the dedicated manual storage key', () => {
    expect(
      resolveStoredSceneCardFlipState({
        cardType: 'timer',
        legacyStoredValue: 'true',
        manualStoredValue: 'true',
      })
    ).toBe(true);
  });

  it('still respects legacy checklist persistence', () => {
    expect(
      resolveStoredSceneCardFlipState({
        cardType: 'checklist',
        legacyStoredValue: 'true',
        manualStoredValue: null,
        checklistCompletedByDefault: false,
      })
    ).toBe(true);
  });
});
