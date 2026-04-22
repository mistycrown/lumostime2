/**
 * @file aiBackfillUtils.ts
 * @input AI backfill tool-call payloads, fallback dates, and date/time strings
 * @output Normalized backfill tool calls plus reusable date/time parsing helpers
 * @pos Utility (AI backfill)
 * @description Keeps AI backfill date handling consistent so the service and chat UI can share the same default-date, cross-day split, and dedupe rules.
 * @updated 2026-04-22: Added per-tool-call date normalization, midnight split handling, and reusable timestamp/date formatting helpers for AI backfill.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import type { AIBackfillToolCall } from '../services/aiService';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export const isValidBackfillDate = (value?: string | null): value is string => (
  typeof value === 'string' && DATE_PATTERN.test(value.trim())
);

export const isValidBackfillTime = (value?: string | null): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const match = TIME_PATTERN.exec(value.trim());
  if (!match) {
    return false;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDaysToDateKey = (dateKey: string, dayOffset: number): string => {
  const baseDate = new Date(`${dateKey}T00:00:00`);
  baseDate.setDate(baseDate.getDate() + dayOffset);
  return formatDateKey(baseDate);
};

export const normalizeBackfillDate = (value: unknown, fallbackDate: string): string => (
  isValidBackfillDate(typeof value === 'string' ? value.trim() : null)
    ? value.trim()
    : fallbackDate
);

export const parseTimeOnDateKey = (dateKey: string, hhmm: string): number | null => {
  const match = TIME_PATTERN.exec(hhmm.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }

  const next = new Date(`${dateKey}T00:00:00`);
  next.setHours(hour, minute, 0, 0);
  return next.getTime();
};

const cloneToolCallWithArgs = (
  toolCall: AIBackfillToolCall,
  args: AIBackfillToolCall['args']
): AIBackfillToolCall => ({
  ...toolCall,
  args: {
    ...args,
    ...(Array.isArray(args.scopeIds) ? { scopeIds: [...args.scopeIds] } : {})
  }
});

export const normalizeAIBackfillToolCalls = (
  rawToolCalls: AIBackfillToolCall[],
  fallbackDate: string
): AIBackfillToolCall[] => {
  const normalizedCalls = rawToolCalls.flatMap((toolCall) => {
    if (toolCall?.toolName !== 'create_log' || !toolCall.args) {
      return [];
    }

    const normalizedDate = normalizeBackfillDate(toolCall.args.date, fallbackDate);
    const normalizedArgs = {
      ...toolCall.args,
      date: normalizedDate
    };

    if (!isValidBackfillTime(normalizedArgs.startTime) || !isValidBackfillTime(normalizedArgs.endTime)) {
      return [cloneToolCallWithArgs(toolCall, normalizedArgs)];
    }

    const startTimestamp = parseTimeOnDateKey(normalizedDate, normalizedArgs.startTime);
    const endTimestamp = parseTimeOnDateKey(normalizedDate, normalizedArgs.endTime);
    if (!startTimestamp || !endTimestamp || endTimestamp > startTimestamp) {
      return [cloneToolCallWithArgs(toolCall, normalizedArgs)];
    }

    const nextDate = addDaysToDateKey(normalizedDate, 1);
    return [
      cloneToolCallWithArgs(toolCall, {
        ...normalizedArgs,
        date: normalizedDate,
        endTime: '23:59'
      }),
      cloneToolCallWithArgs(toolCall, {
        ...normalizedArgs,
        date: nextDate,
        startTime: '00:00'
      })
    ];
  });

  return normalizedCalls.filter((call, index, list) => {
    const dedupeKey = JSON.stringify({
      toolName: call.toolName,
      date: call.args.date,
      startTime: call.args.startTime,
      endTime: call.args.endTime,
      description: call.args.description.trim(),
      categoryId: call.args.categoryId,
      activityId: call.args.activityId,
      scopeIds: [...(call.args.scopeIds || [])].sort(),
      linkedTodoId: call.args.linkedTodoId || '',
      progressIncrement: typeof call.args.progressIncrement === 'number'
        ? call.args.progressIncrement
        : null
    });

    return index === list.findIndex((candidate) => JSON.stringify({
      toolName: candidate.toolName,
      date: candidate.args.date,
      startTime: candidate.args.startTime,
      endTime: candidate.args.endTime,
      description: candidate.args.description.trim(),
      categoryId: candidate.args.categoryId,
      activityId: candidate.args.activityId,
      scopeIds: [...(candidate.args.scopeIds || [])].sort(),
      linkedTodoId: candidate.args.linkedTodoId || '',
      progressIncrement: typeof candidate.args.progressIncrement === 'number'
        ? candidate.args.progressIncrement
        : null
    }) === dedupeKey);
  });
};
