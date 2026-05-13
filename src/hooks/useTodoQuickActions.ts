/**
 * @file useTodoQuickActions.ts
 * @input Todo save/edit callbacks from TodoView
 * @output Shared quick-actions state and handlers for todo list rows and week-view badges
 * @pos Hook
 * @description Centralizes todo quick-actions sheet state so multiple entry points can open the same modal without duplicating move/complete/detail logic inside the view.
 * @updated 2026-05-13: Added a shared quick-to-project upgrade action so lightweight reminders can graduate into full project todos from shared entry points.
 * @updated 2026-05-05: Exposes the quick-actions open timestamp plus a shared interaction guard so bottom-edge touch openings cannot immediately trigger a newly mounted action button.
 * @updated 2026-04-27: Routed shared quick-actions delete requests into the existing todo deletion flow.
 * @updated 2026-04-21: Added a shared pin/unpin quick action so schedule-list rows and week badges can toggle the today-top flag consistently.
 * @updated 2026-04-20: Extracted from TodoView to unify quick-actions behavior across todo-row taps and week badge actions.
 */
import { useRef, useState } from 'react';
import { TodoItem } from '../types';
import { formatDateKey, parseDateKey } from '../utils/todoScheduleUtils';
import { isQuickTodo } from '../utils/todoKindUtils';

export const QUICK_ACTION_INTERACTION_GUARD_MS = 280;

export const isTodoQuickActionInteractionGuardActive = (
  openedAt: number,
  now = Date.now()
): boolean => openedAt > 0 && now - openedAt < QUICK_ACTION_INTERACTION_GUARD_MS;

interface UseTodoQuickActionsOptions {
  onSaveTodo: (todo: TodoItem) => void;
  onEditTodo: (todo: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
  projectCategoryId?: string;
}

export const useTodoQuickActions = ({ onSaveTodo, onEditTodo, onDeleteTodo, projectCategoryId }: UseTodoQuickActionsOptions) => {
  const [quickActionTodo, setQuickActionTodo] = useState<TodoItem | null>(null);
  const quickActionOpenedAtRef = useRef(0);

  const openQuickActions = (todo: TodoItem) => {
    quickActionOpenedAtRef.current = Date.now();
    setQuickActionTodo(todo);
  };

  const closeQuickActions = (force = false) => {
    if (!force && isTodoQuickActionInteractionGuardActive(quickActionOpenedAtRef.current)) {
      return;
    }

    setQuickActionTodo(null);
  };

  const handleQuickActionMove = (type: 'scheduled' | 'deadline', mode: 'today' | 'tomorrow' | 'nextWeek') => {
    if (!quickActionTodo) return;

    const baseDateKey = type === 'scheduled'
      ? quickActionTodo.scheduledDate
      : quickActionTodo.deadlineDate;
    const baseDate = parseDateKey(baseDateKey) || new Date();
    const targetDate = new Date(baseDate);

    if (mode === 'today') {
      const today = new Date();
      targetDate.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
    } else if (mode === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDate.setFullYear(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    } else {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    const dateKey = formatDateKey(targetDate);
    onSaveTodo({
      ...quickActionTodo,
      scheduledDate: type === 'scheduled' ? dateKey : quickActionTodo.scheduledDate,
      deadlineDate: type === 'deadline' ? dateKey : quickActionTodo.deadlineDate
    });
    closeQuickActions(true);
  };

  const handleQuickActionOpenDetail = () => {
    if (!quickActionTodo) return;
    onEditTodo(quickActionTodo);
    closeQuickActions(true);
  };

  const handleQuickActionComplete = () => {
    if (!quickActionTodo) return;
    onSaveTodo({
      ...quickActionTodo,
      isCompleted: true,
      completedAt: new Date().toISOString()
    });
    closeQuickActions(true);
  };

  const handleQuickActionUndoComplete = () => {
    if (!quickActionTodo) return;
    onSaveTodo({
      ...quickActionTodo,
      isCompleted: false,
      completedAt: undefined
    });
    closeQuickActions(true);
  };

  const handleQuickActionClearDate = (type: 'scheduled' | 'deadline') => {
    if (!quickActionTodo) return;
    onSaveTodo({
      ...quickActionTodo,
      scheduledDate: type === 'scheduled' ? undefined : quickActionTodo.scheduledDate,
      deadlineDate: type === 'deadline' ? undefined : quickActionTodo.deadlineDate
    });
    closeQuickActions(true);
  };

  const handleQuickActionTogglePin = () => {
    if (!quickActionTodo) return;
    onSaveTodo({
      ...quickActionTodo,
      pin: !quickActionTodo.pin
    });
    closeQuickActions(true);
  };

  const handleQuickActionUpgradeToProject = () => {
    if (!quickActionTodo) return;

    if (!isQuickTodo(quickActionTodo)) return;

    onSaveTodo({
      ...quickActionTodo,
      kind: 'project',
      categoryId: projectCategoryId || quickActionTodo.categoryId
    });
    closeQuickActions(true);
  };

  const handleQuickActionDelete = () => {
    if (!quickActionTodo) return;
    const todoId = quickActionTodo.id;
    closeQuickActions(true);
    onDeleteTodo(todoId);
  };

  return {
    quickActionTodo,
    quickActionOpenedAt: quickActionOpenedAtRef.current,
    openQuickActions,
    closeQuickActions,
    handleQuickActionMove,
    handleQuickActionOpenDetail,
    handleQuickActionComplete,
    handleQuickActionUndoComplete,
    handleQuickActionClearDate,
    handleQuickActionTogglePin,
    handleQuickActionUpgradeToProject,
    handleQuickActionDelete
  };
};
