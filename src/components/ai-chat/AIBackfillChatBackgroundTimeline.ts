/**
 * @file AIBackfillChatBackgroundTimeline.ts
 * @input Persisted assistant background call history and Android native diagnostic events
 * @output Chronologically sorted entries for the assistant background history viewer
 * @pos Component Support (AI Background History)
 * @description Merges Web-orchestrated turns with native wake/request diagnostics while preserving debug payloads and request lifecycle state.
 * @updated 2026-09-22: Extracted background-history timeline assembly from AIBackfillChatModal.
 * @updated 2026-09-23: Aligns message outcome labeling with the unified send_message action type.
 */

import type { AIDebugExchange } from '../../services/aiService';
import type { AssistantBackgroundCallHistoryEntry } from '../../services/assistantOrchestratorService';
import type { AssistantNativeDiagnosticEntry } from '../../types/assistant';
import { buildNativeDiagnosticDebugExchange } from '../../utils/assistantNativeDebug';
import type { AssistantBackgroundTimelineEntry } from './AIBackfillChatShared';

type NativeRequestState = {
  startedAt?: string;
  completedAt?: string;
  status?: AssistantBackgroundTimelineEntry['requestStatus'];
  outcomeSummary?: string;
  message?: string;
  errorMessage?: string;
  debugExchange?: AIDebugExchange;
};

const getNativeRequestStates = (
  diagnostics: AssistantNativeDiagnosticEntry[]
): Map<string, NativeRequestState> => {
  const nativeRequestStates = new Map<string, NativeRequestState>();

  diagnostics.forEach((entry) => {
    const triggerId = entry.triggerId?.trim();
    if (!triggerId) {
      return;
    }

    const current = nativeRequestStates.get(triggerId) || {};
    if (entry.type === 'native_request_started') {
      nativeRequestStates.set(triggerId, {
        ...current,
        startedAt: entry.context?.requestedAt || entry.createdAt,
        status: 'pending'
      });
      return;
    }

    if (entry.type === 'native_request_completed') {
      const debugExchange = buildNativeDiagnosticDebugExchange(entry);
      nativeRequestStates.set(triggerId, {
        ...current,
        startedAt: current.startedAt || entry.context?.requestedAt,
        completedAt: entry.context?.completedAt || entry.createdAt,
        status: 'completed',
        outcomeSummary: entry.context?.decisionSummary || '原生后台请求已完成',
        message: entry.context?.assistantReply || undefined,
        ...(debugExchange ? { debugExchange } : {})
      });
      return;
    }

    if (entry.type === 'native_request_skipped') {
      nativeRequestStates.set(triggerId, {
        ...current,
        startedAt: current.startedAt || entry.context?.requestedAt,
        completedAt: entry.createdAt,
        status: 'not_started',
        outcomeSummary: entry.reason === 'native_ai_unavailable'
          ? '原生 AI 未就绪，等待 Web fallback 或下次重试'
          : entry.message,
        errorMessage: entry.reason || undefined
      });
      return;
    }

    if (entry.type !== 'native_request_failed') {
      return;
    }

    const debugExchange = buildNativeDiagnosticDebugExchange(entry);
    nativeRequestStates.set(triggerId, {
      ...current,
      startedAt: current.startedAt || entry.context?.requestedAt,
      completedAt: entry.createdAt,
      status: 'failed',
      outcomeSummary: '原生后台请求失败了',
      errorMessage: entry.context?.error || entry.message,
      ...(debugExchange ? { debugExchange } : {})
    });
  });

  return nativeRequestStates;
};

