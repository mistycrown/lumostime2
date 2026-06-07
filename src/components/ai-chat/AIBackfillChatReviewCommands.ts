/**
 * @file AIBackfillChatReviewCommands.ts
 * @input Review-command sessions, review datasets, and modal orchestration callbacks
 * @output Shared command handlers for weekly/monthly writeback entrypoints and daily overwrite confirmation
 * @pos Component Support (AI Integration)
 * @description Extracts the review command coordination layer out of AIBackfillChatModal so the modal keeps the main send-path dispatch while review preparation and overwrite confirmation live in focused helpers.
 * @updated 2026-06-07: Fixed weekly/monthly newspaper command payload assembly so date formatting is injected explicitly instead of relying on an undefined runtime helper.
 * @updated 2026-06-07: Added ordinary-chat `周小报` / `月小报` commands plus guarded overwrite confirmation for periodic AI newspapers.
 * @updated 2026-05-16: Added explicit date parsing for the `小报` command so daily-review jumps and manual chat commands can target past dates.
 * @updated 2026-05-15: Extracted weekly/monthly review writeback commands plus daily narrative command/confirmation handling from AIBackfillChatModal.
 */
import { dailyReviewTemplateService } from '../../services/dailyReviewTemplateService';
import { dailyNewspaperService } from '../../services/dailyNewspaperService';
import { monthlyNewspaperService } from '../../services/monthlyNewspaperService';
import { monthlyReviewTemplateService, type MonthlyReviewTemplateSessionMeta } from '../../services/monthlyReviewTemplateService';
import { weeklyNewspaperService } from '../../services/weeklyNewspaperService';
import { weeklyReviewTemplateService, type WeeklyReviewTemplateSessionMeta } from '../../services/weeklyReviewTemplateService';
import type { Category, DailyReview, Log, MonthlyReview, Scope, TodoCategory, TodoItem, WeeklyReview } from '../../types';
import { getWeekRange } from '../../utils/dateUtils';
import type {
  DailyNewspaperWritebackConfirmationState,
  AIChatSession,
  DailyReviewWritebackConfirmationState,
  MonthlyNewspaperWritebackConfirmationState,
  WeeklyNewspaperWritebackConfirmationState
} from './AIBackfillChatShared';

type AddToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;

interface WeeklyWritebackCommandOptions {
  addToast: AddToast;
  buildWeekDataText: (session: AIChatSession) => string | null;
  resolveTemplateMeta: (session: AIChatSession) => WeeklyReviewTemplateSessionMeta | null;
  reviewTemplates: any[];
  runWriteback: (
    session: AIChatSession,
    params: {
      createdReview: boolean;
      mergeMode: 'create' | 'overwrite';
      weekDataText: string;
      weeklyReview: WeeklyReview;
    }
  ) => Promise<void>;
  session: AIChatSession;
  weeklyReviews: WeeklyReview[];
}

interface MonthlyWritebackCommandOptions {
  addToast: AddToast;
  buildMonthDataText: (session: AIChatSession) => string | null;
  resolveTemplateMeta: (session: AIChatSession) => MonthlyReviewTemplateSessionMeta | null;
  reviewTemplates: any[];
  runWriteback: (
    session: AIChatSession,
    params: {
      createdReview: boolean;
      mergeMode: 'create' | 'overwrite';
      monthDataText: string;
      monthlyReview: MonthlyReview;
    }
  ) => Promise<void>;
  session: AIChatSession;
  monthlyReviews: MonthlyReview[];
}

interface DailyNarrativeCommandBase {
  appendSystemMessage: (sessionId: string, content: string) => void;
  categories: Category[];
  checkTemplates: any[];
  dailyReviews: DailyReview[];
  getLocalDateStr: (date: Date) => string;
  logs: Log[];
  prepareForInteraction: () => void;
  reviewTemplates: any[];
  runWriteback: (
    session: AIChatSession,
    params: {
      createdReview: boolean;
      dailyReview: DailyReview;
      dayDataText: string;
      mergeMode: 'create' | 'overwrite';
    }
  ) => Promise<void>;
  scopes: Scope[];
  setConfirmation: (value: DailyReviewWritebackConfirmationState | null) => void;
  todoCategories: TodoCategory[];
  todos: TodoItem[];
}

