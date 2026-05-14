/**
 * @file monthlyReviewTemplateService.ts
 * @input Monthly review range selection text, local logs/todos/reviews, and optional existing monthly review content
 * @output Parsed monthly-review template targets, structured monthly context digests, and dedicated monthly-review AI prompt text
 * @pos Service (Monthly Review Template)
 * @description Centralizes the monthly-review template workflow, including strict month-range parsing, method selection metadata, Monthly Review lookup/creation helpers, compact per-month data packaging, and prompt composition for both monthly-review chat and monthly-review narrative writeback.
 * @updated 2026-05-13: Added the first monthly-review template service by mirroring the weekly-review template flow with month-based range selection and writeback.
 */

import type {
  Category,
  DailyReview,
  Log,
  MonthlyReview,
  ReviewTemplate,
  Scope,
  TodoCategory,
  TodoItem,
  WeeklyReview
} from '../types';
import { MONTHLY_REVIEW_TEMPLATE_PROMPTS } from '../constants/monthlyReviewTemplatePrompts';
import { calculateMonthlyStats, formatDuration, generateCheckItemStatsText } from '../utils/reviewStatsUtils';
import { getLocalDateStr, getLocalTimeStr } from '../utils/dateUtils';

const STRICT_JSON_OUTPUT_RULES = [
  '=== Structured Output Contract ===',
  'You must return exactly one strict JSON object.',
  'Do not return any text before or after the JSON object.',
  'Do not use Markdown fences, comments, headings, or explanation outside the JSON.',
  'Your entire response must be valid JSON parsable by JSON.parse with no cleanup step.'
].join('\n');

const MONTHLY_REVIEW_CHAT_OUTPUT_SCHEMA = {
  mode: 'foreground',
  outcome: 'reply | clarify',
  assistantReply: 'string',
  memoryAction: 'no_update'
};

export type MonthlyReviewTemplateSelectionLabel = '本月' | '上月' | 'custom_date';
export type MonthlyReviewTemplateStage = 'select_range' | 'select_method' | 'ready';
export type MonthlyReviewMethodId = 'pdca' | 'systems' | 'cbt' | 'narrative';

const MONTHLY_REVIEW_METHOD_TITLES: Record<MonthlyReviewMethodId, string> = {
  pdca: 'PDCA',
  systems: '系统复盘',
  cbt: 'CBT',
  narrative: '叙事疗法'
};

const MONTHLY_REVIEW_METHOD_DESCRIPTIONS: Record<MonthlyReviewMethodId, string> = {
  pdca: '适合行动改进，围绕计划、执行、检查、调整来复盘。',
  systems: '适合看模式、瓶颈和杠杆点，关注整月系统如何运转。',
  cbt: '适合纠正过度自责或偏差解释，区分事实、想法、情绪和行为。',
  narrative: '适合梳理这个月的主线、冲突、例外时刻和价值感。'
};

export interface MonthlyReviewTemplateMethodOption {
  id: MonthlyReviewMethodId;
  title: string;
  description: string;
}

export interface MonthlyReviewTemplateSessionMeta {
  templateType: 'monthly_review';
  stage: MonthlyReviewTemplateStage;
  monthStartDate?: string;
  monthEndDate?: string;
  selectedRangeLabel?: MonthlyReviewTemplateSelectionLabel;
  methodId?: MonthlyReviewMethodId;
  methodLabel?: string;
  pendingWriteIntent?: boolean;
}

export interface MonthlyReviewTemplateSelectionResult {
  monthStartDate: string;
  monthEndDate: string;
  selectedRangeLabel: MonthlyReviewTemplateSelectionLabel;
}

interface BuildMonthlyReviewTemplateDataParams {
  monthStartDate: string;
  monthEndDate: string;
  selectedRangeLabel: MonthlyReviewTemplateSelectionLabel;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  monthlyReview?: MonthlyReview;
}

