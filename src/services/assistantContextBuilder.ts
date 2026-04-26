/**
 * @file assistantContextBuilder.ts
 * @input App runtime dictionaries, logs, todos, conversation turns, and current session state
 * @output Shared assistant state-context and dictionary-context snapshots for unified turns
 * @pos Service (Assistant Context Builder)
 * @description Builds the minimal structured context payloads used by the unified assistant-turn architecture so foreground and background flows can share the same state summaries and full candidate dictionaries without duplicating formatting logic in UI components.
 *
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
  AssistantLogDictionaryItem,
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
  logs?: Log[];
}

const DEFAULT_TIMELINE_LIMIT = 12;
const DEFAULT_TODO_LIMIT = 8;

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

export const assistantContextBuilder = {
  summarizeConversationTurns(turns: AssistantConversationEntry[], limit = 6): string {
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

  buildConversationContext(turns: AssistantConversationEntry[], limit = 6): AssistantTurnConversationContext {
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

    const todoSummary = params.todos
      .filter((todo) => !todo.isCompleted)
      .slice(0, todoLimit)
      .map((todo) => todo.title)
      .join('；');

    const todayScheduledTodoSummary = params.todos
      .filter((todo) => todo.scheduledDate === params.defaultDate)
      .slice(0, todoLimit)
      .map((todo) => `${todo.title} [${todo.isCompleted ? 'completed' : 'pending'}]`)
      .join('\n');

    const pinnedTodoSummary = params.todos
      .filter((todo) => Boolean(todo.pin))
      .slice(0, todoLimit)
      .map((todo) => `${todo.title} [${todo.isCompleted ? 'completed' : 'pending'}]`)
      .join('\n');

    return {
      currentDateTime: params.currentDateTime,
      ...(params.currentDateTimeLocal ? { currentDateTimeLocal: params.currentDateTimeLocal } : {}),
      ...(params.currentDateTimeUtc ? { currentDateTimeUtc: params.currentDateTimeUtc } : {}),
      defaultDate: params.defaultDate,
      ...(todayTimelineSummary ? { todayTimelineSummary } : {}),
      ...(activeSessionSummary ? { activeSessionSummary } : {}),
      ...(todoSummary ? { todoSummary } : {}),
      ...(todayScheduledTodoSummary ? { todayScheduledTodoSummary } : {}),
      ...(pinnedTodoSummary ? { pinnedTodoSummary } : {}),
      ...(params.reminderSummary ? { reminderSummary: params.reminderSummary } : {})
    };
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

    const logs: AssistantLogDictionaryItem[] = (params.logs || []).map((log) => {
      const category = (params.categories || []).find((item) => item.id === log.categoryId);
      const activity = category?.activities.find((item) => item.id === log.activityId)
        || getActivityById(params.categories || [], log.activityId);
      const linkedTodo = log.linkedTodoId
        ? (params.todos || []).find((todo) => todo.id === log.linkedTodoId)
        : undefined;
      return {
        id: log.id,
        date: formatDateKey(new Date(log.startTime)),
        startTime: `${String(new Date(log.startTime).getHours()).padStart(2, '0')}:${String(new Date(log.startTime).getMinutes()).padStart(2, '0')}`,
        endTime: `${String(new Date(log.endTime).getHours()).padStart(2, '0')}:${String(new Date(log.endTime).getMinutes()).padStart(2, '0')}`,
        categoryId: log.categoryId,
        categoryName: category?.name || '',
        activityId: log.activityId,
        activityName: activity?.name || log.title || '',
        ...(log.note ? { note: log.note } : {}),
        ...(linkedTodo ? { linkedTodoId: linkedTodo.id, linkedTodoTitle: linkedTodo.title } : {})
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