interface DailyNewspaperCommandBase {
  appendSystemMessage: (sessionId: string, content: string) => void;
  categories: Category[];
  checkTemplates: any[];
  dailyReviews: DailyReview[];
  getLocalDateStr: (date: Date) => string;
  logs: Log[];
  prepareForInteraction: () => void;
  reviewTemplates: any[];
  runWriteback: (
    session: AIChatSession,
    params: {
      createdReview: boolean;
      dailyReview: DailyReview;
      dayDataText: string;
      mergeMode: 'create' | 'overwrite';
    }
  ) => Promise<void>;
  scopes: Scope[];
  setConfirmation: (value: DailyNewspaperWritebackConfirmationState | null) => void;
  todoCategories: TodoCategory[];
  todos: TodoItem[];
}

interface WeeklyNewspaperCommandBase {
  appendSystemMessage: (sessionId: string, content: string) => void;
  categories: Category[];
  dailyReviews: DailyReview[];
  getLocalDateStr: (date: Date) => string;
  logs: Log[];
  monthlyReviews: MonthlyReview[];
  prepareForInteraction: () => void;
  reviewTemplates: any[];
  runWriteback: (
    session: AIChatSession,
    params: {
      createdReview: boolean;
      mergeMode: 'create' | 'overwrite';
      weekDataText: string;
      weeklyReview: WeeklyReview;
    }
  ) => Promise<void>;
  scopes: Scope[];
  setConfirmation: (value: WeeklyNewspaperWritebackConfirmationState | null) => void;
  todoCategories: TodoCategory[];
  todos: TodoItem[];
  weeklyReviews: WeeklyReview[];
}

interface MonthlyNewspaperCommandBase {
  appendSystemMessage: (sessionId: string, content: string) => void;
  categories: Category[];
  dailyReviews: DailyReview[];
  getLocalDateStr: (date: Date) => string;
  logs: Log[];
  monthlyReviews: MonthlyReview[];
  prepareForInteraction: () => void;
  reviewTemplates: any[];
  runWriteback: (
    session: AIChatSession,
    params: {
      createdReview: boolean;
      mergeMode: 'create' | 'overwrite';
      monthDataText: string;
      monthlyReview: MonthlyReview;
    }
  ) => Promise<void>;
  scopes: Scope[];
  setConfirmation: (value: MonthlyNewspaperWritebackConfirmationState | null) => void;
  todoCategories: TodoCategory[];
  todos: TodoItem[];
  weeklyReviews: WeeklyReview[];
}

interface DailyNarrativeCommandOptions extends DailyNarrativeCommandBase {
  session: AIChatSession;
}

interface DailyOverwriteConfirmationOptions extends DailyNarrativeCommandBase {
  appendUserMessage: (sessionId: string, content: string) => void;
  confirmation: DailyReviewWritebackConfirmationState | null;
  session: AIChatSession;
  userInput: string;
}

interface DailyNewspaperCommandOptions extends DailyNewspaperCommandBase {
  commandText?: string;
  fallbackDate?: string;
  session: AIChatSession;
}

interface DailyNewspaperOverwriteConfirmationOptions extends DailyNewspaperCommandBase {
  appendUserMessage: (sessionId: string, content: string) => void;
  confirmation: DailyNewspaperWritebackConfirmationState | null;
  session: AIChatSession;
  userInput: string;
}

interface WeeklyNewspaperCommandOptions extends WeeklyNewspaperCommandBase {
  commandText?: string;
  fallbackDate?: string;
  session: AIChatSession;
}

interface WeeklyNewspaperOverwriteConfirmationOptions extends WeeklyNewspaperCommandBase {
  appendUserMessage: (sessionId: string, content: string) => void;
  confirmation: WeeklyNewspaperWritebackConfirmationState | null;
  session: AIChatSession;
  userInput: string;
}

