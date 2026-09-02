/**
 * @file AIBackfillChatShared.tsx
 * @input Shared AI chat domain types, draft helpers, assistant scheduling drafts, and lightweight presentation props
 * @output Reusable AI chat model definitions, validation helpers, and small presentational components
 * @pos Component Support (AI Integration)
 * @description Centralizes the stable data model and low-risk helper/UI pieces used by AIBackfillChatModal so the main modal focuses on orchestration instead of carrying every type and validator inline.
 * @updated 2026-09-03: Removed the legacy polling-frequency draft and validation from random check-in interval settings.
 * @updated 2026-07-05: Extended chat debug sections so foreground local-query rounds can persist structured text blocks alongside AI request exchanges.
 * @updated 2026-08-24: Persisted pre-turn reminder and memory snapshots so retry can restore every foreground side effect.
 * @updated 2026-06-07: Added weekly/monthly newspaper result and confirmation types so periodic AI newspaper writeback can travel through chat state and guarded overwrite flows.
 * @updated 2026-05-16: Added daily newspaper result card types so AI chat can open lightweight structured newspaper pages stored on Daily Review.
 * @updated 2026-05-16: Added per-block enable flags for persona-scoped custom prompt blocks so each extra prompt snippet can be toggled independently.
 * @updated 2026-05-16: Added optional temporary log overrides for event-driven background assistant turns that need to see a just-saved record before React state settles.
 * @updated 2026-05-16: Added persona-scoped custom prompt blocks so AI settings can store multiple labeled extra prompt snippets per persona.
 * @updated 2026-05-14: Extracted shared chat types, reminder/scheduled-task validators, and avatar/revealing bubble helpers out of AIBackfillChatModal for a safer first-pass refactor.
 */
import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import type { AIDebugExchange, AIConversationTurn } from '../../services/aiService';
import { imageService } from '../../services/imageService';
import type { Log, TodoRecurrenceRule } from '../../types';
import type {
  AssistantAgentConfig,
  AssistantEditableMemoryListKey,
  AssistantLetterResultCard,
  AssistantLocalQueryResult,
  AssistantMemory,
  AssistantReasoningSummary,
  AssistantReminder,
  AssistantScheduledTask,
  AssistantSystemTrigger,
  DreamUpdateCard
} from '../../types/assistant';
import { normalizeAssistantDateTime } from '../../utils/assistantTime';
import { normalizeAssistantQuietHoursValue } from '../../utils/assistantQuietHours';
import { parseMonthlyDayInput } from '../../utils/todoScheduleUtils';
import type {
  AppliedChatAction
} from '../../services/assistantActionExecutor';
import type {
  MonthlyReviewTemplateSessionMeta
} from '../../services/monthlyReviewTemplateService';
import type {
  WeeklyReviewTemplateSessionMeta
} from '../../services/weeklyReviewTemplateService';

export type ChatTone = 'normal' | 'system' | 'error' | 'pending';

export interface AIChatDebugTextBlock {
  label: string;
  content: string;
}

export interface AIChatDebugSection {
  label: string;
  exchange?: AIDebugExchange;
  blocks?: AIChatDebugTextBlock[];
}

export interface AIChatCustomPromptBlock {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
}

export interface AIChatPersona {
  id: string;
  name: string;
  avatarIcon: string;
  avatarImage?: string;
  assistantSelfName: string;
  userCallName: string;
  systemPrompt: string;
  contextMessageLimit: number;
  isBuiltIn: boolean;
}

export interface AIChatUserProfile {
  avatarIcon: string;
  avatarImage?: string;
}

export interface AIChatMemoryUpdateSection {
  label: string;
  items: string[];
}

export interface AIChatDreamUpdateCard extends DreamUpdateCard {}

export interface AIChatWeeklyReviewWritebackResult {
  weeklyReviewId: string;
  weekStartDate: string;
  weekEndDate: string;
  title: string;
  preview: string;
  createdReview: boolean;
  mergeMode: 'create' | 'overwrite';
}

