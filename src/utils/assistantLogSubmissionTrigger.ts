/**
 * @file assistantLogSubmissionTrigger.ts
 * @input Assistant config snapshots, newly created logs, and current category/todo/scope dictionaries
 * @output Shared event, matching, and prompt-building helpers for post-log assistant triggers
 * @pos Utilities (Assistant Triggering)
 * @description Centralizes the fixed log-submission trigger rules so log persistence can emit lightweight events while the globally mounted AI assistant decides whether and how to run a background system turn.
 * @updated 2026-05-16: Added a compact user-facing summary builder so submitted-log triggers can also appear as short simulated user messages inside chat history.
 * @updated 2026-05-16: Added fixed prompt construction plus event helpers for triggering the background assistant after selected new log submissions.
 */

import type { Category, Log, Scope, TodoItem } from '../types';
import type { AssistantAgentConfig, AssistantSystemTrigger } from '../types/assistant';
import { formatAssistantLocalDateTime } from './assistantTime';

export const ASSISTANT_LOG_SUBMITTED_EVENT = 'lumostime:assistant-log-submitted';

export interface AssistantLogSubmittedEventDetail {
  log: Log;
}

interface BuildAssistantLogSubmissionTriggerParams {
  log: Log;
  categories: Category[];
  scopes: Scope[];
  todos: TodoItem[];
  now?: Date;
}

const formatClockTime = (timestamp: number): string => (
  new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(timestamp)
);

const formatDurationMinutes = (log: Log): number => {
  const durationSeconds = Number.isFinite(log.duration)
    ? log.duration
    : Math.max(0, (log.endTime - log.startTime) / 1000);

  return Math.max(1, Math.round(durationSeconds / 60));
};

const normalizeInlineText = (value?: string): string => (
  (value || '').replace(/\s+/g, ' ').trim()
);

const getActivityLabel = (log: Log, categories: Category[]): string => {
  const category = categories.find((item) => item.id === log.categoryId);
  const activity = category?.activities.find((item) => item.id === log.activityId)
    || categories.flatMap((item) => item.activities).find((item) => item.id === log.activityId);
  const categoryLabel = normalizeInlineText(category?.name);
  const activityLabel = normalizeInlineText(activity?.name || log.title || log.activityId);

  if (categoryLabel && activityLabel) {
    return `${categoryLabel} / ${activityLabel}`;
  }

  return activityLabel || categoryLabel || '未命名标签';
};

const getLinkedTodoLabel = (log: Log, todos: TodoItem[]): string => {
  if (!log.linkedTodoId) {
    return '';
  }

  const linkedTodo = todos.find((todo) => todo.id === log.linkedTodoId);
  return normalizeInlineText(linkedTodo?.title);
};

const getScopeLabel = (log: Log, scopes: Scope[]): string => {
  if (!log.scopeIds?.length) {
    return '';
  }

  const names = log.scopeIds
    .map((scopeId) => normalizeInlineText(scopes.find((scope) => scope.id === scopeId)?.name))
    .filter(Boolean);

  return Array.from(new Set(names)).join(' / ');
};

const buildSharedSubmittedLogFields = (
  log: Log,
  categories: Category[],
  scopes: Scope[],
  todos: TodoItem[]
) => ({
  activityLabel: getActivityLabel(log, categories),
  linkedTodoLabel: getLinkedTodoLabel(log, todos),
  scopeLabel: getScopeLabel(log, scopes),
  noteLabel: normalizeInlineText(log.note),
  durationMinutes: formatDurationMinutes(log)
});

const buildAssistantLogSubmissionText = (
  log: Log,
  categories: Category[],
  scopes: Scope[],
  todos: TodoItem[]
): string => {
  const {
    activityLabel,
    linkedTodoLabel,
    scopeLabel,
    noteLabel,
    durationMinutes
  } = buildSharedSubmittedLogFields(log, categories, scopes, todos);
  const lines = [
    'System: 用户刚才完成了一条时间记录。',
    `标签：${activityLabel}`,
    `时长：${durationMinutes} 分钟`,
    `开始：${formatClockTime(log.startTime)}`,
    `结束：${formatClockTime(log.endTime)}`
  ];

  if (linkedTodoLabel) {
    lines.push(`关联待办：${linkedTodoLabel}`);
  }

  if (scopeLabel) {
    lines.push(`关联领域：${scopeLabel}`);
  }

  if (noteLabel) {
    lines.push(`备注：${noteLabel}`);
  }

  lines.push('请基于这条新完成记录做出简短反应。');
  return lines.join('\n');
};

export const buildAssistantLogSubmissionUserMessage = (
  log: Log,
  categories: Category[],
  scopes: Scope[],
  todos: TodoItem[]
): string => {
  const {
    activityLabel,
    linkedTodoLabel,
    scopeLabel,
    noteLabel,
    durationMinutes
  } = buildSharedSubmittedLogFields(log, categories, scopes, todos);

  const extras = [
    linkedTodoLabel ? `待办：${linkedTodoLabel}` : '',
    scopeLabel ? `领域：${scopeLabel}` : '',
    noteLabel ? `备注：${noteLabel}` : ''
  ].filter(Boolean);

  return [
    `刚刚完成了 ${activityLabel}，耗时 ${durationMinutes} 分钟。`,
    ...extras
  ].join('\n');
};

export const isNewLogInsertion = (existingLog?: Log | null): boolean => !existingLog;

export const matchesAssistantLogSubmissionTrigger = (
  config: AssistantAgentConfig,
  log: Log
): boolean => (
  config.enabled
  && config.logSubmissionTriggerEnabled
  && config.logSubmissionTriggerActivityIds.includes(log.activityId)
);

export const dispatchAssistantLogSubmittedEvent = (detail: AssistantLogSubmittedEventDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<AssistantLogSubmittedEventDetail>(ASSISTANT_LOG_SUBMITTED_EVENT, {
    detail
  }));
};

export const upsertLogForAssistantContext = (logs: Log[], log: Log): Log[] => {
  const existingIndex = logs.findIndex((item) => item.id === log.id);
  if (existingIndex === -1) {
    return [log, ...logs];
  }

  const nextLogs = [...logs];
  nextLogs[existingIndex] = log;
  return nextLogs;
};

export const buildAssistantLogSubmissionTrigger = ({
  log,
  categories,
  scopes,
  todos,
  now = new Date()
}: BuildAssistantLogSubmissionTriggerParams): AssistantSystemTrigger => ({
  id: `log_submitted:${log.id}:${now.getTime()}`,
  type: 'log_submitted',
  source: 'system',
  createdAt: formatAssistantLocalDateTime(now),
  text: buildAssistantLogSubmissionText(log, categories, scopes, todos),
  metadata: {
    logId: log.id,
    activityId: log.activityId,
    categoryId: log.categoryId,
    durationMinutes: formatDurationMinutes(log),
    ...(log.linkedTodoId ? { linkedTodoId: log.linkedTodoId } : {})
  }
});
