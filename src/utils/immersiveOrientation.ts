/**
 * @file immersiveOrientation.ts
 * @input Raw storage values plus default/session orientation inputs
 * @output Normalized immersive timer orientation helpers
 * @description Centralizes immersive timer orientation rules so settings and immersive UI resolve the same way.
 */
export type ImmersiveTimerOrientation = 'landscape' | 'portrait';

export function normalizeImmersiveTimerOrientation(
  value: string | null | undefined
): ImmersiveTimerOrientation {
  return value === 'portrait' ? 'portrait' : 'landscape';
}

export function resolveImmersiveTimerOrientation(
  defaultOrientation: ImmersiveTimerOrientation,
  sessionOverride: ImmersiveTimerOrientation | null
): ImmersiveTimerOrientation {
  return sessionOverride ?? defaultOrientation;
}

export function toggleImmersiveTimerOrientation(
  currentOrientation: ImmersiveTimerOrientation
): ImmersiveTimerOrientation {
  return currentOrientation === 'landscape' ? 'portrait' : 'landscape';
}

export function getScreenOrientationLockValue(
  orientation: ImmersiveTimerOrientation
): 'landscape-primary' | 'portrait-primary' {
  return orientation === 'portrait' ? 'portrait-primary' : 'landscape-primary';
}

export function shouldManageImmersiveOrientationLock(platform: string): boolean {
  return platform === 'android' || platform === 'ios';
}

export function shouldSilenceImmersiveOrientationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const name = 'name' in error ? String((error as { name?: unknown }).name ?? '') : '';
  return name === 'AbortError' || name === 'NotSupportedError';
}
