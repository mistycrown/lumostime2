/**
 * @file useAppAwarenessRuntime.ts
 * @input Native app-awareness detection events, configured workflows, and session runtime state
 * @output Android floating overlay workflow orchestration for app-awareness prompts, countdowns, and overtime reminders
 * @pos Hook (System Integration)
 * @description Drives the native app-awareness floating workflow panel step-by-step without switching back to LumosTime, while reusing the existing session and log pipeline for actual timer records.
 * @updated 2026-06-21: Removed dismiss/close from the overtime finish prompt so expected-duration handling only offers extend or submit.
 * @updated 2026-06-21: Added the first-pass native overlay runtime for cooldown,问答,预计时长,开始记录 and overtime extension prompts.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  ActiveSession,
  Activity,
  AppAwarenessAnswerValue,
  AppAwarenessExpectedDurationStep,
  AppAwarenessRun,
  AppAwarenessSessionMeta,
  AppAwarenessStartRecordStep,
  AppAwarenessWorkflowStep,
  AppAwarenessWorkflowTemplate
} from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import AppUsage, {
  AppAwarenessOverlayPayload,
  PendingAppAwarenessNativeFinishPayload,
  PendingAppAwarenessNativeStartPayload
} from '../plugins/AppUsagePlugin';

interface AppAwarenessDetectionPayload {
  packageName?: string;
  appLabel?: string;
  workflowTemplateId?: string;
}

interface AppAwarenessOverlayActionPayload {
  actionId?: string;
  value?: string | null;
}

interface AppAwarenessNativeStartPayload {
  nativeTimerId?: string;
  packageName?: string;
  appLabel?: string;
  workflowTemplateId?: string;
  answers?: Record<string, AppAwarenessAnswerValue>;
  selectedActivity?: {
    categoryId?: string;
    activityId?: string;
    label?: string;
    icon?: string;
  };
  expectedDurationMinutes?: number;
  startedAt?: number;
}

interface AppAwarenessNativeFinishPayload {
  nativeTimerId?: string;
  packageName?: string;
  finishedAt?: number;
}

interface UseAppAwarenessRuntimeOptions {
  handleStartActivity: (
    activity: Activity,
    categoryId: string,
    todoId?: string,
    scopeIdOrIds?: string | string[],
    note?: string,
    autoEnterFocus?: boolean,
    appAwarenessMeta?: AppAwarenessSessionMeta
  ) => string;
  handleStopActivity: (sessionId: string, finalSessionData?: ActiveSession) => void;
}

const parseEventDetail = <T,>(event: Event): T | null => {
  const customEvent = event as CustomEvent<unknown>;
  const detail = customEvent.detail;

  if (!detail) {
    return null;
  }

  if (typeof detail === 'string') {
    try {
      return JSON.parse(detail) as T;
    } catch (error) {
      console.error('[useAppAwarenessRuntime] Failed to parse event detail', error);
      return null;
    }
  }

  return detail as T;
};

const buildProgressText = (stepIndex: number, template: AppAwarenessWorkflowTemplate): string =>
  `${Math.min(stepIndex + 1, template.steps.length)}/${template.steps.length}`;

const getActivityOptionDisplayLabel = (label: string): string => {
  const segments = label.split('/');
  return (segments[segments.length - 1] || label).trim();
};

const findActivityBySelection = (
  categories: ReturnType<typeof useCategoryScope>['categories'],
  selection: Exclude<AppAwarenessAnswerValue, string | number | boolean>
): { categoryId: string; activity: Activity } | null => {
  const category = categories.find((item) => item.id === selection.categoryId);
  const activity = category?.activities.find((item) => item.id === selection.activityId);
  if (!category || !activity) {
    return null;
  }

  return {
    categoryId: category.id,
    activity
  };
};

const getExpectedDurationFromAnswers = (
  answers: Record<string, AppAwarenessAnswerValue>,
  step: AppAwarenessWorkflowStep | undefined
): number | undefined => {
  if (!step || step.type !== 'expected_duration') {
    return undefined;
  }

  const value = answers[step.answerKey];
  return typeof value === 'number' && value > 0 ? value : undefined;
};

const buildAppAwarenessNote = (
  template: AppAwarenessWorkflowTemplate,
  answers: Record<string, AppAwarenessAnswerValue>
): string => {
  const lines = template.steps.flatMap((step) => {
    if (step.type === 'cooldown_wait') {
      return [];
    }

    const rawValue = answers[step.answerKey];
    if (rawValue === undefined || rawValue === null) {
      return [];
    }

    const noteKey = (step.answerKey || step.title).trim();
    if (!noteKey) {
      return [];
    }

    if (step.type === 'text_question') {
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';
      return value ? [`${noteKey}: ${value}`] : [];
    }

    if (step.type === 'single_choice') {
      const selectedValue = typeof rawValue === 'string' ? rawValue : '';
      if (!selectedValue) {
        return [];
      }
      const selectedOption = step.options.find((option) => option.value === selectedValue);
      const label = (selectedOption?.label || selectedValue).trim();
      return label ? [`${noteKey}: ${label}`] : [];
    }

    if (step.type === 'expected_duration') {
      const minutes = typeof rawValue === 'number' ? rawValue : Number.NaN;
      return Number.isFinite(minutes) && minutes > 0 ? [`${noteKey}: ${minutes}`] : [];
    }

    if (step.type === 'start_record') {
      const selection =
        rawValue && typeof rawValue === 'object' && 'label' in rawValue
          ? rawValue as Exclude<AppAwarenessAnswerValue, string | number | boolean>
          : null;
      const label = selection?.label?.trim() || '';
      return label ? [`${noteKey}: ${label}`] : [];
    }

    return [];
  });

  return lines.join('\n').trim();
};

const formatAppAwarenessClockTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const appendExtensionNote = (baseNote: string | undefined, extendedAt: number, minutes: number): string => {
  const line = `延长记录：${formatAppAwarenessClockTime(extendedAt)} 延长 ${minutes} 分钟`;
  if (!baseNote?.trim()) {
    return line;
  }

  return `${baseNote.trim()}\n${line}`;
};

export const useAppAwarenessRuntime = ({
  handleStartActivity,
  handleStopActivity
}: UseAppAwarenessRuntimeOptions) => {
  const {
    appAwarenessTemplates,
    appAwarenessBindings,
    appAwarenessActiveRun,
    setAppAwarenessActiveRun
  } = useSettings();
  const { categories } = useCategoryScope();
  const { activeSessions, setActiveSessions } = useSession();
  const { addToast } = useToast();

  const templatesRef = useRef(appAwarenessTemplates);
  const bindingsRef = useRef(appAwarenessBindings);
  const categoriesRef = useRef(categories);
  const activeRunRef = useRef(appAwarenessActiveRun);
  const activeSessionsRef = useRef(activeSessions);
  const processedNativeStartIdsRef = useRef<Map<string, number>>(new Map());
  const handleStartActivityRef = useRef(handleStartActivity);
  const handleStopActivityRef = useRef(handleStopActivity);

  useEffect(() => {
    templatesRef.current = appAwarenessTemplates;
  }, [appAwarenessTemplates]);

  useEffect(() => {
    bindingsRef.current = appAwarenessBindings;
  }, [appAwarenessBindings]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    activeRunRef.current = appAwarenessActiveRun;
  }, [appAwarenessActiveRun]);

  useEffect(() => {
    activeSessionsRef.current = activeSessions;
  }, [activeSessions]);

  useEffect(() => {
    handleStartActivityRef.current = handleStartActivity;
  }, [handleStartActivity]);

  useEffect(() => {
    handleStopActivityRef.current = handleStopActivity;
  }, [handleStopActivity]);

  const currentTemplate = useMemo(
    () => appAwarenessTemplates.find((item) => item.id === appAwarenessActiveRun?.templateId) || null,
    [appAwarenessActiveRun?.templateId, appAwarenessTemplates]
  );

  const goToStep = (
    run: AppAwarenessRun,
    template: AppAwarenessWorkflowTemplate,
    nextStepIndex: number,
    nextAnswers: Record<string, AppAwarenessAnswerValue> = run.answers
  ) => {
    if (nextStepIndex >= template.steps.length) {
      setAppAwarenessActiveRun({
        ...run,
        answers: nextAnswers,
        status: 'completed',
        completedAt: Date.now(),
        currentStepIndex: template.steps.length,
        stepStartedAt: undefined,
        stepEndsAt: undefined
      });
      return;
    }

    const nextStep = template.steps[nextStepIndex];
    const stepStartedAt = Date.now();
    if (nextStep.type === 'cooldown_wait') {
      setAppAwarenessActiveRun({
        ...run,
        answers: nextAnswers,
        currentStepIndex: nextStepIndex,
        status: 'waiting_cooldown',
        stepStartedAt,
        stepEndsAt: stepStartedAt + nextStep.durationSeconds * 1000
      });
      return;
    }

    setAppAwarenessActiveRun({
      ...run,
      answers: nextAnswers,
      currentStepIndex: nextStepIndex,
      status: 'running_step',
      stepStartedAt,
      stepEndsAt: undefined
    });
  };

  const hideOverlay = async () => {
    if (Capacitor.getPlatform() !== 'android' || typeof AppUsage.hideAppAwarenessOverlay !== 'function') {
      return;
    }

    try {
      await AppUsage.hideAppAwarenessOverlay();
    } catch (error) {
      console.error('[useAppAwarenessRuntime] Failed to hide app-awareness overlay', error);
    }
  };

  const showOverlay = async (payload: AppAwarenessOverlayPayload) => {
    if (Capacitor.getPlatform() !== 'android' || typeof AppUsage.showAppAwarenessOverlay !== 'function') {
      return;
    }

    try {
      await AppUsage.showAppAwarenessOverlay({ payload });
    } catch (error) {
      console.error('[useAppAwarenessRuntime] Failed to show app-awareness overlay', error);
    }
  };

  const finishActiveRun = (run: AppAwarenessRun | null) => {
    if (!run) {
      void hideOverlay();
      setAppAwarenessActiveRun(null);
      return;
    }

    setAppAwarenessActiveRun({
      ...run,
      status: 'completed',
      completedAt: Date.now(),
      stepEndsAt: undefined,
      stepStartedAt: undefined
    });
    void hideOverlay();
  };

  const startLinkedSession = (
    run: AppAwarenessRun,
    template: AppAwarenessWorkflowTemplate,
    selection: AppAwarenessStartRecordStep['activityOptions'][number],
    nextAnswers: Record<string, AppAwarenessAnswerValue>,
    durationMinutes?: number,
    options?: {
      startedAt?: number;
      nativeTimerId?: string;
    }
  ) => {
    const resolved = findActivityBySelection(categoriesRef.current, {
      categoryId: selection.categoryId,
      activityId: selection.activityId,
      label: selection.label,
      icon: selection.icon
    });
    if (!resolved) {
      addToast('error', '所选活动已不存在');
      return;
    }

    const note = buildAppAwarenessNote(template, nextAnswers) || `应用感知：${run.appName}`;
    const startedAt = options?.startedAt ?? Date.now();
    const meta: AppAwarenessSessionMeta = {
      sourceAppPackage: run.packageName,
      sourceAppName: run.appName,
      workflowTemplateId: template.id,
      workflowTemplateName: template.name,
      answers: nextAnswers,
      startedAt,
      nativeTimerId: options?.nativeTimerId,
      expectedDurationMinutes: durationMinutes,
      extensionHistory: []
    };
    const sessionId = handleStartActivityRef.current(
      resolved.activity,
      resolved.categoryId,
      undefined,
      undefined,
      note,
      false,
      meta
    );

    setAppAwarenessActiveRun({
      ...run,
      answers: nextAnswers,
      linkedSessionId: sessionId,
      status: 'timer_running',
      currentStepIndex: run.currentStepIndex,
      stepStartedAt: undefined,
      stepEndsAt: undefined,
      expectedTimer: durationMinutes
        ? {
            startedAt,
            durationMinutes,
            scheduledEndAt: startedAt + durationMinutes * 60 * 1000,
            extensionHistory: [],
            reminderIssuedAt: undefined
          }
        : undefined
    });
    void hideOverlay();
  };

  const claimNativeStartId = (nativeTimerId?: string) => {
    if (!nativeTimerId) {
      return true;
    }

    const now = Date.now();
    const processedIds = processedNativeStartIdsRef.current;
    processedIds.forEach((timestamp, existingId) => {
      if (now - timestamp > 5 * 60 * 1000) {
        processedIds.delete(existingId);
      }
    });

    if (processedIds.has(nativeTimerId)) {
      return false;
    }

    processedIds.set(nativeTimerId, now);
    return true;
  };

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    const handleDetected = (event: Event) => {
      const detail = parseEventDetail<AppAwarenessDetectionPayload>(event);
      if (!detail?.packageName) {
        return;
      }

      const existingSessionForPackage = activeSessionsRef.current.some((session) =>
        session.appAwarenessMeta?.sourceAppPackage === detail.packageName
      );
      if (existingSessionForPackage) {
        return;
      }

      const existingRun = activeRunRef.current;
      if (existingRun && existingRun.status !== 'completed' && existingRun.status !== 'cancelled' && existingRun.status !== 'abandoned') {
        if (existingRun.packageName === detail.packageName) {
          return;
        }

        addToast('info', '已有一个应用感知流程正在进行中');
        return;
      }

      const binding = bindingsRef.current.find((item) =>
        item.packageName === detail.packageName
        && item.enabled
        && (!detail.workflowTemplateId || item.workflowTemplateId === detail.workflowTemplateId)
      );
      const template = templatesRef.current.find((item) =>
        item.id === (detail.workflowTemplateId || binding?.workflowTemplateId)
      );

      if (!binding || !template || !template.enabled) {
        return;
      }

      goToStep({
        id: crypto.randomUUID(),
        templateId: template.id,
        packageName: detail.packageName,
        appName: detail.appLabel || binding.appName,
        status: 'idle',
        currentStepIndex: 0,
        answers: {},
        startedAt: Date.now()
      }, template, 0, {});
    };

    const handleOverlayAction = (event: Event) => {
      const detail = parseEventDetail<AppAwarenessOverlayActionPayload>(event);
      const run = activeRunRef.current;
      const template = templatesRef.current.find((item) => item.id === run?.templateId);
      if (!run || !template || !detail?.actionId) {
        return;
      }

      if (run.status === 'waiting_cooldown') {
        if (detail.actionId === 'workflow-cancel') {
          setAppAwarenessActiveRun(null);
          void hideOverlay();
        }
        return;
      }

      if (run.status === 'timer_overtime_pending') {
        if (detail.actionId === 'workflow-cancel') {
          setAppAwarenessActiveRun({
            ...run,
            status: 'timer_running'
          });
          void hideOverlay();
          return;
        }

        if (detail.actionId === 'overtime-finish' && run.linkedSessionId) {
          const linkedSession = activeSessionsRef.current.find((session) => session.id === run.linkedSessionId);
          handleStopActivityRef.current(run.linkedSessionId, linkedSession);
          finishActiveRun(run);
          return;
        }

        if (detail.actionId === 'overtime-dismiss') {
          setAppAwarenessActiveRun({
            ...run,
            status: 'timer_running'
          });
          void hideOverlay();
          return;
        }

        if (detail.actionId === 'overtime-extend' && run.expectedTimer) {
          const extendedAt = Date.now();
          const nextDurationMinutes = Math.max(1, Number.parseInt(detail.value || '0', 10) || 0);
          const nextExtensionHistory = [...run.expectedTimer.extensionHistory, nextDurationMinutes];
          setActiveSessions((prev) => prev.map((session) => {
            if (session.id !== run.linkedSessionId) {
              return session;
            }

            return {
              ...session,
              note: appendExtensionNote(session.note, extendedAt, nextDurationMinutes),
              appAwarenessMeta: session.appAwarenessMeta
                ? {
                    ...session.appAwarenessMeta,
                    expectedDurationMinutes: nextDurationMinutes,
                    extensionHistory: nextExtensionHistory
                  }
                : session.appAwarenessMeta
            };
          }));
          setAppAwarenessActiveRun({
            ...run,
            status: 'timer_running',
            expectedTimer: {
              ...run.expectedTimer,
              durationMinutes: nextDurationMinutes,
              scheduledEndAt: extendedAt + nextDurationMinutes * 60 * 1000,
              extensionHistory: nextExtensionHistory,
              reminderIssuedAt: undefined
            }
          });
          void hideOverlay();
        }
        return;
      }

      if (detail.actionId === 'workflow-cancel') {
        setAppAwarenessActiveRun(null);
        void hideOverlay();
        return;
      }

      const currentStep = template.steps[run.currentStepIndex];
      if (!currentStep) {
        return;
      }

      if (currentStep.type === 'text_question' && detail.actionId === 'text-submit') {
        const value = (detail.value || '').trim();
        if (currentStep.required !== false && !value) {
          addToast('error', '请先填写内容');
          return;
        }

        goToStep(run, template, run.currentStepIndex + 1, {
          ...run.answers,
          [currentStep.answerKey]: value
        });
        return;
      }

      if (currentStep.type === 'single_choice' && detail.actionId === 'choice-select') {
        goToStep(run, template, run.currentStepIndex + 1, {
          ...run.answers,
          [currentStep.answerKey]: detail.value || ''
        });
        return;
      }

      if (currentStep.type === 'expected_duration' && detail.actionId === 'duration-select') {
        const minutes = Math.max(1, Number.parseInt(detail.value || '0', 10) || 0);
        if (minutes <= 0) {
          return;
        }

        goToStep(run, template, run.currentStepIndex + 1, {
          ...run.answers,
          [currentStep.answerKey]: minutes
        });
        return;
      }

      if (currentStep.type === 'start_record' && detail.actionId === 'activity-start') {
        const selection = currentStep.activityOptions.find((item) => item.id === detail.value);
        if (!selection) {
          addToast('error', '未找到对应活动');
          return;
        }

        const expectedDurationStep = template.steps.find((item): item is AppAwarenessExpectedDurationStep => item.type === 'expected_duration');
        const durationMinutes =
          currentStep.durationSource === 'fixed'
            ? currentStep.defaultDurationMinutes
            : currentStep.durationSource === 'from_step'
              ? getExpectedDurationFromAnswers(run.answers, expectedDurationStep)
              : undefined;
        const nextAnswers: Record<string, AppAwarenessAnswerValue> = {
          ...run.answers,
          [currentStep.answerKey]: {
            categoryId: selection.categoryId,
            activityId: selection.activityId,
            label: getActivityOptionDisplayLabel(selection.label),
            icon: selection.icon
          }
        };

        startLinkedSession(run, template, selection, nextAnswers, durationMinutes);
      }
    };

    const processNativeStartPayload = (
      detail: AppAwarenessNativeStartPayload | PendingAppAwarenessNativeStartPayload | null
    ) => {
      if (!detail?.packageName || !detail.workflowTemplateId || !detail.selectedActivity?.categoryId || !detail.selectedActivity?.activityId) {
        return;
      }

      if (!claimNativeStartId(detail.nativeTimerId)) {
        return;
      }

      const template = templatesRef.current.find((item) => item.id === detail.workflowTemplateId);
      const startRecordStep = template?.steps.find((item): item is AppAwarenessStartRecordStep => item.type === 'start_record');
      if (!template || !startRecordStep) {
        return;
      }

      const answers =
        detail.answers && typeof detail.answers === 'object'
          ? { ...detail.answers }
          : {};
      const selection = {
        id: `${detail.selectedActivity.categoryId}:${detail.selectedActivity.activityId}`,
        categoryId: detail.selectedActivity.categoryId,
        activityId: detail.selectedActivity.activityId,
        label: detail.selectedActivity.label || '',
        icon: detail.selectedActivity.icon
      };
      const nextAnswers: Record<string, AppAwarenessAnswerValue> = {
        ...answers,
        [startRecordStep.answerKey]: {
          categoryId: selection.categoryId,
          activityId: selection.activityId,
          label: getActivityOptionDisplayLabel(selection.label || ''),
          icon: selection.icon
        }
      };
      const startStepIndex = template.steps.findIndex((item) => item.id === startRecordStep.id);
      const durationMinutes =
        typeof detail.expectedDurationMinutes === 'number' && detail.expectedDurationMinutes > 0
          ? detail.expectedDurationMinutes
          : undefined;

      startLinkedSession(
        {
          id: crypto.randomUUID(),
          templateId: template.id,
          packageName: detail.packageName,
          appName: detail.appLabel || detail.packageName,
          status: 'running_step',
          currentStepIndex: startStepIndex >= 0 ? startStepIndex : 0,
          answers,
          startedAt: typeof detail.startedAt === 'number' && detail.startedAt > 0 ? detail.startedAt : Date.now()
        },
        template,
        selection,
        nextAnswers,
        durationMinutes,
        {
          startedAt: typeof detail.startedAt === 'number' && detail.startedAt > 0 ? detail.startedAt : Date.now(),
          nativeTimerId: detail.nativeTimerId
        }
      );
    };

    const processNativeFinishPayload = (
      detail: AppAwarenessNativeFinishPayload | PendingAppAwarenessNativeFinishPayload | null
    ) => {
      if (!detail?.nativeTimerId) {
        return;
      }

      const matchedSession = activeSessionsRef.current.find((session) =>
        session.appAwarenessMeta?.nativeTimerId === detail.nativeTimerId
      );
      const activeRun = activeRunRef.current;

      if (matchedSession) {
        handleStopActivityRef.current(matchedSession.id, matchedSession);
      }

      if (activeRun?.linkedSessionId && matchedSession?.id === activeRun.linkedSessionId) {
        finishActiveRun(activeRun);
        return;
      }

      if (matchedSession) {
        setAppAwarenessActiveRun(null);
        void hideOverlay();
      }
    };

    const handleNativeStart = (event: Event) => {
      processNativeStartPayload(parseEventDetail<AppAwarenessNativeStartPayload>(event));
    };

    const handleNativeFinish = (event: Event) => {
      processNativeFinishPayload(parseEventDetail<AppAwarenessNativeFinishPayload>(event));
    };

    const consumePendingNativeStart = async () => {
      if (typeof AppUsage.consumePendingAppAwarenessStart !== 'function') {
        return;
      }

      try {
        const pending = await AppUsage.consumePendingAppAwarenessStart();
        if (!pending.hasPending) {
          return;
        }

        processNativeStartPayload(pending);
      } catch (error) {
        console.error('[useAppAwarenessRuntime] Failed to consume pending native start', error);
      }
    };

    const consumePendingNativeFinish = async () => {
      if (typeof AppUsage.consumePendingAppAwarenessFinish !== 'function') {
        return;
      }

      try {
        const pending = await AppUsage.consumePendingAppAwarenessFinish();
        if (!pending.hasPending) {
          return;
        }

        processNativeFinishPayload(pending);
      } catch (error) {
        console.error('[useAppAwarenessRuntime] Failed to consume pending native finish', error);
      }
    };

    const reconcilePendingNativeEvents = async () => {
      await consumePendingNativeStart();
      await consumePendingNativeFinish();
    };

    window.addEventListener('appAwarenessDetected', handleDetected);
    window.addEventListener('appAwarenessOverlayAction', handleOverlayAction);
    window.addEventListener('appAwarenessNativeStart', handleNativeStart);
    window.addEventListener('appAwarenessNativeFinish', handleNativeFinish);

    let appStateListener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;
    void reconcilePendingNativeEvents();
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void reconcilePendingNativeEvents();
      }
    }).then((listener) => {
      appStateListener = listener;
    }).catch((error) => {
      console.error('[useAppAwarenessRuntime] Failed to register appStateChange listener', error);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reconcilePendingNativeEvents();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void appStateListener?.remove();
      window.removeEventListener('appAwarenessDetected', handleDetected);
      window.removeEventListener('appAwarenessOverlayAction', handleOverlayAction);
      window.removeEventListener('appAwarenessNativeStart', handleNativeStart);
      window.removeEventListener('appAwarenessNativeFinish', handleNativeFinish);
    };
  }, [addToast, setActiveSessions, setAppAwarenessActiveRun]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android' || !appAwarenessActiveRun || !currentTemplate) {
      return;
    }

    if (appAwarenessActiveRun.status === 'timer_running' || appAwarenessActiveRun.status === 'completed' || appAwarenessActiveRun.status === 'cancelled' || appAwarenessActiveRun.status === 'abandoned') {
      void hideOverlay();
      return;
    }

    const step = currentTemplate.steps[appAwarenessActiveRun.currentStepIndex];
    if (!step && appAwarenessActiveRun.status !== 'timer_overtime_pending') {
      void hideOverlay();
      return;
    }

    if (appAwarenessActiveRun.status === 'waiting_cooldown' && step?.type === 'cooldown_wait') {
      const remainingSeconds = Math.max(
        0,
        Math.ceil(((appAwarenessActiveRun.stepEndsAt || Date.now()) - Date.now()) / 1000)
      );
      void showOverlay({
        progressText: buildProgressText(appAwarenessActiveRun.currentStepIndex, currentTemplate),
        title: step.title,
        body: `${appAwarenessActiveRun.appName} 前先冷静 ${remainingSeconds} 秒。`,
        allowClose: currentTemplate.allowClose !== false,
        countdownSeconds: remainingSeconds,
        buttons: []
      });
      return;
    }

    if (appAwarenessActiveRun.status === 'timer_overtime_pending' && currentTemplate) {
      const startRecordStep = currentTemplate.steps.find((item): item is AppAwarenessStartRecordStep => item.type === 'start_record');
      const extensionMinutesOptions = startRecordStep?.allowContinueExtensions === false
        ? []
        : (startRecordStep?.extensionMinutesOptions || []);
      void showOverlay({
        progressText: '已到预计时长',
        title: '是否结束当前活动？',
        body: `${appAwarenessActiveRun.appName} 还在前台，你可以现在结束，或继续延长一段时间。`,
        allowClose: false,
        buttons: [
          { id: 'overtime-finish', label: '结束活动', style: 'primary' },
          ...(extensionMinutesOptions.map((minutes) => ({
            id: 'overtime-extend',
            label: `继续 ${minutes} 分钟`,
            style: 'secondary' as const,
            value: String(minutes)
          })))
        ]
      });
      return;
    }

    if (appAwarenessActiveRun.status !== 'running_step' || !step) {
      return;
    }

    if (step.type === 'text_question') {
      void showOverlay({
        progressText: buildProgressText(appAwarenessActiveRun.currentStepIndex, currentTemplate),
        title: step.title,
        body: step.description || `${appAwarenessActiveRun.appName} 这次是为了做什么？`,
        allowClose: currentTemplate.allowClose !== false,
        showInput: true,
        inputPlaceholder: step.placeholder || '写下这次打开它的目的',
        inputHint: '填写后继续',
        inputValue: typeof appAwarenessActiveRun.answers[step.answerKey] === 'string'
          ? appAwarenessActiveRun.answers[step.answerKey] as string
          : '',
        buttons: [
          { id: 'text-submit', label: '下一步', style: 'primary', submitTextValue: true }
        ]
      });
      return;
    }

    if (step.type === 'single_choice') {
      void showOverlay({
        progressText: buildProgressText(appAwarenessActiveRun.currentStepIndex, currentTemplate),
        title: step.title,
        body: step.description || `${appAwarenessActiveRun.appName} 这次主要用来做什么？`,
        allowClose: currentTemplate.allowClose !== false,
        buttons: [
          ...step.options.map((option) => ({
            id: 'choice-select',
            label: option.label,
            style: 'secondary' as const,
            value: option.value
          }))
        ]
      });
      return;
    }

    if (step.type === 'expected_duration') {
      void showOverlay({
        progressText: buildProgressText(appAwarenessActiveRun.currentStepIndex, currentTemplate),
        title: step.title,
        body: step.description || '预计这次会花多久？',
        allowClose: currentTemplate.allowClose !== false,
        buttons: [
          ...step.durationMinutesOptions.map((minutes) => ({
            id: 'duration-select',
            label: `${minutes} 分钟`,
            style: 'secondary' as const,
            value: String(minutes)
          }))
        ]
      });
      return;
    }

    if (step.type === 'start_record') {
      void showOverlay({
        progressText: buildProgressText(appAwarenessActiveRun.currentStepIndex, currentTemplate),
        title: step.title,
        body: step.description || '选择这次要记录成什么活动，并开始计时。',
        allowClose: currentTemplate.allowClose !== false,
        buttons: [
          ...step.activityOptions.map((option) => ({
            id: 'activity-start',
            label: getActivityOptionDisplayLabel(option.label),
            style: 'secondary' as const,
            value: option.id
          }))
        ]
      });
    }
  }, [appAwarenessActiveRun, currentTemplate]);

  useEffect(() => {
    if (!appAwarenessActiveRun || !currentTemplate || appAwarenessActiveRun.status !== 'waiting_cooldown' || !appAwarenessActiveRun.stepEndsAt) {
      return;
    }

    const timer = window.setInterval(() => {
      const latestRun = activeRunRef.current;
      if (!latestRun || latestRun.status !== 'waiting_cooldown') {
        window.clearInterval(timer);
        return;
      }

      if ((latestRun.stepEndsAt || 0) <= Date.now()) {
        window.clearInterval(timer);
        goToStep(latestRun, currentTemplate, latestRun.currentStepIndex + 1, latestRun.answers);
      } else {
        setAppAwarenessActiveRun({
          ...latestRun
        });
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [appAwarenessActiveRun, currentTemplate, setAppAwarenessActiveRun]);

  useEffect(() => {
    if (!appAwarenessActiveRun?.linkedSessionId) {
      return;
    }

    const linkedSessionStillActive = activeSessions.some((session) => session.id === appAwarenessActiveRun.linkedSessionId);
    if (!linkedSessionStillActive) {
      if (Capacitor.getPlatform() === 'android' && typeof AppUsage.stopCurrentAppAwarenessTimer === 'function') {
        void AppUsage.stopCurrentAppAwarenessTimer().catch((error) => {
          console.error('[useAppAwarenessRuntime] Failed to stop native app-awareness timer', error);
        });
      }
      setAppAwarenessActiveRun(null);
      void hideOverlay();
    }
  }, [activeSessions, appAwarenessActiveRun, setAppAwarenessActiveRun]);

  useEffect(() => {
    if (!appAwarenessActiveRun?.expectedTimer || appAwarenessActiveRun.status !== 'timer_running') {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const latestRun = activeRunRef.current;
      if (!latestRun?.expectedTimer || latestRun.status !== 'timer_running' || latestRun.expectedTimer.reminderIssuedAt) {
        return;
      }

      try {
        const currentApp = await AppUsage.getRunningApp();
        if (currentApp.packageName === latestRun.packageName) {
          setAppAwarenessActiveRun({
            ...latestRun,
            status: 'timer_overtime_pending',
            expectedTimer: {
              ...latestRun.expectedTimer,
              reminderIssuedAt: Date.now()
            }
          });
          return;
        }

        setAppAwarenessActiveRun({
          ...latestRun,
          expectedTimer: {
            ...latestRun.expectedTimer,
            reminderIssuedAt: Date.now()
          }
        });
      } catch (error) {
        console.error('[useAppAwarenessRuntime] Failed to inspect current foreground app', error);
      }
    }, Math.max(0, appAwarenessActiveRun.expectedTimer.scheduledEndAt - Date.now()));

    return () => {
      window.clearTimeout(timeout);
    };
  }, [appAwarenessActiveRun, setAppAwarenessActiveRun]);
};
