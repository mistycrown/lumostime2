/**
 * @file SceneCard.test.ts
 * @updated 2026-10-17: Exercises statistics-card clicks with stale timer/todo and app-launch actions.
 * @input Scene-card actions, flip state and surface styles with and without a configured background image
 * @output Regression coverage for display-only statistics clicks, flip behavior and the conditional scene-card outline
 * @updated 2026-09-27: Ensures active card backgrounds suppress the inset border without reducing flip coverage.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const clickHandlers = vi.hoisted(() => ({ front: undefined as (() => Promise<void>) | undefined }));

// Capture DOM handlers while preserving React's real server rendering and hooks.
vi.mock('react/jsx-runtime', async (importOriginal) => {
  const runtime = await importOriginal<typeof import('react/jsx-runtime')>();
  return {
    ...runtime,
    jsx: (...args: Parameters<typeof runtime.jsx>) => {
      const props = args[1];
      if (props?.className === 'scene-card-face scene-card-front') {
        clickHandlers.front = props.onClick;
      }
      return runtime.jsx(...args);
    }
  };
});

vi.mock('react/jsx-dev-runtime', async (importOriginal) => {
  const runtime = await importOriginal<typeof import('react/jsx-dev-runtime')>();
  return {
    ...runtime,
    jsxDEV: (...args: Parameters<typeof runtime.jsxDEV>) => {
      const props = args[1];
      if (props?.className === 'scene-card-face scene-card-front') {
        clickHandlers.front = props.onClick;
      }
      return runtime.jsxDEV(...args);
    }
  };
});

vi.mock('../hooks/useCardBackground', () => ({
  useCardBackground: vi.fn(() => ({ active: false, style: {} }))
}));

import { SceneCard, getSceneCardSurfaceStyle } from './SceneCard';
import { getSceneCardFlipInteractionState } from '../utils/sceneCardFlipUtils';
import { AppLauncherService } from '../services/AppLauncherService';
import type { SceneCardAction } from '../types';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SceneCard statistics clicks', () => {
  it.each(['realtime', 'backfill'] as const)('only flips legacy statistics cards in %s mode', async (sceneCardTimerMode) => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    const launchApp = vi.spyOn(AppLauncherService, 'launchApp').mockResolvedValue(true);
    const onAction = vi.fn();
    for (const type of ['startTimer', 'startTodo'] as const) {
      const action: SceneCardAction = {
        type, activityId: 'reading', categoryId: 'study', todoId: 'todo-1',
        launchApp: true, appPackageName: 'test.app'
      };
      clickHandlers.front = undefined;
      const html = renderToStaticMarkup(React.createElement(SceneCard, {
        data: { id: 'stats-1', type: 'stats', title: 'Study', statValue: '15m', action },
        onAction,
        sceneCardTimerMode
      }));
      expect(html).toContain('15m');
      expect(clickHandlers.front).toBeTypeOf('function');
      await clickHandlers.front!();
      expect(storage.setItem).toHaveBeenCalledWith('scene_card_flipped_stats-1', 'true');
      expect(onAction).not.toHaveBeenCalled();
      expect(launchApp).not.toHaveBeenCalled();
    }
  });
});

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
