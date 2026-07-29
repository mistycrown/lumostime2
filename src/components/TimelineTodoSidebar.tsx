/**
 * @file TimelineTodoSidebar.tsx
 * @input Incomplete todos, todo categories, resolved daily checks, and selection callbacks
 * @output A resizable, in-flow todo-and-daily-check column for the Chronicle split workspace
 * @pos Component
 * @description Renders pinned, today, and daily-check groups without duplicating Todo view mutation controls.
 * @updated 2026-07-29: Added direct Daily Review check actions and removed the redundant column title.
 */
import React, { useMemo } from 'react';
import { CalendarDays, Check, ClipboardCheck, Pin } from 'lucide-react';
import { CheckItem, TodoCategory, TodoItem } from '../types';
import { getCheckItemCountState } from '../utils/dailyCheckUtils';
import { getTodoAssociationTodayTodos } from '../utils/todoScheduleUtils';

interface TimelineTodoSidebarProps {
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  checkItems: CheckItem[];
  onSelectTodo: (todo: TodoItem) => void;
  onCheckItemClick: (item: CheckItem) => void;
}

const getCategoryColor = (category?: TodoCategory): string => {
  const color = category?.color?.trim();
  return color && (/^#|^rgb|^hsl/i.test(color) ? color : '#a8a29e');
};

const getScheduleLabel = (todo: TodoItem): string | null => {
  if (todo.deadlineDate) return `截止 ${todo.deadlineDate.slice(5).replace('-', '/')}`;
  if (todo.scheduledDate) return `今天 ${todo.scheduledDate.slice(5).replace('-', '/')}`;
  if (todo.recurrenceRule) return '重复';
  return null;
};

const TodoRow: React.FC<{
  todo: TodoItem;
  category?: TodoCategory;
  onSelect: () => void;
}> = ({ todo, category, onSelect }) => {
  const scheduleLabel = getScheduleLabel(todo);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-stone-50"
    >
      <span
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
        style={{ backgroundColor: getCategoryColor(category) }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-5 text-stone-700 transition-colors group-hover:text-stone-950">
          {todo.title}
        </span>
        {(category?.name || scheduleLabel) && (
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-stone-400">
            {category?.name && <span className="truncate">{category.name}</span>}
            {category?.name && scheduleLabel && <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-stone-300" />}
            {scheduleLabel && <span className="shrink-0">{scheduleLabel}</span>}
          </span>
        )}
      </span>
    </button>
  );
};

const CheckRow: React.FC<{
  item: CheckItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const isCount = item.manualMode === 'count';
  const { current, target, isCompleted } = getCheckItemCountState(item);
  const isAuto = item.type === 'auto';
  const status = isCount
    ? `${isCompleted ? '已完成' : '未完成'} ${current}/${target}`
    : isCompleted ? '已完成' : '未完成';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isAuto}
      className={`flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors ${isAuto ? 'cursor-default' : 'hover:bg-stone-50'}`}
    >
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isCompleted ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white text-transparent'}`}>
        <Check size={11} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-bold leading-5 ${isCompleted ? 'text-stone-400 line-through' : 'text-stone-700'}`}>{item.content}</span>
        <span className="mt-1 block text-[11px] font-medium text-stone-400">{isAuto ? `自动 · ${status}` : status}</span>
      </span>
    </button>
  );
};

const TodoGroups: React.FC<{
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  checkItems: CheckItem[];
  onSelectTodo: (todo: TodoItem) => void;
  onCheckItemClick: (item: CheckItem) => void;
}> = ({ todos, todoCategories, checkItems, onSelectTodo, onCheckItemClick }) => {
  const { pinnedTodos, todayTodos } = useMemo(() => {
    const visibleTodos = getTodoAssociationTodayTodos(todos).filter((todo) => !todo.isCompleted);
    const pinned = visibleTodos.filter((todo) => todo.pin);
    const pinnedIds = new Set(pinned.map((todo) => todo.id));

    return {
      pinnedTodos: pinned,
      todayTodos: visibleTodos.filter((todo) => !pinnedIds.has(todo.id))
    };
  }, [todos]);

  const categoryById = useMemo(
    () => new Map(todoCategories.map((category) => [category.id, category])),
    [todoCategories]
  );

  const renderGroup = (
    title: string,
    icon: React.ReactNode,
    groupTodos: TodoItem[],
    isLast = false
  ) => (
    <section className={isLast ? '' : 'border-b border-stone-100 pb-3'}>
      <div className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-stone-400">
        <span className="flex items-center gap-1.5">{icon}{title}</span>
        <span>{groupTodos.length}</span>
      </div>
      {groupTodos.length > 0 ? (
        <div className="overflow-hidden rounded-lg">
          {groupTodos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              category={categoryById.get(todo.categoryId)}
              onSelect={() => onSelectTodo(todo)}
            />
          ))}
        </div>
      ) : (
        <p className="px-3 py-4 text-xs text-stone-400">暂无待办</p>
      )}
    </section>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-40">
      {renderGroup('置顶', <Pin size={12} />, pinnedTodos, false)}
      {renderGroup('今天', <CalendarDays size={12} />, todayTodos)}
      <section>
        <div className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-stone-400">
          <span className="flex items-center gap-1.5"><ClipboardCheck size={12} />日课</span>
          <span>{checkItems.length}</span>
        </div>
        {checkItems.length > 0 ? (
          <div className="overflow-hidden rounded-lg">
            {checkItems.map((item) => <CheckRow key={item.id} item={item} onClick={() => onCheckItemClick(item)} />)}
          </div>
        ) : (
          <p className="px-3 py-4 text-xs text-stone-400">暂无日课</p>
        )}
      </section>
    </div>
  );
};

export const TimelineTodoSidebar: React.FC<TimelineTodoSidebarProps> = ({
  todos,
  todoCategories,
  checkItems,
  onSelectTodo,
  onCheckItemClick
}) => (
  <aside className="flex h-full w-[clamp(11rem,35vw,22rem)] shrink-0 flex-col border-l border-stone-200/80 bg-[#fdfbf7]/95 shadow-[-10px_0_30px_rgba(28,25,23,0.04)] backdrop-blur-md" aria-label="待办与日课">
    <TodoGroups todos={todos} todoCategories={todoCategories} checkItems={checkItems} onSelectTodo={onSelectTodo} onCheckItemClick={onCheckItemClick} />
  </aside>
);