export interface AIChatDailyReviewWritebackResult {
  dailyReviewId: string;
  date: string;
  title: string;
  preview: string;
  createdReview: boolean;
  mergeMode: 'create' | 'overwrite';
}

export interface AIChatDailyNewspaperWritebackResult {
  dailyReviewId: string;
  date: string;
  title: string;
  preview: string;
  createdReview: boolean;
  mergeMode: 'create' | 'overwrite';
}

export interface AIChatWeeklyNewspaperWritebackResult {
  weeklyReviewId: string;
  weekStartDate: string;
  weekEndDate: string;
  title: string;
  preview: string;
  createdReview: boolean;
  mergeMode: 'create' | 'overwrite';
}

export interface AIChatMonthlyReviewWritebackResult {
  monthlyReviewId: string;
  monthStartDate: string;
  monthEndDate: string;
  title: string;
  preview: string;
  createdReview: boolean;
  mergeMode: 'create' | 'overwrite';
}

export interface AIChatMonthlyNewspaperWritebackResult {
  monthlyReviewId: string;
  monthStartDate: string;
  monthEndDate: string;
  title: string;
  preview: string;
  createdReview: boolean;
  mergeMode: 'create' | 'overwrite';
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: AssistantReasoningSummary;
  localQueryResults?: AssistantLocalQueryResult[];
  displayParts?: string[];
  createdAt: number;
  tone?: ChatTone;
  backgroundDebugHistoryId?: string;
  debugSections?: AIChatDebugSection[];
  appliedActions?: AppliedChatAction[];
  assistantLetterResult?: AssistantLetterResultCard;
  memoryUpdates?: AIChatMemoryUpdateSection[];
  memoryBefore?: AssistantMemory;
  dreamUpdates?: AIChatDreamUpdateCard[];
  reminderUpdates?: string[];
  remindersBefore?: AssistantReminder[];
  dailyReviewWriteback?: AIChatDailyReviewWritebackResult;
  dailyNewspaperWriteback?: AIChatDailyNewspaperWritebackResult;
  weeklyNewspaperWriteback?: AIChatWeeklyNewspaperWritebackResult;
  weeklyReviewWriteback?: AIChatWeeklyReviewWritebackResult;
  monthlyNewspaperWriteback?: AIChatMonthlyNewspaperWritebackResult;
  monthlyReviewWriteback?: AIChatMonthlyReviewWritebackResult;
  retryInput?: string;
  retrySourceUserMessageId?: string;
  dreamRetryYearMonth?: string;
}

export interface AssistantEditableMemoryDeleteTarget {
  key: AssistantEditableMemoryListKey;
  value: string;
}

export interface AssistantReminderDrafts {
  text: string;
  date: string;
  hour: string;
}

export interface AssistantReminderDeleteTarget {
  id: string;
}

export interface AssistantScheduledTaskDrafts {
  text: string;
  time: string;
  frequency: TodoRecurrenceRule['frequency'];
  interval: string;
  weekdays: number[];
  monthDaysInput: string;
  fallbackToMonthEnd: boolean;
}

export interface AssistantScheduledTaskDeleteTarget {
  id: string;
}

export interface DreamTopicDrafts {
  title: string;
  note: string;
}

export interface DreamEntryDrafts {
  content: string;
}

export interface DreamMonthSelectionState {
  sessionId: string;
}

export interface DailyReviewWritebackConfirmationState {
  sessionId: string;
  date: string;
}

export interface DailyNewspaperWritebackConfirmationState {
  sessionId: string;
  date: string;
}

export interface WeeklyNewspaperWritebackConfirmationState {
  sessionId: string;
  weekStartDate: string;
  weekEndDate: string;
}

export interface MonthlyNewspaperWritebackConfirmationState {
  sessionId: string;
  monthStartDate: string;
  monthEndDate: string;
}

