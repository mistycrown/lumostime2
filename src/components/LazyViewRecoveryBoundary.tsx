/**
 * @file LazyViewRecoveryBoundary.tsx
 * @input Lazily loaded React children and import errors
 * @output A one-time page-refresh recovery for stale Vite dependency imports
 * @pos Component (Error Recovery)
 * @description Recovers once from Vite optimized-dependency invalidation without allowing an endless refresh loop.
 * @updated 2026-09-27: Added recovery for stale optimized dependencies while loading the focus detail overlay.
 */
import React from 'react';

const RECOVERY_STORAGE_KEY = 'lumostime:vite-lazy-view-recovery';
const RECOVERY_WINDOW_MS = 30_000;

interface LazyViewRecoveryBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface LazyViewRecoveryBoundaryState {
  hasError: boolean;
}

export const isStaleViteDynamicImportError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /outdated optimize dep|failed to fetch dynamically imported module/i.test(message);
};

const hasRecentRecoveryAttempt = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const attemptedAt = Number(window.sessionStorage.getItem(RECOVERY_STORAGE_KEY));
  return Number.isFinite(attemptedAt) && Date.now() - attemptedAt < RECOVERY_WINDOW_MS;
};

export class LazyViewRecoveryBoundary extends React.Component<
  LazyViewRecoveryBoundaryProps,
  LazyViewRecoveryBoundaryState
> {
  public state: LazyViewRecoveryBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): LazyViewRecoveryBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error): void {
    if (
      typeof window === 'undefined' ||
      !isStaleViteDynamicImportError(error) ||
      hasRecentRecoveryAttempt()
    ) {
      return;
    }

    window.sessionStorage.setItem(RECOVERY_STORAGE_KEY, String(Date.now()));
    window.location.reload();
  }

  public render(): React.ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
