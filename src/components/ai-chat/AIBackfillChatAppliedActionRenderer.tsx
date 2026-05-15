/**
 * @file AIBackfillChatAppliedActionRenderer.tsx
 * @input Applied assistant actions, live log/todo lookups, theme tokens, and action callbacks
 * @output Reusable renderer for in-chat applied-action result cards
 * @pos Component Support (AI Integration)
 * @description Extracts the bulky applied-action JSX branches out of AIBackfillChatModal while keeping the same live-data lookups, undo affordances, and visual treatment.
 * @updated 2026-05-15: Extracted create-log, create-todo, update-todo, and edit-log action rendering from AIBackfillChatModal.
 */
import React from 'react';
import { Pencil, Undo2 } from 'lucide-react';
import type { Category, Log, TodoCategory, TodoItem } from '../../types';
import type {
  AppliedChatAction,
  AppliedCreateLogAction,
  AppliedCreateSubtaskAction,
  AppliedCreateTodoAction,
  AppliedEditLogAction,
  AppliedUpdateTodoAction
} from '../../services/assistantActionExecutor';

interface AppliedActionTheme {
  activeBorder: string;
  chipBg: string;
  chipBorder: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  inputBg: string;
  successBg: string;
  successBorder: string;
  successText: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
  undoneBg: string;
  undoneBorder: string;
  undoneText: string;
}

interface ActivityLike {
  id: string;
  name: string;
}

interface AIBackfillChatAppliedActionRendererProps {
  action: AppliedChatAction;
  categories: Category[];
  formatActionDate: (value: number) => string;
  formatTimeRange: (startTime: number, endTime: number) => string;
  getActivityById: (activityId?: string) => ActivityLike | undefined;
  getActivityCategory: (activityId?: string) => Category | undefined;
  getScopeNames: (scopeIds: string[]) => string[];
  logs: Log[];
  messageId: string;
  onOpenLogEditor: (logId?: string) => void;
  onOpenTodoDetail: (todoId?: string) => void;
  onUndoCreateSubtaskAction: (messageId: string, action: AppliedCreateSubtaskAction) => void;
  onUndoEditLogAction: (messageId: string, action: AppliedEditLogAction) => void;
  onUndoLogAction: (messageId: string, action: AppliedCreateLogAction) => void;
  onUndoTodoAction: (messageId: string, action: AppliedCreateTodoAction) => void;
  onUndoUpdateTodoAction: (messageId: string, action: AppliedUpdateTodoAction) => void;
  theme: AppliedActionTheme;
  todoCategories: TodoCategory[];
  todos: TodoItem[];
}

const dedupeStringArray = (values: Array<string | undefined>): string[] => {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const normalized = value?.trim() || '';
    if (!normalized || seen.has(normalized)) {
      return [];
    }
    seen.add(normalized);
    return [normalized];
  });
};

const getStatusBadgeStyle = (status: AppliedChatAction['status'], theme: AppliedActionTheme) => {
  if (status === 'failed') {
    return {
      borderColor: theme.dangerBorder,
      backgroundColor: theme.dangerBg,
      color: theme.dangerText
    };
  }

  if (status === 'undone') {
    return {
      borderColor: theme.undoneBorder,
      backgroundColor: theme.undoneBg,
      color: theme.undoneText
    };
  }

  return {
    borderColor: theme.successBorder,
    backgroundColor: theme.successBg,
    color: theme.successText
  };
};

const getStatusBorderColor = (status: AppliedChatAction['status'], theme: AppliedActionTheme) => {
  if (status === 'failed') {
    return theme.dangerBorder;
  }

  if (status === 'undone') {
    return theme.undoneBorder;
  }

  return theme.activeBorder;
};

