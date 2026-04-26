/**
 * @file assistantTime.ts
 * @input Assistant reminder and trigger datetime strings plus local runtime dates
 * @output Canonical timestamp normalization, local offset formatting, and due-delay helpers for assistant flows
 * @pos Utils (Assistant Time)
 * @description Keeps assistant reminder timing on one consistent timeline by normalizing stored datetimes to canonical ISO strings while still exposing local offset strings that are easier for prompts, debug output, and humans to read.
 *
 * @updated 2026-04-26: Added shared reminder datetime normalization, local offset formatting, and due-delay helpers for the unified foreground/background assistant flow.
 */

const pad2 = (value: number): string => String(value).padStart(2, '0');

export const formatAssistantLocalDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offsetHours = pad2(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetRemainder = pad2(Math.abs(offsetMinutes) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainder}`;
};

export const parseAssistantDateTime = (value?: string | null): number => {
  if (!value || typeof value !== 'string') {
    return Number.NaN;
  }

  const parsed = Date.parse(value.trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const normalizeAssistantDateTime = (value?: string | null): string | null => {
  const parsed = parseAssistantDateTime(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};

export const formatAssistantDateTimeForDisplay = (value?: string | null): string => {
  const parsed = parseAssistantDateTime(value);
  return Number.isFinite(parsed)
    ? formatAssistantLocalDateTime(new Date(parsed))
    : (typeof value === 'string' ? value : '');
};

export const getAssistantDelayMinutes = (
  scheduledAt?: string | null,
  actualAt?: string | null
): number | null => {
  const scheduledMs = parseAssistantDateTime(scheduledAt);
  const actualMs = parseAssistantDateTime(actualAt);
  if (!Number.isFinite(scheduledMs) || !Number.isFinite(actualMs)) {
    return null;
  }

  return Math.max(0, Math.round((actualMs - scheduledMs) / 60000));
};

export const isAssistantDateTimeDue = (dueAt: string, now = new Date()): boolean => {
  const dueAtMs = parseAssistantDateTime(dueAt);
  return Number.isFinite(dueAtMs) && dueAtMs <= now.getTime();
};
