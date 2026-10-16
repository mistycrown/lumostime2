/**
 * @file DesktopTodoQuickEditorWindowView.tsx
 * @updated 2026-10-16: Supports dated recurring completion without ending the task series.
 * @input Electron quick-editor payloads plus live todo data snapshots
 * @output Transparent always-on-top desktop quick editor that can exceed the source widget bounds
 * @pos View (Desktop widget)
 * @description Hosts the shared todo quick editor inside its own transparent Electron window so desktop widgets can open a larger inline editor near the pointer without clipping against the widget BrowserWindow.
 * @updated 2026-05-23: Reused the shared desktop todo sync helpers so title/note/completion saves notify sibling widget windows through one central channel contract.
 * @updated 2026-05-17: Added the external quick-editor window view with inline title and note editing, parent navigation, and live todo sync.
 * @updated 2026-05-17: Integrated the onToggleComplete action callback to support fast check/uncheck status updates in the desktop quick editor.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DesktopTodoQuickEditorPopover } from '../../components/DesktopTodoQuickEditorPopover';
import { dataRepository } from '../../repositories/dataRepository';
import {
  publishDesktopTodoSyncEvent,
  subscribeDesktopTodoSyncEvent
} from '../../services/desktopWidgetService';
import type { DesktopTodoQuickEditorWindowPayload } from '../../services/desktopWidgetService';
import type { TodoItem } from '../../types';
import { buildDesktopTodoQuickEditorModel } from '../../utils/desktopTodoQuickEditorUtils';
import { canCompleteTodoOccurrence, getTodoForOccurrence, setTodoCompletion } from '../../utils/todoOccurrenceUtils';
import { getTodayDateKey } from '../../utils/todoScheduleUtils';
import { TodoDatePickerModal } from '../../components/TodoDatePickerModal';

const APP_READY_EVENT = 'lumostime:app-ready';

export const DesktopTodoQuickEditorWindowView: React.FC = () => {
  const [payload, setPayload] = useState<DesktopTodoQuickEditorWindowPayload | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isCompletionPickerOpen, setIsCompletionPickerOpen] = useState(false);
  const occurrenceDateKey = payload?.occurrenceDateKey || getTodayDateKey();

  const refreshTodos = useCallback(async () => {
    try {
      const dataSnapshot = await dataRepository.loadDataContextSnapshot();
      setTodos(dataSnapshot.todos || []);
    } catch (error) {
      console.error('Failed to load desktop quick editor todos', error);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.body.style.overflow = 'hidden';
      document.getElementById('loading-screen')?.remove();
    }

    let isMounted = true;

    const applyPayload = (nextPayload: DesktopTodoQuickEditorWindowPayload | null) => {
      if (!nextPayload || !isMounted) {
        return;
      }
      setPayload(nextPayload);
      setSelectedTodoId(nextPayload.todoId);
      setTheme(nextPayload.theme);
    };

    const hydrate = async () => {
      window.dispatchEvent(new Event(APP_READY_EVENT));
      applyPayload(await window.desktopWidget?.getTodoQuickEditorState?.() || null);
      await refreshTodos();
    };

    void hydrate();

    const stopTodoSyncSubscription = subscribeDesktopTodoSyncEvent(() => {
      void refreshTodos();
    });
    const handleFocus = () => {
      void refreshTodos();
    };

    window.addEventListener('focus', handleFocus);
    const stopPayloadSubscription = window.desktopWidget?.onTodoQuickEditorState?.((nextPayload) => {
      applyPayload(nextPayload);
      void refreshTodos();
    });

    return () => {
      isMounted = false;
      stopTodoSyncSubscription();
      window.removeEventListener('focus', handleFocus);
      stopPayloadSubscription?.();
    };
  }, [refreshTodos]);

  const selectedTodoModel = useMemo(
    () => {
      const model = selectedTodoId ? buildDesktopTodoQuickEditorModel(todos, selectedTodoId) : null;
      return model ? { ...model, todo: getTodoForOccurrence(model.todo, occurrenceDateKey) } : null;
    },
    [selectedTodoId, todos, occurrenceDateKey]
  );

  useEffect(() => {
    const todo = todos.find((item) => item.id === selectedTodoId);
    if (payload && todo) {
      setIsCompletionPickerOpen(Boolean(todo.recurrenceRule && !todo.isCompleted && !canCompleteTodoOccurrence(todo, occurrenceDateKey)));
    }
  }, [payload, selectedTodoId, Boolean(selectedTodoModel), occurrenceDateKey]);

  useEffect(() => {
    if (payload) {
      setTheme(payload.theme);
    }
  }, [payload]);

  useEffect(() => {
    if (selectedTodoId && !selectedTodoModel) {
      window.desktopWidget?.closeTodoQuickEditor?.();
    }
  }, [selectedTodoId, selectedTodoModel]);

  const saveTodoPatch = async (
    todoId: string,
    patch: Partial<TodoItem>,
    errorLabel: string
  ) => {
    const updatedTodos = todos.map((todo) => (
      todo.id === todoId
        ? { ...todo, ...patch }
        : todo
    ));

    setTodos(updatedTodos);

    try {
      await dataRepository.saveTodos(updatedTodos);
      publishDesktopTodoSyncEvent();
      await refreshTodos();
    } catch (error) {
      console.error(errorLabel, error);
      await refreshTodos();
    }
  };

  const handleOpenTodoDetail = (todoId: string) => {
    window.desktopWidget?.requestMainAction({
      type: 'open_todo',
      todoId
    });
    window.desktopWidget?.closeTodoQuickEditor?.();
  };

  const isDark = theme === 'dark';

  return (
    <div className="h-screen w-screen bg-transparent p-2">
      {selectedTodoModel && (
        <DesktopTodoQuickEditorPopover
          anchor={{ x: 0, y: 0 }}
          isDark={isDark}
          model={selectedTodoModel}
          occurrenceDateKey={occurrenceDateKey}
          inline
          onClose={() => window.desktopWidget?.closeTodoQuickEditor?.()}
          onOpenDetail={handleOpenTodoDetail}
          onSaveTitle={(todoId, title) => saveTodoPatch(
            todoId,
            { title },
            'Failed to save todo title from desktop quick editor'
          )}
          onSaveNote={(todoId, note) => saveTodoPatch(
            todoId,
            { note },
            'Failed to save todo note from desktop quick editor'
          )}
          onToggleComplete={(todoId, isCompleted) => {
            const todo = todos.find((item) => item.id === todoId);
            if (!todo) return;
            if (todo.recurrenceRule && !todo.isCompleted && !canCompleteTodoOccurrence(todo, occurrenceDateKey)) {
              setIsCompletionPickerOpen(true);
              return;
            }
            return saveTodoPatch(todoId, setTodoCompletion(todo, isCompleted, todo.isCompleted ? undefined : occurrenceDateKey), 'Failed to complete todo occurrence');
          }}
          onSelectTodo={(todoId) => setSelectedTodoId(todoId)}
        />
      )}
      <TodoDatePickerModal
        isOpen={isCompletionPickerOpen}
        title="选择完成日期"
        isDateSelectable={(dateKey) => {
          const todo = todos.find((item) => item.id === selectedTodoId);
          return Boolean(todo && canCompleteTodoOccurrence(todo, dateKey));
        }}
        onSelect={(dateKey) => {
          const todo = todos.find((item) => item.id === selectedTodoId);
          if (todo) void saveTodoPatch(todo.id, setTodoCompletion(todo, !todo.occurrenceCompletions?.[dateKey], dateKey), 'Failed to complete todo occurrence');
          setIsCompletionPickerOpen(false);
        }}
        onClose={() => setIsCompletionPickerOpen(false)}
      />
    </div>
  );
};