const RenderLogAction: React.FC<AIBackfillChatAppliedActionRendererProps & {
  action: AppliedCreateLogAction;
}> = ({
  action,
  categories,
  formatActionDate,
  formatTimeRange,
  logs,
  messageId,
  onOpenLogEditor,
  onUndoLogAction,
  theme,
  todos
}) => {
  const liveLog = action.snapshot.logId
    ? logs.find((log) => log.id === action.snapshot.logId)
    : undefined;
  const liveCategory = liveLog
    ? categories.find((category) => category.id === liveLog.categoryId)
    : categories.find((category) => category.id === action.snapshot.categoryId);
  const liveActivity = liveLog
    ? liveCategory?.activities.find((activity) => activity.id === liveLog.activityId)
    : liveCategory?.activities.find((activity) => activity.id === action.snapshot.activityId);
  const liveLinkedTodo = liveLog?.linkedTodoId
    ? todos.find((todo) => todo.id === liveLog.linkedTodoId)
    : undefined;
  const categoryActivityLabel = dedupeStringArray([
    liveCategory?.name || action.snapshot.categoryName,
    liveActivity?.name || action.snapshot.activityName
  ]).join(' / ');
  const primaryText = action.snapshot.description.trim() || liveActivity?.name || action.snapshot.activityName;

  return (
    <div
      key={action.actionId}
      className={`border-l-2 pl-3 pr-1 py-1 ${action.status === 'undone' ? 'opacity-70' : ''}`}
      style={{ borderColor: getStatusBorderColor(action.status, theme) }}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <span className="pt-0.5 text-[11px]" style={{ color: theme.textMuted }}>
            {formatActionDate(action.snapshot.startTime)}
          </span>
          <span
            className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px]"
            style={{
              color: theme.textSecondary,
              borderColor: theme.chipBorder,
              backgroundColor: theme.chipBg
            }}
          >
            {formatTimeRange(action.snapshot.startTime, action.snapshot.endTime)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="mt-1 font-serif text-[1rem] leading-6" style={{ color: theme.textPrimary }}>
            {primaryText}
          </p>
        </div>

        <span
          className="hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={getStatusBadgeStyle(action.status, theme)}
        >
          {action.status === 'failed' ? '失败' : action.status === 'undone' ? '已撤销' : '已应用'}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
        <span className="inline-flex items-center gap-1">
          <span className="font-bold">#</span>
          <span>{categoryActivityLabel}</span>
        </span>

        {action.snapshot.scopeNames.map((scopeName) => (
          <span key={`${action.actionId}-${scopeName}`} className="inline-flex items-center gap-1">
            <span className="font-bold">%</span>
            <span>{scopeName}</span>
          </span>
        ))}

        {(liveLinkedTodo?.title || action.snapshot.linkedTodoTitle) && (
          <span className="inline-flex items-center gap-1">
            <span className="font-bold">@</span>
            <span>{liveLinkedTodo?.title || action.snapshot.linkedTodoTitle}</span>
          </span>
        )}
      </div>

      {action.kind === 'create_subtask' && action.snapshot.parentTodoTitle && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
          <span className="inline-flex items-center gap-1">
            <span className="font-bold">↳</span>
            <span>{action.snapshot.parentTodoTitle}</span>
          </span>
        </div>
      )}

      {action.errorMessage && (
        <p className="mt-2 text-xs" style={{ color: theme.dangerText }}>{action.errorMessage}</p>
      )}

      <div className="mt-2.5 flex justify-end gap-2">
        <button
          onClick={() => onOpenLogEditor(action.snapshot.logId)}
          disabled={!liveLog || action.status !== 'applied'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textSecondary
          }}
          title="编辑"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onUndoLogAction(messageId, action)}
          disabled={action.status !== 'applied'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textSecondary
          }}
          title="撤销"
        >
          <Undo2 size={13} />
        </button>
      </div>
    </div>
  );
};

