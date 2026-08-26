/**
 * @file routineStorage.ts
 * @input Routine 配置与 ActiveRoutineRun 运行状态
 * @output 本地存储的读写与格式兜底
 * @pos Utility Layer (Routine)
 * @description 持久化 Routine 配置及应用重启后仍需恢复的当前运行状态。
 * @updated 2026-08-26: Added first Routine configuration and active-run persistence helpers.
 */
import { ActiveRoutineRun, Routine } from '../types';
import { USER_DATA_KEYS } from '../constants/storageKeys';

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

export const loadRoutines = (): Routine[] => {
  const routines = readJson<unknown>(USER_DATA_KEYS.ROUTINES, []);
  return Array.isArray(routines) ? routines as Routine[] : [];
};

export const saveRoutines = (routines: Routine[]): void => {
  localStorage.setItem(USER_DATA_KEYS.ROUTINES, JSON.stringify(routines));
  window.dispatchEvent(new Event('routinesUpdated'));
};

export const loadActiveRoutineRun = (): ActiveRoutineRun | null => {
  const run = readJson<unknown>(USER_DATA_KEYS.ACTIVE_ROUTINE_RUN, null);
  if (!run || typeof run !== 'object') {
    return null;
  }

  const candidate = run as Partial<ActiveRoutineRun>;
  if (
    typeof candidate.routineId !== 'string'
    || typeof candidate.currentStepIndex !== 'number'
    || typeof candidate.routineStartedAt !== 'number'
    || typeof candidate.currentSessionId !== 'string'
  ) {
    return null;
  }

  return candidate as ActiveRoutineRun;
};

export const saveActiveRoutineRun = (run: ActiveRoutineRun | null): void => {
  if (run) {
    localStorage.setItem(USER_DATA_KEYS.ACTIVE_ROUTINE_RUN, JSON.stringify(run));
  } else {
    localStorage.removeItem(USER_DATA_KEYS.ACTIVE_ROUTINE_RUN);
  }
  window.dispatchEvent(new Event('activeRoutineRunUpdated'));
};