export interface DreamMonthRangeSelection {
  yearMonth: string;
  year: number;
  month: number;
  label: string;
  startDate: string;
  endDate: string;
}

export interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  personaId: string;
  contextCacheEnabled: boolean;
  messages: AIChatMessage[];
  templateMeta?: WeeklyReviewTemplateSessionMeta | MonthlyReviewTemplateSessionMeta;
}

export interface AssistantBackgroundTurnRequestOptions {
  trigger: AssistantSystemTrigger;
  now: Date;
  targetSession?: AIChatSession;
  conversationHistory?: AIConversationTurn[];
  showSystemNotification: boolean;
  logsOverride?: Log[];
}

export type AISettingsMainTab = 'persona' | 'call';

export type AssistantAgentIntervalField = 'minCheckinMinutes' | 'maxCheckinMinutes';

export type AssistantAgentIntervalDrafts = Record<AssistantAgentIntervalField, string>;

export type AssistantAgentIntervalErrors = Record<AssistantAgentIntervalField, string | null>;

export type AssistantAgentQuietHoursField = 'quietHoursStart' | 'quietHoursEnd';

export type AssistantAgentQuietHoursDrafts = Record<AssistantAgentQuietHoursField, string>;

export type AssistantAgentQuietHoursErrors = Record<AssistantAgentQuietHoursField, string | null>;

export type AssistantLetterField = 'letterFrequencyDays' | 'letterWindowStart' | 'letterWindowEnd';

export interface AssistantLetterDrafts {
  letterFrequencyDays: string;
  letterWindowStart: string;
  letterWindowEnd: string;
}

export interface AssistantLetterDraftErrors {
  letterFrequencyDays: string | null;
  letterWindowStart: string | null;
  letterWindowEnd: string | null;
}

export interface DebugViewerState {
  title: string;
  sections: AIChatDebugSection[];
}

export interface InitialChatState {
  personas: AIChatPersona[];
  sessions: AIChatSession[];
  activeSessionId: string;
  debugMode: boolean;
  userProfile: AIChatUserProfile;
  customPromptBlocks: AIChatCustomPromptBlock[];
}

export interface AssistantBackgroundTimelineEntry {
  id: string;
  triggerId?: string;
  triggerType?: string;
  persistedMessageId?: string;
  wakeAt?: string;
  requestStartedAt?: string;
  requestCompletedAt?: string;
  requestStatus: 'not_started' | 'pending' | 'completed' | 'failed';
  outcomeSummary: string;
  message?: string;
  errorMessage?: string;
  debugExchange?: AIDebugExchange;
}

export const MOBILE_KEYBOARD_INSET_THRESHOLD = 120;

export const DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS: Record<AssistantEditableMemoryListKey, string> = {
  profileMemory: '',
  preferenceMemory: ''
};

export const DEFAULT_ASSISTANT_REMINDER_DRAFTS: AssistantReminderDrafts = {
  text: '',
  date: '',
  hour: ''
};

export const DEFAULT_DREAM_TOPIC_DRAFTS: DreamTopicDrafts = {
  title: '',
  note: ''
};

export const DEFAULT_DREAM_ENTRY_DRAFTS: DreamEntryDrafts = {
  content: ''
};

export const DREAM_MONTH_SELECTION_PROMPT = '要对哪个年月进行 dream？请回复 6 位阿拉伯数字，例如 202601。';
export const DREAM_MONTH_SELECTION_INVALID_PROMPT = '这个年月我没读懂。请回复 6 位阿拉伯数字，例如 202601。';

export const ASSISTANT_SCHEDULED_TASK_WEEKDAY_OPTIONS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' }
] as const;

export const DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS: AssistantScheduledTaskDrafts = {
  text: '',
  time: '0800',
  frequency: 'daily',
  interval: '1',
  weekdays: [1],
  monthDaysInput: '1',
  fallbackToMonthEnd: false
};

