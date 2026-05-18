/**
 * @file assistantActionExecutor.ts
 * @input Current logs/todos plus runtime dictionaries and assistant tool-call payloads
 * @output Applied assistant action summaries together with the next local logs/todos state
 * @pos Service (Assistant Action Executor)
 * @description Executes AI-planned log/todo/subtask/edit tool calls against local app data using pure helpers so the UI can reuse one shared execution layer instead of keeping tool application logic inside a modal component.
 *
 * @updated 2026-05-18: `create_todo` actions can now create nested direct subtasks in the same pass, and the applied snapshot records those child ids so the UI can undo the whole bundle cleanly.
 * @updated 2026-05-13: Added explicit todo kind handling so assistant-created quick reminders can skip activity linkage while still resolving into the reserved 小事 category.
 * @updated 2026-04-26: Extracted local assistant tool-call execution, save/delete helpers, action snapshots, and subtask-date stripping into a shared service for the unified AI assistant architecture.
 */

import type {
  AutoLinkRule,
  Category,
  Log,
  Scope,
  TodoCategory,
  TodoItem,
  TodoRecurrenceRule
} from '../types';
import type {
  AIBackfillToolCall,
  AICreateSubtaskToolCall,
  AIEditLogToolCall,
  AITodoNestedSubtaskArgs,
  AITodoToolCall,
  AITodoUpdateToolCall
} from './aiService';
import { formatDateKey, normalizeAIBackfillToolCalls, parseTimeOnDateKey } from '../utils/aiBackfillUtils';
import { getTodoProgressTrackingMode, syncSubtaskProgressToParentTodos } from '../utils/todoProgressUtils';
import { getNextChildOrder, normalizeTodoHierarchy, syncDirectChildTodosWithParent } from '../utils/todoHierarchyUtils';
import { getTodoKind, isQuickTodo } from '../utils/todoKindUtils';
import {
  ensureQuickTodoCategory,
  getQuickTodoCategory,
  QUICK_TODO_CATEGORY_ID
} from '../utils/todoQuickCategoryUtils';

export type AppliedActionStatus = 'applied' | 'undone' | 'failed';

export interface AppliedCreateLogSnapshot {
  logId?: string;
  startTime: number;
  endTime: number;
  description: string;
  categoryId: string;
  categoryName: string;
  activityId: string;
  activityName: string;
  scopeIds: string[];
  scopeNames: string[];
  linkedTodoId?: string;
  linkedTodoTitle?: string;
  progressIncrement?: number;
}

export interface AppliedCreateLogAction {
  actionId: string;
  kind: 'create_log';
  status: AppliedActionStatus;
  snapshot: AppliedCreateLogSnapshot;
  errorMessage?: string;
}

export interface AppliedCreateTodoSnapshot {
  todoId?: string;
  title: string;
  kind?: TodoItem['kind'];
  categoryId: string;
  categoryName: string;
  linkedCategoryId?: string;
  linkedCategoryName?: string;
  linkedActivityId?: string;
  linkedActivityName?: string;
  defaultScopeIds: string[];
  defaultScopeNames: string[];
  note?: string;
  scheduledDate?: string;
  deadlineDate?: string;
  recurrenceRule?: TodoRecurrenceRule;
  createdSubtaskIds?: string[];
}

export interface AppliedCreateTodoAction {
  actionId: string;
  kind: 'create_todo';
  status: AppliedActionStatus;
  snapshot: AppliedCreateTodoSnapshot;
  errorMessage?: string;
}

export interface AppliedUpdateTodoSnapshot {
  todoId?: string;
  previousTodo?: TodoItem;
  nextTodo?: TodoItem;
}

export interface AppliedUpdateTodoAction {
  actionId: string;
  kind: 'update_todo';
  status: AppliedActionStatus;
  snapshot: AppliedUpdateTodoSnapshot;
  errorMessage?: string;
}

export interface AppliedCreateSubtaskSnapshot extends AppliedCreateTodoSnapshot {
  parentTodoId?: string;
  parentTodoTitle?: string;
}

export interface AppliedCreateSubtaskAction {
  actionId: string;
  kind: 'create_subtask';
  status: AppliedActionStatus;
  snapshot: AppliedCreateSubtaskSnapshot;
  errorMessage?: string;
}

export interface AppliedEditLogSnapshot {
  logId?: string;
  previousLog?: Log;
  nextLog?: Log;
}

