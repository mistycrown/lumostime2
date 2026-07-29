/**
 * @file TimelineTodoSidebar.tsx
 * @input Date-specific scheduled todos, logs, resolved daily checks, review entries, and selection callbacks
 * @output A resizable, in-flow todo-and-daily-check column for the Chronicle split workspace
 * @pos Component
 * @description Renders date-specific todos and daily checks without duplicating Todo view mutation controls.
 * @updated 2026-07-30: Matched todo rows to schedule entries, added compact typed check markers, and hid checks for future dates.
 */
import React, { useMemo } from 'react';
import { Check, ClipboardCheck, ListTodo } from 'lucide-react';
import { CheckItem, Log, TodoItem } from '../types';
import { getCheckItemCountState } from '../utils/dailyCheckUtils';
import { buildTodoDateEntries, formatDateKey, TodoDateEntry } from '../utils/todoScheduleUtils';

interface TimelineTodoSidebarProps {
  todos: TodoItem[];
  logs: Log[];
  checkItems: CheckItem[];
  currentDate: Date;
  width: number;
  reviewSlot?: React.ReactNode;
  onSelectTodo: (todo: TodoItem) => void;
  onCheckItemClick: (item: CheckItem) => void;
}

const SCHEDULE_LABELS: Record<Exclude<TodoDateEntry['primaryKind'], 'inProgress'>, string> = {
  deadline: 'DUE',
  scheduled: 'ARR',
  recurring: 'REP',
  maybe: 'MAY',
  completed: 'DONE'
};

const TodoCompletionMarker: React.FC<{ completed: boolean }> = ({ completed }) => (
  <span
    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 dark:border-stone-600"
    style={completed ? { color: 'var(--accent-color, #1c1917)', borderColor: 'var(--accent-color, #1c1917)' } : undefined}
  >
    {completed && <Check size={11} strokeWidth={2.5} />}
  </span>
);

const TodoRow: React.FC<{ entry: TodoDateEntry; onSelect: () => void }> = ({ entry, onSelect }) => {
  const isCompleted = entry.primaryKind === 'completed' || entry.todo.isCompleted;
  const scheduleLabel = entry.primaryKind === 'inProgress' ? null : SCHEDULE_LABELS[entry.primaryKind];

  return (
  <button
    type="button"
    onClick={onSelect}
    className="group flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/70"
  >
    <TodoCompletionMarker completed={isCompleted} />
    <span className={`min-w-0 flex-1 truncate text-sm font-bold leading-5 transition-colors ${isCompleted ? 'text-stone-400 line-through dark:text-stone-500' : 'text-stone-700 group-hover:text-stone-950 dark:text-stone-200 dark:group-hover:text-white'}`}>
      {entry.todo.title}
    </span>
    {scheduleLabel && <span className="shrink-0 rounded-[3px] border border-stone-200 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-stone-400 dark:border-stone-700 dark:text-stone-500">{scheduleLabel}</span>}
  </button>
  );
};

const CheckRow: React.FC<{ item: CheckItem; onClick: () => void }> = ({ item, onClick }) => {
  const isCount = item.manualMode === 'count';
  const { current, target, isCompleted } = getCheckItemCountState(item);
  const isAuto = item.type === 'auto';
  const isSquare = isAuto || isCount;
  const markerLabel = isCount ? String(current) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isAuto}
      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${isAuto ? 'cursor-default' : 'hover:bg-stone-50 dark:hover:bg-stone-800/70'}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center border text-[9px] font-bold ${isSquare ? 'rounded-[3px]' : 'rounded-full'} ${isCompleted ? '' : 'border-stone-300 text-transparent dark:border-stone-600'}`}
        style={isCompleted ? { color: 'var(--accent-color, #1c1917)', borderColor: 'var(--accent-color, #1c1917)' } : undefined}
      >
        {markerLabel || (isCompleted && <Check size={11} strokeWidth={2.5} />)}
      </span>
      <span className={`min-w-0 flex-1 truncate text-sm font-bold leading-5 ${isCompleted ? 'text-stone-400 line-through dark:text-stone-500' : 'text-stone-700 dark:text-stone-200'}`}>{item.content}</span>
      {isCount && <span className="shrink-0 text-[10px] font-medium text-stone-400">/{target}</span>}
    </button>
  );
};

const GroupHeader: React.FC<{ icon: React.ReactNode; title: string; count: number }> = ({ icon, title, count }) => (
  <div className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
    <span className="flex items-center gap-1.5">{icon}{title}</span>
    <span>{count}</span>
  </div>
);

const TodoGroups: React.FC<{
  todos: TodoItem[];
  logs: Log[];
  checkItems: CheckItem[];
  currentDate: Date;
  onSelectTodo: (todo: TodoItem) => void;
  onCheckItemClick: (item: CheckItem) => void;
}> = ({ todos, logs, checkItems, currentDate, onSelectTodo, onCheckItemClick }) => {
  const visibleTodos = useMemo(() => (
    buildTodoDateEntries(todos, logs, formatDateKey(currentDate))
      .filter((entry) => entry.primaryKind !== 'inProgress')
  ), [currentDate, logs, todos]);
  const isFutureDate = useMemo(() => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return selectedDate > todayStart;
  }, [currentDate]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-64 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <section className="border-b border-stone-100 pb-3 dark:border-stone-800">
        <GroupHeader icon={<ListTodo size={12} />} title="待办" count={visibleTodos.length} />
        {visibleTodos.length > 0 ? (
          <div className="overflow-hidden rounded-lg">
            {visibleTodos.map((entry) => <TodoRow key={`${entry.todo.id}-${entry.primaryKind}`} entry={entry} onSelect={() => onSelectTodo(entry.todo)} />)}
          </div>
        ) : (
          <p className="px-3 py-4 text-xs text-stone-400">暂无待办</p>
        )}
      </section>
      {!isFutureDate && <section>
        <GroupHeader icon={<ClipboardCheck size={12} />} title="日课" count={checkItems.length} />
        {checkItems.length > 0 ? (
          <div className="overflow-hidden rounded-lg">
            {checkItems.map((item) => <CheckRow key={item.id} item={item} onClick={() => onCheckItemClick(item)} />)}
          </div>
        ) : (
          <p className="px-3 py-4 text-xs text-stone-400">暂无日课</p>
        )}
      </section>}
    </div>
  );
};

export const TimelineTodoSidebar: React.FC<TimelineTodoSidebarProps> = ({
  todos,
  logs,
  checkItems,
  currentDate,
  width,
  reviewSlot,
  onSelectTodo,
  onCheckItemClick
}) => (
  <aside
    className="flex h-full min-w-[15rem] shrink-0 flex-col bg-[#fdfbf7]/95 shadow-[-10px_0_30px_rgba(28,25,23,0.04)] backdrop-blur-md dark:bg-stone-900/95"
    style={{ width: `${width}px`, maxWidth: '50%' }}
    aria-label="待办与日课"
  >
    {reviewSlot}
    <TodoGroups todos={todos} logs={logs} checkItems={checkItems} currentDate={currentDate} onSelectTodo={onSelectTodo} onCheckItemClick={onCheckItemClick} />
  </aside>
);
