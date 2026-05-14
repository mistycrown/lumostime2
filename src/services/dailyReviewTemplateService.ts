/**
 * @file dailyReviewTemplateService.ts
 * @input Current-day logs/todos/reviews plus optional existing daily review content
 * @output Structured daily-review context text, strict daily writeback prompts, and local daily review ensure/update helpers
 * @pos Service (Daily Review Template)
 * @description Powers the ordinary-chat `日报` command by packaging one day's local context, composing a dedicated AI writeback prompt, and parsing the strict JSON tool call back into a daily narrative write.
 * @updated 2026-05-14: Added the first dedicated daily-review writeback service for ordinary-chat narrative generation and writeback.
 */

import type {
  Category,
  CheckTemplate,
  DailyReview,
  Log,
  ReviewTemplate,
  Scope,
  TodoCategory,
  TodoItem
} from '../types';
import { DAILY_REVIEW_TEMPLATE_PROMPTS } from '../constants/dailyReviewTemplatePrompts';
import { createDailyReviewFromTemplates } from '../utils/dailyCheckUtils';
import { calculateMonthlyStats, formatDuration, generateCheckItemStatsText } from '../utils/reviewStatsUtils';
import { getLocalDateStr, getLocalTimeStr } from '../utils/dateUtils';

const STRICT_JSON_OUTPUT_RULES = [
  '=== Structured Output Contract ===',
  'You must return exactly one strict JSON object.',
  'Do not return any text before or after the JSON object.',
  'Do not use Markdown fences, comments, headings, or explanation outside the JSON.',
  'Your entire response must be valid JSON parsable by JSON.parse with no cleanup step.'
].join('\n');

interface BuildDailyReviewTemplateDataParams {
  date: string;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  dailyReviews: DailyReview[];
  dailyReview: DailyReview;
}

interface BuildDailyReviewNarrativePromptParams {
  personaPrompt?: string;
  dayDataText: string;
  conversationSummary: string;
  existingNarrative?: string;
  mergeMode: 'create' | 'overwrite';
}

export interface DailyReviewNarrativeWritebackResponse {
  assistantReply: string;
  toolCall: DailyReviewNarrativeToolCall;
}

