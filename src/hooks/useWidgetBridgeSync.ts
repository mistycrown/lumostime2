/**
 * @file useWidgetBridgeSync.ts
 * @input Widget native bridge state, categories, active sessions, logs, daily reviews, and daily templates
 * @output Runtime reconciliation between the Android widget layer and the React app
 * @pos Hook
 * @description Imports completed timer widget actions into logs, mirrors timer runtime state, syncs daily widget progress to native, and replays queued daily taps back into review state.
 * @updated 2026-07-22: Replays TODAY + PIN checkbox changes from Android widgets into persisted todo completion state.
 * @updated 2026-05-18: Catches both synchronous and async native bridge failures during widget payload sync so newly extended todo recurrence payloads cannot white-screen the app.
 * @updated 2026-05-14: Stops native app-sourced runtime echoes from restoring a just-stopped in-app session back into React state during NFC flows.
 * @updated 2026-04-25: Syncs today's DAILY_RUNTIME heatmap payload so the dedicated 4x4 widget reflects logs and live sessions.
 * @updated 2026-04-25: Strips unsupported widget UI icon assets on app startup so expired supporter access falls back to emoji rendering.
 * @updated 2026-04-26: Syncs today's TODAY + PIN todo payload so the dedicated scrollable 4x2 widget stays current.
 * @updated 2026-05-01: Syncs tracking-calendar payloads for dedicated 2x2 monthly tracking widgets and re-runs when widget templates change.
 * @updated 2026-05-02: Syncs full scene-group payloads so the dedicated 4x3 scene widget can follow native time-based group and tab changes.
 * @updated 2026-05-03: Reused the shared normalized template equality helper when deciding whether unsupported UI-icon state actually changed.
 * @updated 2026-05-05: Includes mirrored TODAY + PIN source todos/categories in the native sync payload so Android refresh actions can rebuild today's list without waiting for a new web-state change.
 * @updated 2026-05-05: Clears native widget runtime after app-side stop/cancel transitions while still preserving widget-started sessions during initial hydration.
 * @updated 2026-05-05: Mirrors the latest app log end time to native storage so widget quick-punch shortcuts can append gaps directly on the home screen.
 * @updated 2026-08-09: Mirrors the principle library into the native principle-card widget payload so the Android 4x2 card can randomize from the latest library state.
 */
import { App as CapacitorApp } from '@capacitor/app';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useData } from '../contexts/DataContext';
import { useReview } from '../contexts/ReviewContext';
import { useSession } from '../contexts/SessionContext';
import WidgetBridge from '../plugins/WidgetBridgePlugin';
import { RedemptionService } from '../services/redemptionService';
import { uiIconService } from '../services/uiIconService';
import {
  areWidgetTemplatesEqual,
  WIDGET_TEMPLATES_UPDATED_EVENT,
  buildDailyRuntimeWidgetPayload,
  buildDailyWidgetSyncPayload,
  buildWidgetLogTailState,
  buildLogFromWidgetPendingAction,
  buildTrackingCalendarWidgetPayload,
  buildTodoPinWidgetPayload,
  buildWidgetRuntimeStateFromSession,
  buildWidgetSessionFromRuntimeState,
  loadPrincipleCardWidgetPayloadFromStorage,
  PRINCIPLE_LIBRARY_STORAGE_KEY,
  isNativeAndroidWidgetSupported,
  loadWidgetTemplatesFromStorage,
  normalizeWidgetTemplates,
  sanitizeWidgetTemplatesForUiIconSupport,
  saveWidgetTemplatesToStorage
} from '../services/widgetService';
import { buildSceneWidgetPayloadFromStorage } from '../services/widgetSceneService';
import { applyDailyCheckActionForDate } from '../utils/dailyCheckUtils';
import { syncSubtaskProgressToParentTodos } from '../utils/todoProgressUtils';

const fireAndForgetWidgetBridgeCall = (
  label: string,
  invoke: () => Promise<unknown>
) => {
  try {
    void Promise.resolve(invoke()).catch((error) => {
      console.error(`[useWidgetBridgeSync] ${label}`, error);
    });
  } catch (error) {
    console.error(`[useWidgetBridgeSync] ${label}`, error);
  }
};

