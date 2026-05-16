/**
 * @file dailyNewspaperService.ts
 * @input Current-day logs/todos/reviews plus optional existing daily newspaper content
 * @output Structured daily-newspaper context text, strict writeback prompts, and local Daily Review newspaper helpers
 * @pos Service (Daily Review Newspaper)
 * @description Powers the ordinary-chat `小报` command by packaging one day's local context, composing a strict AI writeback contract, and writing lightweight structured newspaper data back onto `DailyReview`.
 * @updated 2026-05-16: Mirrored foreground-chat prompt assembly for daily newspaper writeback by adding the shared base prompt plus stable/volatile state, long-term memory, Dream, and conversation-summary sections.
 * @updated 2026-05-16: Added the first daily newspaper service for AI chat writeback and full-screen newspaper rendering.
 */

import type {
  Category,
  DailyNewspaper,
  DailyReview,
  Log,
  Scope,
  TodoCategory,
  TodoItem
} from '../types';
import type { AssistantMemory, AssistantTurnStateContext } from '../types/assistant';
import { assistantPromptService } from './assistantPromptService';
import { createDailyReviewFromTemplates } from '../utils/dailyCheckUtils';
import { formatAssistantDateTimeForDisplay } from '../utils/assistantTime';
import { getLocalDateStr, getLocalTimeStr } from '../utils/dateUtils';
import { formatDuration } from '../utils/reviewStatsUtils';
import { getParentTodo } from '../utils/todoHierarchyUtils';

const stringifyJson = (value: unknown): string => JSON.stringify(value, null, 2);

const STABLE_STATE_CONTEXT_KEYS = [
  'currentLocalDate',
  'currentWeekday',
  'tomorrowDate',
  'dayAfterTomorrowDate',
  'currentWeekRange',
  'nextWeekdayDates',
  'timelineSummaryForDate',
  'timelineSummaryForPreviousDate',
  'timelineReviewSummary',
  'scheduledTodosForDateSummary',
  'pinnedTodoSummary',
  'overdueTodoSummary'
] as const;

const VOLATILE_STATE_CONTEXT_KEYS = [
  'currentDateTime',
  'stateContextDate',
  'activeSessionSummary',
  'reminderSummary'
] as const;

const STRICT_JSON_OUTPUT_RULES = [
  '=== Structured Output Contract ===',
  'You must return exactly one strict JSON object.',
  'Do not return any text before or after the JSON object.',
  'Do not use Markdown fences, comments, headings, or explanation outside the JSON.',
  'Your entire response must be valid JSON parsable by JSON.parse with no cleanup step.'
].join('\n');

interface BuildDailyNewspaperDataParams {
  date: string;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
  dailyReview: DailyReview;
}

interface BuildDailyNewspaperPromptParams {
  personaPrompt?: string;
  dayDataText: string;
  conversationSummary?: string;
  existingNewspaper?: DailyNewspaper;
  mergeMode: 'create' | 'overwrite';
  stateContext?: AssistantTurnStateContext;
  memorySnapshot?: AssistantMemory;
  dreamContext?: string;
}

export interface DailyNewspaperWritebackToolCall {
  toolName: 'write_daily_newspaper';
  args: {
    date: string;
    mode: 'create' | 'overwrite';
    title: string;
    overallComment: string;
    annotations: Array<{
      logId: string;
      comment: string;
    }>;
  };
}

export interface DailyNewspaperWritebackResponse {
  assistantReply: string;
  toolCalls?: unknown[];
  newspaperToolCall: DailyNewspaperWritebackToolCall;
}

const pickPromptSection = <
  TSource extends Record<string, unknown>,
  TKey extends keyof TSource
>(
  source: TSource,
  keys: readonly TKey[]
): Partial<Pick<TSource, TKey>> => (
  Object.fromEntries(
    keys.flatMap((key) => (
      source[key] === undefined
        ? []
        : [[key, source[key]] as const]
    ))
  ) as Partial<Pick<TSource, TKey>>
);

const formatPromptDateTime = (value?: string | null): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  return formatAssistantDateTimeForDisplay(value) || value.trim();
};