interface MonthlyNewspaperCommandOptions extends MonthlyNewspaperCommandBase {
  commandText?: string;
  fallbackDate?: string;
  session: AIChatSession;
}

interface MonthlyNewspaperOverwriteConfirmationOptions extends MonthlyNewspaperCommandBase {
  appendUserMessage: (sessionId: string, content: string) => void;
  confirmation: MonthlyNewspaperWritebackConfirmationState | null;
  session: AIChatSession;
  userInput: string;
}

const normalizeCommandDate = (rawValue: string): string | null => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, year, month, day] = compactMatch;
    return `${year}-${month}-${day}`;
  }

  const dashedMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!dashedMatch) {
    return null;
  }

  const [, year, month, day] = dashedMatch;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const isValidCommandDate = (value: string): boolean => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);

  return candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day;
};

const resolveDailyNewspaperCommandDate = ({
  commandText,
  fallbackDate,
  getLocalDateStr
}: {
  commandText?: string;
  fallbackDate?: string;
  getLocalDateStr: (date: Date) => string;
}): { date: string | null; error?: string } => {
  const trimmed = commandText?.trim() || '';
  const match = trimmed.match(/^小报(?:\s+(.+))?$/);

  if (match) {
    const requestedDate = match[1]?.trim();
    if (requestedDate) {
      const normalizedDate = normalizeCommandDate(requestedDate);
      if (!normalizedDate || !isValidCommandDate(normalizedDate)) {
        return {
          date: null,
          error: '小报日期无效。请使用 YYYY-MM-DD，例如：小报 2026-05-16。'
        };
      }

      return { date: normalizedDate };
    }
  }

  if (fallbackDate && isValidCommandDate(fallbackDate)) {
    return { date: fallbackDate };
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return { date: getLocalDateStr(today) };
};

const getMonthRangeForDate = (date: Date): { start: Date; end: Date } => ({
  start: new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0),
  end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0, 0)
});

const resolveWeeklySelectionLabel = (targetDate: Date, now: Date = new Date()): '本周' | '上周' | 'custom_date' => {
  const currentWeek = getWeekRange(now);
  const previousWeek = getWeekRange(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 12, 0, 0, 0));
  const targetTime = new Date(targetDate);
  targetTime.setHours(12, 0, 0, 0);

  if (targetTime.getTime() >= currentWeek.start.getTime() && targetTime.getTime() <= currentWeek.end.getTime()) {
    return '本周';
  }

  if (targetTime.getTime() >= previousWeek.start.getTime() && targetTime.getTime() <= previousWeek.end.getTime()) {
    return '上周';
  }

  return 'custom_date';
};

const resolveMonthlySelectionLabel = (targetDate: Date, now: Date = new Date()): '本月' | '上月' | 'custom_date' => {
  if (targetDate.getFullYear() === now.getFullYear() && targetDate.getMonth() === now.getMonth()) {
    return '本月';
  }

  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0, 0);
  if (targetDate.getFullYear() === previousMonth.getFullYear() && targetDate.getMonth() === previousMonth.getMonth()) {
    return '上月';
  }

  return 'custom_date';
};