export const useWidgetBridgeSync = () => {
  const { categories, scopes } = useCategoryScope();
  const { logs, todos, setLogs, setTodos } = useData();
  const { activeSessions, setActiveSessions } = useSession();
  const { dailyReviews, setDailyReviews, checkTemplates, reviewTemplates } = useReview();
  const [hasHydratedNativeState, setHasHydratedNativeState] = useState(!isNativeAndroidWidgetSupported());
  const [widgetTemplateRevision, setWidgetTemplateRevision] = useState(0);
  const [sceneWidgetRevision, setSceneWidgetRevision] = useState(0);
  const [principleLibraryRevision, setPrincipleLibraryRevision] = useState(0);

  const latestSession = useMemo(
    () => (activeSessions.length > 0 ? activeSessions[activeSessions.length - 1] : null),
    [activeSessions]
  );

  const latestDailyStateRef = useRef({
    dailyReviews,
    checkTemplates,
    reviewTemplates
  });
  const hasHydratedSessionRuntimeRef = useRef(false);

  useEffect(() => {
    latestDailyStateRef.current = {
      dailyReviews,
      checkTemplates,
      reviewTemplates
    };
  }, [checkTemplates, dailyReviews, reviewTemplates]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleTemplatesUpdated = () => {
      setWidgetTemplateRevision((previous) => previous + 1);
    };

    window.addEventListener(WIDGET_TEMPLATES_UPDATED_EVENT, handleTemplatesUpdated);
    return () => window.removeEventListener(WIDGET_TEMPLATES_UPDATED_EVENT, handleTemplatesUpdated);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const bumpPrincipleRevision = () => {
      setPrincipleLibraryRevision((previous) => previous + 1);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === PRINCIPLE_LIBRARY_STORAGE_KEY) {
        bumpPrincipleRevision();
      }
    };

    window.addEventListener('principleLibraryChanged', bumpPrincipleRevision);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('principleLibraryChanged', bumpPrincipleRevision);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const bumpSceneRevision = () => {
      setSceneWidgetRevision((previous) => previous + 1);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'sceneGroupState' || event.key === 'sceneTimeSlots') {
        bumpSceneRevision();
      }
    };

    window.addEventListener('sceneGroupsUpdated', bumpSceneRevision);
    window.addEventListener('sceneTimeSlotsUpdated', bumpSceneRevision);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('sceneGroupsUpdated', bumpSceneRevision);
      window.removeEventListener('sceneTimeSlotsUpdated', bumpSceneRevision);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported()) {
      return;
    }

    let cancelled = false;

    const sanitizeUnsupportedWidgetUiIcons = async () => {
      try {
        const redemptionService = new RedemptionService();
        const verification = await redemptionService.isVerified();
        const allowUiIcon = verification.isVerified && uiIconService.isCustomTheme();

        if (cancelled || allowUiIcon) {
          return;
        }

        const localTemplates = normalizeWidgetTemplates(loadWidgetTemplatesFromStorage());
        const { templates: nativeTemplates } = await WidgetBridge.getTemplates();
        if (cancelled) {
          return;
        }

        const sourceTemplates =
          nativeTemplates.length > 0 ? normalizeWidgetTemplates(nativeTemplates) : localTemplates;
        const sanitizedTemplates = sanitizeWidgetTemplatesForUiIconSupport(sourceTemplates, false);

        if (areWidgetTemplatesEqual(sanitizedTemplates, sourceTemplates)) {
          return;
        }

        saveWidgetTemplatesToStorage(sanitizedTemplates);
        await WidgetBridge.saveTemplates({ templates: sanitizedTemplates });
      } catch (error) {
        console.error('[useWidgetBridgeSync] Failed to sanitize widget UI icon state', error);
      }
    };

    void sanitizeUnsupportedWidgetUiIcons();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported()) {
      return;
    }

    let cancelled = false;

    const reconcileFromNative = async () => {
      try {
        let reconciledDailyState = latestDailyStateRef.current;
        const [{ actions }, { runtimeState }, { actions: dailyActions }, { actions: todoPinActions }] = await Promise.all([
          WidgetBridge.getPendingActions(),
          WidgetBridge.getRuntimeState(),
          WidgetBridge.getPendingDailyActions(),
          WidgetBridge.getPendingTodoPinActions()
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

        if (todoPinActions.length > 0) {
          const completedAt = new Date().toISOString();
          setTodos((prevTodos) => {
            const createdTodos = todoPinActions
              .filter((action) => action.actionType === 'create' && action.title?.trim())
              .filter((action) => !prevTodos.some((todo) => todo.id === action.todoId))
              .map((action) => ({
                id: action.todoId,
                categoryId: '__virtual_quick__',
                kind: 'quick' as const,
                title: action.title!.trim(),
                isCompleted: false,
                pin: false,
                completedUnits: 0
              }));
            const currentTodos = [...prevTodos, ...createdTodos];

            return syncSubtaskProgressToParentTodos(currentTodos.map((todo) => {
              const action = todoPinActions.find(
                (item) => item.actionType !== 'create' && item.todoId === todo.id
              );
              if (!action || todo.isCompleted === action.isCompleted) {
                return todo;
              }
              return {
                ...todo,
                isCompleted: action.isCompleted,
                completedAt: action.isCompleted ? todo.completedAt || completedAt : undefined
              };
            }));
          });
          await WidgetBridge.clearPendingTodoPinActions({ ids: todoPinActions.map((action) => action.id) });
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

          if (runtimeState.source !== 'widget') {
            return withoutCompletedSessions;
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
  }, [categories, setActiveSessions, setDailyReviews, setLogs, setTodos]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const syncLogTailState = async () => {
      try {
        await WidgetBridge.syncLogTailState({
          logTailState: buildWidgetLogTailState(logs)
        });
      } catch (error) {
        console.error('[useWidgetBridgeSync] Failed to sync widget log-tail state to native widget', error);
      }
    };

    void syncLogTailState();
  }, [hasHydratedNativeState, logs]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const syncRuntimeState = async () => {
      if (!latestSession) {
        if (!hasHydratedSessionRuntimeRef.current) {
          hasHydratedSessionRuntimeRef.current = true;
          try {
            const { runtimeState: nativeRuntime } = await WidgetBridge.getRuntimeState();
            if (nativeRuntime?.source === 'widget') {
              return;
            }
          } catch (error) {
            console.error('[useWidgetBridgeSync] Failed to read native runtime state', error);
          }
        }

        try {
          await WidgetBridge.syncRuntimeState({ runtimeState: null });
        } catch (error) {
          console.error('[useWidgetBridgeSync] Failed to clear native widget runtime state', error);
        }
        return;
      }

      hasHydratedSessionRuntimeRef.current = true;
      const runtimeState = latestSession
        ? buildWidgetRuntimeStateFromSession(latestSession, categories)
        : null;

      fireAndForgetWidgetBridgeCall(
        'Failed to sync runtime state to native widget',
        () => WidgetBridge.syncRuntimeState({ runtimeState })
      );
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

    fireAndForgetWidgetBridgeCall(
      'Failed to sync daily widget data to native widget',
      () => WidgetBridge.syncDailyWidgetData({ payload })
    );
  }, [checkTemplates, dailyReviews, hasHydratedNativeState]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const payload = buildDailyRuntimeWidgetPayload({
      logs,
      activeSessions,
      categories
    });

    fireAndForgetWidgetBridgeCall(
      'Failed to sync DAILY_RUNTIME payload to native widget',
      () => WidgetBridge.syncDailyRuntimeWidgetData({ payload })
    );
  }, [activeSessions, categories, hasHydratedNativeState, logs]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const payload = buildTodoPinWidgetPayload({
      todos,
      categories
    });

    fireAndForgetWidgetBridgeCall(
      'Failed to sync TODAY + PIN widget payload to native widget',
      () => WidgetBridge.syncTodoPinWidgetData({ payload })
    );
  }, [categories, hasHydratedNativeState, todos]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const payload = buildTrackingCalendarWidgetPayload({
      templates: loadWidgetTemplatesFromStorage(),
      logs,
      activeSessions,
      categories,
      scopes,
      dailyReviews,
      checkTemplates
    });

    fireAndForgetWidgetBridgeCall(
      'Failed to sync tracking calendar payload to native widget',
      () => WidgetBridge.syncTrackingCalendarWidgetData({ payload })
    );
  }, [
    activeSessions,
    categories,
    checkTemplates,
    dailyReviews,
    hasHydratedNativeState,
    logs,
    scopes,
    widgetTemplateRevision
  ]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const payload = loadPrincipleCardWidgetPayloadFromStorage();

    fireAndForgetWidgetBridgeCall(
      'Failed to sync principle-card widget data to native widget',
      () => WidgetBridge.syncPrincipleCardWidgetData({ payload })
    );
  }, [hasHydratedNativeState, principleLibraryRevision]);

  useEffect(() => {
    if (!isNativeAndroidWidgetSupported() || !hasHydratedNativeState) {
      return;
    }

    const payload = buildSceneWidgetPayloadFromStorage({
      categories,
      todos,
      checkTemplates
    });

    fireAndForgetWidgetBridgeCall(
      'Failed to sync scene widget payload to native widget',
      () => WidgetBridge.syncSceneWidgetData({ payload })
    );
  }, [
    categories,
    checkTemplates,
    hasHydratedNativeState,
    sceneWidgetRevision,
    todos
  ]);
};
