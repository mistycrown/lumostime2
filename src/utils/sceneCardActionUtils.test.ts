/**
 * @file sceneCardActionUtils.test.ts
 * @input Statistics cards with stale actions and normal interactive cards
 * @output Regression coverage for display-only statistics cards
 * @updated 2026-10-17: Covers legacy timer/todo actions and app-launch metadata after type changes.
 */
import { describe, expect, it } from 'vitest';
import type { SceneCardAction } from '../types';
import { getSceneCardAction } from './sceneCardActionUtils';

describe('statistics card actions', () => {
  it.each<SceneCardAction>([
    { type: 'startTimer', activityId: 'reading', categoryId: 'study', launchApp: true, appPackageName: 'test.app' },
    { type: 'startTodo', todoId: 'todo-1', launchApp: true, appPackageName: 'test.app' },
    { type: 'navigate', targetView: 'stats-today' },
    { type: 'none', launchApp: true, appPackageName: 'test.app' }
  ])('discards a stale $type action and launch metadata', (action) => {
    expect(getSceneCardAction({ type: 'stats', action })).toEqual({ type: 'none' });
  });

  it('keeps a converted statistics card inert when it is changed back to a timer without selecting an activity', () => {
    const action = getSceneCardAction({
      type: 'stats',
      action: { type: 'startTimer', activityId: 'reading', categoryId: 'study' }
    });
    expect(getSceneCardAction({ type: 'timer', action })).toEqual({ type: 'none' });
  });

  it('preserves normal timer actions without mutating the original', () => {
    const action: SceneCardAction = { type: 'startTimer', activityId: 'reading', categoryId: 'study', launchApp: true };
    expect(getSceneCardAction({ type: 'timer', action })).toBe(action);
    getSceneCardAction({ type: 'stats', action });
    expect(action.type).toBe('startTimer');
    expect(action.launchApp).toBe(true);
  });

  it('defaults new cards to no action', () => {
    expect(getSceneCardAction({ type: 'stats' })).toEqual({ type: 'none' });
    expect(getSceneCardAction({ type: 'timer' })).toEqual({ type: 'none' });
  });
});