const resolvePeriodicCommandDate = ({
  commandText,
  commandName,
  fallbackDate,
  getLocalDateStr,
  pattern
}: {
  commandText?: string;
  commandName: string;
  fallbackDate?: string;
  getLocalDateStr: (date: Date) => string;
  pattern: RegExp;
}): { date: string | null; error?: string } => {
  const trimmed = commandText?.trim() || '';
  const match = trimmed.match(pattern);

  if (match) {
    const requestedDate = match[1]?.trim();
    if (requestedDate) {
      const normalizedDate = normalizeCommandDate(requestedDate);
      if (!normalizedDate || !isValidCommandDate(normalizedDate)) {
        return {
          date: null,
          error: `${commandName}日期无效。请使用 YYYY-MM-DD，例如：${commandName} 2026-06-07。`
        };
      }

      return { date: normalizedDate };
    }
  }

  if (fallbackDate && isValidCommandDate(fallbackDate)) {
    return { date: fallbackDate };
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return { date: getLocalDateStr(today) };
};

const buildEnsuredDailyReviewPayload = ({
  categories,
  checkTemplates,
  dailyReviews,
  date,
  logs,
  reviewTemplates,
  scopes,
  todoCategories,
  todos
}: {
  categories: Category[];
  checkTemplates: any[];
  dailyReviews: DailyReview[];
  date: string;
  logs: Log[];
  reviewTemplates: any[];
  scopes: Scope[];
  todoCategories: TodoCategory[];
  todos: TodoItem[];
}) => {
  const ensuredReview = dailyReviewTemplateService.ensureDailyReview(
    dailyReviews,
    checkTemplates,
    reviewTemplates,
    date
  );
  const dayDataText = dailyReviewTemplateService.buildDayDataText({
    date,
    logs,
    categories,
    todos,
    todoCategories,
    scopes,
    dailyReviews: ensuredReview.created ? [...dailyReviews, ensuredReview.dailyReview] : dailyReviews,
    dailyReview: ensuredReview.dailyReview
  });

  return {
    dayDataText,
    ensuredReview
  };
};

const buildEnsuredDailyNewspaperPayload = ({
  categories,
  checkTemplates,
  dailyReviews,
  date,
  logs,
  reviewTemplates,
  scopes,
  todoCategories,
  todos
}: {
  categories: Category[];
  checkTemplates: any[];
  dailyReviews: DailyReview[];
  date: string;
  logs: Log[];
  reviewTemplates: any[];
  scopes: Scope[];
  todoCategories: TodoCategory[];
  todos: TodoItem[];
}) => {
  const ensuredReview = dailyNewspaperService.ensureDailyReview(
    dailyReviews,
    checkTemplates,
    reviewTemplates,
    date
  );
  const dayDataText = dailyNewspaperService.buildDayDataText({
    date,
    logs,
    categories,
    todos,
    todoCategories,
    scopes,
    dailyReview: ensuredReview.dailyReview
  });

  return {
    dayDataText,
    ensuredReview
  };
};

const buildEnsuredWeeklyNewspaperPayload = ({
  categories,
  dailyReviews,
  date,
  getLocalDateStr,
  logs,
  monthlyReviews: _monthlyReviews,
  reviewTemplates,
  scopes,
  todoCategories,
  todos,
  weeklyReviews
}: {
  categories: Category[];
  dailyReviews: DailyReview[];
  date: string;
  getLocalDateStr: (date: Date) => string;
  logs: Log[];
  monthlyReviews: MonthlyReview[];
  reviewTemplates: any[];
  scopes: Scope[];
  todoCategories: TodoCategory[];
  todos: TodoItem[];
  weeklyReviews: WeeklyReview[];
}) => {
  const targetDate = new Date(`${date}T12:00:00`);
  const weekRange = getWeekRange(targetDate);
  const weekStartDate = getLocalDateStr(weekRange.start);
  const weekEndDate = getLocalDateStr(weekRange.end);
  const selectedRangeLabel = resolveWeeklySelectionLabel(targetDate);
  const ensuredReview = weeklyNewspaperService.ensureWeeklyReview(
    weeklyReviews,
    reviewTemplates,
    weekStartDate,
    weekEndDate
  );
  const weekDataText = weeklyNewspaperService.buildWeekDataText({
    weekStartDate,
    weekEndDate,
    selectedRangeLabel,
    logs,
    categories,
    todos,
    todoCategories,
    scopes,
    dailyReviews,
    weeklyReview: ensuredReview.weeklyReview
  });

  return {
    weekDataText,
    ensuredReview,
    weekStartDate,
    weekEndDate
  };
};

const buildEnsuredMonthlyNewspaperPayload = ({
  categories,
  dailyReviews,
  date,
  getLocalDateStr,
  logs,
  monthlyReviews,
  reviewTemplates,
  scopes,
  todoCategories,
  todos,
  weeklyReviews
}: {
  categories: Category[];
  dailyReviews: DailyReview[];
  date: string;
  getLocalDateStr: (date: Date) => string;
  logs: Log[];
  monthlyReviews: MonthlyReview[];
  reviewTemplates: any[];
  scopes: Scope[];
  todoCategories: TodoCategory[];
  todos: TodoItem[];
  weeklyReviews: WeeklyReview[];
}) => {
  const targetDate = new Date(`${date}T12:00:00`);
  const monthRange = getMonthRangeForDate(targetDate);
  const monthStartDate = getLocalDateStr(monthRange.start);
  const monthEndDate = getLocalDateStr(monthRange.end);
  const selectedRangeLabel = resolveMonthlySelectionLabel(targetDate);
  const ensuredReview = monthlyNewspaperService.ensureMonthlyReview(
    monthlyReviews,
    reviewTemplates,
    monthStartDate,
    monthEndDate
  );
  const monthDataText = monthlyNewspaperService.buildMonthDataText({
    monthStartDate,
    monthEndDate,
    selectedRangeLabel,
    logs,
    categories,
    todos,
    todoCategories,
    scopes,
    dailyReviews,
    weeklyReviews,
    monthlyReview: ensuredReview.monthlyReview
  });

  return {
    monthDataText,
    ensuredReview,
    monthStartDate,
    monthEndDate
  };
};

export const runWeeklyReviewNarrativeWritebackCommand = async ({
  addToast,
  buildWeekDataText,
  resolveTemplateMeta,
  reviewTemplates,
  runWriteback,
  session,
  weeklyReviews
}: WeeklyWritebackCommandOptions): Promise<void> => {
  const templateMeta = resolveTemplateMeta(session);
  if (!templateMeta) {
    return;
  }

  const weekDataText = buildWeekDataText(session);
  if (!weekDataText) {
    addToast('error', '这段对话还没有可用的周复盘数据。');
    return;
  }

  const ensuredReview = weeklyReviewTemplateService.ensureWeeklyReview(
    weeklyReviews,
    reviewTemplates,
    templateMeta.weekStartDate,
    templateMeta.weekEndDate
  );

  await runWriteback(session, {
    weeklyReview: ensuredReview.weeklyReview,
    weekDataText,
    mergeMode: ensuredReview.weeklyReview.narrative?.trim() ? 'overwrite' : 'create',
    createdReview: ensuredReview.created
  });
};

export const runMonthlyReviewNarrativeWritebackCommand = async ({
  addToast,
  buildMonthDataText,
  resolveTemplateMeta,
  reviewTemplates,
  runWriteback,
  session,
  monthlyReviews
}: MonthlyWritebackCommandOptions): Promise<void> => {
  const templateMeta = resolveTemplateMeta(session);
  if (!templateMeta) {
    return;
  }

  const monthDataText = buildMonthDataText(session);
  if (!monthDataText) {
    addToast('error', '这段对话还没有可用的月复盘数据。');
    return;
  }

  const ensuredReview = monthlyReviewTemplateService.ensureMonthlyReview(
    monthlyReviews,
    reviewTemplates,
    templateMeta.monthStartDate,
    templateMeta.monthEndDate
  );

  await runWriteback(session, {
    monthlyReview: ensuredReview.monthlyReview,
    monthDataText,
    mergeMode: ensuredReview.monthlyReview.narrative?.trim() ? 'overwrite' : 'create',
    createdReview: ensuredReview.created
  });
};

export const runDailyReviewNarrativeCommand = async ({
  appendSystemMessage,
  categories,
  checkTemplates,
  dailyReviews,
  getLocalDateStr,
  logs,
  prepareForInteraction,
  reviewTemplates,
  runWriteback,
  scopes,
  session,
  setConfirmation,
  todoCategories,
  todos
}: DailyNarrativeCommandOptions): Promise<void> => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const date = getLocalDateStr(today);
  const { dayDataText, ensuredReview } = buildEnsuredDailyReviewPayload({
    categories,
    checkTemplates,
    dailyReviews,
    date,
    logs,
    reviewTemplates,
    scopes,
    todoCategories,
    todos
  });

  if (ensuredReview.dailyReview.narrative?.trim()) {
    setConfirmation({
      sessionId: session.id,
      date
    });
    appendSystemMessage(
      session.id,
      `今天（${date}）的日报已经有 AI 叙事了。回复“是”覆盖，回复“否”取消。`
    );
    return;
  }

  prepareForInteraction();
  await runWriteback(session, {
    dailyReview: ensuredReview.dailyReview,
    dayDataText,
    mergeMode: 'create',
    createdReview: ensuredReview.created
  });
};

