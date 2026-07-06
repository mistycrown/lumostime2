/**
 * @file assistantLetterScheduler.ts
 * @input Assistant-letter scheduling config snapshots and reference timestamps
 * @output Normalized next-letter scheduling decisions, due checks, and config patches
 * @pos Service (Assistant Letter Scheduling)
 * @description Centralizes the pure scheduling rules for assistant letters so enabling, successful sends, catch-up retries, and time-window validation all follow one shared deterministic policy.
 *
 * @updated 2026-07-04: Added the first assistant-letter scheduler with frequency, time-window, catch-up, and next-send generation helpers.
 */

import type { AssistantAgentConfig } from '../types/assistant';
import { formatAssistantLocalDateTime, normalizeAssistantDateTime, parseAssistantDateTime } from '../utils/assistantTime';
import { normalizeAssistantQuietHoursValue } from '../utils/assistantQuietHours';

interface AssistantLetterWindowRange {
  startMinutes: number;
  endMinutes: number;
}

export interface AssistantLetterWindowValidationResult {
  letterWindowStart: string | null;
  letterWindowEnd: string | null;
}

export interface AssistantLetterSchedulePatch {
  nextLetterAt?: string;
  lastLetterScheduledAt?: string;
}

const MINUTES_PER_DAY = 24 * 60;

const parseWindowMinutes = (value?: string | null): number | null => {
  const normalized = normalizeAssistantQuietHoursValue(value);
  if (!normalized) {
    return null;
  }

  const hours = Number(normalized.slice(0, 2));
  const minutes = Number(normalized.slice(2, 4));
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return (hours * 60) + minutes;
};

const resolveWindowRange = (config: Pick<AssistantAgentConfig, 'letterWindowStart' | 'letterWindowEnd'>): AssistantLetterWindowRange | null => {
  const startMinutes = parseWindowMinutes(config.letterWindowStart);
  const endMinutes = parseWindowMinutes(config.letterWindowEnd);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return null;
  }

  return { startMinutes, endMinutes };
};

const buildWindowCandidate = (baseDate: Date, minutesFromMidnight: number): Date => {
  const candidate = new Date(baseDate);
  candidate.setHours(0, 0, 0, 0);
  candidate.setMinutes(minutesFromMidnight, 0, 0);
  return candidate;
};

const selectWindowMinute = (
  windowRange: AssistantLetterWindowRange,
  referenceMs: number
): number => {
  const span = windowRange.endMinutes > windowRange.startMinutes
    ? windowRange.endMinutes - windowRange.startMinutes
    : (MINUTES_PER_DAY - windowRange.startMinutes) + windowRange.endMinutes;
  const safeSpan = Math.max(1, span);
  const bucket = Math.abs(referenceMs) % safeSpan;
  return (windowRange.startMinutes + bucket) % MINUTES_PER_DAY;
};

const buildNextLetterDate = (
  anchorDate: Date,
  frequencyDays: number,
  selectedMinute: number
): Date => {
  const next = new Date(anchorDate);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + frequencyDays);
  next.setMinutes(selectedMinute, 0, 0);
  return next;
};

const normalizeFrequencyDays = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 2;
  }

  return Math.max(1, Math.min(30, Math.round(parsed)));
};

export const assistantLetterScheduler = {
  validateWindow(config: Pick<AssistantAgentConfig, 'letterWindowStart' | 'letterWindowEnd'>): AssistantLetterWindowValidationResult {
    const normalizedStart = normalizeAssistantQuietHoursValue(config.letterWindowStart) || '';
    const normalizedEnd = normalizeAssistantQuietHoursValue(config.letterWindowEnd) || '';

    const result: AssistantLetterWindowValidationResult = {
      letterWindowStart: null,
      letterWindowEnd: null
    };

    if (!normalizedStart) {
      result.letterWindowStart = '开始时间不能为空';
    }
    if (!normalizedEnd) {
      result.letterWindowEnd = '结束时间不能为空';
    }
    if (normalizedStart && normalizedEnd && normalizedStart === normalizedEnd) {
      result.letterWindowStart = '开始和结束时间不能相同';
      result.letterWindowEnd = '开始和结束时间不能相同';
    }

    return result;
  },

  clearSchedule(): Pick<AssistantAgentConfig, 'nextLetterAt'> {
    return {
      nextLetterAt: undefined
    };
  },

  buildNextSchedulePatch(
    config: Pick<AssistantAgentConfig, 'letterFrequencyDays' | 'letterWindowStart' | 'letterWindowEnd' | 'lastLetterSentAt'>,
    options?: {
      now?: Date;
      anchorAt?: string;
    }
  ): AssistantLetterSchedulePatch | null {
    const now = options?.now || new Date();
    const windowRange = resolveWindowRange(config);
    if (!windowRange) {
      return null;
    }

    const anchorSource = normalizeAssistantDateTime(options?.anchorAt || config.lastLetterSentAt)
      || now.toISOString();
    const anchorMs = parseAssistantDateTime(anchorSource);
    if (!Number.isFinite(anchorMs)) {
      return null;
    }

    const anchorDate = new Date(anchorMs);
    const selectedMinute = selectWindowMinute(windowRange, anchorMs);
    const nextDate = buildNextLetterDate(anchorDate, normalizeFrequencyDays(config.letterFrequencyDays), selectedMinute);
    const nextLetterAt = normalizeAssistantDateTime(nextDate.toISOString());
    if (!nextLetterAt) {
      return null;
    }

    return {
      nextLetterAt,
      lastLetterScheduledAt: nextLetterAt
    };
  },

  isLetterDue(config: Pick<AssistantAgentConfig, 'letterEnabled' | 'nextLetterAt'>, now = new Date()): boolean {
    if (!config.letterEnabled || !config.nextLetterAt) {
      return false;
    }

    const nextLetterMs = parseAssistantDateTime(config.nextLetterAt);
    return Number.isFinite(nextLetterMs) && nextLetterMs <= now.getTime();
  },

  buildSuccessPatch(
    config: Pick<AssistantAgentConfig, 'letterFrequencyDays' | 'letterWindowStart' | 'letterWindowEnd'>,
    options?: {
      now?: Date;
      sentAt?: string;
    }
  ): (Pick<AssistantAgentConfig, 'lastLetterSentAt'> & AssistantLetterSchedulePatch) | null {
    const now = options?.now || new Date();
    const normalizedSentAt = normalizeAssistantDateTime(options?.sentAt || now.toISOString());
    if (!normalizedSentAt) {
      return null;
    }

    const nextPatch = this.buildNextSchedulePatch({
      ...config,
      lastLetterSentAt: normalizedSentAt
    }, {
      now,
      anchorAt: normalizedSentAt
    });
    if (!nextPatch) {
      return null;
    }

    return {
      lastLetterSentAt: normalizedSentAt,
      ...nextPatch
    };
  },

  formatNextLetterPreview(nextLetterAt?: string | null): string {
    const normalized = normalizeAssistantDateTime(nextLetterAt);
    return normalized ? formatAssistantLocalDateTime(new Date(normalized)) : '';
  }
};