const RenderTodoAction: React.FC<AIBackfillChatAppliedActionRendererProps & {
  action: AppliedCreateTodoAction | AppliedCreateSubtaskAction;
}> = ({
  action,
  categories,
  getActivityById,
  getActivityCategory,
  getScopeNames,
  messageId,
  onOpenTodoDetail,
  onUndoCreateSubtaskAction,
  onUndoTodoAction,
  theme,
  todoCategories,
  todos
}) => {
  const liveTodo = action.snapshot.todoId
    ? todos.find((todo) => todo.id === action.snapshot.todoId)
    : undefined;
  const liveParentTodo = action.kind === 'create_subtask' && liveTodo?.parentTodoId
    ? todos.find((todo) => todo.id === liveTodo.parentTodoId)
    : undefined;
  const resolvedTodoCategoryName = todoCategories.find((category) => category.id === (liveTodo?.categoryId || action.snapshot.categoryId))?.name
    || action.snapshot.categoryName;
  const resolvedTodoAtLabel = action.kind === 'create_subtask'
    ? [resolvedTodoCategoryName, liveParentTodo?.title || action.snapshot.parentTodoTitle].filter(Boolean).join(' / ')
    : resolvedTodoCategoryName;
  const resolvedLinkedCategory = (
    categories.find((category) => category.id === (liveTodo?.linkedCategoryId || action.snapshot.linkedCategoryId))
    || getActivityCategory(liveTodo?.linkedActivityId || action.snapshot.linkedActivityId)
  );
  const resolvedLinkedActivity = getActivityById(liveTodo?.linkedActivityId || action.snapshot.linkedActivityId);
  const linkedTagLabel = dedupeStringArray([
    resolvedLinkedCategory?.name || action.snapshot.linkedCategoryName,
    resolvedLinkedActivity?.name || action.snapshot.linkedActivityName
  ]).join(' / ');
  const resolvedScopeIds = dedupeStringArray([
    ...(liveTodo?.defaultScopeIds || action.snapshot.defaultScopeIds)
  ]);
  const resolvedScopeNames = resolvedScopeIds.length > 0
    ? (() => {
      const names = getScopeNames(resolvedScopeIds);
      return names.length > 0 ? names : action.snapshot.defaultScopeNames;
    })()
    : action.snapshot.defaultScopeNames;

  return (
    <div
      key={action.actionId}
      className={`border-l-2 pl-3 pr-1 py-1 ${action.status === 'undone' ? 'opacity-70' : ''}`}
      style={{ borderColor: getStatusBorderColor(action.status, theme) }}
    >
      <div className="min-w-0">
        <div className="min-w-0">
          <p className="font-serif text-[1rem] leading-6" style={{ color: theme.textPrimary }}>
            {liveTodo?.title || action.snapshot.title}
          </p>
          {action.snapshot.note && (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: theme.textSecondary }}>
              {action.snapshot.note}
            </p>
          )}
        </div>

        <span
          className="hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={getStatusBadgeStyle(action.status, theme)}
        >
          {action.status === 'failed' ? '失败' : action.status === 'undone' ? '已撤销' : '已创建'}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
        {resolvedTodoAtLabel && (
          <span className="inline-flex items-center gap-1">
            <span className="font-bold">@</span>
            <span>{resolvedTodoAtLabel}</span>
          </span>
        )}

        {linkedTagLabel && (
          <span className="inline-flex items-center gap-1">
            <span className="font-bold">#</span>
            <span>{linkedTagLabel}</span>
          </span>
        )}

        {resolvedScopeNames.map((scopeName) => (
          <span key={`${action.actionId}-${scopeName}`} className="inline-flex items-center gap-1">
            <span className="font-bold">%</span>
            <span>{scopeName}</span>
          </span>
        ))}

        {action.snapshot.scheduledDate && (
          <span className="inline-flex items-center">
            安排 {action.snapshot.scheduledDate}
          </span>
        )}

        {action.snapshot.deadlineDate && (
          <span className="inline-flex items-center">
            截止 {action.snapshot.deadlineDate}
          </span>
        )}

        {action.snapshot.recurrenceRule && (
          <span className="inline-flex items-center">
            循环 {action.snapshot.recurrenceRule.frequency}
          </span>
        )}
      </div>

      {action.errorMessage && (
        <p className="mt-2 text-xs" style={{ color: theme.dangerText }}>{action.errorMessage}</p>
      )}

      <div className="mt-2.5 flex justify-end gap-2">
        <button
          onClick={() => onOpenTodoDetail(action.snapshot.todoId)}
          disabled={!action.snapshot.todoId || action.status !== 'applied'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textSecondary
          }}
          title="详情"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => (
            action.kind === 'create_subtask'
              ? onUndoCreateSubtaskAction(messageId, action)
              : onUndoTodoAction(messageId, action)
          )}
          disabled={action.status !== 'applied'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textSecondary
          }}
          title="撤销"
        >
          <Undo2 size={13} />
        </button>
      </div>
    </div>
  );
};

