/**
 * @file AssociatedTodoList.tsx
 * @input Filtered associated todos, logs, and todo edit/toggle callbacks
 * @output Shared associated-todo section with one-level parent/subtask hierarchy
 * @pos Component (Todo association display)
 * @description Renders the associated todo list used by tag, category, and scope detail pages, preserving completion and duration metadata while nesting direct subtasks beneath their parent tasks.
 * @updated 2026-06-13: Moved the parent expand/collapse button to the right side of associated todo rows.
 * @updated 2026-06-13: Added collapsed-by-default parent rows with a compact expand/collapse button for subtasks.
 * @updated 2026-06-13: Removed the child-row branch line so subtasks use indentation only.
 * @updated 2026-06-13: Added shared hierarchical associated-todo list for detail pages.
 * @updated 2026-08-09: Planned timeline blocks are excluded from associated todo duration totals.
 * @updated 2026-09-18: Replaced the association card shell with a divider-led editorial section.
 * @updated 2026-09-18: Localized the shared association list title and empty state for Chinese detail pages.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */

import React, { useMemo, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Log, TodoItem } from '../types';
import { buildTodoTreeItems } from '../utils/todoHierarchyUtils';
import { filterCountableLogs } from '../utils/statLogUtils';

interface AssociatedTodoListProps {
  todos: TodoItem[];
  logs: Log[];
  onEditTodo?: (todo: TodoItem) => void;
  onToggleTodo?: (id: string) => void;
  title?: string;
  emptyDescription?: string;
  showCompletionSummary?: boolean;
}

interface AssociatedTodoRow {
  todo: TodoItem;
  level: 0 | 1;
  hasChildren: boolean;
  isExpanded: boolean;
}

const formatTodoDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatCompletedDate = (completedAt?: string): string => {
  if (!completedAt) {
    return '';
  }

  const date = new Date(completedAt);
  return `${date.getFullYear().toString().slice(-2)}/${date.getMonth() + 1}/${date.getDate()} `;
};

export const AssociatedTodoList: React.FC<AssociatedTodoListProps> = ({
  todos,
  logs,
  onEditTodo,
  onToggleTodo,
  title = '关联待办',
  emptyDescription,
  showCompletionSummary = false
}) => {
  const [expandedParentIds, setExpandedParentIds] = useState<string[]>([]);

  const durationByTodoId = useMemo(() => {
    const durationMap = new Map<string, number>();

    filterCountableLogs(logs).forEach((log) => {
      if (!log.linkedTodoId) {
        return;
      }

      durationMap.set(log.linkedTodoId, (durationMap.get(log.linkedTodoId) || 0) + log.duration);
    });

    return durationMap;
  }, [logs]);

  const rows = useMemo<AssociatedTodoRow[]>(() => {
    const expandedParentIdSet = new Set(expandedParentIds);

    return buildTodoTreeItems(todos).flatMap((item) => {
      const isExpanded = expandedParentIdSet.has(item.todo.id);
      const parentRow: AssociatedTodoRow = {
        todo: item.todo,
        level: 0,
        hasChildren: item.children.length > 0,
        isExpanded
      };

      if (!isExpanded) {
        return [parentRow];
      }

      return [
        parentRow,
        ...item.children.map((todo) => ({
          todo,
          level: 1 as const,
          hasChildren: false,
          isExpanded: false
        }))
      ];
    });
  }, [expandedParentIds, todos]);

  const toggleParentExpanded = (todoId: string) => {
    setExpandedParentIds((currentIds) => (
      currentIds.includes(todoId)
        ? currentIds.filter((id) => id !== todoId)
        : [...currentIds, todoId]
    ));
  };

  return (
    <div className="border-t border-stone-300 pt-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight text-stone-900">{title}</h3>
        {showCompletionSummary && (
          <div className="text-xs font-medium tabular-nums text-stone-400">
            {todos.filter((todo) => todo.isCompleted).length} / {todos.length}
          </div>
        )}
      </div>

      <div className="space-y-0 text-sm">
        {todos.length === 0 ? (
          <div className="py-6 text-center text-stone-400">
            <p className="text-xs font-medium opacity-60">暂无关联待办</p>
            {emptyDescription && (
              <p className="text-xs mt-2 opacity-40">{emptyDescription}</p>
            )}
          </div>
        ) : (
          rows.map(({ todo, level, hasChildren, isExpanded }) => {
            const todoDuration = durationByTodoId.get(todo.id) || 0;

            return (
              <div
                key={todo.id}
                onClick={() => onEditTodo?.(todo)}
                className={`group flex items-center gap-3 py-2 border-b border-stone-100 last:border-0 hover:bg-stone-50 md:-mx-2 md:px-2 transition-colors cursor-pointer ${
                  level === 1 ? 'pl-6 md:pl-7' : ''
                }`}
              >
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleTodo?.(todo.id);
                  }}
                  className="shrink-0 transition-colors"
                >
                  <div className={`w-4 h-4 shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors ${todo.isCompleted ? 'bg-stone-900 border-stone-900' : 'border-stone-300 group-hover:border-stone-400'}`}>
                    {todo.isCompleted && <Check size={11} strokeWidth={3} className="text-white" />}
                  </div>
                </button>
                <span className={`flex-1 text-sm font-medium truncate min-w-0 ${todo.isCompleted ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                  {todo.title}
                </span>

                {(todo.isCompleted || todoDuration > 0) && (
                  <span className="text-xs text-stone-300 font-serif whitespace-nowrap shrink-0">
                    {todo.isCompleted ? formatCompletedDate(todo.completedAt) : ''}
                    {todoDuration > 0 && `Total ${formatTodoDuration(todoDuration)}`}
                  </span>
                )}
                {level === 0 && hasChildren && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleParentExpanded(todo.id);
                    }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-stone-300 transition-colors hover:bg-stone-100 hover:text-stone-600"
                    aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                  >
                    <ChevronRight
                      size={14}
                      strokeWidth={2.5}
                      className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
