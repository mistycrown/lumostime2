/**
 * @file useFloatingWindow.ts
 * @input SessionContext active sessions, session cancellation, toast, and app-side stop callback
 * @output Floating window event bridge for ending active focus sessions from Android
 * @pos Hook (System Integration)
 * @description Listens for Android floating-window stop events and resolves them against app or widget-origin sessions without duplicating widget logs.
 * @updated 2026-05-09: Reconciles persisted native floating-window stop requests on resume so background stops clear app sessions without double-writing timeline history.
 * @updated 2026-05-05: Honors native session ids and cancels widget-origin sessions locally after native-side shutdown so floating-window stops work for widget-started focus.
 */
import { App as CapacitorApp } from '@capacitor/app';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import FocusNotification from '../plugins/FocusNotificationPlugin';
import {
  buildFloatingStopActions,
  parseFloatingStopDetail,
  type FloatingStopDetail
} from '../utils/floatingWindowStopUtils';

export const useFloatingWindow = (
  handleStopActivity: (sessionId: string) => void
) => {
  const { activeSessions, cancelSession } = useSession();
  const { addToast } = useToast();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    let cancelled = false;
    let appStateListener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;
    let pluginStopListener: Awaited<ReturnType<typeof FocusNotification.addListener>> | null = null;

    const applyStopDetail = async (
      detail: FloatingStopDetail,
      options?: { shouldDrainPending?: boolean }
    ) => {
      const stopActions = buildFloatingStopActions(activeSessions, detail);
      if (stopActions.length === 0) {
        if (options?.shouldDrainPending) {
          try {
            await FocusNotification.consumePendingStopRequest();
          } catch (error) {
            console.error('[useFloatingWindow] Failed to drain stale pending stop request', error);
          }
        }
        return;
      }

      stopActions.forEach((action) => {
        if (action.mode === 'cancel') {
          cancelSession(action.sessionId);
          return;
        }

        handleStopActivity(action.sessionId);
      });

      addToast('success', '已从悬浮球结束计时');

      if (options?.shouldDrainPending) {
        try {
          await FocusNotification.consumePendingStopRequest();
        } catch (error) {
          console.error('[useFloatingWindow] Failed to clear pending stop after live event', error);
        }
      }
    };

    const reconcilePendingStop = async () => {
      try {
        const pendingStop = await FocusNotification.consumePendingStopRequest();
        if (cancelled || !pendingStop.hasPending) {
          return;
        }

        await applyStopDetail({ sessionId: pendingStop.sessionId ?? null });
      } catch (error) {
        if (!cancelled) {
          console.error('[useFloatingWindow] Failed to reconcile pending floating stop', error);
        }
      }
    };

    const handleStopFromFloating = (event: Event) => {
      void applyStopDetail(parseFloatingStopDetail(event), { shouldDrainPending: true });
    };

    const handleStopFromPlugin = (detail: FloatingStopDetail) => {
      void applyStopDetail(detail, { shouldDrainPending: true });
    };

    window.addEventListener('stopFocusFromFloating', handleStopFromFloating);
    void FocusNotification.addListener('stopFocusFromFloating', handleStopFromPlugin)
      .then((listener) => {
        pluginStopListener = listener;
      })
      .catch((error) => {
        console.error('[useFloatingWindow] Failed to register native floating stop listener', error);
      });
    void reconcilePendingStop();

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void reconcilePendingStop();
      }
    }).then((listener) => {
      appStateListener = listener;
    }).catch((error) => {
      console.error('[useFloatingWindow] Failed to register appStateChange listener', error);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reconcilePendingStop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('stopFocusFromFloating', handleStopFromFloating);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void pluginStopListener?.remove();
      void appStateListener?.remove();
    };
  }, [activeSessions, addToast, cancelSession, handleStopActivity]);
};
