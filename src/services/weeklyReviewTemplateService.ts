/**
 * @file weeklyReviewTemplateService.ts
 * @input Weekly review range selection text, local logs/todos/reviews, and optional existing weekly review content
 * @output Parsed weekly-review template targets, structured weekly context digests, and dedicated weekly-review AI prompt text
 * @pos Service (Weekly Review Template)
 * @description Centralizes the first template-chat workflow for weekly reviews, including strict range-command parsing, weekly-review lookup/creation helpers, compact per-week data packaging, and dedicated chat/writeback prompt builders that stay separate from the generic assistant prompts.
 *
 * @updated 2026-05-11: Added weekly review template parsing, weekly context packaging, and template-specific chat/writeback prompt builders for the new AI weekly-review conversation flow.
 */

import type {
  Category,
  DailyReview,
  Log,
  ReviewTemplate,
  Scope,
  TodoCategory,
  TodoItem,
  WeeklyReview
} from '../types';
import { formatDuration, calculateMonthlyStats, generateCheckItemStatsText } from '../utils/reviewStatsUtils';
import { getLocalDateStr, getLocalTimeStr, getWeekRange } from '../utils/dateUtils';

export type WeeklyReviewTemplateSelectionLabel = '本周' | '上周' | 'custom_date';

export type WeeklyReviewTemplateStage = 'ready' | 'awaiting_narrative_overwrite_confirm';

export interface WeeklyReviewTemplateSessionMeta {
  templateType: 'weekly_review';
  stage: WeeklyReviewTemplateStage;
  weekStartDate: string;
  weekEndDate: string;
  selectedRangeLabel: WeeklyReviewTemplateSelectionLabel;
  pendingWriteIntent?: boolean;
}

export interface WeeklyReviewTemplateSelectionResult {
  weekStartDate: string;
  weekEndDate: string;
  selectedRangeLabel: WeeklyReviewTemplateSelectionLabel;
}

interface BuildWeeklyReviewTemplateDataParams {
  weekStartDate: string;
  weekEndDate: string;
  selectedRangeLabel: WeeklyReviewTemplateSelectionLabel;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  dailyReviews: DailyReview[];
  weeklyReview?: WeeklyReview;
}

interface BuildWeeklyReviewTemplateChatPromptParams {
  personaPrompt?: string;
  weekDataText: string;
  userMessage: string;
}

interface BuildWeeklyReviewNarrativePromptParams {
  personaPrompt?: string;
  weekDataText: string;
  conversationSummary: string;
  existingNarrative?: string;
  mergeMode: 'create' | 'overwrite' | 'merge';
}

const STRICT_JSON_OUTPUT_RULES = [
  '=== Structured Output Contract ===',
  'You must return exactly one strict JSON object.',
  'Do not return any text before or after the JSON object.',
  'Do not use Markdown fences, comments, headings, or explanation outside the JSON.',
  'Your entire response must be valid JSON parsable by JSON.parse with no cleanup step.'
].join('\n');

const WEEKLY_REVIEW_CHAT_OUTPUT_SCHEMA = {
  mode: 'foreground',
  outcome: 'reply | clarify',
  assistantReply: 'string',
  assistantReplyParts: ['string'],
  memoryAction: 'no_update'
};

const WEEKLY_REVIEW_NARRATIVE_OUTPUT_SCHEMA = {
  mode: 'foreground',
  outcome: 'reply',
  assistantReply: 'string',
  memoryAction: 'no_update'
};

const compactText = (value?: string, maxLength = 90): string => {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
    : normalized;
};

const parseEightDigitDate = (value: string): Date | null => {
  if (!/^\d{8}$/.test(value)) {
    return null;
  }

  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(4, 6), 10);
  const day = Number.parseInt(value.slice(6, 8), 10);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

  return (
    parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day
  )
    ? parsed
    : null;
};

const toWeekSelectionResult = (
  date: Date,
  selectedRangeLabel: WeeklyReviewTemplateSelectionLabel
): WeeklyReviewTemplateSelectionResult => {
  const { start, end } = getWeekRange(date);
  return {
    weekStartDate: getLocalDateStr(start),
    weekEndDate: getLocalDateStr(end),
    selectedRangeLabel
  };
};