export const LOG_EDIT_REQUEST_PATTERN = /(改成|改为|改回|改下|改一下|修改|我没|不是)/;
export const LOG_EDIT_SUCCESS_REPLY_PATTERN = /(改过来了|改好了|改成了|已经改好|已经改成|已改好|已改成|收到，?改过来了|帮你改好了)/;

export const ASSISTANT_EDITABLE_MEMORY_SECTION_META: Record<
  AssistantEditableMemoryListKey,
  {
    label: string;
    emptyLabel: string;
    helperText: string;
    placeholder: string;
    addSuccessMessage: string;
    removeSuccessMessage: string;
  }
> = {
  profileMemory: {
    label: '用户画像记忆',
    emptyLabel: '暂无用户画像记忆。',
    helperText: '记录相对稳定的用户背景与现实处境。',
    placeholder: '比如：用户最近在准备论文答辩，且每周三下午固定开组会。',
    addSuccessMessage: '已加入用户画像记忆',
    removeSuccessMessage: '已删除这条用户画像记忆'
  },
  preferenceMemory: {
    label: '偏好记忆',
    emptyLabel: '暂无偏好记忆。',
    helperText: '记录提醒风格、推进节奏、表达方式等长期偏好。',
    placeholder: '比如：用户更喜欢短句提醒，不喜欢一次给太多步骤。',
    addSuccessMessage: '已加入偏好记忆',
    removeSuccessMessage: '已删除这条偏好记忆'
  }
};

const ASSISTANT_AGENT_INTERVAL_FIELD_META: Record<
  AssistantAgentIntervalField,
  { label: string; minimum: number; maximum: number }
> = {
  minCheckinMinutes: {
    label: '最低间隔',
    minimum: 1,
    maximum: 24 * 60
  },
  maxCheckinMinutes: {
    label: '最高间隔',
    minimum: 1,
    maximum: 24 * 60
  }
};

const ASSISTANT_LETTER_FREQUENCY_META = {
  label: '来信频率',
  minimum: 1,
  maximum: 30
} as const;

const ASSISTANT_MULTI_BUBBLE_REVEAL_DURATION_MS = 320;
const ASSISTANT_MULTI_BUBBLE_REVEAL_INITIAL_SCALE = 0.975;
const ASSISTANT_MULTI_BUBBLE_REVEAL_BASE_OFFSET_PX = 10;
const ASSISTANT_MULTI_BUBBLE_REVEAL_MAX_OFFSET_PX = 18;

const clampNumber = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

export const buildAssistantAgentIntervalDrafts = (config: AssistantAgentConfig): AssistantAgentIntervalDrafts => ({
  minCheckinMinutes: String(config.minCheckinMinutes),
  maxCheckinMinutes: String(config.maxCheckinMinutes)
});

export const buildAssistantAgentQuietHoursDrafts = (config: AssistantAgentConfig): AssistantAgentQuietHoursDrafts => ({
  quietHoursStart: normalizeAssistantQuietHoursValue(config.quietHoursStart) || '',
  quietHoursEnd: normalizeAssistantQuietHoursValue(config.quietHoursEnd) || ''
});

export const buildAssistantLetterDrafts = (config: AssistantAgentConfig): AssistantLetterDrafts => ({
  letterFrequencyDays: String(config.letterFrequencyDays || 2),
  letterWindowStart: normalizeAssistantQuietHoursValue(config.letterWindowStart) || '',
  letterWindowEnd: normalizeAssistantQuietHoursValue(config.letterWindowEnd) || ''
});

