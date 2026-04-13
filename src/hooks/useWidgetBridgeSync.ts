/**
 * @file useWidgetBridgeSync.ts
 * @input Widget native bridge state, categories, active sessions, logs
 * @output Runtime reconciliation between the Android widget and app state
 * @pos Hook
 * @description Imports completed widget actions into logs and mirrors active runtime state between native Android and the React app.
 * @updated 2026-04-13: Dedupe native/runtime reconciliation and clear completed app sessions finished from the widget.
 */
import { App as CapacitorApp } from '@capacitor/app';
import { useEffect, useMemo, useState } from 'react';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import WidgetBridge from '../plugins/WidgetBridgePlugin';
import {
  buildLogFromWidgetPendingAction,
  buildWidgetRuntimeStateFromSession,
  buildWidgetSessionFromRuntimeState,
  isNativeAndroidWidgetSupported
} from '../services/widgetTimerService';

export const useWidgetBridgeSync = () => {
  const { categories } = useCategoryScope();
  const { setLogs } = useData();
  const { activeSessions, setActiveSessions } = useSession();
  const [hasHydratedNativeState, setHasHydratedNativeState] = useState(!isNativeAndroidWidgetSupported());

  const latestSession = useMemo(
    () => (activeSessions.length > 0 ? activeSessions[activeSessions.length - 1] : null),
    [activeSessions]
  );

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported()) {
      return;
    }

    let cancelled = false;

    const reconcileFromNative = async () => {
      try {
        const [{ actions }, { runtimeState }] = await Promise.all([
          WidgetBridge.getPendingActions(),
          WidgetBridge.getRuntimeState()
        ]);

        if (cancelled) {
          return;
        }

        if (actions.length > 0) {
          setLogs((prevLogs) => {
            let nextLogs = prevLogs;
            actions.forEach((action) => {
              const nextLog = buildLogFromWidgetPendingAction(action);
              const exists = nextLogs.some((log) => log.id === nextLog.id);
              nextLogs = exists
                ? nextLogs.map((log) => (log.id === nextLog.id ? nextLog : log))
                : [nextLog, ...nextLogs];
            });
            return nextLogs;
          });

          await WidgetBridge.clearPendingActions({ ids: actions.map((action) => action.id) });
        }

        setActiveSessions((prevSessions) => {
          const completedActionIds = new Set(actions.map((action) => action.id));
          const withoutCompletedSessions = prevSessions.filter(
            (session) => !completedActionIds.has(session.id)
          );

          if (!runtimeState) {
            return withoutCompletedSessions.filter((session) => session.source !== 'widget');
          }

          const nextNativeSession = buildWidgetSessionFromRuntimeState(runtimeState, categories);
          const existingSameSession = withoutCompletedSessions.find(
            (session) => session.id === nextNativeSession.id
          );
          const reconciledSession = existingSameSession
            ? {
                ...existingSameSession,
                ...nextNativeSession,
                source: existingSameSession.source || nextNativeSession.source
              }
            : nextNativeSession;

          const withoutDuplicateSessions = withoutCompletedSessions.filter((session) => {
            if (session.id === reconciledSession.id) {
              return false;
            }
            return session.source !== 'widget';
          });

          return [...withoutDuplicateSessions, reconciledSession];
        });

        setHasHydratedNativeState(true);
      } catch (error) {
        console.error('[useWidgetBridgeSync] Failed to reconcile widget native state', error);
        setHasHydratedNativeState(true);
      }
    };

    void reconcileFromNative();

    let appStateHandle: { remove: () => Promise<void> } | null = null;

    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void reconcileFromNative();
      }
    }).then((handle) => {
      appStateHandle = handle;
    }).catch((error) => {
      console.error('[useWidgetBridgeSync] Failed to register appStateChange listener', error);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reconcileFromNative();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void appStateHandle?.remove();
    };
  }, [categories, setActiveSessions, setLogs]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const syncRuntimeState = async () => {
      if (!latestSession) {
        try {
          const { runtimeState: nativeRuntime } = await WidgetBridge.getRuntimeState();
          if (nativeRuntime?.source === 'widget') {
            return;
          }
        } catch (error) {
          console.error('[useWidgetBridgeSync] Failed to read native runtime state', error);
        }
      }

      const runtimeState = latestSession
        ? buildWidgetRuntimeStateFromSession(latestSession, categories)
        : null;

      WidgetBridge.syncRuntimeState({ runtimeState }).catch((error) => {
        console.error('[useWidgetBridgeSync] Failed to sync runtime state to native widget', error);
      });
    };

    void syncRuntimeState();
  }, [categories, hasHydratedNativeState, latestSession]);
};