export interface AppliedEditLogAction {
  actionId: string;
  kind: 'edit_log';
  status: AppliedActionStatus;
  snapshot: AppliedEditLogSnapshot;
  errorMessage?: string;
}

export type AppliedChatAction =
  | AppliedCreateLogAction
  | AppliedCreateTodoAction
  | AppliedUpdateTodoAction
  | AppliedCreateSubtaskAction
  | AppliedEditLogAction;

export interface AssistantActionExecutionContext {
  defaultDateKey: string;
  logs: Log[];
  todos: TodoItem[];
  categories: Category[];
  scopes: Scope[];
  todoCategories: TodoCategory[];
  autoApplyAutoLinkRules: boolean;
  autoLinkRules: AutoLinkRule[];
}

interface AssistantActionExecutionResult {
  actions: AppliedChatAction[];
  nextLogs: Log[];
  nextTodos: TodoItem[];
}

const dedupeStringArray = (values: Array<string | undefined | null>): string[] => (
  Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim())))
);

const getRuleScopeIdsForActivity = (
  context: AssistantActionExecutionContext,
  activityId?: string
): string[] => (
  context.autoApplyAutoLinkRules && activityId
    ? context.autoLinkRules
      .filter((rule) => rule.activityId === activityId)
      .map((rule) => rule.scopeId)
    : []
);

const getScopeNames = (
  context: AssistantActionExecutionContext,
  scopeIds: string[]
): string[] => (
  scopeIds
    .map((scopeId) => context.scopes.find((scope) => scope.id === scopeId)?.name)
    .filter((name): name is string => Boolean(name))
);

const getActivityCategory = (
  context: AssistantActionExecutionContext,
  activityId?: string
): Category | undefined => (
  activityId
    ? context.categories.find((category) => category.activities.some((activity) => activity.id === activityId))
    : undefined
);

const getActivityById = (
  context: AssistantActionExecutionContext,
  activityId?: string
) => (
  activityId
    ? context.categories.flatMap((category) => category.activities).find((activity) => activity.id === activityId)
    : undefined
);

const hasExplicitSubtaskDateRequest = (text: string): boolean => {
  const normalized = text.trim().toLowerCase();
  const datePattern = /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}[-/.]\d{1,2}\b/;
  const explicitDateKeywords = [
    '安排',
    '排到',
    '排在',
    '哪天',
    '什么时候',
    '时间',
    '日期',
    '今天',
    '明天',
    '后天',
    '这周',
    '本周',
    '下周',
    '周一',
    '周二',
    '周三',
    '周四',
    '周五',
    '周六',
    '周日',
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六',
    '星期天',
    '星期日',
    '截止',
    'deadline',
    'due'
  ];

  return datePattern.test(normalized)
    || explicitDateKeywords.some((keyword) => normalized.includes(keyword));
};

const stripSubtaskDatesIfNotRequested = (
  toolCalls: AICreateSubtaskToolCall[],
  sourceText: string
): AICreateSubtaskToolCall[] => {
  if (hasExplicitSubtaskDateRequest(sourceText)) {
    return toolCalls;
  }

  return toolCalls.map((toolCall) => ({
    ...toolCall,
    args: {
      parentTodoId: toolCall.args.parentTodoId,
      title: toolCall.args.title,
      ...(toolCall.args.note ? { note: toolCall.args.note } : {})
    }
  }));
};

const stripNestedSubtaskDatesIfNotRequested = (
  subtasks: AITodoNestedSubtaskArgs[],
  sourceText: string
): AITodoNestedSubtaskArgs[] => {
  if (hasExplicitSubtaskDateRequest(sourceText)) {
    return subtasks;
  }

  return subtasks.map((subtask) => ({
    title: subtask.title,
    ...(subtask.note ? { note: subtask.note } : {})
  }));
};

const formatTimeKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const applyTodoSave = (currentTodos: TodoItem[], todo: TodoItem): TodoItem[] => {
  const normalizedTodo = normalizeTodoHierarchy(todo, currentTodos);
  const exists = currentTodos.find((item) => item.id === normalizedTodo.id);
  let nextTodos = exists
    ? currentTodos.map((item) => (item.id === normalizedTodo.id ? normalizedTodo : item))
    : [normalizedTodo, ...currentTodos];

  if (!normalizedTodo.parentTodoId) {
    nextTodos = syncDirectChildTodosWithParent(nextTodos, normalizedTodo);
  }

  return syncSubtaskProgressToParentTodos(nextTodos);
};

