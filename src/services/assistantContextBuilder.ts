/**
 * @file assistantContextBuilder.ts
 * @input App runtime dictionaries, logs, todos, conversation turns, and current session state
 * @output Shared assistant state-context and dictionary-context snapshots for unified turns
 * @pos Service (Assistant Context Builder)
 * @description Builds the minimal structured context payloads used by the unified assistant-turn architecture so foreground and background flows can share the same state summaries and full candidate dictionaries without duplicating formatting logic in UI components.
 *
 * @updated 2026-05-06: Added explicit `yesterdayTimelineSummary` alongside `todayTimelineSummary` so assistant state context carries concrete activity records for both recent days.
 * @updated 2026-05-06: Kept `todayTimelineSummary` as the full same-day log list, exposed a separate `timelineReviewSummary` digest, and added structured same-day log candidates to the assistant dictionary context for reliable `edit_log` targeting.
 * @updated 2026-04-27: Simplified prompt state time snapshots to one local-offset ISO current-time anchor and stopped exposing assistant-facing UTC `Z` variants.
 * @updated 2026-04-26: Replaced raw recent-log dictionary payloads with a compact digest builder that excludes today's logs and caps history length for lower token use.
 * @updated 2026-04-26: Added a lossless table-style dictionary digest so candidate dictionaries keep their original fields and structural relationships while still avoiding bulky pretty-printed JSON.
 * @updated 2026-04-26: Started carrying both local-offset and UTC "current time" snapshots so reminder prompts have an unambiguous time anchor.
 * @updated 2026-04-26: Added unified state-context, dictionary-context, and conversation-summary builders for the new single-turn assistant architecture.
 */

import type {
  ActiveSession,
  Category,
  DailyReview,
  Log,
  Scope,
  TodoCategory,
  TodoItem
} from '../types';
import type {
  AssistantActivityCategoryDictionaryItem,
  AssistantConversationEntry,
  AssistantLogDictionaryItem,
  AssistantScopeDictionaryItem,
  AssistantTodoCategoryDictionaryItem,
  AssistantTodoDictionaryItem,
  AssistantTurnConversationContext,
  AssistantTurnDictionaryContext,
  AssistantTurnStateContext
} from '../types/assistant';
import { getTodoKind } from '../utils/todoKindUtils';
import { ensureQuickTodoCategory } from '../utils/todoQuickCategoryUtils';

interface BuildStateContextParams {
  currentDateTime: string;
  defaultDate: string;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  activeSessions?: ActiveSession[];
  reminderSummary?: string;
  timelineReviewSummary?: string;
  timelineLimit?: number;
  todoLimit?: number;
}

interface BuildDictionaryContextParams {
  categories?: Category[];
  scopes?: Scope[];
  todoCategories?: TodoCategory[];
  todos?: TodoItem[];
  logs?: Log[];
}

interface BuildRecentLogsDigestParams {
  defaultDate: string;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  limit?: number;
}

interface BuildTimelineSummaryDigestParams {
  defaultDate: string;
  dailyReviews: DailyReview[];
}

const DEFAULT_TIMELINE_LIMIT = 12;
const DEFAULT_TODO_LIMIT = 8;
const DEFAULT_RECENT_LOG_LIMIT = 20;

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeRange = (startTime: number, endTime: number): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const startLabel = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  const endLabel = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  return `${startLabel}-${endLabel}`;
};

const shiftDateKey = (dateKey: string, offsetDays: number): string => {
  const [year, month, day] = dateKey.split('-').map((value) => Number.parseInt(value, 10));
  if ([year, month, day].some((value) => Number.isNaN(value))) {
    return dateKey;
  }

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return formatDateKey(date);
};

const getActivityById = (categories: Category[], activityId?: string) => (
  activityId
    ? categories.flatMap((category) => category.activities).find((activity) => activity.id === activityId)
    : undefined
);

const compactInlineText = (value?: string, maxLength = 48): string => {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
    : normalized;
};

const formatTodoPath = (todo: TodoItem, todos: TodoItem[]): string => {
  const parentTodo = todo.parentTodoId
    ? todos.find((candidate) => candidate.id === todo.parentTodoId)
    : undefined;
  return parentTodo ? `${parentTodo.title} / ${todo.title}` : todo.title;
};

const encodeExactCell = (value: unknown): string => {
  if (value === undefined) {
    return '-';
  }

  return JSON.stringify(value);
};

const buildExactTableSection = (
  title: string,
  headers: string[],
  rows: unknown[][]
): string => {
  if (rows.length === 0) {
    return `[${title}] rows=0`;
  }

  return [
    `[${title}] rows=${rows.length}`,
    headers.join('\t'),
    ...rows.map((row) => row.map((cell) => encodeExactCell(cell)).join('\t'))
  ].join('\n');
};