export const runDailyReviewNarrativeOverwriteConfirmation = async ({
  appendSystemMessage,
  appendUserMessage,
  categories,
  checkTemplates,
  confirmation,
  dailyReviews,
  getLocalDateStr,
  logs,
  prepareForInteraction,
  reviewTemplates,
  runWriteback,
  scopes,
  session,
  setConfirmation,
  todoCategories,
  todos,
  userInput
}: DailyOverwriteConfirmationOptions): Promise<boolean> => {
  if (!confirmation || confirmation.sessionId !== session.id) {
    return false;
  }

  const trimmed = userInput.trim();
  if (!trimmed) {
    return true;
  }

  appendUserMessage(session.id, trimmed);
  prepareForInteraction();

  if (trimmed === '否') {
    setConfirmation(null);
    appendSystemMessage(session.id, '这次日报写入已取消。');
    return true;
  }

  if (trimmed !== '是') {
    appendSystemMessage(session.id, '今天的日报已有 AI 叙事。请回复“是”覆盖，或回复“否”取消。');
    return true;
  }

  const { dayDataText, ensuredReview } = buildEnsuredDailyReviewPayload({
    categories,
    checkTemplates,
    dailyReviews,
    date: confirmation.date,
    logs,
    reviewTemplates,
    scopes,
    todoCategories,
    todos
  });

  await runWriteback(session, {
    dailyReview: ensuredReview.dailyReview,
    dayDataText,
    mergeMode: 'overwrite',
    createdReview: ensuredReview.created
  });
  return true;
};

