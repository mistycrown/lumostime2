/**
 * @file floatingWindowSyncDecision.ts
 * @input Floating-window sync state flags and signatures
 * @output Pure sync action decision for Android floating-window runtime updates
 * @pos Utility
 * @description Resolves whether the floating-window sync hook should stop, reset, sync, or skip native updates without importing React or Capacitor runtime modules.
 * @updated 2026-07-11: Added shared decision helper so disabled floating-ball state resolves to a service stop instead of an idle update.
 */

export type FloatingWindowSyncAction = 'none' | 'stop' | 'reset' | 'sync';

export const resolveFloatingWindowSyncAction = ({
  floatingWindowEnabled,
  shouldForceFloatingWindow,
  hasLatestSession,
  lastSyncedSignature,
  nextSignature,
}: {
  floatingWindowEnabled: boolean;
  shouldForceFloatingWindow: boolean;
  hasLatestSession: boolean;
  lastSyncedSignature: string | null;
  nextSignature: string;
}): { action: FloatingWindowSyncAction; signature: string } => {
  if (!floatingWindowEnabled && !shouldForceFloatingWindow) {
    return {
      action: lastSyncedSignature === 'hidden' ? 'none' : 'stop',
      signature: 'hidden',
    };
  }

  if (lastSyncedSignature === nextSignature) {
    return {
      action: 'none',
      signature: nextSignature,
    };
  }

  return {
    action: hasLatestSession ? 'sync' : 'reset',
    signature: nextSignature,
  };
};