const buildLogDigestLine = (
  log: Log,
  categories: Category[],
  todos: TodoItem[]
): string => {
  const category = categories.find((item) => item.id === log.categoryId);
  const activity = category?.activities.find((item) => item.id === log.activityId)
    || getActivityById(categories, log.activityId);
  const linkedTodo = log.linkedTodoId
    ? todos.find((todo) => todo.id === log.linkedTodoId)
    : undefined;
  const label = [category?.name, activity?.name || log.title].filter(Boolean).join(' / ');
  const note = compactInlineText(log.note);

  return [
    formatDateKey(new Date(log.startTime)),
    formatTimeRange(log.startTime, log.endTime),
    label,
    linkedTodo ? `@${linkedTodo.title}` : '',
    note ? `note:${note}` : ''
  ].filter(Boolean).join(' | ');
};

const buildTimelineSummaryLine = (label: string, dateKey: string, summary?: string): string => {
  const trimmedSummary = summary?.trim();
  return trimmedSummary
    ? `${label}（${dateKey}）的 timelineSummary：${trimmedSummary}`
    : `${label}（${dateKey}）还没有填写 timelineSummary。`;
};

const buildDayTimelineSummary = (
  logs: Log[],
  categories: Category[],
  dateKey: string,
  timelineLimit: number
): string => (
  logs
    .filter((log) => formatDateKey(new Date(log.startTime)) === dateKey)
    .sort((left, right) => left.startTime - right.startTime)
    .slice(-timelineLimit)
    .map((log) => {
      const category = categories.find((item) => item.id === log.categoryId);
      const activity = category?.activities.find((item) => item.id === log.activityId)
        || getActivityById(categories, log.activityId);
      const label = [category?.name, activity?.name || log.title].filter(Boolean).join(' / ');
      return `${formatTimeRange(log.startTime, log.endTime)} ${label}${log.note ? `：${log.note}` : ''}`;
    })
    .join('\n')
);

