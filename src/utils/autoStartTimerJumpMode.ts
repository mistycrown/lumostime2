/**
 * @file autoStartTimerJumpMode.ts
 * @input Stored settings values and optional scene-card override flags
 * @output Normalized timer auto-jump modes and derived runtime decisions
 * @description Centralizes the three-state "start timer then jump" preference so settings migration, labels, and runtime behavior stay aligned.
 * @updated 2026-05-10: Added legacy-boolean migration plus shared helpers for focus-detail and immersive auto-jump behavior.
 */

export type AutoStartTimerJumpMode = 'none' | 'focus-detail' | 'immersive-timer';

export const AUTO_START_TIMER_JUMP_MODE_STORAGE_KEY = 'lumostime_auto_start_timer_jump_mode';
export const LEGACY_AUTO_OPEN_FOCUS_DETAIL_STORAGE_KEY = 'lumostime_auto_open_focus_detail';

export const AUTO_START_TIMER_JUMP_MODE_OPTIONS: ReadonlyArray<{
  value: AutoStartTimerJumpMode;
  label: string;
}> = [
  { value: 'none', label: '不跳转' },
  { value: 'focus-detail', label: '跳转到正在计时页面' },
  { value: 'immersive-timer', label: '跳转到沉浸式计时页面' },
];

export const isAutoStartTimerJumpMode = (value: string | null | undefined): value is AutoStartTimerJumpMode => (
  value === 'none' || value === 'focus-detail' || value === 'immersive-timer'
);

export const normalizeAutoStartTimerJumpMode = (
  value: string | null | undefined
): AutoStartTimerJumpMode => {
  if (isAutoStartTimerJumpMode(value)) {
    return value;
  }

  return 'none';
};

export const readStoredAutoStartTimerJumpMode = (
  storage: Pick<Storage, 'getItem'>
): AutoStartTimerJumpMode => {
  const stored = storage.getItem(AUTO_START_TIMER_JUMP_MODE_STORAGE_KEY);
  if (isAutoStartTimerJumpMode(stored)) {
    return stored;
  }

  const legacyStored = storage.getItem(LEGACY_AUTO_OPEN_FOCUS_DETAIL_STORAGE_KEY);
  return legacyStored === 'true' ? 'focus-detail' : 'none';
};

export const resolveAutoStartTimerJumpMode = (
  globalMode: AutoStartTimerJumpMode,
  autoEnterFocus?: boolean
): AutoStartTimerJumpMode => {
  if (autoEnterFocus === true) {
    return 'immersive-timer';
  }

  if (autoEnterFocus === false) {
    return 'none';
  }

  return globalMode;
};

export const shouldOpenFocusDetailForAutoStartTimerJumpMode = (
  mode: AutoStartTimerJumpMode
): boolean => mode !== 'none';

export const shouldEnterImmersiveForAutoStartTimerJumpMode = (
  mode: AutoStartTimerJumpMode
): boolean => mode === 'immersive-timer';

export const getAutoStartTimerJumpModeLabel = (mode: AutoStartTimerJumpMode): string => (
  AUTO_START_TIMER_JUMP_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? '不跳转'
);