export const validateAssistantAgentIntervalDrafts = (
  drafts: AssistantAgentIntervalDrafts
): AssistantAgentIntervalErrors => {
  const errors: AssistantAgentIntervalErrors = {
    minCheckinMinutes: null,
    maxCheckinMinutes: null
  };
  const parsedValues: Partial<Record<AssistantAgentIntervalField, number>> = {};

  (Object.keys(ASSISTANT_AGENT_INTERVAL_FIELD_META) as AssistantAgentIntervalField[]).forEach((field) => {
    const { label, minimum, maximum } = ASSISTANT_AGENT_INTERVAL_FIELD_META[field];
    const rawValue = drafts[field].trim();

    if (!rawValue) {
      errors[field] = `${label}不能为空`;
      return;
    }

    if (!/^\d+$/.test(rawValue)) {
      errors[field] = `${label}只能输入正整数`;
      return;
    }

    const parsedValue = Number(rawValue);
    if (parsedValue < minimum || parsedValue > maximum) {
      errors[field] = `${label}需在 ${minimum} 到 ${maximum} 分钟之间`;
      return;
    }

    parsedValues[field] = parsedValue;
  });

  if (
    errors.minCheckinMinutes === null
    && errors.maxCheckinMinutes === null
    && parsedValues.minCheckinMinutes !== undefined
    && parsedValues.maxCheckinMinutes !== undefined
    && parsedValues.minCheckinMinutes > parsedValues.maxCheckinMinutes
  ) {
    errors.minCheckinMinutes = '最低间隔不能大于最高间隔';
    errors.maxCheckinMinutes = '最高间隔不能小于最低间隔';
  }

  return errors;
};

export const validateAssistantAgentQuietHoursDrafts = (
  drafts: AssistantAgentQuietHoursDrafts,
  requireBoth = false
): AssistantAgentQuietHoursErrors => {
  const errors: AssistantAgentQuietHoursErrors = {
    quietHoursStart: null,
    quietHoursEnd: null
  };

  ([
    ['quietHoursStart', '开始保护时间'],
    ['quietHoursEnd', '结束保护时间']
  ] as const).forEach(([field, label]) => {
    const rawValue = drafts[field].trim();

    if (!rawValue) {
      if (requireBoth) {
        errors[field] = `${label}不能为空`;
      }
      return;
    }

    if (!normalizeAssistantQuietHoursValue(rawValue)) {
      errors[field] = `${label}需为四位数字时间`;
    }
  });

  if (
    errors.quietHoursStart === null
    && errors.quietHoursEnd === null
    && requireBoth
    && drafts.quietHoursStart.trim()
    && drafts.quietHoursEnd.trim()
    && drafts.quietHoursStart.trim() === drafts.quietHoursEnd.trim()
  ) {
    errors.quietHoursStart = '开始和结束保护时间不能相同';
    errors.quietHoursEnd = '开始和结束保护时间不能相同';
  }

  return errors;
};

export const validateAssistantLetterDrafts = (
  drafts: AssistantLetterDrafts,
  requireWindow = false
): AssistantLetterDraftErrors => {
  const errors: AssistantLetterDraftErrors = {
    letterFrequencyDays: null,
    letterWindowStart: null,
    letterWindowEnd: null
  };

  const rawFrequency = drafts.letterFrequencyDays.trim();
  if (!rawFrequency) {
    errors.letterFrequencyDays = `${ASSISTANT_LETTER_FREQUENCY_META.label}不能为空`;
  } else if (!/^\d+$/.test(rawFrequency)) {
    errors.letterFrequencyDays = `${ASSISTANT_LETTER_FREQUENCY_META.label}只能输入正整数`;
  } else {
    const parsedValue = Number(rawFrequency);
    if (
      parsedValue < ASSISTANT_LETTER_FREQUENCY_META.minimum
      || parsedValue > ASSISTANT_LETTER_FREQUENCY_META.maximum
    ) {
      errors.letterFrequencyDays = `${ASSISTANT_LETTER_FREQUENCY_META.label}需在 ${ASSISTANT_LETTER_FREQUENCY_META.minimum} 到 ${ASSISTANT_LETTER_FREQUENCY_META.maximum} 天之间`;
    }
  }

  ([
    ['letterWindowStart', '开始时间'],
    ['letterWindowEnd', '结束时间']
  ] as const).forEach(([field, label]) => {
    const rawValue = drafts[field].trim();
    if (!rawValue) {
      if (requireWindow) {
        errors[field] = `${label}不能为空`;
      }
      return;
    }

    if (!normalizeAssistantQuietHoursValue(rawValue)) {
      errors[field] = `${label}需为四位数字时间`;
    }
  });

  if (
    errors.letterWindowStart === null
    && errors.letterWindowEnd === null
    && requireWindow
    && drafts.letterWindowStart.trim()
    && drafts.letterWindowEnd.trim()
    && normalizeAssistantQuietHoursValue(drafts.letterWindowStart) === normalizeAssistantQuietHoursValue(drafts.letterWindowEnd)
  ) {
    errors.letterWindowStart = '开始和结束时间不能相同';
    errors.letterWindowEnd = '开始和结束时间不能相同';
  }

  return errors;
};