export const runDailyNewspaperCommand = async ({
  appendSystemMessage,
  categories,
  checkTemplates,
  commandText,
  dailyReviews,
  fallbackDate,
  getLocalDateStr,
  logs,
  prepareForInteraction,
  reviewTemplates,
  runWriteback,
  scopes,
  session,
  setConfirmation,
  todoCategories,
  todos
}: DailyNewspaperCommandOptions): Promise<void> => {
  const resolvedDate = resolveDailyNewspaperCommandDate({
    commandText,
    fallbackDate,
    getLocalDateStr
  });
  if (!resolvedDate.date) {
    appendSystemMessage(session.id, resolvedDate.error || '小报日期无效。');
    return;
  }

  const date = resolvedDate.date;
  const { dayDataText, ensuredReview } = buildEnsuredDailyNewspaperPayload({
    categories,
    checkTemplates,
    dailyReviews,
    date,
    logs,
    reviewTemplates,
    scopes,
    todoCategories,
    todos
  });

  if (ensuredReview.dailyReview.aiNewspaper) {
    setConfirmation({
      sessionId: session.id,
      date
    });
    appendSystemMessage(
      session.id,
      `今天（${date}）的小报已经存在了。回复“是”覆盖，回复“否”取消。`
    );
    return;
  }

  prepareForInteraction();
  await runWriteback(session, {
    dailyReview: ensuredReview.dailyReview,
    dayDataText,
    mergeMode: 'create',
    createdReview: ensuredReview.created
  });
};