const createSubtaskTodo = (
  currentTodos: TodoItem[],
  parentTodo: TodoItem,
  args: AITodoNestedSubtaskArgs
): { nextTodos: TodoItem[]; newTodo: TodoItem } => {
  const newTodo: TodoItem = {
    id: crypto.randomUUID(),
    categoryId: parentTodo.categoryId,
    parentTodoId: parentTodo.id,
    childOrder: getNextChildOrder(currentTodos, parentTodo.id),
    title: args.title.trim(),
    isCompleted: false,
    pin: false,
    completedUnits: 0,
    ...(args.note ? { note: args.note } : {}),
    ...(args.scheduledDate ? { scheduledDate: args.scheduledDate } : {}),
    ...(args.deadlineDate ? { deadlineDate: args.deadlineDate } : {})
  };

  return {
    nextTodos: applyTodoSave(currentTodos, newTodo),
    newTodo
  };
};

export const applyLogSave = (
  currentLogs: Log[],
  currentTodos: TodoItem[],
  nextLog: Log
): { logs: Log[]; todos: TodoItem[] } => {
  const existingLog = currentLogs.find((log) => log.id === nextLog.id);
  const nextTodos = [...currentTodos];

  if (nextLog.linkedTodoId || existingLog?.linkedTodoId) {
    if (existingLog?.linkedTodoId) {
      const oldTodoIndex = nextTodos.findIndex((todo) => todo.id === existingLog.linkedTodoId);
      if (oldTodoIndex >= 0 && getTodoProgressTrackingMode(nextTodos[oldTodoIndex], nextTodos) === 'manual') {
        nextTodos[oldTodoIndex] = {
          ...nextTodos[oldTodoIndex],
          isProgress: true,
          progressTrackingMode: 'manual',
          completedUnits: Math.max(0, (nextTodos[oldTodoIndex].completedUnits || 0) - (existingLog.progressIncrement || 0))
        };
      }
    }

    if (nextLog.linkedTodoId) {
      const newTodoIndex = nextTodos.findIndex((todo) => todo.id === nextLog.linkedTodoId);
      if (newTodoIndex >= 0 && getTodoProgressTrackingMode(nextTodos[newTodoIndex], nextTodos) === 'manual') {
        nextTodos[newTodoIndex] = {
          ...nextTodos[newTodoIndex],
          isProgress: true,
          progressTrackingMode: 'manual',
          completedUnits: Math.max(0, (nextTodos[newTodoIndex].completedUnits || 0) + (nextLog.progressIncrement || 0))
        };
      }
    }
  }

  const nextLogs = existingLog
    ? currentLogs.map((log) => (log.id === nextLog.id ? nextLog : log))
    : [nextLog, ...currentLogs];

  return {
    logs: nextLogs,
    todos: nextTodos
  };
};

export const applyLogDelete = (
  currentLogs: Log[],
  currentTodos: TodoItem[],
  logId: string
): { logs: Log[]; todos: TodoItem[] } => {
  const existingLog = currentLogs.find((log) => log.id === logId);
  if (!existingLog) {
    return {
      logs: currentLogs,
      todos: currentTodos
    };
  }

  const nextTodos = currentTodos.map((todo) => {
    if (todo.id !== existingLog.linkedTodoId || getTodoProgressTrackingMode(todo, currentTodos) !== 'manual') {
      return todo;
    }

    return {
      ...todo,
      isProgress: true,
      progressTrackingMode: 'manual',
      completedUnits: Math.max(0, (todo.completedUnits || 0) - (existingLog.progressIncrement || 0))
    };
  });

  return {
    logs: currentLogs.filter((log) => log.id !== logId),
    todos: nextTodos
  };
};

const buildActionId = (): string => crypto.randomUUID();

