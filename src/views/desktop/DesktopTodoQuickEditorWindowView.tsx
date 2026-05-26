/**
 * @file DesktopTodoQuickEditorWindowView.tsx
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

const APP_READY_EVENT = 'lumostime:app-ready';

export const DesktopTodoQuickEditorWindowView: React.FC = () => {
  const [payload, setPayload] = useState<DesktopTodoQuickEditorWindowPayload | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [todos, setTodos] = useState<TodoItem[]>([]);

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
    () => (selectedTodoId ? buildDesktopTodoQuickEditorModel(todos, selectedTodoId) : null),
    [selectedTodoId, todos]
  );

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
          onToggleComplete={(todoId, isCompleted) => saveTodoPatch(
            todoId,
            {
              isCompleted,
              completedAt: isCompleted ? new Date().toISOString() : undefined
            },
            'Failed to toggle todo completion state from desktop quick editor'
          )}
          onSelectTodo={(todoId) => setSelectedTodoId(todoId)}
        />
      )}
    </div>
  );
};
