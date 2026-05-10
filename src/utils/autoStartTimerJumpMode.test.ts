/**
 * @file autoStartTimerJumpMode.test.ts
 * @description Verifies timer auto-jump mode migration and runtime resolution helpers.
 * @updated 2026-05-10: Added coverage for legacy boolean migration plus immersive override resolution.
 */
import { describe, expect, test } from 'vitest';
import {
  AUTO_START_TIMER_JUMP_MODE_STORAGE_KEY,
  LEGACY_AUTO_OPEN_FOCUS_DETAIL_STORAGE_KEY,
  readStoredAutoStartTimerJumpMode,
  resolveAutoStartTimerJumpMode,
  shouldEnterImmersiveForAutoStartTimerJumpMode,
  shouldOpenFocusDetailForAutoStartTimerJumpMode,
} from './autoStartTimerJumpMode';

const createStorage = (values: Record<string, string | null>): Pick<Storage, 'getItem'> => ({
  getItem: (key: string) => (key in values ? values[key] : null),
});

describe('autoStartTimerJumpMode', () => {
  test('migrates legacy true to focus-detail when no new value exists', () => {
    const mode = readStoredAutoStartTimerJumpMode(createStorage({
      [LEGACY_AUTO_OPEN_FOCUS_DETAIL_STORAGE_KEY]: 'true',
    }));

    expect(mode).toBe('focus-detail');
  });

  test('migrates legacy false to none when no new value exists', () => {
    const mode = readStoredAutoStartTimerJumpMode(createStorage({
      [LEGACY_AUTO_OPEN_FOCUS_DETAIL_STORAGE_KEY]: 'false',
    }));

    expect(mode).toBe('none');
  });

  test('prefers the new stored mode over the legacy boolean', () => {
    const mode = readStoredAutoStartTimerJumpMode(createStorage({
      [AUTO_START_TIMER_JUMP_MODE_STORAGE_KEY]: 'immersive-timer',
      [LEGACY_AUTO_OPEN_FOCUS_DETAIL_STORAGE_KEY]: 'false',
    }));

    expect(mode).toBe('immersive-timer');
  });

  test('resolves scene override and derived runtime flags correctly', () => {
    const immersiveMode = resolveAutoStartTimerJumpMode('focus-detail', true);
    expect(immersiveMode).toBe('immersive-timer');
    expect(shouldOpenFocusDetailForAutoStartTimerJumpMode(immersiveMode)).toBe(true);
    expect(shouldEnterImmersiveForAutoStartTimerJumpMode(immersiveMode)).toBe(true);

    const noneMode = resolveAutoStartTimerJumpMode('immersive-timer', false);
    expect(noneMode).toBe('none');
    expect(shouldOpenFocusDetailForAutoStartTimerJumpMode(noneMode)).toBe(false);
    expect(shouldEnterImmersiveForAutoStartTimerJumpMode(noneMode)).toBe(false);

    const inheritedMode = resolveAutoStartTimerJumpMode('focus-detail');
    expect(inheritedMode).toBe('focus-detail');
    expect(shouldOpenFocusDetailForAutoStartTimerJumpMode(inheritedMode)).toBe(true);
    expect(shouldEnterImmersiveForAutoStartTimerJumpMode(inheritedMode)).toBe(false);
  });
});
