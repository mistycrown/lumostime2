/**
 * @file AIBackfillChatReviewCommands.ts
 * @input Review-command sessions, review datasets, and modal orchestration callbacks
 * @output Shared command handlers for weekly/monthly writeback entrypoints and daily overwrite confirmation
 * @pos Component Support (AI Integration)
 * @description Extracts the review command coordination layer out of AIBackfillChatModal so the modal keeps the main send-path dispatch while review preparation and overwrite confirmation live in focused helpers.
 * @updated 2026-05-15: Extracted weekly/monthly review writeback commands plus daily narrative command/confirmation handling from AIBackfillChatModal.
 */
import { dailyReviewTemplateService } from '../../services/dailyReviewTemplateService';
import { dailyNewspaperService } from '../../services/dailyNewspaperService';
import { monthlyReviewTemplateService, type MonthlyReviewTemplateSessionMeta } from '../../services/monthlyReviewTemplateService';
import { weeklyReviewTemplateService, type WeeklyReviewTemplateSessionMeta } from '../../services/weeklyReviewTemplateService';
import type { Category, DailyReview, Log, MonthlyReview, Scope, TodoCategory, TodoItem, WeeklyReview } from '../../types';
import type {
  DailyNewspaperWritebackConfirmationState,
  AIChatSession,
  DailyReviewWritebackConfirmationState
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
  session: AIChatSession;
}

interface DailyNewspaperOverwriteConfirmationOptions extends DailyNewspaperCommandBase {
  appendUserMessage: (sessionId: string, content: string) => void;
  confirmation: DailyNewspaperWritebackConfirmationState | null;
  session: AIChatSession;
  userInput: string;
}

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
}: DailyNewspaperCommandOptions): Promise<void> => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const date = getLocalDateStr(today);
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