export const runDailyNewspaperOverwriteConfirmation = async ({
  appendSystemMessage,
  appendUserMessage,
  categories,
  checkTemplates,
  confirmation,
  dailyReviews,
  getLocalDateStr,
  logs,
  prepareForInteraction,
  reviewTemplates,
  runWriteback,
  scopes,
  session,
  setConfirmation,
  todoCategories,
  todos,
  userInput
}: DailyNewspaperOverwriteConfirmationOptions): Promise<boolean> => {
  if (!confirmation || confirmation.sessionId !== session.id) {
    return false;
  }

  const trimmed = userInput.trim();
  if (!trimmed) {
    return true;
  }

  appendUserMessage(session.id, trimmed);
  prepareForInteraction();

  if (trimmed === '否') {
    setConfirmation(null);
    appendSystemMessage(session.id, '这次小报写入已取消。');
    return true;
  }

  if (trimmed !== '是') {
    appendSystemMessage(session.id, '今天的小报已经存在。请回复“是”覆盖，或回复“否”取消。');
    return true;
  }

  const { dayDataText, ensuredReview } = buildEnsuredDailyNewspaperPayload({
    categories,
    checkTemplates,
    dailyReviews,
    date: confirmation.date,
    logs,
    reviewTemplates,
    scopes,
    todoCategories,
    todos
  });

  await runWriteback(session, {
    dailyReview: ensuredReview.dailyReview,
    dayDataText,
    mergeMode: 'overwrite',
    createdReview: ensuredReview.created
  });
  return true;
};

export const runWeeklyNewspaperCommand = async ({
  appendSystemMessage,
  categories,
  commandText,
  dailyReviews,
  fallbackDate,
  getLocalDateStr,
  logs,
  monthlyReviews,
  prepareForInteraction,
  reviewTemplates,
  runWriteback,
  scopes,
  session,
  setConfirmation,
  todoCategories,
  todos,
  weeklyReviews
}: WeeklyNewspaperCommandOptions): Promise<void> => {
  const resolvedDate = resolvePeriodicCommandDate({
    commandText,
    commandName: '周小报',
    fallbackDate,
    getLocalDateStr,
    pattern: /^周小报(?:\s+(.+))?$/
  });
  if (!resolvedDate.date) {
    appendSystemMessage(session.id, resolvedDate.error || '周小报日期无效。');
    return;
  }

  const { ensuredReview, weekDataText, weekStartDate, weekEndDate } = buildEnsuredWeeklyNewspaperPayload({
    categories,
    dailyReviews,
    date: resolvedDate.date,
    getLocalDateStr,
    logs,
    monthlyReviews,
    reviewTemplates,
    scopes,
    todoCategories,
    todos,
    weeklyReviews
  });

  if (ensuredReview.weeklyReview.aiNewspaper) {
    setConfirmation({
      sessionId: session.id,
      weekStartDate,
      weekEndDate
    });
    appendSystemMessage(
      session.id,
      `这周（${weekStartDate} - ${weekEndDate}）的小报已经存在了。回复“是”覆盖，回复“否”取消。`
    );
    return;
  }

  prepareForInteraction();
  await runWriteback(session, {
    weeklyReview: ensuredReview.weeklyReview,
    weekDataText,
    mergeMode: 'create',
    createdReview: ensuredReview.created
  });
};

export const runWeeklyNewspaperOverwriteConfirmation = async ({
  appendSystemMessage,
  appendUserMessage,
  categories,
  confirmation,
  dailyReviews,
  getLocalDateStr,
  logs,
  monthlyReviews,
  prepareForInteraction,
  reviewTemplates,
  runWriteback,
  scopes,
  session,
  setConfirmation,
  todoCategories,
  todos,
  userInput,
  weeklyReviews
}: WeeklyNewspaperOverwriteConfirmationOptions): Promise<boolean> => {
  if (!confirmation || confirmation.sessionId !== session.id) {
    return false;
  }

  const trimmed = userInput.trim();
  if (!trimmed) {
    return true;
  }

  appendUserMessage(session.id, trimmed);
  prepareForInteraction();

  if (trimmed === '否') {
    setConfirmation(null);
    appendSystemMessage(session.id, '这次周小报写入已取消。');
    return true;
  }

  if (trimmed !== '是') {
    appendSystemMessage(session.id, '这周的小报已经存在。请回复“是”覆盖，或回复“否”取消。');
    return true;
  }

  const { ensuredReview, weekDataText } = buildEnsuredWeeklyNewspaperPayload({
    categories,
    dailyReviews,
    date: confirmation.weekStartDate,
    getLocalDateStr,
    logs,
    monthlyReviews,
    reviewTemplates,
    scopes,
    todoCategories,
    todos,
    weeklyReviews
  });

  await runWriteback(session, {
    weeklyReview: ensuredReview.weeklyReview,
    weekDataText,
    mergeMode: 'overwrite',
    createdReview: ensuredReview.created
  });
  return true;
};