const buildPromptMemorySnapshot = (memory: AssistantMemory): AssistantMemory => ({
  ...memory,
  updatedAt: formatPromptDateTime(memory.updatedAt) || memory.updatedAt,
  activeReminders: memory.activeReminders.map((reminder) => ({
    ...reminder,
    dueAt: formatPromptDateTime(reminder.dueAt) || reminder.dueAt,
    createdAt: formatPromptDateTime(reminder.createdAt) || reminder.createdAt,
    ...(reminder.lastDispatchAttemptAt
      ? {
        lastDispatchAttemptAt: formatPromptDateTime(reminder.lastDispatchAttemptAt) || reminder.lastDispatchAttemptAt
      }
      : {}),
    ...(reminder.lastDispatchedAt
      ? { lastDispatchedAt: formatPromptDateTime(reminder.lastDispatchedAt) || reminder.lastDispatchedAt }
      : {})
  })),
  ...(memory.lastAgentRunAt
    ? { lastAgentRunAt: formatPromptDateTime(memory.lastAgentRunAt) || memory.lastAgentRunAt }
    : {})
});

const compactText = (value?: string, maxLength = 90): string => {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`
    : normalized;
};

const formatTimeRange = (startTime: number, endTime: number): string => (
  `${getLocalTimeStr(new Date(startTime))}-${getLocalTimeStr(new Date(endTime))}`
);

const buildScopeNames = (scopeIds: string[] | undefined, scopes: Scope[]): string[] => (
  Array.isArray(scopeIds)
    ? scopeIds
      .map((scopeId) => scopes.find((item) => item.id === scopeId)?.name || '')
      .filter(Boolean)
    : []
);

const buildLogLabel = (
  log: Log,
  categories: Category[],
  todos: TodoItem[],
  scopes: Scope[]
): string => {
  const category = categories.find((item) => item.id === log.categoryId);
  const activity = category?.activities.find((item) => item.id === log.activityId)
    || categories.flatMap((item) => item.activities).find((item) => item.id === log.activityId);
  const linkedTodo = log.linkedTodoId
    ? todos.find((item) => item.id === log.linkedTodoId)
    : undefined;
  const parentTodo = linkedTodo ? getParentTodo(todos, linkedTodo) : null;
  const todoLabel = linkedTodo
    ? (parentTodo ? `${linkedTodo.title} @${parentTodo.title}` : linkedTodo.title)
    : '';
  const scopeNames = buildScopeNames(log.scopeIds, scopes);
  const note = compactText(log.note, 120);

  return [
    `- logId: ${log.id}`,
    `  time: ${formatTimeRange(log.startTime, log.endTime)}`,
    `  category: ${category?.name || '未分类'}`,
    `  activity: ${activity?.name || log.title || '未命名记录'}`,
    `  duration: ${formatDuration(log.duration)}`,
    todoLabel ? `  todo: ${todoLabel}` : '',
    scopeNames.length > 0 ? `  scopes: ${scopeNames.join(' / ')}` : '',
    note ? `  note: ${note}` : ''
  ].filter(Boolean).join('\n');
};

const buildTimelineDigest = (
  dayLogs: Log[],
  categories: Category[],
  todos: TodoItem[],
  scopes: Scope[]
): string => {
  if (dayLogs.length === 0) {
    return '今天还没有时间轴记录。';
  }

  return dayLogs
    .sort((left, right) => left.startTime - right.startTime)
    .map((log) => buildLogLabel(log, categories, todos, scopes))
    .join('\n');
};

const buildTodoDigest = (_dayLogs: Log[], todos: TodoItem[], date: string): string => {
  const completedTodos = todos.filter((todo) => (
    todo.isCompleted
    && typeof todo.completedAt === 'string'
    && todo.completedAt.trim()
    && getLocalDateStr(new Date(todo.completedAt)) === date
  ));

  return [
    '[今日待办脉络]',
    '已完成：',
    ...(completedTodos.length > 0
      ? completedTodos.map((todo) => `- ${todo.title}`)
      : ['- 今日没有已完成待办记录。'])
  ].join('\n');
};

const buildReviewDigest = (dailyReview: DailyReview): string => [
  '[当日日报状态]',
  `date: ${dailyReview.date}`,
  dailyReview.summary ? `summary: ${compactText(dailyReview.summary, 140)}` : 'summary: 无',
  dailyReview.narrative ? `narrative: ${compactText(dailyReview.narrative, 180)}` : 'narrative: 无',
  dailyReview.aiNewspaper
    ? `existingNewspaper: ${compactText(dailyReview.aiNewspaper.overallComment, 180)}`
    : 'existingNewspaper: 无'
].join('\n');

const buildPersonaPromptLayer = (personaPrompt?: string): string => {
  const trimmed = personaPrompt?.trim();
  if (!trimmed) {
    return '';
  }

  return [
    '=== User Persona Prompt ===',
    trimmed,
    'Apply this only as tone and interaction style.',
    'Do not switch back to the generic assistant task routing.'
  ].join('\n');
};

export const dailyNewspaperService = {
  ensureDailyReview(
    dailyReviews: DailyReview[],
    checkTemplates: any[],
    reviewTemplates: any[],
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

  updateDailyReviewNewspaper(
    dailyReviews: DailyReview[],
    reviewId: string,
    newspaper: DailyNewspaper
  ): DailyReview[] {
    const updatedAt = Date.now();
    return dailyReviews.map((review) => (
      review.id === reviewId
        ? {
          ...review,
          aiNewspaper: {
            ...newspaper,
            updatedAt
          },
          updatedAt
        }
        : review
    ));
  },

  buildDayDataText(params: BuildDailyNewspaperDataParams): string {
    const dayStart = new Date(`${params.date}T00:00:00`).getTime();
    const dayEnd = new Date(`${params.date}T23:59:59.999`).getTime();
    const dayLogs = params.logs
      .filter((log) => log.startTime >= dayStart && log.endTime <= dayEnd)
      .sort((left, right) => left.startTime - right.startTime);

    return [
      '[日期范围]',
      `date: ${params.date}`,
      '',
      '[今日日程时间轴]',
      buildTimelineDigest(dayLogs, params.categories, params.todos, params.scopes),
      '',
      buildTodoDigest(dayLogs, params.todos, params.date),
      '',
      buildReviewDigest(params.dailyReview)
    ].join('\n');
  },

  async buildWritebackPrompts(
    params: BuildDailyNewspaperPromptParams
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    const date = params.dayDataText.match(/date:\s*(.+)/)?.[1]?.trim() || '';
    const assistantBasePrompt = await assistantPromptService.getAssistantBasePrompt();
    const stableStateContext = params.stateContext
      ? pickPromptSection(params.stateContext, STABLE_STATE_CONTEXT_KEYS)
      : {};
    const volatileStateContext = params.stateContext
      ? pickPromptSection(params.stateContext, VOLATILE_STATE_CONTEXT_KEYS)
      : {};

    const systemPrompt = [
      buildPersonaPromptLayer(params.personaPrompt),
      '=== Assistant Base Prompt ===',
      assistantBasePrompt,
      '',
      '=== Daily Newspaper Writeback Prompt ===',
      '你现在要为 LumosTime 准备一个本地 tool call。',
      'newspaperToolCall.toolName 必须精确等于 "write_daily_newspaper"。',
      '你必须基于给定的真实时间轴，为当天输出一个总评，并为部分值得点评的记录输出简短批注。',
      '请用中文写。',
      'assistantReply 是展示在对话窗口里的简短回复。',
      'newspaperToolCall.args.annotations 里每一项都必须使用输入里真实存在的 logId。',
      '你可以选择性批注，不要求覆盖每一条记录；但整体上请尽量多批注一些，优先覆盖有转折、有情绪、有推进、有停滞、有反差、或最能代表这一天节奏的事件。',
      '对于明显重复、信息量很低、只是机械延续前文的记录，可以不批注。',
      'annotations批注要短，不要写成长段散文，每条一两句以内。overallComment可以稍长，展现出你的看法和观点。',
      '如果采用老师、导师、教练类人设，批注可以更像有分寸的点拨、提醒、提炼与鼓励。',
      '如果采用陪伴、朋友、聊天类人设，批注可以更口语、更贴近陪聊和共感，但仍要有具体观察，不要空泛。',
      '总评和逐条批注都要体现当前 persona 的说话方式，而不是统一模板腔。',
      '如果你还想调用普通工具函数，可以把它们放进 toolCalls 数组；如果不需要，就返回空数组。',
      '除了 JSON 对象本身，不要输出任何多余文本。',
      '',
      STRICT_JSON_OUTPUT_RULES,
      '=== Output Schema ===',
      stringifyJson({
        assistantReply: 'string',
        toolCalls: [],
        newspaperToolCall: {
          toolName: 'write_daily_newspaper',
          args: {
            date: 'string',
            mode: 'create | overwrite',
            title: 'string',
            overallComment: 'string',
            annotations: [
              {
                logId: 'string',
                comment: 'string'
              }
            ]
          }
        }
      }),
      ...(Object.keys(stableStateContext).length > 0
        ? ['', '=== Stable State Context ===', stringifyJson(stableStateContext)]
        : []),
      ...(Object.keys(volatileStateContext).length > 0
        ? ['', '=== Volatile State Anchors ===', stringifyJson(volatileStateContext)]
        : []),
      ...(params.memorySnapshot
        ? ['', '=== Memory Snapshot ===', stringifyJson(buildPromptMemorySnapshot(params.memorySnapshot))]
        : []),
      ...(params.dreamContext?.trim()
        ? ['', '=== Dream Context ===', params.dreamContext.trim()]
        : [])
    ].filter(Boolean).join('\n\n');

    const existingSection = params.existingNewspaper
      ? [
        '=== Existing Newspaper ===',
        `title: ${params.existingNewspaper.title}`,
        `overallComment: ${params.existingNewspaper.overallComment}`,
        `annotationCount: ${params.existingNewspaper.annotations.length}`
      ].join('\n')
      : '';
    const conversationContext = stringifyJson({
      summary: params.conversationSummary?.trim() || '暂无'
    });

    const userPrompt = [
      '=== Conversation Context ===',
      conversationContext,
      '',
      '=== Daily Newspaper Data ===',
      params.dayDataText,
      '',
      existingSection,
      '',
      '=== Required Tool Arguments ===',
      `date: ${date}`,
      `mode: ${params.mergeMode}`,
      '',
      '请返回一个 JSON object。',
      'assistantReply 给用户看。',
      'newspaperToolCall 用于把小报写回 Daily Review。',
      'annotations 只保留 logId 和 comment，不要重复拷贝原始事件正文。',
      'annotations 可以是当天记录的子集，不必覆盖全部条目。'
    ].filter(Boolean).join('\n');

    return { systemPrompt, userPrompt };
  },

  parseWritebackResponse(
    raw: unknown,
    expectedDate: string,
    expectedMode: 'create' | 'overwrite'
  ): DailyNewspaperWritebackResponse {
    const parsed = typeof raw === 'string'
      ? JSON.parse(raw) as {
        assistantReply?: unknown;
        toolCalls?: unknown;
        newspaperToolCall?: Partial<DailyNewspaperWritebackToolCall>;
      }
      : raw as {
        assistantReply?: unknown;
        toolCalls?: unknown;
        newspaperToolCall?: Partial<DailyNewspaperWritebackToolCall>;
      };

    if (
      !parsed.newspaperToolCall
      || parsed.newspaperToolCall.toolName !== 'write_daily_newspaper'
      || !parsed.newspaperToolCall.args
    ) {
      throw new Error('AI 没有返回 write_daily_newspaper 工具调用。');
    }

    const args = parsed.newspaperToolCall.args;
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const overallComment = typeof args.overallComment === 'string' ? args.overallComment.trim() : '';
    const annotations = Array.isArray(args.annotations)
      ? args.annotations.flatMap((annotation) => {
        if (!annotation || typeof annotation !== 'object') {
          return [];
        }

        const logId = typeof annotation.logId === 'string' ? annotation.logId.trim() : '';
        const comment = typeof annotation.comment === 'string' ? annotation.comment.trim() : '';
        if (!logId || !comment) {
          return [];
        }

        return [{ logId, comment }];
      })
      : [];

    if (!title) {
      throw new Error('AI 返回的小报标题为空。');
    }

    if (!overallComment) {
      throw new Error('AI 返回的小报总评为空。');
    }

    return {
      assistantReply: typeof parsed.assistantReply === 'string' && parsed.assistantReply.trim()
        ? parsed.assistantReply.trim()
        : '今天的小报已经整理好了。',
      ...(Array.isArray(parsed.toolCalls) ? { toolCalls: parsed.toolCalls } : {}),
      newspaperToolCall: {
        toolName: 'write_daily_newspaper',
        args: {
          date: expectedDate,
          mode: expectedMode,
          title,
          overallComment,
          annotations
        }
      }
    };
  },

  buildNewspaperFromToolCall(
    toolCall: DailyNewspaperWritebackToolCall,
    assistantReply: string
  ): DailyNewspaper {
    return {
      version: 1,
      date: toolCall.args.date,
      title: toolCall.args.title.trim(),
      assistantReply: assistantReply.trim(),
      overallComment: toolCall.args.overallComment.trim(),
      annotations: toolCall.args.annotations.map((annotation) => ({
        logId: annotation.logId.trim(),
        comment: annotation.comment.trim()
      })),
      updatedAt: Date.now()
    };
  }
};