const formatWeekRangeLabel = (weekStartDate: string, weekEndDate: string): string => {
  const start = new Date(`${weekStartDate}T12:00:00`);
  const end = new Date(`${weekEndDate}T12:00:00`);
  return `${start.getMonth() + 1}/${start.getDate()}-${end.getMonth() + 1}/${end.getDate()}`;
};

const toDayKey = (timestamp: number): string => getLocalDateStr(new Date(timestamp));

const formatTimeRange = (startTime: number, endTime: number): string => (
  `${getLocalTimeStr(new Date(startTime))}-${getLocalTimeStr(new Date(endTime))}`
);

const buildLogLabel = (log: Log, categories: Category[], todos: TodoItem[]): string => {
  const category = categories.find((item) => item.id === log.categoryId);
  const activity = category?.activities.find((item) => item.id === log.activityId)
    || categories.flatMap((item) => item.activities).find((item) => item.id === log.activityId);
  const linkedTodo = log.linkedTodoId
    ? todos.find((item) => item.id === log.linkedTodoId)
    : undefined;
  const note = compactText(log.note, 70);

  return [
    `${formatTimeRange(log.startTime, log.endTime)} ${[category?.name, activity?.name || log.title].filter(Boolean).join(' / ')}`,
    linkedTodo ? `@${linkedTodo.title}` : '',
    note ? `备注：${note}` : ''
  ].filter(Boolean).join(' | ');
};

const buildTimelineDigest = (weekLogs: Log[], categories: Category[], todos: TodoItem[]): string => {
  if (weekLogs.length === 0) {
    return '本周没有时间轴记录。';
  }

  const logsByDay = new Map<string, Log[]>();
  weekLogs.forEach((log) => {
    const dayKey = toDayKey(log.startTime);
    const nextLogs = logsByDay.get(dayKey) || [];
    nextLogs.push(log);
    logsByDay.set(dayKey, nextLogs);
  });

  return Array.from(logsByDay.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayLogs]) => [
      `${date}`,
      ...dayLogs
        .sort((left, right) => left.startTime - right.startTime)
        .map((log) => `- ${buildLogLabel(log, categories, todos)}`)
    ].join('\n'))
    .join('\n\n');
};

const buildDailyDurationDigest = (weekLogs: Log[]): string => {
  if (weekLogs.length === 0) {
    return '本周没有按天可汇总的日志。';
  }

  const totals = new Map<string, number>();
  weekLogs.forEach((log) => {
    const dayKey = toDayKey(log.startTime);
    const nextDuration = (totals.get(dayKey) || 0) + ((log.endTime - log.startTime) / 1000);
    totals.set(dayKey, nextDuration);
  });

  return Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, seconds]) => `- ${date}: ${formatDuration(seconds)}`)
    .join('\n');
};

const buildTodoResultDigest = (
  weekLogs: Log[],
  todos: TodoItem[],
  weekStartDate: string,
  weekEndDate: string
): string => {
  const completedTodos = todos.filter((todo) => (
    todo.isCompleted
    && typeof todo.completedAt === 'string'
    && todo.completedAt.trim()
    && getLocalDateStr(new Date(todo.completedAt)) >= weekStartDate
    && getLocalDateStr(new Date(todo.completedAt)) <= weekEndDate
  ));

  const loggedTodoIds = new Set(
    weekLogs
      .map((log) => log.linkedTodoId || '')
      .filter(Boolean)
  );

  const activeTodos = todos.filter((todo) => (
    !todo.isCompleted
    && loggedTodoIds.has(todo.id)
  ));

  const completedLines = completedTodos.length === 0
    ? ['- 本周没有已完成待办记录。']
    : completedTodos.map((todo) => (
      `- ${todo.title}${todo.completedAt ? `（完成于 ${getLocalDateStr(new Date(todo.completedAt))}）` : ''}`
    ));

  const activeLines = activeTodos.length === 0
    ? ['- 本周没有“有投入但未完成”的待办。']
    : activeTodos.map((todo) => `- ${todo.title}`);

  return [
    '[本周待办结果]',
    '已完成待办：',
    ...completedLines,
    '',
    '有投入但未完成的待办：',
    ...activeLines
  ].join('\n');
};

