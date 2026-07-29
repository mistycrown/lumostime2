/**
 * @file TimelineTodoSidebar.tsx
 * @input Incomplete todos, todo categories, responsive sidebar visibility, and todo selection callback
 * @output Collapsible desktop sidebar and mobile todo drawer for the Chronicle layout
 * @pos Component
 * @description Renders read-only pinned and today todo groups without duplicating Todo view mutation controls.
 * @updated 2026-07-29: Reserved bottom scroll room so floating timeline controls never cover final todos.
 */
import React, { useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ListTodo, Pin } from 'lucide-react';
import { TodoCategory, TodoItem } from '../types';
import { getTodoAssociationTodayTodos } from '../utils/todoScheduleUtils';

interface TimelineTodoSidebarProps {
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  onSelectTodo: (todo: TodoItem) => void;
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

const TodoGroups: React.FC<{
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  onSelectTodo: (todo: TodoItem) => void;
}> = ({ todos, todoCategories, onSelectTodo }) => {
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
    isLast: boolean
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
      {renderGroup('今天', <CalendarDays size={12} />, todayTodos, true)}
    </div>
  );
};

export const TimelineTodoSidebar: React.FC<TimelineTodoSidebarProps> = ({
  todos,
  todoCategories,
  isCollapsed,
  isMobileOpen,
  onToggleCollapsed,
  onCloseMobile,
  onSelectTodo
}) => (
  <>
    <aside
      className={`absolute inset-y-0 right-0 z-20 hidden border-l border-stone-200/80 bg-[#fdfbf7]/95 shadow-[-10px_0_30px_rgba(28,25,23,0.04)] backdrop-blur-md transition-[width] duration-200 lg:flex lg:flex-col ${isCollapsed ? 'w-14' : 'w-[22rem]'}`}
      aria-label="今日待办"
    >
      <div className={`flex h-14 shrink-0 items-center border-b border-stone-100 ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!isCollapsed && <span className="flex items-center gap-2 text-sm font-bold text-stone-700"><ListTodo size={17} />今日待办</span>}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          title={isCollapsed ? '展开待办' : '收起待办'}
          aria-label={isCollapsed ? '展开待办' : '收起待办'}
        >
          {isCollapsed ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
        </button>
      </div>
      {isCollapsed ? (
        <span className="mt-4 flex justify-center text-[10px] font-bold text-stone-300 [writing-mode:vertical-rl]">待办</span>
      ) : (
        <TodoGroups todos={todos} todoCategories={todoCategories} onSelectTodo={onSelectTodo} />
      )}
    </aside>

    <div className={`fixed inset-0 z-50 lg:hidden ${isMobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isMobileOpen}>
      <button
        type="button"
        className={`absolute inset-0 bg-stone-950/20 transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCloseMobile}
        tabIndex={isMobileOpen ? 0 : -1}
        aria-label="关闭待办抽屉"
      />
      <aside className={`absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-[#fdfbf7] shadow-[-18px_0_42px_rgba(28,25,23,0.16)] transition-transform duration-200 ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-stone-100 px-4 pt-[env(safe-area-inset-top)]">
          <span className="flex items-center gap-2 text-sm font-bold text-stone-700"><ListTodo size={17} />今日待办</span>
          <button type="button" onClick={onCloseMobile} className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700" aria-label="关闭待办">
            <ChevronRight size={17} />
          </button>
        </div>
        <TodoGroups todos={todos} todoCategories={todoCategories} onSelectTodo={onSelectTodo} />
      </aside>
    </div>
  </>
);