export interface DailyReviewNarrativeToolCall {
  toolName: 'write_daily_review_narrative';
  args: {
    date: string;
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

const buildTimelineDigest = (dayLogs: Log[], categories: Category[], todos: TodoItem[]): string => {
  if (dayLogs.length === 0) {
    return '今天还没有时间轴记录。';
  }

  return dayLogs
    .sort((left, right) => left.startTime - right.startTime)
    .map((log) => `- ${buildLogLabel(log, categories, todos)}`)
    .join('\n');
};

const buildTodoDigest = (
  dayLogs: Log[],
  todos: TodoItem[],
  date: string
): string => {
  const completedTodos = todos.filter((todo) => (
    todo.isCompleted
    && typeof todo.completedAt === 'string'
    && todo.completedAt.trim()
    && getLocalDateStr(new Date(todo.completedAt)) === date
  ));
  const loggedTodoIds = new Set(
    dayLogs
      .map((log) => log.linkedTodoId || '')
      .filter(Boolean)
  );
  const activeTodos = todos.filter((todo) => !todo.isCompleted && loggedTodoIds.has(todo.id));

  return [
    '[今日待办结果]',
    '已完成待办：',
    ...(completedTodos.length > 0
      ? completedTodos.map((todo) => `- ${todo.title}`)
      : ['- 今天没有已完成待办记录。']),
    '',
    '有投入但未完成的待办：',
    ...(activeTodos.length > 0
      ? activeTodos.map((todo) => `- ${todo.title}`)
      : ['- 今天没有“有投入但未完成”的待办。'])
  ].join('\n');
};

const buildDailyReviewDigest = (dailyReview: DailyReview): string => {
  const answers = dailyReview.answers.length === 0
    ? '暂无引导回答。'
    : dailyReview.answers.map((answer) => `- ${answer.question}: ${compactText(answer.answer, 120)}`).join('\n');
  const completedChecks = (dailyReview.checkItems || []).filter((item) => item.isCompleted).length;
  const totalChecks = dailyReview.checkItems?.length || 0;

  return [
    '[今日日报现状]',
    `date: ${dailyReview.date}`,
    `日课完成：${totalChecks > 0 ? `${completedChecks}/${totalChecks}` : '无'}`,
    dailyReview.summary ? `现有 summary：${compactText(dailyReview.summary, 140)}` : '现有 summary：无',
    dailyReview.narrative ? `现有 narrative：${compactText(dailyReview.narrative, 180)}` : '现有 narrative：无',
    '',
    '引导回答：',
    answers
  ].join('\n');
};

const buildStatsDigest = (
  dayLogs: Log[],
  categories: Category[],
  todos: TodoItem[],
  todoCategories: TodoCategory[],
  scopes: Scope[],
  dailyReviews: DailyReview[],
  date: string
): string => {
  const stats = calculateMonthlyStats(dayLogs, categories, todos, todoCategories, scopes);
  const dayDate = new Date(`${date}T12:00:00`);
  const checkDigest = generateCheckItemStatsText(dailyReviews, dayDate, dayDate);

  return [
    '[今日统计]',
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

export const dailyReviewTemplateService = {
  ensureDailyReview(
    dailyReviews: DailyReview[],
    checkTemplates: CheckTemplate[],
    reviewTemplates: ReviewTemplate[],
    date: string
  ): { dailyReviews: DailyReview[]; dailyReview: DailyReview; created: boolean } {
    const existing = dailyReviews.find((review) => review.date === date);
    if (existing) {
      return { dailyReviews, dailyReview: existing, created: false };
    }

    const createdReview = createDailyReviewFromTemplates(date, checkTemplates, reviewTemplates);
    return {
      dailyReviews: [...dailyReviews, createdReview],
      dailyReview: createdReview,
      created: true
    };
  },

  updateDailyReviewNarrative(
    dailyReviews: DailyReview[],
    reviewId: string,
    narrative: string
  ): DailyReview[] {
    const updatedAt = Date.now();
    return dailyReviews.map((review) => (
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

  buildDayDataText(params: BuildDailyReviewTemplateDataParams): string {
    const dayStart = new Date(`${params.date}T00:00:00`).getTime();
    const dayEnd = new Date(`${params.date}T23:59:59.999`).getTime();
    const dayLogs = params.logs
      .filter((log) => log.startTime >= dayStart && log.endTime <= dayEnd)
      .sort((left, right) => left.startTime - right.startTime);
    const dayReviews = params.dailyReviews.filter((review) => review.date === params.date);

    return [
      '[日期范围]',
      `date: ${params.date}`,
      '',
      buildStatsDigest(
        dayLogs,
        params.categories,
        params.todos,
        params.todoCategories,
        params.scopes,
        dayReviews,
        params.date
      ),
      '',
      '[今日日程时间轴]',
      buildTimelineDigest(dayLogs, params.categories, params.todos),
      '',
      buildTodoDigest(dayLogs, params.todos, params.date),
      '',
      buildDailyReviewDigest(params.dailyReview)
    ].join('\n');
  },

  async buildNarrativeWritebackPrompts(
    params: BuildDailyReviewNarrativePromptParams
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    const date = params.dayDataText.match(/date:\s*(.+)/)?.[1]?.trim() || '';

    const systemPrompt = [
      '你现在要为 LumosTime 准备一个本地 tool call。',
      'tool name 必须精确等于 "write_daily_review_narrative"。',
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
      '=== Daily Review Writeback Common Prompt ===',
      DAILY_REVIEW_TEMPLATE_PROMPTS.writebackCommonPrompt,
      '',
      STRICT_JSON_OUTPUT_RULES,
      '=== Output Schema ===',
      JSON.stringify({
        assistantReply: 'string',
        toolCall: {
          toolName: 'write_daily_review_narrative',
          args: {
            date: 'string',
            mode: 'create | overwrite',
            narrativeMarkdown: 'string'
          }
        }
      }, null, 2)
    ].filter(Boolean).join('\n\n');

    const userPrompt = [
      '=== Daily Review Data ===',
      params.dayDataText,
      '',
      params.existingNarrative
        ? [
          '=== Existing Daily Narrative ===',
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
      `date: ${date}`,
      `mode: ${params.mergeMode}`,
      '',
      '请返回一个 JSON object，其中 assistantReply 是给用户看的简短总结回复，toolCall 是精确的 write_daily_review_narrative 工具调用。',
      '只返回一个 JSON object。'
    ].filter(Boolean).join('\n');

    return { systemPrompt, userPrompt };
  },

  parseNarrativeToolCallResponse(
    raw: unknown,
    expectedDate: string,
    expectedMode: 'create' | 'overwrite'
  ): DailyReviewNarrativeWritebackResponse {
    const parsed = typeof raw === 'string'
      ? JSON.parse(raw) as {
        assistantReply?: unknown;
        toolCall?: Partial<DailyReviewNarrativeToolCall>;
      }
      : raw as {
        assistantReply?: unknown;
        toolCall?: Partial<DailyReviewNarrativeToolCall>;
      };

    if (!parsed.toolCall || parsed.toolCall.toolName !== 'write_daily_review_narrative' || !parsed.toolCall.args) {
      throw new Error('AI 没有返回 write_daily_review_narrative 工具调用。');
    }

    const narrativeMarkdown = typeof parsed.toolCall.args.narrativeMarkdown === 'string'
      ? parsed.toolCall.args.narrativeMarkdown.trim()
      : '';
    if (!narrativeMarkdown) {
      throw new Error('AI 返回的日报 Markdown 为空。');
    }

    return {
      assistantReply: typeof parsed.assistantReply === 'string' && parsed.assistantReply.trim()
        ? parsed.assistantReply.trim()
        : '今天的日报已经整理好了。',
      toolCall: {
        toolName: 'write_daily_review_narrative',
        args: {
          date: expectedDate,
          mode: expectedMode,
          narrativeMarkdown
        }
      }
    };
  },

  buildNarrativeFromToolCall(toolCall: DailyReviewNarrativeToolCall): string {
    return toolCall.args.narrativeMarkdown.trim();
  }
};