export const runMonthlyNewspaperCommand = async ({
  appendSystemMessage,
  categories,
  commandText,
  dailyReviews,
  fallbackDate,
  getLocalDateStr,
  logs,
  monthlyReviews,
  prepareForInteraction,
  reviewTemplates,
  runWriteback,
  scopes,
  session,
  setConfirmation,
  todoCategories,
  todos,
  weeklyReviews
}: MonthlyNewspaperCommandOptions): Promise<void> => {
  const resolvedDate = resolvePeriodicCommandDate({
    commandText,
    commandName: '月小报',
    fallbackDate,
    getLocalDateStr,
    pattern: /^月小报(?:\s+(.+))?$/
  });
  if (!resolvedDate.date) {
    appendSystemMessage(session.id, resolvedDate.error || '月小报日期无效。');
    return;
  }

  const { ensuredReview, monthDataText, monthStartDate, monthEndDate } = buildEnsuredMonthlyNewspaperPayload({
    categories,
    dailyReviews,
    date: resolvedDate.date,
    getLocalDateStr,
    logs,
    monthlyReviews,
    reviewTemplates,
    scopes,
    todoCategories,
    todos,
    weeklyReviews
  });

  if (ensuredReview.monthlyReview.aiNewspaper) {
    setConfirmation({
      sessionId: session.id,
      monthStartDate,
      monthEndDate
    });
    appendSystemMessage(
      session.id,
      `这个月（${monthStartDate} - ${monthEndDate}）的小报已经存在了。回复“是”覆盖，回复“否”取消。`
    );
    return;
  }

  prepareForInteraction();
  await runWriteback(session, {
    monthlyReview: ensuredReview.monthlyReview,
    monthDataText,
    mergeMode: 'create',
    createdReview: ensuredReview.created
  });
};

export const runMonthlyNewspaperOverwriteConfirmation = async ({
  appendSystemMessage,
  appendUserMessage,
  categories,
  confirmation,
  dailyReviews,
  getLocalDateStr,
  logs,
  monthlyReviews,
  prepareForInteraction,
  reviewTemplates,
  runWriteback,
  scopes,
  session,
  setConfirmation,
  todoCategories,
  todos,
  userInput,
  weeklyReviews
}: MonthlyNewspaperOverwriteConfirmationOptions): Promise<boolean> => {
  if (!confirmation || confirmation.sessionId !== session.id) {
    return false;
  }

  const trimmed = userInput.trim();
  if (!trimmed) {
    return true;
  }

  appendUserMessage(session.id, trimmed);
  prepareForInteraction();

  if (trimmed === '否') {
    setConfirmation(null);
    appendSystemMessage(session.id, '这次月小报写入已取消。');
    return true;
  }

  if (trimmed !== '是') {
    appendSystemMessage(session.id, '这个月的小报已经存在。请回复“是”覆盖，或回复“否”取消。');
    return true;
  }

  const { ensuredReview, monthDataText } = buildEnsuredMonthlyNewspaperPayload({
    categories,
    dailyReviews,
    date: confirmation.monthStartDate,
    getLocalDateStr,
    logs,
    monthlyReviews,
    reviewTemplates,
    scopes,
    todoCategories,
    todos,
    weeklyReviews
  });

  await runWriteback(session, {
    monthlyReview: ensuredReview.monthlyReview,
    monthDataText,
    mergeMode: 'overwrite',
    createdReview: ensuredReview.created
  });
  return true;
};
