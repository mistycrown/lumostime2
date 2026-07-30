/**
 * @file TimelineTodoSidebar.tsx
 * @input Date-specific scheduled todos, logs, resolved daily checks, review entries, and selection callbacks
 * @output A resizable, in-flow todo-and-daily-check column for the Chronicle split workspace
 * @pos Component
 * @description Renders date-specific todos and daily checks without duplicating Todo view mutation controls.
 * @updated 2026-07-30: Lowered the in-flow minimum width to match the quick-color sidebar's compact limit.
 * @updated 2026-07-30: Removes schedule and PIN badges from the narrow todo column while retaining their data behavior.
 * @updated 2026-07-30: Tightens the todo list gutter and uses the shared 26%-70% split ratio bounds.
 * @updated 2026-07-30: Shares the row pointer-drag lifecycle with the quick-color sidebar through a common hook.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronRight, ClipboardCheck, ListTodo } from 'lucide-react';
import { usePointerDrag } from '../hooks';
import { CheckItem, Log, TodoItem } from '../types';
import { getCheckItemCountState } from '../utils/dailyCheckUtils';
import { TIMELINE_SIDEBAR_MAX_RATIO, TIMELINE_SIDEBAR_MIN_RATIO } from '../utils/timelineSidebarRatioUtils';
import { buildTodoTreeItems } from '../utils/todoHierarchyUtils';
import { buildTodoDateEntries, formatDateKey, TodoDateEntry } from '../utils/todoScheduleUtils';

interface TimelineTodoSidebarProps {
  todos: TodoItem[];
  logs: Log[];
  checkItems: CheckItem[];
  currentDate: Date;
  ratio: number;
  reviewSlot?: React.ReactNode;
  selectedCategoryId?: string | null;
  selectedListLabel?: string;
  onSelectTodo: (todo: TodoItem) => void;
  onToggleTodoCompletion: (todo: TodoItem) => void;
  onCheckItemClick: (item: CheckItem) => void;
  onTodoDragMove: (todo: TodoItem, clientX: number, clientY: number) => boolean;
  onTodoDragEnd: () => void;
  onTodoDrop: (todo: TodoItem, clientX: number, clientY: number) => boolean;
}

export const TODO_DRAG_DISTANCE = 2;

export const resolveTodoDragIntent = (deltaX: number, deltaY: number): 'drag' | 'scroll' => (
  deltaX < 0 ? 'drag' : 'scroll'
);

export const shouldHideCheckMarkerContent = (isCount: boolean, isCompleted: boolean): boolean => (
  !isCount && !isCompleted
);

const TodoCompletionMarker: React.FC<{ completed: boolean; onToggle: () => void }> = ({ completed, onToggle }) => (
  <button
    type="button"
    aria-label={completed ? '标记为未完成' : '标记为已完成'}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation();
      onToggle();
    }}
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
  >
    <span
      className="flex h-4 w-4 items-center justify-center rounded-full border border-stone-300 dark:border-stone-600"
    style={completed ? { color: 'var(--accent-color, #1c1917)', borderColor: 'var(--accent-color, #1c1917)' } : undefined}
  >
    {completed && <Check size={11} strokeWidth={2.5} />}
    </span>
  </button>
);

type SidebarTodoEntry = TodoDateEntry & { isPinnedOnly?: boolean };

export interface TimelineSidebarTodoTreeGroup {
  parentEntry: SidebarTodoEntry;
  childEntries: SidebarTodoEntry[];
}

const createCategoryTodoEntry = (todo: TodoItem): SidebarTodoEntry => ({
  todo,
  badges: { scheduled: false, deadline: false, recurring: false, maybe: false, completed: todo.isCompleted, inProgress: false },
  primaryKind: todo.isCompleted ? 'completed' : 'scheduled'
});

export const buildTimelineSidebarTodoEntries = (todos: TodoItem[], logs: Log[], dateKey: string): SidebarTodoEntry[] => {
  const dateEntries = buildTodoDateEntries(todos, logs, dateKey)
    .filter((entry) => entry.primaryKind !== 'inProgress');
  const existingIds = new Set(dateEntries.map((entry) => entry.todo.id));
  const pinnedEntries = todos
    .filter((todo) => Boolean(todo.pin) && !todo.isCompleted && !existingIds.has(todo.id))
    .map((todo): SidebarTodoEntry => ({
      todo,
      badges: { scheduled: false, deadline: false, recurring: false, maybe: false, completed: false, inProgress: false },
      primaryKind: 'scheduled',
      isPinnedOnly: true
    }));

  return [...dateEntries, ...pinnedEntries]
    .sort((left, right) => Number(Boolean(right.todo.pin)) - Number(Boolean(left.todo.pin)) || left.todo.title.localeCompare(right.todo.title, 'zh-CN'));
};

export const buildTimelineSidebarCategoryTodoEntries = (todos: TodoItem[], categoryId: string): SidebarTodoEntry[] => (
  todos
    .filter((todo) => todo.categoryId === categoryId && !todo.isCompleted)
    .map(createCategoryTodoEntry)
    .sort((left, right) => left.todo.title.localeCompare(right.todo.title, 'zh-CN'))
);

export const buildTimelineSidebarTodoTreeGroups = (
  entries: SidebarTodoEntry[],
  allTodos: TodoItem[],
  includeUnscheduledChildren = false
): TimelineSidebarTodoTreeGroup[] => {
  const entryById = new Map(entries.map((entry) => [entry.todo.id, entry]));
  const groupedEntryIds = new Set<string>();
  const groups: TimelineSidebarTodoTreeGroup[] = [];

  buildTodoTreeItems(allTodos).forEach(({ todo: parentTodo, children }) => {
    const parentEntry = entryById.get(parentTodo.id);

    if (parentEntry) {
      const childEntries = children
        .filter((childTodo) => includeUnscheduledChildren || entryById.has(childTodo.id))
        .map((childTodo) => entryById.get(childTodo.id) || createCategoryTodoEntry(childTodo));
      groups.push({ parentEntry, childEntries });
      groupedEntryIds.add(parentTodo.id);
      childEntries.forEach((childEntry) => groupedEntryIds.add(childEntry.todo.id));
      return;
    }

    children.forEach((childTodo) => {
      const childEntry = entryById.get(childTodo.id);
      if (!childEntry) return;
      groups.push({ parentEntry: childEntry, childEntries: [] });
      groupedEntryIds.add(childTodo.id);
    });
  });

  entries.forEach((entry) => {
    if (!groupedEntryIds.has(entry.todo.id)) {
      groups.push({ parentEntry: entry, childEntries: [] });
    }
  });

  return groups
    .sort((left, right) => Number(right.parentEntry.todo.pin) - Number(left.parentEntry.todo.pin) || left.parentEntry.todo.title.localeCompare(right.parentEntry.todo.title, 'zh-CN'));
};

const TodoRow: React.FC<{
  entry: SidebarTodoEntry;
  onSelect: () => void;
  onToggleCompletion: () => void;
  onDragMove: (clientX: number, clientY: number) => boolean;
  onDragEnd: () => void;
  onDrop: (clientX: number, clientY: number) => boolean;
}> = ({ entry, onSelect, onToggleCompletion, onDragMove, onDragEnd, onDrop }) => {
  const isCompleted = entry.primaryKind === 'completed' || entry.todo.isCompleted;
  const [didCreatePlan, setDidCreatePlan] = useState(false);
  const feedbackTimerRef = useRef<number | null>(null);

  const showCreateFeedback = useCallback(() => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    setDidCreatePlan(true);
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      setDidCreatePlan(false);
    }, 1200);
  }, []);

  const { beginDrag, dragFeedback, isDragging } = usePointerDrag({
    threshold: TODO_DRAG_DISTANCE,
    resolveIntent: resolveTodoDragIntent,
    onSelect,
    onDragMove,
    onDragEnd,
    onDrop,
    onDropSuccess: showCreateFeedback
  });

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
  }, []);

  return (
  <div className={`group flex min-w-0 flex-1 items-center gap-1.5 px-1.5 ${isDragging ? 'opacity-45' : ''}`}>
    <TodoCompletionMarker completed={isCompleted} onToggle={onToggleCompletion} />
    <button
      type="button"
      onPointerDown={(event) => beginDrag(event, !isCompleted)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
      className="flex min-w-0 flex-1 touch-pan-y items-center gap-2 py-2.5 pr-1 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/70"
    >
      <span className={`min-w-0 flex-1 truncate text-sm font-bold leading-5 transition-colors ${isCompleted ? 'text-stone-400 line-through dark:text-stone-500' : 'text-stone-700 group-hover:text-stone-950 dark:text-stone-200 dark:group-hover:text-white'}`}>
        {entry.todo.title}
      </span>
    </button>
    {dragFeedback && typeof document !== 'undefined' && createPortal(
      <div
        className={`pointer-events-none fixed z-[80] flex max-w-[min(17rem,calc(100vw-2rem))] -translate-y-1/2 items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold shadow-[0_10px_26px_rgba(28,25,23,0.16)] backdrop-blur-sm transition-colors ${dragFeedback.isTarget ? 'border-stone-400 bg-[#fdfbf7]/95 text-stone-800 dark:border-stone-500 dark:bg-stone-900/95 dark:text-stone-100' : 'border-stone-200 bg-[#fdfbf7]/90 text-stone-500 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300'}`}
        style={{ left: `${dragFeedback.x + 16}px`, top: `${dragFeedback.y - 12}px` }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dragFeedback.isTarget ? 'var(--accent-color, #1c1917)' : '#a8a29e' }} />
        <span className="truncate">{entry.todo.title}</span>
      </div>,
      document.body
    )}
    {didCreatePlan && <span className="sr-only" role="status">Plan created</span>}
  </div>
  );
};

const CheckRow: React.FC<{ item: CheckItem; onClick: () => void }> = ({ item, onClick }) => {
  const isCount = item.manualMode === 'count';
  const { current, target, isCompleted } = getCheckItemCountState(item);
  const isAuto = item.type === 'auto';
  const isSquare = isAuto;
  const markerLabel = isCount ? String(current) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isAuto}
      className={`flex w-full items-center gap-2.5 px-2 py-2.5 text-left transition-colors ${isAuto ? 'cursor-default' : 'hover:bg-stone-50 dark:hover:bg-stone-800/70'}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center border text-[9px] font-bold ${isSquare ? 'rounded-[3px]' : 'rounded-full'} ${isCompleted ? '' : 'border-stone-300 dark:border-stone-600'} ${shouldHideCheckMarkerContent(isCount, isCompleted) ? 'text-transparent' : ''}`}
        style={isCompleted ? { color: 'var(--accent-color, #1c1917)', borderColor: 'var(--accent-color, #1c1917)' } : undefined}
      >
        {markerLabel !== null ? markerLabel : (isCompleted && <Check size={11} strokeWidth={2.5} />)}
      </span>
      <span className={`min-w-0 flex-1 truncate text-sm font-bold leading-5 ${isCompleted ? 'text-stone-400 line-through dark:text-stone-500' : 'text-stone-700 dark:text-stone-200'}`}>{item.content}</span>
      {isCount && <span className="shrink-0 text-[10px] font-medium text-stone-400">/{target}</span>}
    </button>
  );
};

const GroupHeader: React.FC<{ icon: React.ReactNode; title: string; count: number }> = ({ icon, title, count }) => (
  <div className="flex items-center justify-between px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
    <span className="flex items-center gap-1.5">{icon}{title}</span>
    <span>{count}</span>
  </div>
);

const TodoGroups: React.FC<{
  todos: TodoItem[];
  logs: Log[];
  checkItems: CheckItem[];
  currentDate: Date;
  selectedCategoryId?: string | null;
  selectedListLabel?: string;
  onSelectTodo: (todo: TodoItem) => void;
  onToggleTodoCompletion: (todo: TodoItem) => void;
  onCheckItemClick: (item: CheckItem) => void;
  onTodoDragMove: (todo: TodoItem, clientX: number, clientY: number) => boolean;
  onTodoDragEnd: () => void;
  onTodoDrop: (todo: TodoItem, clientX: number, clientY: number) => boolean;
}> = ({ todos, logs, checkItems, currentDate, selectedCategoryId, selectedListLabel, onSelectTodo, onToggleTodoCompletion, onCheckItemClick, onTodoDragMove, onTodoDragEnd, onTodoDrop }) => {
  const visibleTodos = useMemo(() => (
    selectedCategoryId
      ? buildTimelineSidebarCategoryTodoEntries(todos, selectedCategoryId)
      : buildTimelineSidebarTodoEntries(todos, logs, formatDateKey(currentDate))
  ), [currentDate, logs, selectedCategoryId, todos]);
  const todoTreeGroups = useMemo(
    () => buildTimelineSidebarTodoTreeGroups(visibleTodos, todos, !selectedCategoryId),
    [selectedCategoryId, todos, visibleTodos]
  );
  const displayedTodoCount = todoTreeGroups.reduce((count, group) => count + 1 + group.childEntries.length, 0);
  const [expandedParentIds, setExpandedParentIds] = useState<Record<string, boolean>>({});
  const isFutureDate = useMemo(() => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return selectedDate > todayStart;
  }, [currentDate]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-64 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <section className="border-b border-stone-100 pb-3 dark:border-stone-800">
        <GroupHeader icon={<ListTodo size={12} />} title={selectedListLabel || '待办'} count={displayedTodoCount} />
        {visibleTodos.length > 0 ? (
          <div className="overflow-hidden rounded-lg">
            {todoTreeGroups.map((group) => {
              const isExpanded = expandedParentIds[group.parentEntry.todo.id] ?? false;
              return (
                <div key={group.parentEntry.todo.id}>
                  <div className="flex items-center">
                    <TodoRow entry={group.parentEntry} onSelect={() => onSelectTodo(group.parentEntry.todo)} onToggleCompletion={() => onToggleTodoCompletion(group.parentEntry.todo)} onDragMove={(clientX, clientY) => onTodoDragMove(group.parentEntry.todo, clientX, clientY)} onDragEnd={onTodoDragEnd} onDrop={(clientX, clientY) => onTodoDrop(group.parentEntry.todo, clientX, clientY)} />
                    {group.childEntries.length > 0 && <button type="button" className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200" aria-label={isExpanded ? '收起子任务' : '展开子任务'} onClick={() => setExpandedParentIds((previous) => ({ ...previous, [group.parentEntry.todo.id]: !isExpanded }))}>{isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>}
                  </div>
                  {isExpanded && group.childEntries.length > 0 && <div className="ml-5 border-l border-stone-200 pl-2 dark:border-stone-700">{group.childEntries.map((entry) => <TodoRow key={entry.todo.id} entry={entry} onSelect={() => onSelectTodo(entry.todo)} onToggleCompletion={() => onToggleTodoCompletion(entry.todo)} onDragMove={(clientX, clientY) => onTodoDragMove(entry.todo, clientX, clientY)} onDragEnd={onTodoDragEnd} onDrop={(clientX, clientY) => onTodoDrop(entry.todo, clientX, clientY)} />)}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2 py-4 text-xs text-stone-400">暂无待办</p>
        )}
      </section>
      {!selectedCategoryId && !isFutureDate && <section>
        <GroupHeader icon={<ClipboardCheck size={12} />} title="日课" count={checkItems.length} />
        {checkItems.length > 0 ? (
          <div className="overflow-hidden rounded-lg">
            {checkItems.map((item) => <CheckRow key={item.id} item={item} onClick={() => onCheckItemClick(item)} />)}
          </div>
        ) : (
          <p className="px-2 py-4 text-xs text-stone-400">暂无日课</p>
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
  ratio,
  reviewSlot,
  selectedCategoryId,
  selectedListLabel,
  onSelectTodo,
  onToggleTodoCompletion,
  onCheckItemClick,
  onTodoDragMove,
  onTodoDragEnd,
  onTodoDrop
}) => (
  <aside
      className="flex h-full min-w-0 shrink-0 flex-col bg-[#fdfbf7]/95 shadow-[-10px_0_30px_rgba(28,25,23,0.04)] backdrop-blur-md dark:bg-stone-900/95"
      style={{ width: `${ratio * 100}%`, minWidth: `${TIMELINE_SIDEBAR_MIN_RATIO * 100}%`, maxWidth: `${TIMELINE_SIDEBAR_MAX_RATIO * 100}%` }}
    aria-label="待办与日课"
  >
    {reviewSlot}
    <TodoGroups todos={todos} logs={logs} checkItems={checkItems} currentDate={currentDate} selectedCategoryId={selectedCategoryId} selectedListLabel={selectedListLabel} onSelectTodo={onSelectTodo} onToggleTodoCompletion={onToggleTodoCompletion} onCheckItemClick={onCheckItemClick} onTodoDragMove={onTodoDragMove} onTodoDragEnd={onTodoDragEnd} onTodoDrop={onTodoDrop} />
  </aside>
);
