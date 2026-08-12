/**
 * @file useFloatingWindowSync.ts
 * @input SessionContext activeSessions, app-awareness runtime state, and local floating-window setting
 * @output Android floating window runtime synchronization
 * @pos Hook (System Integration)
 * @description Keeps the Android floating window aligned with the latest active session, while allowing app-awareness timers to force status syncing even when the regular side-bubble switch is off.
 * @updated 2026-08-12: Hides only the regular side bubble when disabled, preserving the shared Android service for app-awareness overlays.
 * @updated 2026-06-21: Re-sync the floating ball when app-awareness timer state changes so overtime prompts and extensions do not drop the positive timer display.
 * @updated 2026-06-21: Let app-awareness sessions keep floating-window timer/status sync alive independently from the global floating-ball switch.
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from '../contexts/SessionContext';
import { useSettings } from '../contexts/SettingsContext';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import { resolveFloatingWindowSyncAction } from '../utils/floatingWindowSyncDecision';

export const useFloatingWindowSync = () => {
  const { activeSessions } = useSession();
  const { appAwarenessActiveRun } = useSettings();
  const lastSyncedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    const floatingWindowEnabled = localStorage.getItem('floating_window_enabled') === 'true';
    const latestSession = activeSessions.length > 0 ? activeSessions[activeSessions.length - 1] : null;
    const shouldForceFloatingWindow = Boolean(latestSession?.appAwarenessMeta) || Boolean(appAwarenessActiveRun);
    const appAwarenessSyncKey = appAwarenessActiveRun
      ? `${appAwarenessActiveRun.status}:${appAwarenessActiveRun.linkedSessionId || ''}:${appAwarenessActiveRun.expectedTimer?.scheduledEndAt || 0}`
      : 'none';
    const nextSignature = latestSession
      ? `${latestSession.id}:${latestSession.activityIcon || ''}:${latestSession.startTime}:${shouldForceFloatingWindow ? 'app-awareness' : 'default'}:${appAwarenessSyncKey}`
      : `idle:${appAwarenessSyncKey}`;

    const { action, signature } = resolveFloatingWindowSyncAction({
      floatingWindowEnabled,
      shouldForceFloatingWindow,
      hasLatestSession: Boolean(latestSession),
      lastSyncedSignature: lastSyncedSignatureRef.current,
      nextSignature,
    });

    if (action === 'none') {
      return;
    }

    lastSyncedSignatureRef.current = signature;

    if (action === 'hide') {
      FocusNotification.setSideBubbleEnabled({ enabled: false }).catch((error) => {
        console.error('[useFloatingWindowSync] Failed to hide disabled side bubble', error);
      });
      return;
    }

    if (action === 'reset') {
      FocusNotification.updateFloatingWindow({ isFocusing: false }).catch((error) => {
        console.error('[useFloatingWindowSync] Failed to reset floating window', error);
      });
      return;
    }

    if (!latestSession) {
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
  }, [activeSessions, appAwarenessActiveRun]);
};
