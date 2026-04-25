/**
 * @file TodoAssociation.tsx
 * @input todos, categories, linked ID, optional hierarchy toggle
 * @output Todo Selection UI
 * @pos Component (Input)
 * @description A specialized selector for linking a log entry to a specific Todo item, grouped by category and optionally rendered as a collapsible parent/subtask tree.
 * @updated 2026-04-25: Shared pickers now hide unfinished subtasks whenever their parent todo is completed, so completed parents never leave orphan child rows behind.
 * @updated 2026-04-22: Let pinned or today-arranged parent todos in the virtual today category expand to their full direct-subtask set.
 * @updated 2026-04-22: Made the picker default to the virtual today category and added a visible `Pin` badge for pinned rows inside that bucket.
 * @updated 2026-04-22: Fixed manual category switching so the virtual today category no longer snaps back to the linked todo's source category after a tap.
 * @updated 2026-04-22: Added a first-position virtual today category that mixes pinned todos with todos arranged for today inside shared pickers.
 * @updated 2026-04-22: Added optional hierarchy rendering so focus and backfill todo pickers can show collapsed parent tasks with expandable subtasks.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, TrendingUp } from 'lucide-react';
import { TodoCategory, TodoItem } from '../types';
import { buildTodoAssociationRows, getInitialExpandedTodoParentIds } from '../utils/todoAssociationUtils';
import {
  getTodoAssociationTodayTodos,
  isTodoInAssociationTodayCategory,
  TODO_ASSOCIATION_TODAY_CATEGORY_ID
} from '../utils/todoScheduleUtils';
import { IconRenderer } from './IconRenderer';

interface TodoAssociationProps {
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  linkedTodoId: string | undefined;
  onChange: (todoId: string | undefined) => void;
  renderExtraContent?: (todoId: string) => React.ReactNode;
  enableHierarchy?: boolean;
}

const VIRTUAL_TODAY_CATEGORY: TodoCategory = {
  id: TODO_ASSOCIATION_TODAY_CATEGORY_ID,
  name: '\u4eca\u5929',
  icon: '\uD83D\uDCC5'
};

const resolveSelectedCategoryId = (todos: TodoItem[], linkedTodoId?: string): string => {
  if (!linkedTodoId) {
    return TODO_ASSOCIATION_TODAY_CATEGORY_ID;
  }

  const linkedTodo = todos.find((todo) => todo.id === linkedTodoId);
  if (!linkedTodo) {
    return TODO_ASSOCIATION_TODAY_CATEGORY_ID;
  }

  return isTodoInAssociationTodayCategory(linkedTodo)
    ? TODO_ASSOCIATION_TODAY_CATEGORY_ID
    : linkedTodo.categoryId;
};

export const TodoAssociation: React.FC<TodoAssociationProps> = ({
  todos,
  todoCategories,
  linkedTodoId,
  onChange,
  renderExtraContent,
  enableHierarchy = false
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>(() => resolveSelectedCategoryId(todos, linkedTodoId));
  const [expandedParentIds, setExpandedParentIds] = useState<string[]>(() => (
    getInitialExpandedTodoParentIds(todos, linkedTodoId)
  ));
  const categoryOptions = useMemo(() => [VIRTUAL_TODAY_CATEGORY, ...todoCategories], [todoCategories]);
  const todayCategoryTodos = useMemo(() => getTodoAssociationTodayTodos(todos), [todos]);
  const todayCategoryAllTodos = useMemo(
    () => getTodoAssociationTodayTodos(todos, new Date(), { includeCompleted: true }),
    [todos]
  );

  useEffect(() => {
    setSelectedCatId(resolveSelectedCategoryId(todos, linkedTodoId));
  }, [linkedTodoId, todos]);

  useEffect(() => {
    const initialExpandedIds = getInitialExpandedTodoParentIds(todos, linkedTodoId);
    if (initialExpandedIds.length === 0) {
      return;
    }

    setExpandedParentIds((previousIds) => {
      const nextIds = new Set(previousIds);
      let hasChanged = false;

      initialExpandedIds.forEach((todoId) => {
        if (!nextIds.has(todoId)) {
          nextIds.add(todoId);
          hasChanged = true;
        }
      });

      return hasChanged ? Array.from(nextIds) : previousIds;
    });
  }, [linkedTodoId, todos]);

  const selectedCategoryTodos = useMemo(() => (
    selectedCatId === TODO_ASSOCIATION_TODAY_CATEGORY_ID
      ? todayCategoryTodos
      : todos.filter((todo) => todo.categoryId === selectedCatId && !todo.isCompleted)
  ), [selectedCatId, todos, todayCategoryTodos]);

  const selectedCategoryAllTodos = useMemo(() => (
    selectedCatId === TODO_ASSOCIATION_TODAY_CATEGORY_ID
      ? todayCategoryAllTodos
      : todos.filter((todo) => todo.categoryId === selectedCatId)
  ), [selectedCatId, todos, todayCategoryAllTodos]);
  const selectedCategoryCountSourceTodos = useMemo(() => (
    selectedCatId === TODO_ASSOCIATION_TODAY_CATEGORY_ID
      ? todos
      : selectedCategoryAllTodos
  ), [selectedCatId, todos, selectedCategoryAllTodos]);
  const selectedCategoryChildSourceTodos = useMemo(() => (
    selectedCatId === TODO_ASSOCIATION_TODAY_CATEGORY_ID
      ? todos
      : selectedCategoryAllTodos
  ), [selectedCatId, todos, selectedCategoryAllTodos]);

  const todoRows = useMemo(() => (
    buildTodoAssociationRows(
      selectedCategoryTodos,
      expandedParentIds,
      enableHierarchy,
      selectedCategoryCountSourceTodos,
      selectedCategoryChildSourceTodos
    )
  ), [selectedCategoryTodos, expandedParentIds, enableHierarchy, selectedCategoryCountSourceTodos, selectedCategoryChildSourceTodos]);

  const toggleParentExpanded = (todoId: string) => {
    setExpandedParentIds((previousIds) => (
      previousIds.includes(todoId)
        ? previousIds.filter((id) => id !== todoId)
        : [...previousIds, todoId]
    ));
  };

  const isTodayCategorySelected = selectedCatId === TODO_ASSOCIATION_TODAY_CATEGORY_ID;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Associated Todo</span>
        {!!linkedTodoId && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onChange(undefined);
            }}
            className="text-xs font-medium text-stone-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        {categoryOptions.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCatId(selectedCatId === category.id ? TODO_ASSOCIATION_TODAY_CATEGORY_ID : category.id)}
            className={`
              px-2 py-2 rounded-lg text-[10px] font-medium text-center transition-colors flex items-center justify-center gap-1.5 truncate
              ${selectedCatId === category.id
                ? 'btn-template-filled'
                : 'bg-stone-50 text-stone-500 border border-stone-100 hover:bg-stone-100'
              }
            `}
          >
            <IconRenderer icon={category.icon} uiIcon={category.uiIcon} className="text-xs" />
            <span className="truncate">{category.name}</span>
          </button>
        ))}
      </div>

      <div className="space-y-0">
        {todoRows.map((row) => (
          <div
            key={row.todo.id}
            className="group flex flex-col"
            style={{
              paddingLeft: row.level === 1 ? '1.75rem' : undefined
            }}
          >
            <div className={`flex items-center gap-1 rounded-2xl ${linkedTodoId === row.todo.id ? 'bg-transparent' : 'hover:bg-stone-50'}`}>
              <button
                onClick={() => onChange(linkedTodoId === row.todo.id ? undefined : row.todo.id)}
                className={`min-w-0 flex-1 text-left px-4 py-2 rounded-2xl flex items-center gap-3 transition-all ${linkedTodoId === row.todo.id
                  ? 'bg-transparent'
                  : 'bg-transparent text-stone-400'
                }`}
              >
                <div className="flex items-center justify-center flex-shrink-0">
                  {linkedTodoId === row.todo.id ? (
                    <CheckCircle2 size={18} style={{ color: 'var(--accent-color)' }} className="fill-stone-100" />
                  ) : (
                    <Circle size={18} className="text-stone-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0 truncate flex items-center gap-2">
                  <span
                    className={`text-sm truncate ${linkedTodoId === row.todo.id ? 'font-bold' : 'font-medium text-stone-500'}`}
                    style={linkedTodoId === row.todo.id ? { color: 'var(--text-deep)' } : {}}
                  >
                    {row.todo.title}
                  </span>
                  {isTodayCategorySelected && row.todo.pin && (
                    <span className="flex-shrink-0 rounded-full border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-400">
                      Pin
                    </span>
                  )}
                  {row.childCount > 0 && (
                    <span className="flex-shrink-0 rounded-full border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-400">
                      {row.completedChildCount}/{row.childCount}
                    </span>
                  )}
                </div>

                {row.todo.isProgress && (
                  <TrendingUp size={14} className="text-stone-300 flex-shrink-0" />
                )}
              </button>

              {row.hasChildren && (
                <button
                  type="button"
                  aria-label={row.isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                  onClick={() => toggleParentExpanded(row.todo.id)}
                  className="mr-1 flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-500 transition-colors flex-shrink-0"
                >
                  {row.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>

            {linkedTodoId === row.todo.id && renderExtraContent && (
              <div className="animate-in slide-in-from-top-1 pl-[50px] pr-4 pb-0">
                {renderExtraContent(row.todo.id)}
              </div>
            )}
          </div>
        ))}

        {selectedCategoryTodos.length === 0 && (
          <div className="text-center py-6 text-stone-300 text-xs italic border border-dashed border-stone-100 rounded-2xl">
            {'\u5f53\u524d\u5206\u7c7b\u4e0b\u65e0\u5f85\u529e\u4e8b\u9879'}
          </div>
        )}
      </div>
    </div>
  );
};
