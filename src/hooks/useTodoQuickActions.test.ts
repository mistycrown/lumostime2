/**
 * @file useTodoQuickActions.test.ts
 * @input Quick-actions interaction guard helper
 * @output Regression coverage for same-touch quick-actions click-through protection
 * @pos Test
 * @description Ensures the quick-actions sheet can ignore the synthetic follow-up click from the same touch that opened it.
 * @updated 2026-05-05: Added guard-window coverage for bottom-row quick-actions click-through.
 */

import { describe, expect, test } from 'vitest';
import {
  QUICK_ACTION_INTERACTION_GUARD_MS,
  isTodoQuickActionInteractionGuardActive
} from './useTodoQuickActions';

describe('useTodoQuickActions interaction guard', () => {
  test('blocks interactions during the open guard window', () => {
    const openedAt = 10_000;

    expect(isTodoQuickActionInteractionGuardActive(openedAt, openedAt)).toBe(true);
    expect(isTodoQuickActionInteractionGuardActive(openedAt, openedAt + QUICK_ACTION_INTERACTION_GUARD_MS - 1)).toBe(true);
  });

  test('allows interactions after the guard window or without an open timestamp', () => {
    const openedAt = 10_000;

    expect(isTodoQuickActionInteractionGuardActive(openedAt, openedAt + QUICK_ACTION_INTERACTION_GUARD_MS)).toBe(false);
    expect(isTodoQuickActionInteractionGuardActive(0, openedAt)).toBe(false);
  });
});
