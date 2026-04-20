/**
 * @file useWidgetBridgeSync.ts
 * @input Widget native bridge state, categories, active sessions, logs, daily reviews, and daily templates
 * @output Runtime reconciliation between the Android widget layer and the React app
 * @pos Hook
 * @description Imports completed timer widget actions into logs, mirrors timer runtime state, syncs daily widget progress to native, and replays queued daily taps back into review state.
 * @updated 2026-04-20: Force-resyncs today's daily widget payload whenever the app becomes visible so cross-day state resets without requiring a widget tap.
 */
import { App as CapacitorApp } from '@capacitor/app';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useData } from '../contexts/DataContext';
import { useReview } from '../contexts/ReviewContext';
import { useSession } from '../contexts/SessionContext';
import WidgetBridge from '../plugins/WidgetBridgePlugin';
import {
  buildDailyWidgetSyncPayload,
  buildLogFromWidgetPendingAction,
  buildWidgetRuntimeStateFromSession,
  buildWidgetSessionFromRuntimeState,
  isNativeAndroidWidgetSupported
} from '../services/widgetService';
import { applyDailyCheckActionForDate } from '../utils/dailyCheckUtils';

export const useWidgetBridgeSync = () => {
  const { categories } = useCategoryScope();
  const { setLogs } = useData();
  const { activeSessions, setActiveSessions } = useSession();
  const { dailyReviews, setDailyReviews, checkTemplates, reviewTemplates } = useReview();
  const [hasHydratedNativeState, setHasHydratedNativeState] = useState(!isNativeAndroidWidgetSupported());

  const latestSession = useMemo(
    () => (activeSessions.length > 0 ? activeSessions[activeSessions.length - 1] : null),
    [activeSessions]
  );

  const latestDailyStateRef = useRef({
    dailyReviews,
    checkTemplates,
    reviewTemplates
  });

  useEffect(() => {
    latestDailyStateRef.current = {
      dailyReviews,
      checkTemplates,
      reviewTemplates
    };
  }, [checkTemplates, dailyReviews, reviewTemplates]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported()) {
      return;
    }

    let cancelled = false;

    const reconcileFromNative = async () => {
      try {
        let reconciledDailyState = latestDailyStateRef.current;
        const [{ actions }, { runtimeState }, { actions: dailyActions }] = await Promise.all([
          WidgetBridge.getPendingActions(),
          WidgetBridge.getRuntimeState(),
          WidgetBridge.getPendingDailyActions()
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

        if (dailyActions.length > 0) {
          const currentState = latestDailyStateRef.current;
          let nextDailyReviews = currentState.dailyReviews;

          dailyActions.forEach((action) => {
            const result = applyDailyCheckActionForDate({
              dateStr: action.date,
              dailyReviews: nextDailyReviews,
              checkTemplates: currentState.checkTemplates,
              reviewTemplates: currentState.reviewTemplates,
              checkItemId: action.checkItemId,
              actionMode: 'complete_once'
            });

            if (result.updatedReviews) {
              nextDailyReviews = result.updatedReviews;
            }
          });

          if (nextDailyReviews !== currentState.dailyReviews) {
            reconciledDailyState = {
              ...currentState,
              dailyReviews: nextDailyReviews
            };
            latestDailyStateRef.current = reconciledDailyState;
            setDailyReviews(nextDailyReviews);
          } else {
            reconciledDailyState = currentState;
          }

          await WidgetBridge.clearPendingDailyActions({ ids: dailyActions.map((action) => action.id) });
        }

        const payload = buildDailyWidgetSyncPayload({
          dailyReviews: reconciledDailyState.dailyReviews,
          checkTemplates: reconciledDailyState.checkTemplates
        });
        await WidgetBridge.syncDailyWidgetData({ payload });

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
  }, [categories, setActiveSessions, setDailyReviews, setLogs]);

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

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const payload = buildDailyWidgetSyncPayload({
      dailyReviews,
      checkTemplates
    });

    WidgetBridge.syncDailyWidgetData({ payload }).catch((error) => {
      console.error('[useWidgetBridgeSync] Failed to sync daily widget data to native widget', error);
    });
  }, [checkTemplates, dailyReviews, hasHydratedNativeState]);
};