export const buildManualAssistantReminderDueAt = (
  dateDraft: string,
  hourDraft: string
): { dueAt?: string; error?: string } => {
  const normalizedDate = dateDraft.trim();
  const normalizedHour = hourDraft.trim();

  if (!/^\d{8}$/.test(normalizedDate)) {
    return { error: '日期需要填写 8 位数字，例如 20260427。' };
  }

  if (!/^\d{4}$/.test(normalizedHour)) {
    return { error: '时间需要填写 4 位数字，例如 0930。' };
  }

  const year = Number(normalizedDate.slice(0, 4));
  const month = Number(normalizedDate.slice(4, 6));
  const day = Number(normalizedDate.slice(6, 8));
  const hour = Number(normalizedHour.slice(0, 2));
  const minute = Number(normalizedHour.slice(2, 4));

  if (year < 2000 || year > 2999) {
    return { error: '日期中的年份需在 2000 到 2999 之间。' };
  }

  if (month < 1 || month > 12) {
    return { error: '日期中的月份需在 01 到 12 之间。' };
  }

  if (day < 1 || day > 31) {
    return { error: '日期中的日需在 01 到 31 之间。' };
  }

  if (hour < 0 || hour > 23) {
    return { error: '时间需在 00 到 23 之间。' };
  }

  if (minute < 0 || minute > 59) {
    return { error: '分钟需在 00 到 59 之间。' };
  }

  const candidate = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    candidate.getFullYear() !== year
    || candidate.getMonth() !== month - 1
    || candidate.getDate() !== day
    || candidate.getHours() !== hour
    || candidate.getMinutes() !== minute
  ) {
    return { error: '这个日期时间无效，请检查后再保存。' };
  }

  const dueAt = normalizeAssistantDateTime(candidate.toISOString());
  if (!dueAt) {
    return { error: '提醒时间解析失败，请重试。' };
  }

  return { dueAt };
};

export const buildAssistantScheduledTaskRecurrenceRule = (
  drafts: AssistantScheduledTaskDrafts,
  startDate: string
): { recurrenceRule?: TodoRecurrenceRule; error?: string } => {
  const normalizedInterval = Number(drafts.interval.trim() || '1');
  if (!Number.isInteger(normalizedInterval) || normalizedInterval < 1 || normalizedInterval > 365) {
    return { error: '循环间隔需要填写 1 到 365 之间的整数。' };
  }

  if (drafts.frequency === 'weekly' && drafts.weekdays.length === 0) {
    return { error: '每周循环至少要选择一天。' };
  }

  if (drafts.frequency === 'monthly') {
    const monthDays = parseMonthlyDayInput(drafts.monthDaysInput);
    if (monthDays.length === 0) {
      return { error: '每月日期需要填写 1 到 31，可用空格分隔多个数字。' };
    }

    return {
      recurrenceRule: {
        frequency: 'monthly',
        startDate,
        ...(normalizedInterval > 1 ? { interval: normalizedInterval } : {}),
        monthDays,
        ...(monthDays.includes(31) && drafts.fallbackToMonthEnd ? { fallbackToMonthEnd: true } : {})
      }
    };
  }

  if (drafts.frequency === 'weekly') {
    return {
      recurrenceRule: {
        frequency: 'weekly',
        startDate,
        ...(normalizedInterval > 1 ? { interval: normalizedInterval } : {}),
        weekdays: [...drafts.weekdays].sort((left, right) => left - right)
      }
    };
  }

  return {
    recurrenceRule: {
      frequency: 'daily',
      startDate,
      ...(normalizedInterval > 1 ? { interval: normalizedInterval } : {})
    }
  };
};

