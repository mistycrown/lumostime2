/**
 * @file useTodoQuickActions.ts
 * @input Todo save/edit callbacks from TodoView
 * @output Shared quick-actions state and handlers for todo list rows and week-view badges
 * @pos Hook
 * @description Centralizes todo quick-actions sheet state so multiple entry points can open the same modal without duplicating move/complete/detail logic inside the view.
 * @updated 2026-04-20: Extracted from TodoView to unify quick-actions behavior across todo-row taps and week badge actions.
 */
import { useRef, useState } from 'react';
import { TodoItem } from '../types';
import { formatDateKey, parseDateKey } from '../utils/todoScheduleUtils';

const QUICK_ACTION_CLOSE_GUARD_MS = 280;

interface UseTodoQuickActionsOptions {
  onSaveTodo: (todo: TodoItem) => void;
  onEditTodo: (todo: TodoItem) => void;
}

export const useTodoQuickActions = ({ onSaveTodo, onEditTodo }: UseTodoQuickActionsOptions) => {
  const [quickActionTodo, setQuickActionTodo] = useState<TodoItem | null>(null);
  const quickActionOpenedAtRef = useRef(0);

  const openQuickActions = (todo: TodoItem) => {
    quickActionOpenedAtRef.current = Date.now();
    setQuickActionTodo(todo);
  };

  const closeQuickActions = (force = false) => {
    if (!force && Date.now() - quickActionOpenedAtRef.current < QUICK_ACTION_CLOSE_GUARD_MS) {
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

  return {
    quickActionTodo,
    openQuickActions,
    closeQuickActions,
    handleQuickActionMove,
    handleQuickActionOpenDetail,
    handleQuickActionComplete,
    handleQuickActionUndoComplete,
    handleQuickActionClearDate
  };
};