export const assistantActionExecutor = {
  applyLogToolCalls(
    context: AssistantActionExecutionContext,
    toolCalls: AIBackfillToolCall[]
  ): AssistantActionExecutionResult {
    const normalizedToolCalls = normalizeAIBackfillToolCalls(toolCalls, context.defaultDateKey);
    const actions: AppliedChatAction[] = [];
    let nextLogs = [...context.logs];
    let nextTodos = [...context.todos];

    normalizedToolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const actionDate = args.date || context.defaultDateKey;
      const startTime = parseTimeOnDateKey(actionDate, args.startTime);
      const endTime = parseTimeOnDateKey(actionDate, args.endTime);
      const category = context.categories.find((item) => item.id === args.categoryId)
        || context.categories.find((item) => item.activities.some((activity) => activity.id === args.activityId));
      const activity = category?.activities.find((item) => item.id === args.activityId)
        || context.categories.flatMap((item) => item.activities).find((item) => item.id === args.activityId);
      const linkedTodo = args.linkedTodoId
        ? nextTodos.find((todo) => todo.id === args.linkedTodoId)
        : undefined;

      if (!startTime || !endTime || endTime <= startTime || !category || !activity) {
        actions.push({
          actionId: buildActionId(),
          kind: 'create_log',
          status: 'failed',
          errorMessage: '这条补记的时间或分类信息不完整，我先没有自动应用。',
          snapshot: {
            startTime: startTime || Date.now(),
            endTime: endTime || Date.now(),
            description: args.description || '',
            categoryId: category?.id || args.categoryId,
            categoryName: category?.name || '未知分类',
            activityId: activity?.id || args.activityId,
            activityName: activity?.name || '未知活动',
            scopeIds: [],
            scopeNames: []
          }
        });
        return;
      }

      const scopeIds = dedupeStringArray([
        ...(args.scopeIds || []),
        ...(linkedTodo?.defaultScopeIds || []),
        ...getRuleScopeIdsForActivity(context, activity.id)
      ]).filter((scopeId) => context.scopes.some((scope) => scope.id === scopeId));

      const progressIncrement = (
        linkedTodo
        && typeof args.progressIncrement === 'number'
        && args.progressIncrement > 0
        && getTodoProgressTrackingMode(linkedTodo, nextTodos) === 'manual'
      )
        ? Math.max(1, Math.round(args.progressIncrement))
        : undefined;

      if (linkedTodo && progressIncrement) {
        const todoIndex = nextTodos.findIndex((todo) => todo.id === linkedTodo.id);
        if (todoIndex >= 0) {
          nextTodos[todoIndex] = {
            ...nextTodos[todoIndex],
            isProgress: true,
            progressTrackingMode: 'manual',
            completedUnits: Math.max(0, (nextTodos[todoIndex].completedUnits || 0) + progressIncrement)
          };
        }
      }

      const newLog: Log = {
        id: crypto.randomUUID(),
        categoryId: category.id,
        activityId: activity.id,
        title: activity.name,
        startTime,
        endTime,
        duration: Math.max(0, (endTime - startTime) / 1000),
        note: args.description,
        ...(scopeIds.length > 0 ? { scopeIds } : {}),
        ...(linkedTodo ? { linkedTodoId: linkedTodo.id } : {}),
        ...(progressIncrement ? { progressIncrement } : {})
      };

      const saveResult = applyLogSave(nextLogs, nextTodos, newLog);
      nextLogs = saveResult.logs;
      nextTodos = saveResult.todos;
      actions.push({
        actionId: buildActionId(),
        kind: 'create_log',
        status: 'applied',
        snapshot: {
          logId: newLog.id,
          startTime,
          endTime,
          description: args.description,
          categoryId: category.id,
          categoryName: category.name,
          activityId: activity.id,
          activityName: activity.name,
          scopeIds,
          scopeNames: getScopeNames(context, scopeIds),
          ...(linkedTodo ? { linkedTodoId: linkedTodo.id, linkedTodoTitle: linkedTodo.title } : {}),
          ...(progressIncrement ? { progressIncrement } : {})
        }
      });
    });

    return {
      actions,
      nextLogs,
      nextTodos
    };
  },

  applyTodoToolCalls(
    context: AssistantActionExecutionContext,
    toolCalls: AITodoToolCall[],
    sourceText: string = ''
  ): AssistantActionExecutionResult {
    const actions: AppliedChatAction[] = [];
    let nextTodos = [...context.todos];

    toolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const todoKind = getTodoKind(args);
      const normalizedTodoCategories = ensureQuickTodoCategory(context.todoCategories);
      const quickTodoCategory = getQuickTodoCategory(normalizedTodoCategories);
      const resolvedTodoCategory = todoKind === 'quick'
        ? quickTodoCategory
        : normalizedTodoCategories.find((category) => category.id === args.categoryId && category.id !== QUICK_TODO_CATEGORY_ID)
          || normalizedTodoCategories.find((category) => category.id !== QUICK_TODO_CATEGORY_ID)
          || quickTodoCategory;
      const resolvedLinkedCategoryId = args.linkedCategoryId
        || (args.linkedActivityId
          ? context.categories.find((category) => category.activities.some((activity) => activity.id === args.linkedActivityId))?.id
          : undefined);
      const resolvedLinkedCategory = resolvedLinkedCategoryId
        ? context.categories.find((category) => category.id === resolvedLinkedCategoryId)
        : undefined;
      const resolvedActivity = args.linkedActivityId
        ? resolvedLinkedCategory?.activities.find((activity) => activity.id === args.linkedActivityId)
          || getActivityById(context, args.linkedActivityId)
        : undefined;

      const requiresLinkedActivity = todoKind !== 'quick';
      if (!resolvedTodoCategory || !args.title.trim() || (requiresLinkedActivity && (!args.linkedActivityId || !resolvedActivity || !resolvedLinkedCategoryId))) {
        actions.push({
          actionId: buildActionId(),
          kind: 'create_todo',
          status: 'failed',
          errorMessage: '这条待办缺少标题、分类，或没能识别出要关联的活动，我先没有自动创建。',
          snapshot: {
            title: args.title || '未命名待办',
            categoryId: resolvedTodoCategory?.id || '',
            categoryName: resolvedTodoCategory?.name || '未知分类',
            defaultScopeIds: [],
            defaultScopeNames: []
          }
        });
        return;
      }

      const defaultScopeIds = todoKind === 'quick'
        ? []
        : dedupeStringArray([
            ...(args.defaultScopeIds || []),
            ...getRuleScopeIdsForActivity(context, args.linkedActivityId)
          ]).filter((scopeId) => context.scopes.some((scope) => scope.id === scopeId));

      const newTodo: TodoItem = {
        id: crypto.randomUUID(),
        kind: todoKind,
        categoryId: todoKind === 'quick' ? QUICK_TODO_CATEGORY_ID : resolvedTodoCategory.id,
        title: args.title.trim(),
        isCompleted: false,
        pin: false,
        completedUnits: 0,
        ...(todoKind !== 'quick' && resolvedLinkedCategoryId ? { linkedCategoryId: resolvedLinkedCategoryId } : {}),
        ...(todoKind !== 'quick' && args.linkedActivityId ? { linkedActivityId: args.linkedActivityId } : {}),
        ...(todoKind !== 'quick' && defaultScopeIds.length > 0 ? { defaultScopeIds } : {}),
        ...(args.note ? { note: args.note } : {}),
        ...(args.scheduledDate ? { scheduledDate: args.scheduledDate } : {}),
        ...(args.deadlineDate ? { deadlineDate: args.deadlineDate } : {}),
        ...(todoKind !== 'quick' && args.recurrenceRule ? { recurrenceRule: args.recurrenceRule } : {})
      };

      nextTodos = applyTodoSave(nextTodos, newTodo);
      const createdSubtaskIds: string[] = [];
      const nestedSubtasks = stripNestedSubtaskDatesIfNotRequested(
        (args.subtasks || []).filter((subtask) => Boolean(subtask.title.trim())),
        sourceText
      );

      nestedSubtasks.forEach((subtaskArgs) => {
        const liveParentTodo = nextTodos.find((todo) => todo.id === newTodo.id) || newTodo;
        const subtaskResult = createSubtaskTodo(nextTodos, liveParentTodo, subtaskArgs);
        nextTodos = subtaskResult.nextTodos;
        createdSubtaskIds.push(subtaskResult.newTodo.id);
      });

      actions.push({
        actionId: buildActionId(),
        kind: 'create_todo',
        status: 'applied',
        snapshot: {
          todoId: newTodo.id,
          title: newTodo.title,
          kind: todoKind,
          categoryId: newTodo.categoryId,
          categoryName: resolvedTodoCategory.name,
          ...(todoKind !== 'quick' && resolvedLinkedCategoryId ? { linkedCategoryId: resolvedLinkedCategoryId } : {}),
          ...(todoKind !== 'quick' && resolvedLinkedCategory ? { linkedCategoryName: resolvedLinkedCategory.name } : {}),
          ...(todoKind !== 'quick' && args.linkedActivityId ? { linkedActivityId: args.linkedActivityId } : {}),
          ...(todoKind !== 'quick' && resolvedActivity ? { linkedActivityName: resolvedActivity.name } : {}),
          defaultScopeIds,
          defaultScopeNames: getScopeNames(context, defaultScopeIds),
          ...(args.note ? { note: args.note } : {}),
          ...(args.scheduledDate ? { scheduledDate: args.scheduledDate } : {}),
          ...(args.deadlineDate ? { deadlineDate: args.deadlineDate } : {}),
          ...(todoKind !== 'quick' && args.recurrenceRule ? { recurrenceRule: args.recurrenceRule } : {}),
          ...(createdSubtaskIds.length > 0 ? { createdSubtaskIds } : {})
        }
      });
    });

    return {
      actions,
      nextLogs: context.logs,
      nextTodos
    };
  },

  applyTodoUpdateToolCalls(
    context: AssistantActionExecutionContext,
    toolCalls: AITodoUpdateToolCall[]
  ): AssistantActionExecutionResult {
    const actions: AppliedChatAction[] = [];
    let nextTodos = [...context.todos];

    toolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const currentTodo = nextTodos.find((todo) => todo.id === args.todoId);
      if (!currentTodo) {
        actions.push({
          actionId: buildActionId(),
          kind: 'update_todo',
          status: 'failed',
          errorMessage: '没有找到要修改的待办，我先没有自动应用。',
          snapshot: {
            todoId: args.todoId
          }
        });
        return;
      }

      const patch = args.patch;
      const normalizedTodoCategories = ensureQuickTodoCategory(context.todoCategories);
      const quickTodoCategory = getQuickTodoCategory(normalizedTodoCategories);
      const nextKind = patch.kind || getTodoKind(currentTodo);
      const resolvedActivity = patch.linkedActivityId === undefined
        ? undefined
        : patch.linkedActivityId === null
          ? null
          : getActivityById(context, patch.linkedActivityId);
      const resolvedLinkedCategory = patch.linkedActivityId === undefined
        ? undefined
        : patch.linkedActivityId === null
          ? null
          : getActivityCategory(context, patch.linkedActivityId);

      if (patch.linkedActivityId && (!resolvedActivity || !resolvedLinkedCategory)) {
        actions.push({
          actionId: buildActionId(),
          kind: 'update_todo',
          status: 'failed',
          errorMessage: '要关联的活动没有匹配成功，这次我先没有自动修改待办。',
          snapshot: {
            todoId: currentTodo.id,
            previousTodo: currentTodo
          }
        });
        return;
      }

      const nextDefaultScopeIds = patch.defaultScopeIds === undefined
        ? currentTodo.defaultScopeIds
        : patch.defaultScopeIds === null
          ? undefined
          : dedupeStringArray(patch.defaultScopeIds).filter((scopeId) => context.scopes.some((scope) => scope.id === scopeId));

      const nextTitle = patch.title === undefined ? currentTodo.title : patch.title.trim();
      if (!nextTitle) {
        actions.push({
          actionId: buildActionId(),
          kind: 'update_todo',
          status: 'failed',
          errorMessage: '修改后的待办标题不能为空，我先没有自动应用。',
          snapshot: {
            todoId: currentTodo.id,
            previousTodo: currentTodo
          }
        });
        return;
      }

      const nextLinkedCategoryId = patch.linkedActivityId !== undefined
        ? (resolvedLinkedCategory?.id || undefined)
        : patch.linkedCategoryId === undefined
          ? currentTodo.linkedCategoryId
          : patch.linkedCategoryId || undefined;

      const nextLinkedActivityId = patch.linkedActivityId === undefined
        ? currentTodo.linkedActivityId
        : patch.linkedActivityId || undefined;
      const nextCategoryId = patch.categoryId !== undefined
        ? patch.categoryId
        : nextKind === 'quick'
          ? QUICK_TODO_CATEGORY_ID
          : isQuickTodo(currentTodo)
            ? (normalizedTodoCategories.find((category) => category.id !== QUICK_TODO_CATEGORY_ID)?.id || quickTodoCategory.id)
            : currentTodo.categoryId;

      const shouldClearRecurrence = !currentTodo.parentTodoId
        && (patch.scheduledDate !== undefined || patch.deadlineDate !== undefined)
        && patch.recurrenceRule === undefined;

      const nextTodo: TodoItem = {
        ...currentTodo,
        kind: nextKind,
        title: nextTitle,
        ...(patch.note !== undefined ? { note: patch.note || undefined } : {}),
        categoryId: nextCategoryId,
        ...(
          nextKind === 'quick'
            ? {
                linkedCategoryId: undefined,
                linkedActivityId: undefined,
                defaultScopeIds: undefined,
                isProgress: false,
                progressTrackingMode: 'none',
                totalAmount: undefined,
                unitAmount: undefined,
                completedUnits: 0,
                heatmapMin: undefined,
                heatmapMax: undefined,
                coverImage: undefined,
                recurrenceRule: undefined,
                parentTodoId: undefined,
                childOrder: undefined
              }
            : {}
        ),
        ...(nextKind !== 'quick' && (patch.linkedCategoryId !== undefined || patch.linkedActivityId !== undefined) ? { linkedCategoryId: nextLinkedCategoryId } : {}),
        ...(nextKind !== 'quick' && patch.linkedActivityId !== undefined ? { linkedActivityId: nextLinkedActivityId } : {}),
        ...(nextKind !== 'quick' && patch.defaultScopeIds !== undefined ? { defaultScopeIds: nextDefaultScopeIds } : {}),
        ...(patch.scheduledDate !== undefined ? { scheduledDate: patch.scheduledDate || undefined } : {}),
        ...(patch.deadlineDate !== undefined ? { deadlineDate: patch.deadlineDate || undefined } : {}),
        ...(nextKind !== 'quick' && !currentTodo.parentTodoId && patch.recurrenceRule !== undefined ? { recurrenceRule: patch.recurrenceRule || undefined } : {}),
        ...(nextKind !== 'quick' && !currentTodo.parentTodoId && shouldClearRecurrence ? { recurrenceRule: undefined } : {}),
        ...(typeof patch.pin === 'boolean' ? { pin: patch.pin } : {}),
        ...(typeof patch.isCompleted === 'boolean'
          ? {
              isCompleted: patch.isCompleted,
              completedAt: patch.isCompleted
                ? (currentTodo.isCompleted ? currentTodo.completedAt : new Date().toISOString())
                : undefined
            }
          : {})
      };

      nextTodos = applyTodoSave(nextTodos, nextTodo);
      actions.push({
        actionId: buildActionId(),
        kind: 'update_todo',
        status: 'applied',
        snapshot: {
          todoId: nextTodo.id,
          previousTodo: currentTodo,
          nextTodo
        }
      });
    });

    return {
      actions,
      nextLogs: context.logs,
      nextTodos
    };
  },

  applyCreateSubtaskToolCalls(
    context: AssistantActionExecutionContext,
    toolCalls: AICreateSubtaskToolCall[],
    sourceText: string
  ): AssistantActionExecutionResult {
    const actions: AppliedChatAction[] = [];
    let nextTodos = [...context.todos];

    stripSubtaskDatesIfNotRequested(toolCalls, sourceText).forEach((toolCall) => {
      const { args } = toolCall;
      const parentTodo = nextTodos.find((todo) => todo.id === args.parentTodoId);

      if (!parentTodo || parentTodo.parentTodoId || parentTodo.recurrenceRule || !args.title.trim()) {
        actions.push({
          actionId: buildActionId(),
          kind: 'create_subtask',
          status: 'failed',
          errorMessage: '没有找到可挂载的父任务，或父任务不允许再添加子任务，这次我先没有自动创建。',
          snapshot: {
            title: args.title || '未命名子任务',
            categoryId: parentTodo?.categoryId || '',
            categoryName: context.todoCategories.find((category) => category.id === parentTodo?.categoryId)?.name || '未知分类',
            defaultScopeIds: parentTodo?.defaultScopeIds || [],
            defaultScopeNames: getScopeNames(context, parentTodo?.defaultScopeIds || []),
            parentTodoId: args.parentTodoId,
            parentTodoTitle: parentTodo?.title
          }
        });
        return;
      }

      const resolvedCategory = context.todoCategories.find((category) => category.id === parentTodo.categoryId);
      const subtaskResult = createSubtaskTodo(nextTodos, parentTodo, args);
      nextTodos = subtaskResult.nextTodos;
      const liveSubtask = nextTodos.find((todo) => todo.id === subtaskResult.newTodo.id) || subtaskResult.newTodo;
      actions.push({
        actionId: buildActionId(),
        kind: 'create_subtask',
        status: 'applied',
        snapshot: {
          todoId: liveSubtask.id,
          title: liveSubtask.title,
          categoryId: liveSubtask.categoryId,
          categoryName: resolvedCategory?.name || '',
          defaultScopeIds: liveSubtask.defaultScopeIds || [],
          defaultScopeNames: getScopeNames(context, liveSubtask.defaultScopeIds || []),
          ...(liveSubtask.note ? { note: liveSubtask.note } : {}),
          ...(liveSubtask.scheduledDate ? { scheduledDate: liveSubtask.scheduledDate } : {}),
          ...(liveSubtask.deadlineDate ? { deadlineDate: liveSubtask.deadlineDate } : {}),
          parentTodoId: parentTodo.id,
          parentTodoTitle: parentTodo.title
        }
      });
    });

    return {
      actions,
      nextLogs: context.logs,
      nextTodos
    };
  },

  applyEditLogToolCalls(
    context: AssistantActionExecutionContext,
    toolCalls: AIEditLogToolCall[]
  ): AssistantActionExecutionResult {
    const actions: AppliedChatAction[] = [];
    let nextLogs = [...context.logs];
    let nextTodos = [...context.todos];

    toolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const currentLog = nextLogs.find((log) => log.id === args.logId);
      if (!currentLog) {
        actions.push({
          actionId: buildActionId(),
          kind: 'edit_log',
          status: 'failed',
          errorMessage: '没有找到要修改的记录，我先没有自动应用。',
          snapshot: {
            logId: args.logId
          }
        });
        return;
      }

      const targetDateKey = args.patch.date || formatDateKey(new Date(currentLog.startTime));
      const startTime = args.patch.startTime
        ? parseTimeOnDateKey(targetDateKey, args.patch.startTime)
        : parseTimeOnDateKey(targetDateKey, formatTimeKey(currentLog.startTime));
      const endTime = args.patch.endTime
        ? parseTimeOnDateKey(targetDateKey, args.patch.endTime)
        : parseTimeOnDateKey(targetDateKey, formatTimeKey(currentLog.endTime));

      const resolvedActivity = args.patch.activityId
        ? getActivityById(context, args.patch.activityId)
        : undefined;
      const resolvedActivityCategory = args.patch.activityId
        ? getActivityCategory(context, args.patch.activityId)
        : undefined;
      const resolvedCategory = args.patch.categoryId
        ? context.categories.find((category) => category.id === args.patch.categoryId)
        : undefined;

      const nextCategory = resolvedActivityCategory
        || resolvedCategory
        || context.categories.find((category) => category.id === currentLog.categoryId);
      const nextActivity = resolvedActivity
        || nextCategory?.activities.find((activity) => activity.id === currentLog.activityId)
        || getActivityById(context, currentLog.activityId);

      if (!startTime || !endTime || endTime <= startTime || !nextCategory || !nextActivity) {
        actions.push({
          actionId: buildActionId(),
          kind: 'edit_log',
          status: 'failed',
          errorMessage: '这条记录修改后的时间或活动信息不完整，我先没有自动应用。',
          snapshot: {
            logId: currentLog.id,
            previousLog: currentLog
          }
        });
        return;
      }

      const nextLinkedTodoId = args.patch.linkedTodoId === undefined
        ? currentLog.linkedTodoId
        : args.patch.linkedTodoId || undefined;
      if (nextLinkedTodoId && !nextTodos.some((todo) => todo.id === nextLinkedTodoId)) {
        actions.push({
          actionId: buildActionId(),
          kind: 'edit_log',
          status: 'failed',
          errorMessage: '要关联的待办没有匹配成功，这次我先没有自动修改记录。',
          snapshot: {
            logId: currentLog.id,
            previousLog: currentLog
          }
        });
        return;
      }

      const nextScopeIds = args.patch.scopeIds === undefined
        ? currentLog.scopeIds
        : args.patch.scopeIds === null
          ? undefined
          : dedupeStringArray(args.patch.scopeIds).filter((scopeId) => context.scopes.some((scope) => scope.id === scopeId));

      const nextLog: Log = {
        ...currentLog,
        categoryId: nextCategory.id,
        activityId: nextActivity.id,
        title: nextActivity.name,
        startTime,
        endTime,
        duration: Math.max(0, (endTime - startTime) / 1000),
        ...(args.patch.note !== undefined ? { note: args.patch.note || '' } : {}),
        ...(args.patch.linkedTodoId !== undefined ? { linkedTodoId: nextLinkedTodoId } : {}),
        ...(args.patch.scopeIds !== undefined ? { scopeIds: nextScopeIds } : {})
      };

      const saveResult = applyLogSave(nextLogs, nextTodos, nextLog);
      nextLogs = saveResult.logs;
      nextTodos = saveResult.todos;
      actions.push({
        actionId: buildActionId(),
        kind: 'edit_log',
        status: 'applied',
        snapshot: {
          logId: nextLog.id,
          previousLog: currentLog,
          nextLog
        }
      });
    });

    return {
      actions,
      nextLogs,
      nextTodos
    };
  }
};