export const buildAssistantScheduledTaskTime = (value: string): { time?: string; error?: string } => {
  const normalized = value.trim();
  if (!/^\d{4}$/.test(normalized)) {
    return { error: '触发时间需要填写 4 位数字，例如 0800。' };
  }

  const hours = Number(normalized.slice(0, 2));
  const minutes = Number(normalized.slice(2, 4));
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    return { error: '小时需要在 00 到 23 之间。' };
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    return { error: '分钟需要在 00 到 59 之间。' };
  }

  return {
    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  };
};

export const formatAssistantScheduledTaskRecurrence = (task: AssistantScheduledTask): string => {
  const interval = Math.max(1, task.recurrenceRule.interval || 1);

  if (task.recurrenceRule.frequency === 'weekly') {
    const weekdayLabels = (task.recurrenceRule.weekdays?.length
      ? task.recurrenceRule.weekdays
      : [new Date(task.recurrenceRule.startDate).getDay()]
    )
      .map((weekday) => ASSISTANT_SCHEDULED_TASK_WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label || '')
      .filter(Boolean)
      .join('、');
    return interval > 1
      ? `每${interval}周 ${weekdayLabels || '指定日期'} ${task.time}`
      : `每周${weekdayLabels || '指定日期'} ${task.time}`;
  }

  if (task.recurrenceRule.frequency === 'monthly') {
    const monthDays = task.recurrenceRule.monthDays?.length
      ? task.recurrenceRule.monthDays
      : [Number(task.recurrenceRule.startDate.split('-')[2] || '1')];
    const fallbackSuffix = monthDays.includes(31) && task.recurrenceRule.fallbackToMonthEnd
      ? '，无则月末'
      : '';
    const monthDayLabel = monthDays.map((monthDay) => `${monthDay}号`).join('/');
    return interval > 1
      ? `每${interval}个月 ${monthDayLabel}${fallbackSuffix} ${task.time}`
      : `每月${monthDayLabel}${fallbackSuffix} ${task.time}`;
  }

  return interval > 1
    ? `每${interval}天 ${task.time}`
    : `每天 ${task.time}`;
};