const buildDailyReviewDigest = (dailyReviews: DailyReview[]): string => {
  if (dailyReviews.length === 0) {
    return '本周没有 Daily Review。';
  }

  return dailyReviews
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((review) => {
      const summary = compactText(review.summary, 80);
      const narrative = compactText(review.narrative, 80);
      const completedChecks = (review.checkItems || []).filter((item) => item.isCompleted).length;
      const totalChecks = review.checkItems?.length || 0;

      return [
        `${review.date}`,
        `- 日课：${totalChecks > 0 ? `${completedChecks}/${totalChecks}` : '无'}`,
        summary ? `- 一句话总结：${summary}` : '',
        narrative ? `- AI 叙事摘录：${narrative}` : ''
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
};

const buildWeeklyReviewDigest = (weeklyReview?: WeeklyReview): string => {
  if (!weeklyReview) {
    return '本周还没有 Weekly Review。';
  }

  const answers = weeklyReview.answers.length === 0
    ? '暂无引导回答。'
    : weeklyReview.answers.map((answer) => `- ${answer.question}: ${compactText(answer.answer, 120)}`).join('\n');

  return [
    '已有 Weekly Review：',
    answers,
    weeklyReview.summary ? `现有 summary：${compactText(weeklyReview.summary, 140)}` : '现有 summary：无',
    weeklyReview.narrative ? `现有 narrative：${compactText(weeklyReview.narrative, 180)}` : '现有 narrative：无'
  ].join('\n');
};

const buildStatsDigest = (
  weekLogs: Log[],
  categories: Category[],
  todos: TodoItem[],
  todoCategories: TodoCategory[],
  scopes: Scope[],
  dailyReviews: DailyReview[],
  weekStartDate: string,
  weekEndDate: string
): string => {
  const stats = calculateMonthlyStats(weekLogs, categories, todos, todoCategories, scopes);
  const checkDigest = generateCheckItemStatsText(
    dailyReviews,
    new Date(`${weekStartDate}T00:00:00`),
    new Date(`${weekEndDate}T23:59:59`)
  );

  return [
    '[本周统计]',
    `总时长：${formatDuration(stats.totalDuration)}`,
    '',
    '分类分布：',
    ...(stats.categoryStats.length > 0
      ? stats.categoryStats.map((item) => `- ${item.name}: ${formatDuration(item.duration)} (${item.percentage.toFixed(1)}%)`)
      : ['- 无']),
    '',
    'Scope 分布：',
    ...(stats.scopeStats.length > 0
      ? stats.scopeStats.map((item) => `- ${item.name}: ${formatDuration(item.duration)} (${item.percentage.toFixed(1)}%)`)
      : ['- 无']),
    '',
    '待办投入分布：',
    ...(stats.todoStats.length > 0
      ? stats.todoStats.map((item) => `- ${item.name}: ${formatDuration(item.duration)} (${item.percentage.toFixed(1)}%)`)
      : ['- 无']),
    '',
    '[本周每日时长]',
    buildDailyDurationDigest(weekLogs),
    checkDigest ? ['', checkDigest.trim()] : []
  ].flat().join('\n');
};

const buildPersonaStyleLayer = (personaPrompt?: string): string => {
  const trimmed = personaPrompt?.trim();
  if (!trimmed) {
    return '';
  }

  return [
    '=== Persona Style Layer ===',
    trimmed,
    'Apply this only as tone and interaction style.',
    'Do not switch back to the generic assistant task routing.'
  ].join('\n');
};

export const weeklyReviewTemplateService = {
  parseWeekSelectionInput(input: string, now: Date = new Date()): WeeklyReviewTemplateSelectionResult | null {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed === '本周') {
      return toWeekSelectionResult(now, '本周');
    }

    if (trimmed === '上周') {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return toWeekSelectionResult(lastWeek, '上周');
    }

    const parsedDate = parseEightDigitDate(trimmed);
    return parsedDate ? toWeekSelectionResult(parsedDate, 'custom_date') : null;
  },

  createSessionMeta(selection: WeeklyReviewTemplateSelectionResult): WeeklyReviewTemplateSessionMeta {
    return {
      templateType: 'weekly_review',
      stage: 'ready',
      weekStartDate: selection.weekStartDate,
      weekEndDate: selection.weekEndDate,
      selectedRangeLabel: selection.selectedRangeLabel
    };
  },

  getSessionTitle(selection: WeeklyReviewTemplateSelectionResult): string {
    return `周复盘 ${formatWeekRangeLabel(selection.weekStartDate, selection.weekEndDate)}`;
  },

  getIntroMessage(selection: WeeklyReviewTemplateSelectionResult): string {
    const sourceLabel = selection.selectedRangeLabel === 'custom_date'
      ? '自定义日期所在周'
      : selection.selectedRangeLabel;
    return [
      `已进入周复盘：${selection.weekStartDate} ~ ${selection.weekEndDate}（${sourceLabel}）。`,
      '接下来你可以直接和我讨论这一周的节奏、推进、卡点和收获。',
      '如果最后要落到周报里，请发送：写入 AI 叙事'
    ].join('\n');
  },

  isWriteNarrativeCommand(input: string): boolean {
    return input.trim() === '写入 AI 叙事';
  },

  isOverwriteConfirmation(input: string): input is '是' | '否' {
    const trimmed = input.trim();
    return trimmed === '是' || trimmed === '否';
  },

  findWeeklyReview(
    weeklyReviews: WeeklyReview[],
    weekStartDate: string,
    weekEndDate: string
  ): WeeklyReview | undefined {
    return weeklyReviews.find((review) => (
      review.weekStartDate === weekStartDate && review.weekEndDate === weekEndDate
    ));
  },

  ensureWeeklyReview(
    weeklyReviews: WeeklyReview[],
    reviewTemplates: ReviewTemplate[],
    weekStartDate: string,
    weekEndDate: string
  ): { weeklyReviews: WeeklyReview[]; weeklyReview: WeeklyReview; created: boolean } {
    const existing = weeklyReviewTemplateService.findWeeklyReview(weeklyReviews, weekStartDate, weekEndDate);
    if (existing) {
      return { weeklyReviews, weeklyReview: existing, created: false };
    }

    const templateSnapshot = reviewTemplates
      .filter((template) => template.isWeeklyTemplate)
      .sort((left, right) => left.order - right.order)
      .map((template) => ({
        id: template.id,
        title: template.title,
        questions: template.questions,
        order: template.order,
        syncToTimeline: template.syncToTimeline
      }));

    const now = Date.now();
    const createdReview: WeeklyReview = {
      id: crypto.randomUUID(),
      weekStartDate,
      weekEndDate,
      createdAt: now,
      updatedAt: now,
      answers: [],
      templateSnapshot
    };

    return {
      weeklyReviews: [...weeklyReviews, createdReview],
      weeklyReview: createdReview,
      created: true
    };
  },

  updateWeeklyReviewNarrative(
    weeklyReviews: WeeklyReview[],
    reviewId: string,
    narrative: string
  ): WeeklyReview[] {
    const updatedAt = Date.now();
    return weeklyReviews.map((review) => (
      review.id === reviewId
        ? {
          ...review,
          narrative,
          narrativeUpdatedAt: updatedAt,
          updatedAt
        }
        : review
    ));
  },

  buildWeekDataText(params: BuildWeeklyReviewTemplateDataParams): string {
    const weekStart = new Date(`${params.weekStartDate}T00:00:00`);
    const weekEnd = new Date(`${params.weekEndDate}T23:59:59`);
    const weekLogs = params.logs
      .filter((log) => log.startTime >= weekStart.getTime() && log.endTime <= weekEnd.getTime())
      .sort((left, right) => left.startTime - right.startTime);
    const weekDailyReviews = params.dailyReviews.filter((review) => (
      review.date >= params.weekStartDate && review.date <= params.weekEndDate
    ));

    return [
      '[周范围]',
      `weekStartDate: ${params.weekStartDate}`,
      `weekEndDate: ${params.weekEndDate}`,
      `selection: ${params.selectedRangeLabel}`,
      '',
      buildStatsDigest(
        weekLogs,
        params.categories,
        params.todos,
        params.todoCategories,
        params.scopes,
        weekDailyReviews,
        params.weekStartDate,
        params.weekEndDate
      ),
      '',
      '[本周时间轴]',
      buildTimelineDigest(weekLogs, params.categories, params.todos),
      '',
      buildTodoResultDigest(weekLogs, params.todos, params.weekStartDate, params.weekEndDate),
      '',
      '[本周 Daily Review]',
      buildDailyReviewDigest(weekDailyReviews),
      '',
      '[本周 Weekly Review]',
      buildWeeklyReviewDigest(params.weeklyReview)
    ].join('\n');
  },

  buildChatPrompts(
    params: BuildWeeklyReviewTemplateChatPromptParams
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = [
      'You are LumosTime\'s weekly review discussion assistant.',
      'This is a template conversation dedicated to one selected week.',
      'Your job is to help the user review that week using only the provided weekly data package.',
      'Focus on patterns, progress, friction, wins, unfinished threads, and useful follow-up questions.',
      'Stay in discussion mode. Do not act like the generic log/todo assistant.',
      'Do not propose tool calls, reminders, or memory updates.',
      'Reply in natural Chinese unless the user clearly wants another language.',
      'Be specific, grounded in the provided week data, and willing to challenge weak narratives gently.',
      'If the user asks a broad reflection question, summarize first and then deepen the discussion.',
      buildPersonaStyleLayer(params.personaPrompt),
      '',
      STRICT_JSON_OUTPUT_RULES,
      '=== Output Schema ===',
      JSON.stringify(WEEKLY_REVIEW_CHAT_OUTPUT_SCHEMA, null, 2),
      'Always set "mode" to "foreground".',
      'Use "reply" when you can answer directly and "clarify" only when key information is genuinely missing.',
      'Always set "memoryAction" to "no_update".',
      'Do not include toolCalls, reminders, or memoryPatch.'
    ].filter(Boolean).join('\n\n');

    const userPrompt = [
      '=== Weekly Review Data ===',
      params.weekDataText,
      '',
      '=== User Message ===',
      params.userMessage,
      '',
      'Return one JSON object only.'
    ].join('\n');

    return { systemPrompt, userPrompt };
  },

  buildNarrativeWritebackPrompts(
    params: BuildWeeklyReviewNarrativePromptParams
  ): { systemPrompt: string; userPrompt: string } {
    const mergeInstruction = (
      params.mergeMode === 'merge'
        ? 'There is already an existing weekly-review narrative. Integrate it with the new discussion instead of overwriting it mechanically.'
        : 'Write a fresh weekly-review narrative based on the latest week data and discussion.'
    );
    const overwriteInstruction = (
      params.mergeMode === 'overwrite'
        ? 'Ignore the previous narrative content and produce a full replacement.'
        : ''
    );

    const systemPrompt = [
      'You write polished weekly review narratives for LumosTime.',
      'The output will be written directly into WeeklyReview.narrative.',
      'Write in Chinese and return the full narrative as the JSON field "assistantReply".',
      'Keep the result readable, reflective, and grounded in the provided weekly data and discussion.',
      'Do not mention tool calls, app internals, or that you are generating JSON.',
      mergeInstruction,
      overwriteInstruction,
      buildPersonaStyleLayer(params.personaPrompt),
      '',
      STRICT_JSON_OUTPUT_RULES,
      '=== Output Schema ===',
      JSON.stringify(WEEKLY_REVIEW_NARRATIVE_OUTPUT_SCHEMA, null, 2),
      'Always set "mode" to "foreground".',
      'Always set "outcome" to "reply".',
      'Always set "memoryAction" to "no_update".',
      'Do not include toolCalls, reminders, or memoryPatch.'
    ].filter(Boolean).join('\n\n');

    const userPrompt = [
      '=== Weekly Review Data ===',
      params.weekDataText,
      '',
      params.existingNarrative
        ? [
          '=== Existing Weekly Narrative ===',
          params.existingNarrative
        ].join('\n')
        : '',
      params.conversationSummary
        ? [
          '=== Conversation Summary ===',
          params.conversationSummary
        ].join('\n')
        : '',
      '',
      'Write the final WeeklyReview.narrative content now.',
      'Return one JSON object only.'
    ].filter(Boolean).join('\n');

    return { systemPrompt, userPrompt };
  }
};
