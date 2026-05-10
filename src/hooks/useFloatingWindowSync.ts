/**
 * @file useFloatingWindowSync.ts
 * @input SessionContext activeSessions, local floating window setting
 * @output Android floating window runtime synchronization
 * @pos Hook (System Integration)
 * @description Keeps the Android floating window aligned with the latest active session, regardless of whether the session started in-app or from the widget bridge.
 * @updated 2026-05-09: Includes the active app session id in Android sync payloads so floating-window stops can reconcile precisely after background resume.
 * @updated 2026-05-09: Serves as the single floating-window sync path so stopping one session falls back cleanly to the latest remaining session.
 * @updated 2026-04-13: Added unified floating window sync based on the latest active session.
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from '../contexts/SessionContext';
import FocusNotification from '../plugins/FocusNotificationPlugin';

export const useFloatingWindowSync = () => {
  const { activeSessions } = useSession();
  const lastSyncedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    const floatingWindowEnabled = localStorage.getItem('floating_window_enabled') === 'true';
    if (!floatingWindowEnabled) {
      lastSyncedSignatureRef.current = null;
      return;
    }

    const latestSession = activeSessions.length > 0 ? activeSessions[activeSessions.length - 1] : null;
    const nextSignature = latestSession
      ? `${latestSession.id}:${latestSession.activityIcon || ''}:${latestSession.startTime}`
      : 'idle';

    if (lastSyncedSignatureRef.current === nextSignature) {
      return;
    }

    lastSyncedSignatureRef.current = nextSignature;

    if (!latestSession) {
      FocusNotification.updateFloatingWindow({ isFocusing: false }).catch((error) => {
        console.error('[useFloatingWindowSync] Failed to reset floating window', error);
      });
      return;
    }

    FocusNotification.updateFloatingWindow({
      icon: latestSession.activityIcon,
      isFocusing: true,
      startTime: latestSession.startTime.toString(),
      sessionId: latestSession.source === 'app' ? latestSession.id : undefined
    }).catch((error) => {
      console.error('[useFloatingWindowSync] Failed to sync floating window', error);
    });
  }, [activeSessions]);
};