const RenderUpdateTodoAction: React.FC<AIBackfillChatAppliedActionRendererProps & {
  action: AppliedUpdateTodoAction;
}> = ({
  action,
  categories,
  getActivityById,
  getScopeNames,
  messageId,
  onOpenTodoDetail,
  onUndoUpdateTodoAction,
  theme,
  todoCategories,
  todos
}) => {
  const liveTodo = action.snapshot.todoId
    ? todos.find((todo) => todo.id === action.snapshot.todoId)
    : undefined;
  const displayTodo = liveTodo || action.snapshot.nextTodo || action.snapshot.previousTodo;
  const linkedCategory = displayTodo?.linkedCategoryId
    ? categories.find((category) => category.id === displayTodo.linkedCategoryId)
    : undefined;
  const linkedActivity = displayTodo?.linkedActivityId
    ? linkedCategory?.activities.find((activity) => activity.id === displayTodo.linkedActivityId) || getActivityById(displayTodo.linkedActivityId)
    : undefined;
  const linkedTagLabel = dedupeStringArray([
    linkedCategory?.name,
    linkedActivity?.name
  ]).join(' / ');
  const scopeNames = getScopeNames(displayTodo?.defaultScopeIds || []);
  const todoCategoryName = displayTodo?.categoryId
    ? todoCategories.find((category) => category.id === displayTodo.categoryId)?.name
    : '';

  return (
    <div
      key={action.actionId}
      className={`border-l-2 pl-3 pr-1 py-1 ${action.status === 'undone' ? 'opacity-70' : ''}`}
      style={{ borderColor: getStatusBorderColor(action.status, theme) }}
    >
      <div className="min-w-0">
        <p className="font-serif text-[1rem] leading-6" style={{ color: theme.textPrimary }}>
          {displayTodo?.title || action.snapshot.previousTodo?.title || '未找到待办'}
        </p>
        {displayTodo?.note && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: theme.textSecondary }}>
            {displayTodo.note}
          </p>
        )}
      </div>

      {displayTodo && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
          {todoCategoryName && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">@</span>
              <span>{todoCategoryName}</span>
            </span>
          )}
          {linkedTagLabel && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">#</span>
              <span>{linkedTagLabel}</span>
            </span>
          )}
          {scopeNames.map((scopeName) => (
            <span key={`${action.actionId}-scope-${scopeName}`} className="inline-flex items-center gap-1">
              <span className="font-bold">%</span>
              <span>{scopeName}</span>
            </span>
          ))}
          {displayTodo.pin && <span className="inline-flex items-center">Pin</span>}
          {displayTodo.scheduledDate && <span className="inline-flex items-center">安排 {displayTodo.scheduledDate}</span>}
          {displayTodo.deadlineDate && <span className="inline-flex items-center">截止 {displayTodo.deadlineDate}</span>}
          {displayTodo.isCompleted && <span className="inline-flex items-center">已完成</span>}
        </div>
      )}

      {action.errorMessage && (
        <p className="mt-2 text-xs" style={{ color: theme.dangerText }}>{action.errorMessage}</p>
      )}

      <div className="mt-2.5 flex justify-end gap-2">
        <button
          onClick={() => onOpenTodoDetail(action.snapshot.todoId)}
          disabled={!action.snapshot.todoId || action.status !== 'applied'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textSecondary
          }}
          title="详情"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onUndoUpdateTodoAction(messageId, action)}
          disabled={action.status !== 'applied'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textSecondary
          }}
          title="撤销"
        >
          <Undo2 size={13} />
        </button>
      </div>
    </div>
  );
};