export const buildAssistantBackgroundTimeline = ({
  backgroundCallHistory,
  nativeDiagnostics
}: {
  backgroundCallHistory: AssistantBackgroundCallHistoryEntry[];
  nativeDiagnostics: AssistantNativeDiagnosticEntry[];
}): AssistantBackgroundTimelineEntry[] => {
  const visibleNativeWakeEvents = nativeDiagnostics.filter((entry) => (
    entry.type === 'checkin_skipped'
    || entry.type === 'checkin_dispatched'
    || entry.type === 'manual_trigger_dispatched'
    || entry.type === 'reminder_due_dispatched'
    || entry.type === 'native_request_skipped'
  ));
  const nativeRequestStates = getNativeRequestStates(nativeDiagnostics.filter((entry) => (
    entry.type === 'native_request_started'
    || entry.type === 'native_request_skipped'
    || entry.type === 'native_request_completed'
    || entry.type === 'native_request_failed'
  )));
  const nativeWakeEventsByTriggerId = new Map<string, AssistantNativeDiagnosticEntry>();
  visibleNativeWakeEvents.forEach((entry) => {
    if (entry.triggerId) {
      nativeWakeEventsByTriggerId.set(entry.triggerId, entry);
    }
  });

  const usedNativeIds = new Set<string>();
  const mergedEntries: AssistantBackgroundTimelineEntry[] = backgroundCallHistory.map((entry) => {
    const nativeEvent = entry.triggerId ? nativeWakeEventsByTriggerId.get(entry.triggerId) : undefined;
    const nativeRequest = entry.triggerId ? nativeRequestStates.get(entry.triggerId) : undefined;
    if (nativeEvent) {
      usedNativeIds.add(nativeEvent.id);
    }

    const trimmedMessage = entry.message?.trim() || '';
    const trimmedDecisionSummary = entry.decisionSummary?.trim() || '';
    const outcomeSummary = entry.status === 'failed'
      ? '这次后台请求失败了'
      : trimmedDecisionSummary && trimmedDecisionSummary !== trimmedMessage
        ? trimmedDecisionSummary
        : entry.action === 'send_message' && trimmedMessage
          ? '这次请求成功并返回了一条消息'
          : entry.action === 'silent'
            ? '这次请求成功，但选择了静默'
            : '这次请求已完成';

    return {
      id: entry.id,
      ...(entry.triggerId ? { triggerId: entry.triggerId } : {}),
      triggerType: entry.triggerType || nativeEvent?.triggerType,
      ...(entry.persistedMessageId ? { persistedMessageId: entry.persistedMessageId } : {}),
      wakeAt: nativeEvent?.createdAt || entry.requestedAt,
      requestStartedAt: nativeRequest?.startedAt || entry.requestedAt,
      requestCompletedAt: nativeRequest?.completedAt || entry.completedAt,
      requestStatus: entry.status === 'failed'
        ? 'failed'
        : entry.status === 'pending'
          ? 'pending'
          : 'completed',
      outcomeSummary,
      ...(trimmedMessage && trimmedMessage !== outcomeSummary ? { message: trimmedMessage } : {}),
      ...(entry.errorMessage?.trim() ? { errorMessage: entry.errorMessage.trim() } : {}),
      ...(entry.debugExchange
        ? { debugExchange: entry.debugExchange }
        : nativeRequest?.debugExchange
          ? { debugExchange: nativeRequest.debugExchange }
          : {})
    };
  });

  visibleNativeWakeEvents.forEach((entry) => {
    if (usedNativeIds.has(entry.id)) {
      return;
    }

    const nativeRequest = entry.triggerId ? nativeRequestStates.get(entry.triggerId) : undefined;
    mergedEntries.push({
      id: entry.id,
      ...(entry.triggerId ? { triggerId: entry.triggerId } : {}),
      triggerType: entry.triggerType,
      wakeAt: entry.createdAt,
      requestStartedAt: nativeRequest?.startedAt,
      requestCompletedAt: nativeRequest?.completedAt,
      requestStatus: nativeRequest?.status || 'not_started',
      outcomeSummary: nativeRequest?.outcomeSummary
        || (entry.reason === 'native_ai_unavailable'
          ? '原生 AI 未就绪，已保留 Reminder 并等待 Web fallback 或下次重试'
          : entry.type === 'checkin_skipped'
            ? `本次 check-in 已跳过：${entry.reason || '条件未满足'}`
            : '原生已经唤醒并派发 trigger，但 Web 侧还没有开始请求'),
      ...(nativeRequest?.message ? { message: nativeRequest.message } : {}),
      ...(nativeRequest?.errorMessage ? { errorMessage: nativeRequest.errorMessage } : {}),
      ...(nativeRequest?.debugExchange ? { debugExchange: nativeRequest.debugExchange } : {})
    });
  });

  return mergedEntries.sort((left, right) => {
    const leftTime = Date.parse(left.requestCompletedAt || left.requestStartedAt || left.wakeAt || '') || 0;
    const rightTime = Date.parse(right.requestCompletedAt || right.requestStartedAt || right.wakeAt || '') || 0;
    return rightTime - leftTime;
  });
};
