/**
 * @file sceneGroupStorage.test.ts
 * @input SceneGroupState reorder helper inputs
 * @output Regression coverage for manual scene-group ordering behavior
 * @description Verifies moving scene groups up and down preserves the active group id while changing the saved group order consumed by manual-mode selectors.
 * @updated 2026-05-11: Added regression coverage for manual scene-group ordering so SceneView quick-switch menus can follow the saved group sequence.
 */

import { describe, expect, it } from 'vitest';
import type { SceneGroupState } from '../types';
import { moveSceneGroup } from './sceneGroupStorage';

const buildState = (): SceneGroupState => ({
  version: 1,
  switchMode: 'manual',
  activeGroupId: 'group-b',
  groups: [
    {
      id: 'group-a',
      name: 'Alpha',
      timeSlots: [],
      autoSwitch: { mode: 'disabled' }
    },
    {
      id: 'group-b',
      name: 'Beta',
      timeSlots: [],
      autoSwitch: { mode: 'disabled' }
    },
    {
      id: 'group-c',
      name: 'Gamma',
      timeSlots: [],
      autoSwitch: { mode: 'disabled' }
    }
  ]
});

describe('moveSceneGroup', () => {
  it('moves a middle group upward without changing the active group id', () => {
    const moved = moveSceneGroup(buildState(), 'group-b', 'up');

    expect(moved.activeGroupId).toBe('group-b');
    expect(moved.groups.map(group => group.id)).toEqual(['group-b', 'group-a', 'group-c']);
  });

  it('moves a middle group downward without changing the active group id', () => {
    const moved = moveSceneGroup(buildState(), 'group-b', 'down');

    expect(moved.activeGroupId).toBe('group-b');
    expect(moved.groups.map(group => group.id)).toEqual(['group-a', 'group-c', 'group-b']);
  });

  it('leaves the order unchanged when the requested move is out of bounds', () => {
    const state = buildState();

    expect(moveSceneGroup(state, 'group-a', 'up')).toBe(state);
    expect(moveSceneGroup(state, 'group-c', 'down')).toBe(state);
  });
});