const RenderEditLogAction: React.FC<AIBackfillChatAppliedActionRendererProps & {
  action: AppliedEditLogAction;
}> = ({
  action,
  categories,
  formatActionDate,
  formatTimeRange,
  getScopeNames,
  logs,
  messageId,
  onOpenLogEditor,
  onUndoEditLogAction,
  theme,
  todos
}) => {
  const liveLog = action.snapshot.logId
    ? logs.find((log) => log.id === action.snapshot.logId)
    : undefined;
  const displayLog = liveLog || action.snapshot.nextLog || action.snapshot.previousLog;
  const category = displayLog
    ? categories.find((item) => item.id === displayLog.categoryId)
    : undefined;
  const activity = displayLog
    ? category?.activities.find((item) => item.id === displayLog.activityId)
      || categories.flatMap((item) => item.activities).find((item) => item.id === displayLog.activityId)
    : undefined;
  const linkedTodo = displayLog?.linkedTodoId
    ? todos.find((todo) => todo.id === displayLog.linkedTodoId)
    : undefined;
  const scopeNames = getScopeNames(displayLog?.scopeIds || []);

  return (
    <div
      key={action.actionId}
      className={`border-l-2 pl-3 pr-1 py-1 ${action.status === 'undone' ? 'opacity-70' : ''}`}
      style={{ borderColor: getStatusBorderColor(action.status, theme) }}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <span className="pt-0.5 text-[11px]" style={{ color: theme.textMuted }}>
            {displayLog ? formatActionDate(displayLog.startTime) : ''}
          </span>
          <span
            className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px]"
            style={{
              color: theme.textSecondary,
              borderColor: theme.chipBorder,
              backgroundColor: theme.chipBg
            }}
          >
            {displayLog ? formatTimeRange(displayLog.startTime, displayLog.endTime) : ''}
          </span>
        </div>
        <p className="mt-1 font-serif text-[1rem] leading-6" style={{ color: theme.textPrimary }}>
          {displayLog?.note?.trim() || activity?.name || '已修改记录'}
        </p>
      </div>

      {displayLog && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
          <span className="inline-flex items-center gap-1">
            <span className="font-bold">#</span>
            <span>{dedupeStringArray([category?.name, activity?.name]).join(' / ')}</span>
          </span>
          {scopeNames.map((scopeName) => (
            <span key={`${action.actionId}-log-scope-${scopeName}`} className="inline-flex items-center gap-1">
              <span className="font-bold">%</span>
              <span>{scopeName}</span>
            </span>
          ))}
          {linkedTodo?.title && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">@</span>
              <span>{linkedTodo.title}</span>
            </span>
          )}
        </div>
      )}

      {action.errorMessage && (
        <p className="mt-2 text-xs" style={{ color: theme.dangerText }}>{action.errorMessage}</p>
      )}

      <div className="mt-2.5 flex justify-end gap-2">
        <button
          onClick={() => onOpenLogEditor(action.snapshot.logId)}
          disabled={!action.snapshot.logId || action.status !== 'applied'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textSecondary
          }}
          title="编辑"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onUndoEditLogAction(messageId, action)}
          disabled={action.status !== 'applied'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textSecondary
          }}
          title="撤销"
        >
          <Undo2 size={13} />
        </button>
      </div>
    </div>
  );
};

export const renderAppliedChatAction = ({
  action,
  ...props
}: AIBackfillChatAppliedActionRendererProps): React.ReactNode => {
  if (action.kind === 'create_log') {
    return <RenderLogAction {...props} action={action} />;
  }

  if (action.kind === 'edit_log') {
    return <RenderEditLogAction {...props} action={action} />;
  }

  if (action.kind === 'update_todo') {
    return <RenderUpdateTodoAction {...props} action={action} />;
  }

  return <RenderTodoAction {...props} action={action} />;
};