export const assistantContextBuilder = {
  summarizeConversationTurns(turns: AssistantConversationEntry[], limit = 30): string {
    return turns
      .slice(-limit)
      .map((turn) => {
        const content = turn.content.trim();
        if (!content) {
          return '';
        }
        return `${turn.role === 'assistant' ? 'Assistant' : 'User'}: ${content}`;
      })
      .filter(Boolean)
      .join('\n');
  },

  buildConversationContext(turns: AssistantConversationEntry[], limit = 30): AssistantTurnConversationContext {
    const trimmedTurns = turns
      .map((turn) => ({
        role: turn.role,
        content: turn.content.trim()
      }))
      .filter((turn) => turn.content.length > 0);

    return {
      recentTurns: trimmedTurns.slice(-limit),
      ...(trimmedTurns.length > 0 ? { summary: assistantContextBuilder.summarizeConversationTurns(trimmedTurns, limit) } : {})
    };
  },

  buildStateContext(params: BuildStateContextParams): AssistantTurnStateContext {
    const timelineLimit = params.timelineLimit ?? DEFAULT_TIMELINE_LIMIT;
    const todoLimit = params.todoLimit ?? DEFAULT_TODO_LIMIT;
    const yesterdayDate = shiftDateKey(params.defaultDate, -1);
    const todayTimelineSummary = buildDayTimelineSummary(params.logs, params.categories, params.defaultDate, timelineLimit);
    const yesterdayTimelineSummary = buildDayTimelineSummary(params.logs, params.categories, yesterdayDate, timelineLimit);

    const activeSessionSummary = (params.activeSessions || []).length === 0
      ? ''
      : (params.activeSessions || []).map((session) => {
        const linkedTodo = session.linkedTodoId
          ? params.todos.find((todo) => todo.id === session.linkedTodoId)
          : undefined;
        return `${session.activityName}${linkedTodo ? ` @${linkedTodo.title}` : ''}`;
      }).join('；');

    const todayScheduledTodoSummary = params.todos
      .filter((todo) => !todo.isCompleted && todo.scheduledDate === params.defaultDate)
      .slice(0, todoLimit)
      .map((todo) => `- ${formatTodoPath(todo, params.todos)}`)
      .join('\n');

    const pinnedTodoSummary = params.todos
      .filter((todo) => !todo.isCompleted && Boolean(todo.pin))
      .slice(0, todoLimit)
      .map((todo) => `- ${formatTodoPath(todo, params.todos)}`)
      .join('\n');

    const overdueTodoSummary = params.todos
      .filter((todo) => !todo.isCompleted && typeof todo.deadlineDate === 'string' && todo.deadlineDate < params.defaultDate)
      .slice(0, todoLimit)
      .map((todo) => `- ${formatTodoPath(todo, params.todos)}（截止 ${todo.deadlineDate}）`)
      .join('\n');

    return {
      currentDateTime: params.currentDateTime,
      defaultDate: params.defaultDate,
      ...(todayTimelineSummary ? { todayTimelineSummary } : {}),
      ...(yesterdayTimelineSummary ? { yesterdayTimelineSummary } : {}),
      ...(params.timelineReviewSummary ? { timelineReviewSummary: params.timelineReviewSummary } : {}),
      ...(activeSessionSummary ? { activeSessionSummary } : {}),
      ...(todayScheduledTodoSummary ? { todayScheduledTodoSummary: `以下是安排在今天的待办：\n${todayScheduledTodoSummary}` } : {}),
      ...(pinnedTodoSummary ? { pinnedTodoSummary: `以下是已 Pin 的待办：\n${pinnedTodoSummary}` } : {}),
      ...(overdueTodoSummary ? { overdueTodoSummary: `以下是已经过期但仍未完成的待办：\n${overdueTodoSummary}` } : {}),
      ...(params.reminderSummary ? { reminderSummary: params.reminderSummary } : {})
    };
  },

  buildRecentLogsDigest(params: BuildRecentLogsDigestParams): string | undefined {
    const limit = params.limit ?? DEFAULT_RECENT_LOG_LIMIT;
    const recentLogs = params.logs
      .filter((log) => formatDateKey(new Date(log.startTime)) !== params.defaultDate)
      .sort((left, right) => right.startTime - left.startTime)
      .slice(0, limit);

    if (recentLogs.length === 0) {
      return undefined;
    }

    return [
      `以下是最近日志摘要：已排除今天（${params.defaultDate}）的记录；当前提供 ${recentLogs.length} 条；最多保留 ${limit} 条；按时间倒序排列。`,
      ...recentLogs.map((log) => buildLogDigestLine(log, params.categories, params.todos))
    ].join('\n');
  },

  buildTimelineSummaryDigest(params: BuildTimelineSummaryDigestParams): string {
    const yesterdayDate = shiftDateKey(params.defaultDate, -1);
    const todaySummary = params.dailyReviews.find((review) => review.date === params.defaultDate)?.summary;
    const yesterdaySummary = params.dailyReviews.find((review) => review.date === yesterdayDate)?.summary;

    return [
      '以下是应用状态上下文。',
      buildTimelineSummaryLine('今天', params.defaultDate, todaySummary),
      buildTimelineSummaryLine('昨天', yesterdayDate, yesterdaySummary)
    ].join('\n');
  },

  buildDictionaryDigest(context: AssistantTurnDictionaryContext): string {
    const activityCategoryRows = (context.activityCategories || []).map((category) => ([
      category.id,
      category.name
    ]));

    const activityRows = (context.activityCategories || []).flatMap((category) => (
      category.activities.map((activity) => ([
        category.id,
        activity.id,
        activity.name
      ]))
    ));

    const scopeRows = (context.scopes || []).map((scope) => ([
      scope.id,
      scope.name
    ]));

    const todoCategoryRows = ensureQuickTodoCategory(context.todoCategories || []).map((category) => ([
      category.id,
      category.name
    ]));

    const todoRows = (context.todos || []).map((todo) => ([
      todo.id,
      todo.title,
      getTodoKind(todo),
      todo.path,
      todo.parentTodoId,
      todo.parentTodoTitle,
      todo.categoryId,
      todo.categoryName,
      todo.linkedCategoryId,
      todo.linkedActivityId,
      todo.linkedActivityName,
      todo.defaultScopeIds,
      todo.scheduledDate,
      todo.deadlineDate,
      todo.pin,
      todo.isCompleted
    ]));

    const logRows = (context.logs || []).map((log) => ([
      log.id,
      log.date,
      log.timeRange,
      log.categoryId,
      log.categoryName,
      log.activityId,
      log.activityName,
      log.linkedTodoId,
      log.linkedTodoTitle,
      log.note
    ]));

    return [
      '以下是候选词典无损表。字段与应用词典一一对应；活动通过 categoryId 关联分类；子任务通过 parentTodoId 关联父任务；日志候选中的 id 可直接用于 edit_log；数组字段保持 JSON 数组；空值记为 - 。',
      buildExactTableSection('ActivityCategories', ['id', 'name'], activityCategoryRows),
      buildExactTableSection('Activities', ['categoryId', 'id', 'name'], activityRows),
      buildExactTableSection('Scopes', ['id', 'name'], scopeRows),
      buildExactTableSection('TodoCategories', ['id', 'name'], todoCategoryRows),
      buildExactTableSection('Todos', ['id', 'title', 'kind', 'path', 'parentTodoId', 'parentTodoTitle', 'categoryId', 'categoryName', 'linkedCategoryId', 'linkedActivityId', 'linkedActivityName', 'defaultScopeIds', 'scheduledDate', 'deadlineDate', 'pin', 'isCompleted'], todoRows),
      buildExactTableSection('Logs', ['id', 'date', 'timeRange', 'categoryId', 'categoryName', 'activityId', 'activityName', 'linkedTodoId', 'linkedTodoTitle', 'note'], logRows)
    ].join('\n\n');
  },

  buildDictionaryContext(params: BuildDictionaryContextParams): AssistantTurnDictionaryContext {
    const activityCategories: AssistantActivityCategoryDictionaryItem[] = (params.categories || []).map((category) => ({
      id: category.id,
      name: category.name,
      activities: category.activities.map((activity) => ({
        id: activity.id,
        name: activity.name
      }))
    }));

    const scopes: AssistantScopeDictionaryItem[] = (params.scopes || []).map((scope) => ({
      id: scope.id,
      name: scope.name
    }));

    const todoCategories: AssistantTodoCategoryDictionaryItem[] = ensureQuickTodoCategory(params.todoCategories || []).map((category) => ({
      id: category.id,
      name: category.name
    }));

    const todos: AssistantTodoDictionaryItem[] = (params.todos || []).map((todo) => {
      const parentTodo = todo.parentTodoId
        ? (params.todos || []).find((candidate) => candidate.id === todo.parentTodoId)
        : undefined;
      const category = todo.categoryId
        ? (params.todoCategories || []).find((candidate) => candidate.id === todo.categoryId)
        : undefined;
      const linkedActivity = getActivityById(params.categories || [], todo.linkedActivityId);
      return {
        id: todo.id,
        title: todo.title,
        kind: getTodoKind(todo),
        ...(parentTodo ? { path: `${parentTodo.title} / ${todo.title}`, parentTodoId: parentTodo.id, parentTodoTitle: parentTodo.title } : {}),
        ...(todo.categoryId ? { categoryId: todo.categoryId } : {}),
        ...(category?.name ? { categoryName: category.name } : {}),
        ...(todo.linkedCategoryId ? { linkedCategoryId: todo.linkedCategoryId } : {}),
        ...(todo.linkedActivityId ? { linkedActivityId: todo.linkedActivityId } : {}),
        ...(linkedActivity?.name ? { linkedActivityName: linkedActivity.name } : {}),
        ...(todo.defaultScopeIds?.length ? { defaultScopeIds: todo.defaultScopeIds } : {}),
        ...(todo.scheduledDate ? { scheduledDate: todo.scheduledDate } : {}),
        ...(todo.deadlineDate ? { deadlineDate: todo.deadlineDate } : {}),
        isCompleted: todo.isCompleted,
        pin: Boolean(todo.pin)
      };
    });

    const logs: AssistantLogDictionaryItem[] = (params.logs || []).map((log) => {
      const category = (params.categories || []).find((candidate) => candidate.id === log.categoryId);
      const activity = category?.activities.find((candidate) => candidate.id === log.activityId)
        || getActivityById(params.categories || [], log.activityId);
      const linkedTodo = log.linkedTodoId
        ? (params.todos || []).find((candidate) => candidate.id === log.linkedTodoId)
        : undefined;

      return {
        id: log.id,
        date: formatDateKey(new Date(log.startTime)),
        timeRange: formatTimeRange(log.startTime, log.endTime),
        ...(log.categoryId ? { categoryId: log.categoryId } : {}),
        ...(category?.name ? { categoryName: category.name } : {}),
        ...(log.activityId ? { activityId: log.activityId } : {}),
        ...(activity?.name || log.title ? { activityName: activity?.name || log.title || '' } : {}),
        ...(linkedTodo?.id ? { linkedTodoId: linkedTodo.id, linkedTodoTitle: linkedTodo.title } : {}),
        ...(typeof log.note === 'string' && log.note.trim() ? { note: log.note.trim() } : {})
      };
    });

    return {
      ...(activityCategories.length > 0 ? { activityCategories } : {}),
      ...(scopes.length > 0 ? { scopes } : {}),
      ...(todoCategories.length > 0 ? { todoCategories } : {}),
      ...(todos.length > 0 ? { todos } : {}),
      ...(logs.length > 0 ? { logs } : {})
    };
  }
};

