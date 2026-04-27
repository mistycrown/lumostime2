/**
 * @file assistantContextBuilder.ts
 * @input App runtime dictionaries, logs, todos, conversation turns, and current session state
 * @output Shared assistant state-context and dictionary-context snapshots for unified turns
 * @pos Service (Assistant Context Builder)
 * @description Builds the minimal structured context payloads used by the unified assistant-turn architecture so foreground and background flows can share the same state summaries and full candidate dictionaries without duplicating formatting logic in UI components.
 *
 * @updated 2026-04-26: Replaced raw recent-log dictionary payloads with a compact digest builder that excludes today's logs and caps history length for lower token use.
 * @updated 2026-04-26: Added a lossless table-style dictionary digest so candidate dictionaries keep their original fields and structural relationships while still avoiding bulky pretty-printed JSON.
 * @updated 2026-04-26: Started carrying both local-offset and UTC "current time" snapshots so reminder prompts have an unambiguous time anchor.
 * @updated 2026-04-26: Added unified state-context, dictionary-context, and conversation-summary builders for the new single-turn assistant architecture.
 */

import type {
  ActiveSession,
  Category,
  Log,
  Scope,
  TodoCategory,
  TodoItem
} from '../types';
import type {
  AssistantActivityCategoryDictionaryItem,
  AssistantConversationEntry,
  AssistantScopeDictionaryItem,
  AssistantTodoCategoryDictionaryItem,
  AssistantTodoDictionaryItem,
  AssistantTurnConversationContext,
  AssistantTurnDictionaryContext,
  AssistantTurnStateContext
} from '../types/assistant';

interface BuildStateContextParams {
  currentDateTime: string;
  currentDateTimeLocal?: string;
  currentDateTimeUtc?: string;
  defaultDate: string;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  activeSessions?: ActiveSession[];
  reminderSummary?: string;
  timelineLimit?: number;
  todoLimit?: number;
}

interface BuildDictionaryContextParams {
  categories?: Category[];
  scopes?: Scope[];
  todoCategories?: TodoCategory[];
  todos?: TodoItem[];
}

interface BuildRecentLogsDigestParams {
  defaultDate: string;
  logs: Log[];
  categories: Category[];
  todos: TodoItem[];
  limit?: number;
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

    const todayTimelineSummary = params.logs
      .filter((log) => formatDateKey(new Date(log.startTime)) === params.defaultDate)
      .sort((left, right) => left.startTime - right.startTime)
      .slice(-timelineLimit)
      .map((log) => {
        const category = params.categories.find((item) => item.id === log.categoryId);
        const activity = category?.activities.find((item) => item.id === log.activityId)
          || getActivityById(params.categories, log.activityId);
        const label = [category?.name, activity?.name || log.title].filter(Boolean).join(' / ');
        return `${formatTimeRange(log.startTime, log.endTime)} ${label}${log.note ? `：${log.note}` : ''}`;
      })
      .join('\n');

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
      ...(params.currentDateTimeLocal ? { currentDateTimeLocal: params.currentDateTimeLocal } : {}),
      ...(params.currentDateTimeUtc ? { currentDateTimeUtc: params.currentDateTimeUtc } : {}),
      defaultDate: params.defaultDate,
      ...(todayTimelineSummary ? { todayTimelineSummary } : {}),
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

    const todoCategoryRows = (context.todoCategories || []).map((category) => ([
      category.id,
      category.name
    ]));

    const todoRows = (context.todos || []).map((todo) => ([
      todo.id,
      todo.title,
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

    return [
      '以下是候选词典无损表。字段与应用词典一一对应；活动通过 categoryId 关联分类；子任务通过 parentTodoId 关联父任务；数组字段保持 JSON 数组；空值记为 - 。',
      buildExactTableSection('ActivityCategories', ['id', 'name'], activityCategoryRows),
      buildExactTableSection('Activities', ['categoryId', 'id', 'name'], activityRows),
      buildExactTableSection('Scopes', ['id', 'name'], scopeRows),
      buildExactTableSection('TodoCategories', ['id', 'name'], todoCategoryRows),
      buildExactTableSection('Todos', ['id', 'title', 'path', 'parentTodoId', 'parentTodoTitle', 'categoryId', 'categoryName', 'linkedCategoryId', 'linkedActivityId', 'linkedActivityName', 'defaultScopeIds', 'scheduledDate', 'deadlineDate', 'pin', 'isCompleted'], todoRows)
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

    const todoCategories: AssistantTodoCategoryDictionaryItem[] = (params.todoCategories || []).map((category) => ({
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

    return {
      ...(activityCategories.length > 0 ? { activityCategories } : {}),
      ...(scopes.length > 0 ? { scopes } : {}),
      ...(todoCategories.length > 0 ? { todoCategories } : {}),
      ...(todos.length > 0 ? { todos } : {})
    };
  }
};