interface BuildMonthlyReviewTemplateChatPromptParams {
  personaPrompt?: string;
  monthDataText: string;
  userMessage: string;
  methodId: MonthlyReviewMethodId;
}

interface BuildMonthlyReviewNarrativePromptParams {
  personaPrompt?: string;
  monthDataText: string;
  conversationSummary: string;
  existingNarrative?: string;
  mergeMode: 'create' | 'overwrite';
}

export interface MonthlyReviewNarrativeToolCall {
  toolName: 'write_monthly_review_narrative';
  args: {
    monthStartDate: string;
    monthEndDate: string;
    mode: 'create' | 'overwrite';
    narrativeMarkdown: string;
  };
}

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

const getMonthRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const toMonthSelectionResult = (
  date: Date,
  selectedRangeLabel: MonthlyReviewTemplateSelectionLabel
): MonthlyReviewTemplateSelectionResult => {
  const { start, end } = getMonthRange(date);
  return {
    monthStartDate: getLocalDateStr(start),
    monthEndDate: getLocalDateStr(end),
    selectedRangeLabel
  };
};

const formatMonthRangeLabel = (monthStartDate: string): string => {
  const start = new Date(`${monthStartDate}T12:00:00`);
  return `${start.getFullYear()}/${start.getMonth() + 1}`;
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

const buildTimelineDigest = (monthLogs: Log[], categories: Category[], todos: TodoItem[]): string => {
  if (monthLogs.length === 0) {
    return '本月没有时间轴记录。';
  }

  const logsByDay = new Map<string, Log[]>();
  monthLogs.forEach((log) => {
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

const buildDailyDurationDigest = (monthLogs: Log[]): string => {
  if (monthLogs.length === 0) {
    return '本月没有按天可汇总的日志。';
  }

  const totals = new Map<string, number>();
  monthLogs.forEach((log) => {
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
  monthLogs: Log[],
  todos: TodoItem[],
  monthStartDate: string,
  monthEndDate: string
): string => {
  const completedTodos = todos.filter((todo) => (
    todo.isCompleted
    && typeof todo.completedAt === 'string'
    && todo.completedAt.trim()
    && getLocalDateStr(new Date(todo.completedAt)) >= monthStartDate
    && getLocalDateStr(new Date(todo.completedAt)) <= monthEndDate
  ));

  const loggedTodoIds = new Set(
    monthLogs
      .map((log) => log.linkedTodoId || '')
      .filter(Boolean)
  );

  const activeTodos = todos.filter((todo) => (
    !todo.isCompleted
    && loggedTodoIds.has(todo.id)
  ));

  const completedLines = completedTodos.length === 0
    ? ['- 本月没有已完成待办记录。']
    : completedTodos.map((todo) => (
      `- ${todo.title}${todo.completedAt ? `（完成于 ${getLocalDateStr(new Date(todo.completedAt))}）` : ''}`
    ));

  const activeLines = activeTodos.length === 0
    ? ['- 本月没有“有投入但未完成”的待办。']
    : activeTodos.map((todo) => `- ${todo.title}`);

  return [
    '[本月待办结果]',
    '已完成待办：',
    ...completedLines,
    '',
    '有投入但未完成的待办：',
    ...activeLines
  ].join('\n');
};

const buildDailyReviewDigest = (dailyReviews: DailyReview[]): string => {
  if (dailyReviews.length === 0) {
    return '本月没有 Daily Review。';
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

const buildWeeklyReviewDigest = (weeklyReviews: WeeklyReview[]): string => {
  if (weeklyReviews.length === 0) {
    return '本月没有 Weekly Review。';
  }

  return weeklyReviews
    .sort((left, right) => left.weekStartDate.localeCompare(right.weekStartDate))
    .map((review) => {
      const summary = compactText(review.summary, 100);
      const narrative = compactText(review.narrative, 120);
      const answerText = review.answers.length > 0
        ? review.answers.map((answer) => `- ${answer.question}: ${compactText(answer.answer, 70)}`).join('\n')
        : '- 暂无引导回答。';

      return [
        `${review.weekStartDate} ~ ${review.weekEndDate}`,
        answerText,
        summary ? `- Weekly summary：${summary}` : '',
        narrative ? `- Weekly narrative：${narrative}` : ''
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
};

const buildMonthlyReviewDigest = (monthlyReview?: MonthlyReview): string => {
  if (!monthlyReview) {
    return '本月还没有 Monthly Review。';
  }

  const answers = monthlyReview.answers.length === 0
    ? '暂无引导回答。'
    : monthlyReview.answers.map((answer) => `- ${answer.question}: ${compactText(answer.answer, 120)}`).join('\n');

  return [
    '已有 Monthly Review：',
    answers,
    monthlyReview.summary ? `现有 summary：${compactText(monthlyReview.summary, 140)}` : '现有 summary：无',
    monthlyReview.narrative ? `现有 narrative：${compactText(monthlyReview.narrative, 180)}` : '现有 narrative：无'
  ].join('\n');
};

const buildStatsDigest = (
  monthLogs: Log[],
  categories: Category[],
  todos: TodoItem[],
  todoCategories: TodoCategory[],
  scopes: Scope[],
  dailyReviews: DailyReview[],
  monthStartDate: string,
  monthEndDate: string
): string => {
  const stats = calculateMonthlyStats(monthLogs, categories, todos, todoCategories, scopes);
  const checkDigest = generateCheckItemStatsText(
    dailyReviews,
    new Date(`${monthStartDate}T00:00:00`),
    new Date(`${monthEndDate}T23:59:59`)
  );

  return [
    '[本月统计]',
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
    '[本月每日时长]',
    buildDailyDurationDigest(monthLogs),
    ...(checkDigest ? ['', checkDigest.trim()] : [])
  ].join('\n');
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

export const monthlyReviewTemplateService = {
  listMethodOptions(): MonthlyReviewTemplateMethodOption[] {
    return (Object.entries(MONTHLY_REVIEW_METHOD_TITLES) as Array<[MonthlyReviewMethodId, string]>).map(([id, title]) => ({
      id,
      title,
      description: MONTHLY_REVIEW_METHOD_DESCRIPTIONS[id]
    }));
  },

  parseMethodSelectionInput(input: string): MonthlyReviewMethodId | null {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.toLowerCase().replace(/\s+/g, '');
    if (normalized === 'pdca') {
      return 'pdca';
    }

    if (normalized === 'cbt') {
      return 'cbt';
    }

    if (trimmed === '系统复盘') {
      return 'systems';
    }

    if (trimmed === '叙事疗法') {
      return 'narrative';
    }

    return null;
  },

  createSetupSessionMeta(): MonthlyReviewTemplateSessionMeta {
    return {
      templateType: 'monthly_review',
      stage: 'select_range'
    };
  },

  getRangeSelectionPrompt(): string {
    return [
      '这次我们先一步一步来。',
      '你想复盘哪一个月？',
      '可以直接回复：本月、上月，或者输入一个 8 位日期 YYYYMMDD 来定位那一天所在的整个月。'
    ].join('\n');
  },

  getRangeSelectionInvalidPrompt(): string {
    return '我暂时只能识别“本月”“上月”或 8 位日期 YYYYMMDD，你重新输入一次就行。';
  },

  getMethodSelectionPrompt(selection: MonthlyReviewTemplateSelectionResult): string {
    return [
      `即将复盘 ${selection.monthStartDate} ~ ${selection.monthEndDate}。`,
      '要采用哪一种分析方式呢？',
      `可以回复：${monthlyReviewTemplateService.listMethodOptions().map((item) => item.title).join(' / ')}`
    ].join('\n');
  },

  getMethodSelectionInvalidPrompt(): string {
    return `暂时只支持这四种方法：${monthlyReviewTemplateService.listMethodOptions().map((item) => item.title).join(' / ')}。请重新输入一种方法。`;
  },

  parseMonthSelectionInput(input: string, now: Date = new Date()): MonthlyReviewTemplateSelectionResult | null {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed === '本月') {
      return toMonthSelectionResult(now, '本月');
    }

    if (trimmed === '上月') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15, 12, 0, 0, 0);
      return toMonthSelectionResult(lastMonth, '上月');
    }

    const parsedDate = parseEightDigitDate(trimmed);
    return parsedDate ? toMonthSelectionResult(parsedDate, 'custom_date') : null;
  },

  createSessionMeta(
    selection: MonthlyReviewTemplateSelectionResult,
    methodId: MonthlyReviewMethodId
  ): MonthlyReviewTemplateSessionMeta {
    return {
      templateType: 'monthly_review',
      stage: 'ready',
      monthStartDate: selection.monthStartDate,
      monthEndDate: selection.monthEndDate,
      selectedRangeLabel: selection.selectedRangeLabel,
      methodId,
      methodLabel: MONTHLY_REVIEW_METHOD_TITLES[methodId]
    };
  },

  getSessionTitle(selection: MonthlyReviewTemplateSelectionResult): string {
    return `月复盘 ${formatMonthRangeLabel(selection.monthStartDate)}`;
  },

  getIntroMessage(selection: MonthlyReviewTemplateSelectionResult, methodId: MonthlyReviewMethodId): string {
    const sourceLabel = selection.selectedRangeLabel === 'custom_date'
      ? '自定义日期所在月'
      : selection.selectedRangeLabel;
    return [
      `已进入月复盘：${selection.monthStartDate} ~ ${selection.monthEndDate}（${sourceLabel}）。`,
      `当前分析方法：${MONTHLY_REVIEW_METHOD_TITLES[methodId]}。`,
      '接下来你可以直接和我讨论这个月的节奏、推进、卡点和收获。',
      '如果最后要落到月报里，请发送：写入 AI 叙事'
    ].join('\n');
  },

  isWriteNarrativeCommand(input: string): boolean {
    return input.trim() === '写入 AI 叙事';
  },

  findMonthlyReview(
    monthlyReviews: MonthlyReview[],
    monthStartDate: string,
    monthEndDate: string
  ): MonthlyReview | undefined {
    return monthlyReviews.find((review) => (
      review.monthStartDate === monthStartDate && review.monthEndDate === monthEndDate
    ));
  },

  ensureMonthlyReview(
    monthlyReviews: MonthlyReview[],
    reviewTemplates: ReviewTemplate[],
    monthStartDate: string,
    monthEndDate: string
  ): { monthlyReviews: MonthlyReview[]; monthlyReview: MonthlyReview; created: boolean } {
    const existing = monthlyReviewTemplateService.findMonthlyReview(monthlyReviews, monthStartDate, monthEndDate);
    if (existing) {
      return { monthlyReviews, monthlyReview: existing, created: false };
    }

    const templateSnapshot = reviewTemplates
      .filter((template) => template.isMonthlyTemplate)
      .sort((left, right) => left.order - right.order)
      .map((template) => ({
        id: template.id,
        title: template.title,
        questions: template.questions,
        order: template.order,
        syncToTimeline: template.syncToTimeline
      }));

    const now = Date.now();
    const createdReview: MonthlyReview = {
      id: crypto.randomUUID(),
      monthStartDate,
      monthEndDate,
      createdAt: now,
      updatedAt: now,
      answers: [],
      templateSnapshot
    };

    return {
      monthlyReviews: [...monthlyReviews, createdReview],
      monthlyReview: createdReview,
      created: true
    };
  },

  updateMonthlyReviewNarrative(
    monthlyReviews: MonthlyReview[],
    reviewId: string,
    narrative: string
  ): MonthlyReview[] {
    const updatedAt = Date.now();
    return monthlyReviews.map((review) => (
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

  buildMonthDataText(params: BuildMonthlyReviewTemplateDataParams): string {
    const monthStart = new Date(`${params.monthStartDate}T00:00:00`);
    const monthEnd = new Date(`${params.monthEndDate}T23:59:59`);
    const monthLogs = params.logs
      .filter((log) => log.startTime >= monthStart.getTime() && log.endTime <= monthEnd.getTime())
      .sort((left, right) => left.startTime - right.startTime);
    const monthDailyReviews = params.dailyReviews.filter((review) => (
      review.date >= params.monthStartDate && review.date <= params.monthEndDate
    ));
    const monthWeeklyReviews = params.weeklyReviews.filter((review) => (
      review.weekStartDate <= params.monthEndDate && review.weekEndDate >= params.monthStartDate
    ));

    return [
      '[月范围]',
      `monthStartDate: ${params.monthStartDate}`,
      `monthEndDate: ${params.monthEndDate}`,
      `selection: ${params.selectedRangeLabel}`,
      '',
      buildStatsDigest(
        monthLogs,
        params.categories,
        params.todos,
        params.todoCategories,
        params.scopes,
        monthDailyReviews,
        params.monthStartDate,
        params.monthEndDate
      ),
      '',
      '[本月时间轴]',
      buildTimelineDigest(monthLogs, params.categories, params.todos),
      '',
      buildTodoResultDigest(monthLogs, params.todos, params.monthStartDate, params.monthEndDate),
      '',
      '[本月 Daily Review]',
      buildDailyReviewDigest(monthDailyReviews),
      '',
      '[本月 Weekly Review]',
      buildWeeklyReviewDigest(monthWeeklyReviews),
      '',
      '[本月 Monthly Review]',
      buildMonthlyReviewDigest(params.monthlyReview)
    ].join('\n');
  },

  async buildChatPrompts(
    params: BuildMonthlyReviewTemplateChatPromptParams
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    const methodPrompt = MONTHLY_REVIEW_TEMPLATE_PROMPTS.chatMethodPrompts[params.methodId] || '';

    const systemPrompt = [
      '你是 LumosTime 的月复盘对话助手。',
      '这是一段只服务于某个选定月份的模板对话。',
      '你的任务是只基于提供的月数据包，帮助用户复盘这一个月。',
      '保持在讨论模式里，不要表现得像通用的 log/todo 助手。',
      '不要提出 tool calls、reminders 或 memory updates。',
      '默认用自然中文回复，除非用户明确想用别的语言。',
      buildPersonaStyleLayer(params.personaPrompt),
      '',
      '=== Monthly Review Common Prompt ===',
      MONTHLY_REVIEW_TEMPLATE_PROMPTS.chatCommonPrompt,
      '',
      `=== Monthly Review Method Prompt (${MONTHLY_REVIEW_METHOD_TITLES[params.methodId]}) ===`,
      methodPrompt,
      '',
      STRICT_JSON_OUTPUT_RULES,
      '=== Output Schema ===',
      JSON.stringify(MONTHLY_REVIEW_CHAT_OUTPUT_SCHEMA, null, 2),
      '始终把 "mode" 设为 "foreground"。',
      '当你可以直接回答时使用 "reply"，只有在关键信息确实缺失时才使用 "clarify"。',
      '始终把 "memoryAction" 设为 "no_update"。',
      '不要包含 toolCalls、reminders 或 memoryPatch。'
    ].filter(Boolean).join('\n\n');

    const userPrompt = [
      '=== Monthly Review Data ===',
      params.monthDataText,
      '',
      '=== User Message ===',
      params.userMessage,
      '',
      '只返回一个 JSON object。'
    ].join('\n');

    return { systemPrompt, userPrompt };
  },

  async buildNarrativeWritebackPrompts(
    params: BuildMonthlyReviewNarrativePromptParams
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    const monthStartDate = params.monthDataText.match(/monthStartDate:\s*(.+)/)?.[1]?.trim() || '';
    const monthEndDate = params.monthDataText.match(/monthEndDate:\s*(.+)/)?.[1]?.trim() || '';

    const systemPrompt = [
      '你现在要为 LumosTime 准备一个本地 tool call。',
      'tool name 必须精确等于 "write_monthly_review_narrative"。',
      '你的任务是为这个 tool 返回一个完整的 narrativeMarkdown 字符串。',
      '请用中文写。',
      '这个 narrativeMarkdown 必须已经是完整可写入的 Markdown，并且必须恰好包含以下三部分：',
      '1. 第一行标题。',
      '2. 中间正文。',
      '3. 结尾一个 blockquote 金句。',
      'Markdown 结构应类似："# 标题\\n\\n正文\\n\\n> 金句"。',
      '不要在 JSON tool-call object 之外输出任何 prose。',
      buildPersonaStyleLayer(params.personaPrompt),
      '',
      '=== Monthly Review Writeback Common Prompt ===',
      MONTHLY_REVIEW_TEMPLATE_PROMPTS.writebackCommonPrompt,
      '',
      STRICT_JSON_OUTPUT_RULES,
      '=== Output Schema ===',
      JSON.stringify({
        toolName: 'write_monthly_review_narrative',
        args: {
          monthStartDate: 'string',
          monthEndDate: 'string',
          mode: 'create | overwrite',
          narrativeMarkdown: 'string'
        }
      }, null, 2)
    ].filter(Boolean).join('\n\n');

    const userPrompt = [
      '=== Monthly Review Data ===',
      params.monthDataText,
      '',
      params.existingNarrative
        ? [
          '=== Existing Monthly Narrative ===',
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
      '=== Required Tool Arguments ===',
      `monthStartDate: ${monthStartDate}`,
      `monthEndDate: ${monthEndDate}`,
      `mode: ${params.mergeMode}`,
      '',
      '现在请精确返回一个 write_monthly_review_narrative tool-call JSON object。',
      '只返回一个 JSON object。'
    ].filter(Boolean).join('\n');

    return { systemPrompt, userPrompt };
  },

  parseNarrativeToolCallResponse(
    raw: string,
    expectedMonthStartDate: string,
    expectedMonthEndDate: string,
    expectedMode: 'create' | 'overwrite'
  ): MonthlyReviewNarrativeToolCall {
    const cleaned = raw
      .replace(/```json\s*|\s*```/gi, '')
      .replace(/```\s*|\s*```/g, '')
      .trim();
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    const jsonText = objectStart >= 0 && objectEnd > objectStart
      ? cleaned.slice(objectStart, objectEnd + 1)
      : cleaned;
    const parsed = JSON.parse(jsonText) as Partial<MonthlyReviewNarrativeToolCall>;

    if (parsed.toolName !== 'write_monthly_review_narrative' || !parsed.args) {
      throw new Error('AI 没有返回 write_monthly_review_narrative 工具调用。');
    }

    const narrativeMarkdown = typeof parsed.args.narrativeMarkdown === 'string'
      ? parsed.args.narrativeMarkdown.trim()
      : '';
    if (!narrativeMarkdown) {
      throw new Error('AI 返回的月叙事 Markdown 为空。');
    }

    return {
      toolName: 'write_monthly_review_narrative',
      args: {
        monthStartDate: expectedMonthStartDate,
        monthEndDate: expectedMonthEndDate,
        mode: expectedMode,
        narrativeMarkdown
      }
    };
  },

  buildNarrativeFromToolCall(toolCall: MonthlyReviewNarrativeToolCall): string {
    return toolCall.args.narrativeMarkdown.trim();
  }
};