export const PersonaAvatar: React.FC<{
  persona: AIChatPersona;
  className?: string;
  iconClassName?: string;
}> = ({
  persona,
  className = '',
  iconClassName = ''
}) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!persona.avatarImage) {
      setSrc('');
      return () => {
        cancelled = true;
      };
    }

    imageService.getImageUrl(persona.avatarImage).then((url) => {
      if (!cancelled) {
        setSrc(url);
      }
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Failed to load persona avatar', error);
      if (!cancelled) {
        setSrc('');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [persona.avatarImage]);

  if (src) {
    return <img src={src} alt={persona.name} className={`h-full w-full object-cover ${className}`.trim()} />;
  }

  return (
    <span
      className={`inline-flex h-full w-full items-center justify-center text-center leading-none ${iconClassName}`.trim()}
      style={{ lineHeight: 1 }}
    >
      {persona.avatarIcon || '✨'}
    </span>
  );
};

export const UserAvatar: React.FC<{
  profile: AIChatUserProfile;
  className?: string;
  iconClassName?: string;
}> = ({
  profile,
  className = '',
  iconClassName = ''
}) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!profile.avatarImage) {
      setSrc('');
      return () => {
        cancelled = true;
      };
    }

    imageService.getImageUrl(profile.avatarImage).then((url) => {
      if (!cancelled) {
        setSrc(url);
      }
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Failed to load user avatar', error);
      if (!cancelled) {
        setSrc('');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [profile.avatarImage]);

  if (src) {
    return <img src={src} alt="user avatar" className={`h-full w-full object-cover ${className}`.trim()} />;
  }

  if (profile.avatarIcon.trim()) {
    return (
      <span
        className={`inline-flex h-full w-full items-center justify-center text-center leading-none ${iconClassName}`.trim()}
        style={{ lineHeight: 1 }}
      >
        {profile.avatarIcon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-full w-full items-center justify-center text-center leading-none ${iconClassName}`.trim()}
      style={{ lineHeight: 1 }}
    >
      <User size={15} />
    </span>
  );
};

export const RevealingMessageBubble: React.FC<{
  children: React.ReactNode;
  className: string;
  style: React.CSSProperties;
  revealMode?: 'default' | 'assistantStaggered';
  partIndex?: number;
  partCount?: number;
}> = ({
  children,
  className,
  style,
  revealMode = 'default',
  partIndex = 0,
  partCount = 1
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const isAssistantStaggered = revealMode === 'assistantStaggered';
  const totalParts = Math.max(partCount, 1);
  const depthRatio = totalParts > 1 ? partIndex / (totalParts - 1) : 0;
  const hiddenOffsetPx = isAssistantStaggered
    ? clampNumber(
      ASSISTANT_MULTI_BUBBLE_REVEAL_BASE_OFFSET_PX + (depthRatio * 8),
      ASSISTANT_MULTI_BUBBLE_REVEAL_BASE_OFFSET_PX,
      ASSISTANT_MULTI_BUBBLE_REVEAL_MAX_OFFSET_PX
    )
    : 4;
  const baseBoxShadow = typeof style.boxShadow === 'string' ? style.boxShadow : '';
  const landingShadow = isAssistantStaggered
    ? '0 18px 34px -28px rgba(15,23,42,0.28)'
    : '0 10px 22px -24px rgba(15,23,42,0.16)';
  const hiddenShadow = isAssistantStaggered
    ? '0 26px 42px -34px rgba(15,23,42,0.18)'
    : '0 12px 24px -24px rgba(15,23,42,0.10)';
  const composedStyle: React.CSSProperties = {
    ...style,
    transform: isVisible
      ? 'translate3d(0, 0, 0) scale(1)'
      : `translate3d(0, ${hiddenOffsetPx}px, 0) scale(${isAssistantStaggered ? ASSISTANT_MULTI_BUBBLE_REVEAL_INITIAL_SCALE : 0.99})`,
    opacity: isVisible ? 1 : 0,
    filter: isVisible
      ? 'blur(0px) brightness(1)'
      : `blur(${isAssistantStaggered ? 1 : 0.6}px) brightness(${isAssistantStaggered ? 1.045 : 1.02})`,
    boxShadow: baseBoxShadow ? `${baseBoxShadow}, ${isVisible ? landingShadow : hiddenShadow}` : (isVisible ? landingShadow : hiddenShadow),
    transitionDuration: `${ASSISTANT_MULTI_BUBBLE_REVEAL_DURATION_MS}ms`
  };

  return (
    <div
      className={`${className} relative overflow-hidden transform-gpu transition-[opacity,transform,filter,box-shadow] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity,filter]`}
      style={composedStyle}
    >
      {isAssistantStaggered && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/12 to-transparent transition-opacity duration-500"
          style={{ opacity: isVisible ? 0 : 0.75 }}
        />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
