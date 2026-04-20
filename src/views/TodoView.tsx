/**
 * @file TodoView.tsx
 * @input Todos, Categories, Scopes
 * @output Todo Status Updates, Edit Triggers, Focus Timer Start
 * @pos View (Main Tab)
 * @description The main To-Do list interface. Displays tasks grouped by category, supports swipe actions, and now includes a week planning view with schedule and history badges.
 * @updated 2026-04-20 18:07: Limited week-view overdue alerts to items that are past due and still have no completion date.
 * @updated 2026-04-20 18:03: Added extra bottom padding to the week planning scroll area so the floating action button no longer covers the last rows.
 * @updated 2026-04-20 17:59: Hid empty quick-action schedule metadata rows instead of rendering None placeholders.
 * @updated 2026-04-20: Added a quick duplicate-edit modal before creating copied todos.
 * @updated 2026-04-20: Added list/week switching, seven-row week planning layout, and first-pass schedule/history badge rendering.
 * @updated 2026-04-12: Matched the expanded sidebar action button spacing with RecordView, added a persisted toggle for showing completed todos, and softened the shared sidebar control styling.
 * @updated 2026-04-20: Switched custom background rendering to the shared preloaded display hook and reduced mobile blur cost.
 * @updated 2026-04-20: Moved week-view touch dragging to non-passive native listeners so mobile drag no longer logs passive preventDefault warnings.
 * @updated 2026-04-20: Simplified week Arrange icons, added quick-clear actions, and refined schedule picker ordering.
 *
 * 闁宠法濯寸粭?Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Scope, TodoItem, TodoCategory, Category, AutoLinkRule, Log, TodoDuplicateOptions } from '../types';
import { PlayCircle, CheckCircle2, Plus, MoreHorizontal, ChevronLeft, ChevronRight, LayoutList, Rows, Sparkles, Eye, EyeOff, CalendarDays, Flag, Repeat2, TrendingUp, ListTodo, CircleAlert, ArrowRightCircle, PanelRightOpen, Check, X } from 'lucide-react';
import { AITodoInputModal } from '../components/AITodoInputModal';
import { AITodoConfirmModal, ParsedTask } from '../components/AITodoConfirmModal';
import { aiService } from '../services/aiService';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useToast } from '../contexts/ToastContext';
import { IconRenderer } from '../components/IconRenderer';
import { useBackgroundDisplay } from '../hooks/useBackgroundDisplay';
import { FloatingButton } from '../components/FloatingButton';
import { UIIcon } from '../components/UIIcon';
import { uiIconService } from '../services/uiIconService';
import { WeekTodoEntry, buildWeekTodoBuckets, formatDateKey, getTodayDateKey, getWeekDates, parseDateKey } from '../utils/todoScheduleUtils';
import { TodoScheduleAssignModal } from '../components/TodoScheduleAssignModal';
import { TodoDatePickerModal } from '../components/TodoDatePickerModal';
import { TodoDuplicateModal } from '../components/TodoDuplicateModal';


interface TodoViewProps {
  todos: TodoItem[];
  logs: Log[];
  categories: TodoCategory[];
  activityCategories: Category[];
  scopes: Scope[];
  onToggleTodo: (id: string) => void;
  onEditTodo: (todo: TodoItem) => void;
  onAddTodo: (categoryId: string) => void;
  onStartFocus: (todo: TodoItem) => void;
  onDuplicateTodo: (todo: TodoItem, options: TodoDuplicateOptions) => void;
  onSaveTodo: (todo: TodoItem) => void;
  onBatchAddTodos?: (todos: Partial<TodoItem>[]) => void;
  autoLinkRules?: AutoLinkRule[];
}

// Sub-component for Swipeable Item
const SwipeableTodoItem: React.FC<{
  todo: TodoItem;
  categories: TodoCategory[];
  activityCategories: Category[];
  scopes: Scope[];
  onToggle: (id: string) => void;
  onEdit: (todo: TodoItem) => void;
  onStartFocus: (todo: TodoItem) => void;
  onDuplicate: (todo: TodoItem) => void;
  viewMode: 'loose' | 'compact';
  isFirst?: boolean;
  isLast?: boolean;
}> = ({ todo, categories, activityCategories, scopes, onToggle, onEdit, onStartFocus, onDuplicate, viewMode, isFirst = false, isLast = false }) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const canQuickToggle = !todo.recurrenceRule;

  // Constants
  const minSwipeDistance = 100;
  const maxSwipeDistance = 150; // Limit drag visual

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;

    if (diff < 0 && !canQuickToggle) {
      setTranslateX(0);
      return;
    }

    // Allow swipe in both directions but clamp
    if (Math.abs(diff) < maxSwipeDistance) {
      setTranslateX(diff);
    } else {
      // Clamp to max distance, keeping sign
      setTranslateX(diff > 0 ? maxSwipeDistance : -maxSwipeDistance);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) {
      setTranslateX(0); // Reset if tap
      return;
    }

    const currentTouch = e.changedTouches[0].clientX;
    const diff = currentTouch - touchStart;

    if (diff > minSwipeDistance) {
      // Right Swipe -> Duplicate
      onDuplicate(todo);
    } else if (canQuickToggle && diff < -minSwipeDistance) {
      // Left Swipe -> Toggle Complete
      onToggle(todo.id);
    }

    // Reset
    setTranslateX(0);
    setTouchStart(null);
  };

  const linkedDetails = (() => {
    if (!todo.linkedCategoryId || !todo.linkedActivityId) return null;
    const cat = activityCategories.find(c => c.id === todo.linkedCategoryId);
    const act = cat?.activities.find(a => a.id === todo.linkedActivityId);
    return act && cat ? { 
      categoryName: cat.name, 
      categoryIcon: cat.icon, 
      categoryUiIcon: cat.uiIcon,
      activityName: act.name, 
      activityIcon: act.icon,
      activityUiIcon: act.uiIcon
    } : null;
  })();

  const linkedScopes = (!todo.defaultScopeIds || todo.defaultScopeIds.length === 0)
    ? []
    : todo.defaultScopeIds.map(id => scopes.find(s => s.id === id)).filter(Boolean) as Scope[];

  const { isPrivacyMode } = usePrivacy();

  // 閻犱緤绱曢悾濠氬捶閸℃凹娼￠柡宥呭槻缁?
  const getRoundedClass = () => {
    if (viewMode !== 'compact') return 'rounded-2xl';
    if (isFirst && isLast) return 'rounded-xl';
    if (isFirst) return 'rounded-t-xl';
    if (isLast) return 'rounded-b-xl';
    return '';
  };

  return (
    <div className={`relative overflow-hidden select-none touch-pan-y group ${viewMode === 'compact' ? `mb-0 ${getRoundedClass()}` : 'mb-3 rounded-2xl'}`}>
      {/* Background Actions (Right Swipe -> Duplicate) */}
      <div
        className={`absolute inset-0 bg-blue-500 flex items-center justify-start pl-6 text-white font-bold tracking-wider z-0 transition-opacity duration-200 ${viewMode === 'compact' ? getRoundedClass() : 'rounded-2xl'}`}
        style={{ opacity: translateX > 0 ? 1 : 0 }}
      >
        <span className="flex items-center gap-2">
          <Plus size={20} /> DUPLICATE
        </span>
      </div>

      {/* Background Actions (Left Swipe -> Complete/Uncomplete) */}
      <div
        className={`absolute inset-0 flex items-center justify-end pr-6 text-white font-bold tracking-wider z-0 transition-opacity duration-200 ${todo.isCompleted ? 'bg-stone-400' : 'bg-green-500'} ${viewMode === 'compact' ? getRoundedClass() : 'rounded-2xl'}`}
        style={{ opacity: canQuickToggle && translateX < 0 ? 1 : 0 }}
      >
        <span className="flex items-center gap-2">
          {todo.isCompleted ? 'UNDO' : 'COMPLETE'} <CheckCircle2 size={20} />
        </span>
      </div>

      {/* Foreground Content */}
      <div
        className={`
          relative z-10 flex gap-3 transition-transform duration-200
          ${viewMode === 'compact'
            ? `p-3 border-b border-stone-100 min-h-[3.5rem] items-center ${getRoundedClass()}`
            : 'p-4 rounded-2xl border min-h-[5rem] mb-0 items-start'
          }
          ${todo.isCompleted
            ? (viewMode === 'compact' ? 'bg-stone-50/50' : 'bg-stone-50/80 backdrop-blur-md border-stone-100') // Compact completed style
            : (viewMode === 'compact' ? 'bg-white' : 'bg-white/80 backdrop-blur-md border-stone-100 shadow-sm')
          }
        `}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Content (Click to Edit) */}
        <div className={`flex-1 cursor-pointer ${todo.isCompleted ? 'opacity-60' : ''} ${viewMode === 'compact' ? 'flex items-center gap-2 min-w-0' : 'py-0.5'}`} onClick={() => onEdit(todo)}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`font-bold leading-tight ${todo.isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'} ${viewMode === 'compact' ? 'text-sm truncate' : 'text-base'} transition-all duration-500`}>
              {todo.title}
            </div>

            {/* Progress Circle - Only in Compact Mode for Progress Tasks */}
            {todo.isProgress && viewMode === 'compact' && (
              <div className="flex-shrink-0 relative" style={{ width: '16px', height: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" className="-rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    fill="none"
                    stroke="var(--progress-bar-bg)"
                    strokeWidth="2"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    fill="none"
                    stroke="var(--progress-bar-fill)"
                    strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 7}`}
                    strokeDashoffset={`${2 * Math.PI * 7 * (1 - (todo.completedUnits || 0) / (todo.totalAmount || 1))}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Note - Hide in Compact Mode */}
          {viewMode === 'loose' && todo.note && (
            <div className={`text-xs text-stone-400 mt-1 line-clamp-1 ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}>{todo.note}</div>
          )}

          {/* Linked Tags/Scopes */}
          <div className={`flex items-center gap-1.5 flex-wrap flex-shrink-0 ${viewMode === 'compact' ? 'mt-0' : 'mt-1.5'}`}>
            {linkedDetails && (
              <span className={`text-[11px] text-stone-500 font-medium flex items-center gap-1 ${viewMode === 'compact' ? 'px-0 border-0 bg-transparent' : 'px-1.5 py-0.5 rounded-md border border-stone-200 bg-white/50'}`}>
                <span className="text-stone-300 font-sans">#</span>
                {viewMode === 'loose' ? (
                  <>
                    <IconRenderer icon={linkedDetails.categoryIcon} uiIcon={linkedDetails.categoryUiIcon} className="text-xs" />
                    <span className="opacity-90">{linkedDetails.categoryName}</span>
                    <span className="text-stone-300 px-0.5">/</span>
                    <IconRenderer icon={linkedDetails.activityIcon} uiIcon={linkedDetails.activityUiIcon} className="text-xs" />
                    <span className="opacity-90">{linkedDetails.activityName}</span>
                  </>
                ) : (
                  <IconRenderer icon={linkedDetails.activityIcon} uiIcon={linkedDetails.activityUiIcon} className="text-xs" />
                )}
              </span>
            )}
            {linkedScopes.map((scope, idx) => (
              <span key={idx} className={`text-[11px] text-stone-500 font-medium flex items-center gap-1 ${viewMode === 'compact' ? 'px-0 border-0 bg-transparent' : 'px-1.5 py-0.5 rounded-md border border-stone-200 bg-white/50'}`}>
                <span className="text-stone-300 font-sans">%</span>
                <IconRenderer 
                    icon={scope.icon} 
                    uiIcon={scope.uiIcon}
                    className="text-xs" 
                />
                {/* Show Scope Name only in Loose Mode */}
                {viewMode === 'loose' && <span className="opacity-90 ml-0.5">{scope.name}</span>}
              </span>
            ))}
          </div>

          {/* Progress Bar - Only in Loose Mode */}
          {todo.isProgress && viewMode === 'loose' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium mb-1.5 uppercase tracking-wider">
                <span>Progress</span>
                <span>{Math.round((todo.completedUnits || 0) / (todo.totalAmount || 1) * 100)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, (todo.completedUnits || 0) / (todo.totalAmount || 1) * 100))}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-stone-400 text-right font-mono">
                {todo.completedUnits} / {todo.totalAmount}
              </div>
            </div>
          )}
        </div>

        {/* Right Actions Column */}
        <div className={`flex items-end pl-2 ${viewMode === 'compact' ? 'items-center' : 'flex-col justify-between self-stretch'}`}>
          {/* Spacer only for Loose mode */}
          {viewMode === 'loose' && <div className="flex-1"></div>}

          {/* Bottom Right: Start Focus */}
          {!todo.isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); onStartFocus(todo); }}
              className={`text-stone-300 hover:text-orange-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 ${viewMode === 'compact' ? '' : 'pt-2'}`}
            >
              <PlayCircle size={viewMode === 'compact' ? 20 : 26} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const WEEKDAY_ROW_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

type WeekBadgeKey = 'deadline' | 'scheduled' | 'recurring' | 'completed' | 'inProgress';

interface WeekBadgeDescriptor {
  key: WeekBadgeKey;
  label: string;
  color: string;
  overdue?: boolean;
}

const TodoScheduleQuickActionsModal: React.FC<{
  isOpen: boolean;
  todo: TodoItem | null;
  badgeType: 'scheduled' | 'deadline' | null;
  currentDateLabel?: string;
  onMoveDate: (type: 'scheduled' | 'deadline', mode: 'today' | 'nextWeek') => void;
  onClearDate: (type: 'scheduled' | 'deadline') => void;
  onOpenDetail: () => void;
  onComplete: () => void;
  onClose: () => void;
}> = ({
  isOpen,
  todo,
  badgeType,
  onMoveDate,
  onClearDate,
  onOpenDetail,
  onComplete,
  onClose
}) => {
  if (!isOpen || !todo || !badgeType) return null;

  const formatQuickActionDate = (dateKey?: string) => {
    if (!dateKey) return null;
    const date = parseDateKey(dateKey);
    if (!date) return dateKey;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatQuickActionDateTime = (dateValue?: string) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })}`;
  };

  const quickActionDateRows = [
    { label: 'Arrange', value: formatQuickActionDate(todo.scheduledDate) },
    { label: 'Due', value: formatQuickActionDate(todo.deadlineDate) },
    { label: 'Completed', value: formatQuickActionDateTime(todo.completedAt) }
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-[rgba(15,23,42,0.12)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm md:items-center md:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[26rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#faf9f6] shadow-[0_26px_70px_rgba(15,23,42,0.14)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-stone-200 px-5 py-4 pr-24">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Quick Actions</div>
              <div className="mt-1 text-lg font-medium text-stone-800">{todo.title}</div>
              {quickActionDateRows.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
                  {quickActionDateRows.map((item) => (
                    <span key={item.label} className="inline-flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 uppercase tracking-[0.18em] text-stone-400">{item.label}</span>
                      <span className="text-stone-500">{item.value}</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="absolute right-5 top-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenDetail}
                  className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
                  title="打开详情"
                >
                  <PanelRightOpen size={16} />
                </button>
                {!todo.isCompleted && (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
                    title="标记完成"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
        </div>

        <div className="px-4 py-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80">
                <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  <CalendarDays size={12} className="text-stone-400" />
                  <span>安排到</span>
                </div>
                <div className="grid grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onMoveDate('scheduled', 'today')}
                    className="flex items-center justify-center px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    <span>今天</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDate('scheduled', 'nextWeek')}
                    className="flex items-center justify-center border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    <span>下周</span>
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80">
                <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  <Flag size={12} className="text-stone-400" />
                  <span>截止到</span>
                </div>
                <div className="grid grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onMoveDate('deadline', 'today')}
                    className="flex items-center justify-center px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    今天
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDate('deadline', 'nextWeek')}
                    className="flex items-center justify-center border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    下周
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onClearDate('scheduled')}
                className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <X size={16} className="text-stone-400" />
                <span>清除安排日期</span>
              </button>

              <button
                type="button"
                onClick={() => onClearDate('deadline')}
                className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <X size={16} className="text-stone-400" />
                <span>清除截止日期</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WeekTodoLineItem: React.FC<{
  entry: WeekTodoEntry;
  isDragging: boolean;
  onDragStart: (entry: WeekTodoEntry, event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onTouchDragStart: (entry: WeekTodoEntry, event: React.TouchEvent<HTMLDivElement>) => void;
  onBadgeClick: (entry: WeekTodoEntry, badgeKey: 'scheduled' | 'deadline') => void;
}> = ({ entry, isDragging, onDragStart, onDragEnd, onTouchDragStart, onBadgeClick }) => {
  const { todo, badges } = entry;
  const isHistoricalOnly = !badges.scheduled && !badges.deadline && !badges.recurring && (badges.completed || badges.inProgress);
  const iconClassName = isHistoricalOnly ? 'text-stone-300' : 'text-stone-400';
  const titleClassName = isHistoricalOnly ? 'text-stone-400' : 'text-stone-700';
  const noteClassName = isHistoricalOnly ? 'text-stone-300' : 'text-stone-400';
  const todayDateKey = getTodayDateKey();
  const completedDateKey = todo.completedAt ? formatDateKey(new Date(todo.completedAt)) : null;
  const isScheduledOverdue = Boolean(
    badges.scheduled &&
    todo.scheduledDate &&
    todo.scheduledDate < todayDateKey &&
    !completedDateKey
  );
  const isDeadlineOverdue = Boolean(
    badges.deadline &&
    todo.deadlineDate &&
    todo.deadlineDate < todayDateKey &&
    !completedDateKey
  );

  const leadingIcon = badges.completed
    ? <CheckCircle2 size={12} className={iconClassName} />
    : badges.inProgress
      ? <TrendingUp size={12} className={iconClassName} />
      : badges.deadline
        ? <Flag size={12} className={iconClassName} />
        : badges.recurring
          ? <Repeat2 size={12} className={iconClassName} />
          : <ChevronRight size={12} className={iconClassName} />;

  const orderedBadges = [
    badges.deadline ? { key: 'deadline', label: 'Due', color: '#8f6f6b', overdue: isDeadlineOverdue } : null,
    badges.scheduled ? { key: 'scheduled', label: 'Arrange', color: '#7c8b97', overdue: isScheduledOverdue } : null,
    badges.recurring ? { key: 'recurring', label: 'Repeat', color: '#8b8f79' } : null,
    badges.completed ? { key: 'completed', label: 'Done', color: '#7f8c84' } : null,
    badges.inProgress ? { key: 'inProgress', label: 'Trace', color: '#8b8096' } : null
  ].filter(Boolean) as WeekBadgeDescriptor[];
  const dragBadgeKey: 'scheduled' | 'deadline' | null = badges.deadline ? 'deadline' : badges.scheduled ? 'scheduled' : null;

  return (
    <div
      className={`flex w-full items-center gap-2 py-1 text-left ${isDragging ? 'opacity-40' : ''}`}
    >
      <span className="shrink-0 self-center flex h-4 w-4 items-center justify-center">
        {leadingIcon}
      </span>
      <div
        draggable={dragBadgeKey !== null}
        onDragStart={(event) => dragBadgeKey && onDragStart(entry, event)}
        onDragEnd={onDragEnd}
        onTouchStart={(event) => dragBadgeKey && onTouchDragStart(entry, event)}
        className={`min-w-0 flex-1 ${dragBadgeKey ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className={`truncate text-[14px] font-medium leading-5 ${titleClassName}`}>
          {todo.title}
        </div>
      </div>
      <div className="shrink-0 flex w-[5.75rem] items-center justify-end text-[9px] tracking-[0.16em] uppercase">
        {orderedBadges.map((badge) => (
          badge.key === 'scheduled' || badge.key === 'deadline' ? (
            <span
              key={badge.key}
              onClick={() => onBadgeClick(entry, badge.key)}
              className="inline-flex w-full cursor-pointer items-center justify-end gap-1 rounded-full py-0.5 text-right transition-colors hover:bg-stone-100/70"
              style={{ color: badge.color }}
            >
              {badge.overdue && <CircleAlert size={10} className="text-red-500" />}
              <span>{badge.label}</span>
            </span>
          ) : (
            <span key={badge.key} className="inline-flex w-full items-center justify-end gap-1 text-right" style={{ color: badge.color }}>
              {badge.overdue && <CircleAlert size={10} className="text-red-500" />}
              <span>{badge.label}</span>
            </span>
          )
        ))}
      </div>
    </div>
  );
};

export const TodoView: React.FC<TodoViewProps> = ({ todos, logs, categories, activityCategories, scopes, onToggleTodo, onEditTodo, onAddTodo, onStartFocus, onDuplicateTodo, onSaveTodo, onBatchAddTodos, autoLinkRules = [] }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { backgroundUrl, hasBackground, panelOverlayOpacity, useReducedEffects } = useBackgroundDisplay();
  const { addToast } = useToast();
  const [screenMode, setScreenMode] = useState<'list' | 'week'>(() => {
    const saved = localStorage.getItem('todoScreenMode');
    return saved === 'week' ? 'week' : 'list';
  });
  const [weekReferenceDate, setWeekReferenceDate] = useState<Date>(new Date());
  const [hasCustomIconTheme, setHasCustomIconTheme] = useState(() => uiIconService.isCustomTheme());
  const [draggingWeekTodoId, setDraggingWeekTodoId] = useState<string | null>(null);
  const [draggingWeekEntry, setDraggingWeekEntry] = useState<WeekTodoEntry | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null);
  const [touchDragPreview, setTouchDragPreview] = useState<{ x: number; y: number; title: string } | null>(null);
  const [isTouchWeekDragging, setIsTouchWeekDragging] = useState(false);
  const [assignModalDate, setAssignModalDate] = useState<string | null>(null);
  const [assignModalType, setAssignModalType] = useState<'scheduled' | 'deadline'>('scheduled');
  const [quickActionEntry, setQuickActionEntry] = useState<WeekTodoEntry | null>(null);
  const [quickActionType, setQuickActionType] = useState<'scheduled' | 'deadline' | null>(null);
  const [isWeekJumpPickerOpen, setIsWeekJumpPickerOpen] = useState(false);
  const [duplicatingTodo, setDuplicatingTodo] = useState<TodoItem | null>(null);
  const touchDragActivatedRef = useRef(false);
  const touchDraggingWeekEntryRef = useRef<WeekTodoEntry | null>(null);
  const touchDragTargetDateRef = useRef<string | null>(null);

  // AI States
  const [isAIInputOpen, setIsAIInputOpen] = useState(false);
  const [isAIConfirmOpen, setIsAIConfirmOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false); // Loading state
  const [aiParsedTasks, setAiParsedTasks] = useState<ParsedTask[]>([]);

  const handleAIGenerate = async (text: string) => {
    setIsAIGenerating(true);
    try {
      // Call AI Service
      const parsedTodos = await aiService.parseTodoText(text, {
        todoCategories: categories,
        activityCategories: activityCategories,
        scopes: scopes
      });

      // Map to Modal Data Structure
      const tasksWithId: ParsedTask[] = parsedTodos.map((t, idx) => ({
        id: Date.now().toString() + idx,
        title: t.title,
        categoryId: t.categoryId || selectedCategoryId, // Use AI's or fallback to current
        linkedActivityId: t.linkedActivityId,
        linkedCategoryId: undefined, // Let Modal auto-derive
        defaultScopeIds: t.defaultScopeIds || [],
      }));

      // Apply Auto-Link Rules (Rule > AI)
      const tasksWithRules = tasksWithId.map(task => {
        if (task.linkedActivityId) {
          const rule = autoLinkRules.find(r => r.activityId === task.linkedActivityId);
          if (rule) {
            return { ...task, defaultScopeIds: [rule.scopeId] };
          }
        }
        return task;
      });

      setAiParsedTasks(tasksWithRules);
      setIsAIInputOpen(false); // Close input ONLY on success
      setIsAIConfirmOpen(true); // Open confirm
    } catch (error) {
      console.error("AI Generation Failed", error);
      alert("AI Analysis Failed. Please check your network or API Key settings in Settings -> AI Integration.");
      // Ideally use toast, but alert is safer if toast prop is missing/optional
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleAISave = (tasks: ParsedTask[]) => {
    const newTodos: Partial<TodoItem>[] = tasks.map(t => {
      // Auto-infer linkedCategoryId if missing but linkedActivityId exists
      let finalLinkedCategoryId = t.linkedCategoryId;
      if (t.linkedActivityId && !finalLinkedCategoryId) {
        const foundCat = activityCategories.find(c => c.activities.some(a => a.id === t.linkedActivityId));
        if (foundCat) {
          finalLinkedCategoryId = foundCat.id;
        }
      }

      return {
        title: t.title,
        categoryId: t.categoryId,
        linkedActivityId: t.linkedActivityId,
        linkedCategoryId: finalLinkedCategoryId,
        defaultScopeIds: t.defaultScopeIds,
        isCompleted: false
      };
    });
    onBatchAddTodos?.(newTodos);
    setIsAIConfirmOpen(false);
  };

  // 濞?localStorage 閻犲洩顕цぐ鍥偨閵婏箑鐓曞☉鎾筹攻椤愬ジ鏌呮径瀣仴闁汇劌瀚～瀣炊閻愵儫浣割嚕?
  const [viewMode, setViewMode] = useState<'loose' | 'compact'>(() => {
    const saved = localStorage.getItem('todoViewMode');
    return (saved === 'compact' || saved === 'loose') ? saved : 'loose';
  });
  const [showCompletedTodos, setShowCompletedTodos] = useState<boolean>(() => {
    const saved = localStorage.getItem('todoShowCompleted');
    return saved !== 'false';
  });

  // 鐟?viewMode 闁衡偓閻熸澘缍侀柡鍐啇缁辨繃绌卞┑鍡欐憼闁?localStorage
  React.useEffect(() => {
    localStorage.setItem('todoViewMode', viewMode);
  }, [viewMode]);

  React.useEffect(() => {
    localStorage.setItem('todoShowCompleted', showCompletedTodos ? 'true' : 'false');
  }, [showCompletedTodos]);

  React.useEffect(() => {
    localStorage.setItem('todoScreenMode', screenMode);
    window.dispatchEvent(new CustomEvent('todo-schedule-mode-changed', {
      detail: { isWeekMode: screenMode === 'week' }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('todo-schedule-mode-changed', {
        detail: { isWeekMode: false }
      }));
    };
  }, [screenMode]);

  React.useEffect(() => {
    const handleThemeChange = () => {
      setHasCustomIconTheme(uiIconService.isCustomTheme());
    };

    window.addEventListener('ui-icon-theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('ui-icon-theme-changed', handleThemeChange);
    };
  }, []);

  // 闁告帗绻傞～鎰板礌閺嶎厸鍋撴径澶庡幀闁汇劌瀚崹搴ｇ尵娴兼瑧绐楀┑鈥冲€归悘澶娾柦閳╁啯绠掗梺顐㈩槷閼垫垶绂掔拋宕囩Э闁告帒妫涚悮顐︽晬瀹€鍕笡閻犱降鍊濋埀顒€顦懙鎴犵箔椤戣法顏卞☉?
  React.useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];

  // 濠碘€冲€归悘澶娾柦閳╁啯绠掗柛鎺戞鐞氼偊鏁嶇仦鐐枖缂佲偓閾忓厜鏁勯柣妯垮煐閳ь兛娴囬埀顒€濂旂粭澶愬及椤栨氨鈹涙繝?
  if (!selectedCategory) {
    return (
      <div className="flex h-full items-center justify-center bg-[#faf9f6] flex-col gap-4">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
          <LayoutList size={32} />
        </div>
        <div className="text-center">
          <p className="text-stone-500 font-bold mb-1">No todo categories yet.</p>
          <p className="text-xs text-stone-400">Create a category first to start adding tasks.</p>
        </div>
      </div>
    );
  }

  const filteredTodos = todos
    .filter(t => t.categoryId === selectedCategoryId)
    .filter(t => showCompletedTodos || !t.isCompleted)
    .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));

  const weekTodos = useMemo(() => todos, [todos]);

  const weekBuckets = useMemo(
    () => buildWeekTodoBuckets(weekTodos, logs, weekReferenceDate),
    [weekReferenceDate, weekTodos, logs]
  );

  const weekDates = useMemo(() => getWeekDates(weekReferenceDate), [weekReferenceDate]);
  const isCurrentWeek = useMemo(
    () => weekDates.some((date) => getTodayDateKey() === formatDateKey(date)),
    [weekDates]
  );
  const currentWeekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    if (!start || !end) return '';
    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;
    return startMonth === endMonth
      ? `${startMonth}.${start.getDate()} - ${end.getDate()}`
      : `${startMonth}.${start.getDate()} - ${endMonth}.${end.getDate()}`;
  }, [weekDates]);
  const weekJumpDateValue = formatDateKey(weekReferenceDate);

  const handleOpenDuplicateModal = (todo: TodoItem) => {
    setDuplicatingTodo(todo);
  };

  const handleCloseDuplicateModal = () => {
    setDuplicatingTodo(null);
  };

  const handleConfirmDuplicate = (options: TodoDuplicateOptions) => {
    if (!duplicatingTodo) return;
    onDuplicateTodo(duplicatingTodo, options);
    setDuplicatingTodo(null);
  };

  const createDragEntryForWeekItem = (entry: WeekTodoEntry): WeekTodoEntry | null => {
    if (entry.badges.deadline) {
      return {
        ...entry,
        badges: {
          scheduled: false,
          deadline: true,
          recurring: false,
          completed: false,
          inProgress: false
        }
      };
    }

    if (entry.badges.scheduled) {
      return {
        ...entry,
        badges: {
          scheduled: true,
          deadline: false,
          recurring: false,
          completed: false,
          inProgress: false
        }
      };
    }

    return null;
  };

  const handleWeekItemDragStart = (entry: WeekTodoEntry, event: React.DragEvent<HTMLDivElement>) => {
    const dragEntry = createDragEntryForWeekItem(entry);
    if (!dragEntry) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entry.todo.id);
    setDraggingWeekTodoId(entry.todo.id);
    setDraggingWeekEntry(dragEntry);
  };

  const handleWeekItemDragEnd = () => {
    setDraggingWeekTodoId(null);
    setDraggingWeekEntry(null);
    setDragTargetDate(null);
    setTouchDragPreview(null);
    setIsTouchWeekDragging(false);
    touchDragActivatedRef.current = false;
    touchDraggingWeekEntryRef.current = null;
    touchDragTargetDateRef.current = null;
  };

  const commitWeekDrop = (entryDate: string, entry: WeekTodoEntry | null) => {
    if (!entry) return;
    const targetTodo = weekTodos.find((todo) => todo.id === entry.todo.id);

    if (!targetTodo) {
      handleWeekItemDragEnd();
      return;
    }

    const shouldMoveDeadline = entry.badges.deadline;
    const shouldMoveScheduled = entry.badges.scheduled;
    const nextTodo: TodoItem = {
      ...targetTodo,
      deadlineDate: shouldMoveDeadline ? entryDate : targetTodo.deadlineDate,
      scheduledDate: shouldMoveScheduled ? entryDate : targetTodo.scheduledDate
    };

    onSaveTodo(nextTodo);
    handleWeekItemDragEnd();
  };

  const handleWeekDrop = (entryDate: string) => {
    if (!draggingWeekEntry) return;
    commitWeekDrop(entryDate, draggingWeekEntry);
  };

  const resolveDropDateFromPoint = (clientX: number, clientY: number): string | null => {
    const targetElement = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const dropContainer = targetElement?.closest('[data-week-drop-date]') as HTMLElement | null;
    return dropContainer?.dataset.weekDropDate || null;
  };

  const handleTouchWeekItemDragStart = (entry: WeekTodoEntry, event: React.TouchEvent<HTMLDivElement>) => {
    const dragEntry = createDragEntryForWeekItem(entry);
    if (!dragEntry) return;
    const touch = event.touches[0];
    if (!touch) return;

    setDraggingWeekTodoId(entry.todo.id);
    setDraggingWeekEntry(dragEntry);
    setTouchDragPreview({
      x: touch.clientX,
      y: touch.clientY,
      title: entry.todo.title
    });
    setIsTouchWeekDragging(true);
    touchDragActivatedRef.current = true;
    touchDraggingWeekEntryRef.current = dragEntry;
    touchDragTargetDateRef.current = null;
  };

  React.useEffect(() => {
    if (!isTouchWeekDragging) return;

    const handleWindowTouchMove = (event: TouchEvent) => {
      if (!touchDragActivatedRef.current) return;

      const touch = event.touches[0];
      const activeEntry = touchDraggingWeekEntryRef.current;
      if (!touch || !activeEntry) return;

      event.preventDefault();

      const nextDate = resolveDropDateFromPoint(touch.clientX, touch.clientY);
      touchDragTargetDateRef.current = nextDate;
      setDragTargetDate(nextDate);
      setTouchDragPreview({
        x: touch.clientX,
        y: touch.clientY,
        title: activeEntry.todo.title
      });
    };

    const handleWindowTouchEnd = () => {
      if (!touchDragActivatedRef.current) return;

      const activeEntry = touchDraggingWeekEntryRef.current;
      const targetDate = touchDragTargetDateRef.current;
      if (targetDate && activeEntry) {
        commitWeekDrop(targetDate, activeEntry);
        return;
      }

      handleWeekItemDragEnd();
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isTouchWeekDragging, weekTodos, onSaveTodo]);

  const handleWeekBadgeClick = (entry: WeekTodoEntry, badgeKey: 'scheduled' | 'deadline') => {
    if (touchDragActivatedRef.current) return;
    setQuickActionEntry(entry);
    setQuickActionType(badgeKey);
  };

  const handleQuickActionMove = (type: 'scheduled' | 'deadline', mode: 'today' | 'nextWeek') => {
    if (!quickActionEntry) return;

    const baseDateKey = type === 'scheduled'
      ? quickActionEntry.todo.scheduledDate
      : quickActionEntry.todo.deadlineDate;
    const baseDate = parseDateKey(baseDateKey) || new Date();
    const targetDate = new Date(baseDate);
    if (mode === 'today') {
      const today = new Date();
      targetDate.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
    } else {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    const dateKey = formatDateKey(targetDate);
    const nextTodo: TodoItem = {
      ...quickActionEntry.todo,
      scheduledDate: type === 'scheduled' ? dateKey : quickActionEntry.todo.scheduledDate,
      deadlineDate: type === 'deadline' ? dateKey : quickActionEntry.todo.deadlineDate
    };

    onSaveTodo(nextTodo);
    setQuickActionEntry(null);
    setQuickActionType(null);
  };

  const handleQuickActionOpenDetail = () => {
    if (!quickActionEntry) return;
    onEditTodo(quickActionEntry.todo);
    setQuickActionEntry(null);
    setQuickActionType(null);
  };

  const handleQuickActionComplete = () => {
    if (!quickActionEntry) return;
    onSaveTodo({
      ...quickActionEntry.todo,
      isCompleted: true,
      completedAt: new Date().toISOString()
    });
    setQuickActionEntry(null);
    setQuickActionType(null);
  };

  const handleQuickActionClearDate = (type: 'scheduled' | 'deadline') => {
    if (!quickActionEntry) return;

    onSaveTodo({
      ...quickActionEntry.todo,
      scheduledDate: type === 'scheduled' ? undefined : quickActionEntry.todo.scheduledDate,
      deadlineDate: type === 'deadline' ? undefined : quickActionEntry.todo.deadlineDate
    });
    setQuickActionEntry(null);
    setQuickActionType(null);
  };

  const quickActionDateLabel = useMemo(() => {
    if (!quickActionEntry || !quickActionType) return '';
    const dateKey = quickActionType === 'scheduled'
      ? quickActionEntry.todo.scheduledDate
      : quickActionEntry.todo.deadlineDate;
    const date = parseDateKey(dateKey);
    if (!date) return '';
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }, [quickActionEntry, quickActionType]);

  const assignModalDateLabel = useMemo(() => {
    if (!assignModalDate) return '';
    const date = parseDateKey(assignModalDate);
    if (!date) return assignModalDate;
    return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAY_ROW_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1]}`;
  }, [assignModalDate]);

  const assignableTodos = useMemo(() => {
    if (!assignModalDate) return [];

    return todos.filter((todo) => {
      if (todo.isCompleted) return false;
      if (todo.recurrenceRule) return false;
      return true;
    });
  }, [assignModalDate, assignModalType, todos]);

  const handleAssignTodoToDate = (todo: TodoItem) => {
    if (!assignModalDate) return;
    const parsedDate = parseDateKey(assignModalDate);
    const readableDate = parsedDate
      ? `${parsedDate.getMonth() + 1}月${parsedDate.getDate()}日`
      : assignModalDate;

    const nextTodo: TodoItem = {
      ...todo,
      scheduledDate: assignModalType === 'scheduled' ? assignModalDate : todo.scheduledDate,
      deadlineDate: assignModalType === 'deadline' ? assignModalDate : todo.deadlineDate
    };

    if (assignModalType === 'scheduled' && nextTodo.recurrenceRule) {
      nextTodo.recurrenceRule = undefined;
    }

    onSaveTodo(nextTodo);
    addToast('success', `《${todo.title}》已添加到 ${readableDate}`);
  };

  const handleCreateTodoForDate = (draft: Partial<TodoItem>) => {
    if (!assignModalDate || !draft.title || !draft.categoryId) return;
    const parsedDate = parseDateKey(assignModalDate);
    const readableDate = parsedDate
      ? `${parsedDate.getMonth() + 1}月${parsedDate.getDate()}日`
      : assignModalDate;

    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      categoryId: draft.categoryId,
      title: draft.title,
      isCompleted: false,
      linkedCategoryId: draft.linkedCategoryId,
      linkedActivityId: draft.linkedActivityId,
      defaultScopeIds: draft.defaultScopeIds,
      note: draft.note,
      completedUnits: 0,
      scheduledDate: assignModalType === 'scheduled' ? assignModalDate : undefined,
      deadlineDate: assignModalType === 'deadline' ? assignModalDate : undefined
    };

    onSaveTodo(newTodo);
    addToast('success', `《${newTodo.title}》已添加到 ${readableDate}`);
  };

  const duplicateModalNode = (
    <TodoDuplicateModal
      isOpen={duplicatingTodo !== null}
      todo={duplicatingTodo}
      onClose={handleCloseDuplicateModal}
      onConfirm={handleConfirmDuplicate}
    />
  );

  if (screenMode === 'week') {
    return (
      <div
        className="relative h-full overflow-hidden"
        style={{
          backgroundColor: hasBackground ? 'transparent' : 'rgb(250, 249, 246)'
        }}
      >
        {hasBackground && (
          <div
            className="absolute inset-0 -z-20"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transform: 'translateZ(0)'
            }}
          />
        )}

        <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'rgba(250, 249, 246, 0.92)' }}></div>

        <div className={`relative z-10 flex h-full flex-col px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:px-8 ${useReducedEffects ? '' : 'backdrop-blur-[2px]'}`}>
          <div className="shrink-0 border-b border-stone-300/70">
            <div className="flex h-14 items-center">
              <div className="flex items-center gap-2 text-slate-500">
                <button
                  type="button"
                  onClick={() => setWeekReferenceDate((prev) => {
                    const next = new Date(prev);
                    next.setDate(prev.getDate() - 7);
                    return next;
                  })}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/60 hover:text-slate-700"
                  title="上一周"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsWeekJumpPickerOpen(true)}
                  className="rounded-full px-2 py-1 text-[13px] tracking-[0.16em] text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700"
                >
                  {currentWeekLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setWeekReferenceDate((prev) => {
                    const next = new Date(prev);
                    next.setDate(prev.getDate() + 7);
                    return next;
                  })}
                  className="rounded-full p-1.5 transition-colors hover:bg-white/60 hover:text-slate-700"
                  title="下一周"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekReferenceDate(new Date())}
                  className={`ml-1 rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                    isCurrentWeek
                      ? 'bg-stone-100 text-slate-600'
                      : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
                  }`}
                >
                  本周
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
            <div className="border-t border-stone-300/70 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
              {weekBuckets.map((bucket, index) => {
                const bucketDate = parseDateKey(bucket.date);
                const isToday = bucket.date === getTodayDateKey();

                return (
                  <section
                    key={bucket.date}
                    data-week-drop-date={bucket.date}
                    className="grid min-h-[5.5rem] grid-cols-[4.25rem_minmax(0,1fr)] border-b border-stone-300/70 md:grid-cols-[4.75rem_minmax(0,1fr)]"
                    onDragOver={(event) => {
                      if (!draggingWeekTodoId) return;
                      event.preventDefault();
                      if (dragTargetDate !== bucket.date) {
                        setDragTargetDate(bucket.date);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragTargetDate === bucket.date) {
                        setDragTargetDate(null);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleWeekDrop(bucket.date);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setAssignModalDate(bucket.date);
                        setAssignModalType('scheduled');
                      }}
                      className="flex flex-col justify-center border-r border-stone-300/70 px-2 py-3 text-center transition-colors hover:bg-white/40 md:px-3"
                    >
                      <div className={`text-[12px] tracking-[0.02em] ${isToday ? 'text-slate-600' : 'text-slate-400'}`}>
                        {WEEKDAY_ROW_LABELS[index]}
                      </div>
                      <div className={`mt-1 text-[19px] leading-none md:text-[22px] font-calendar ${isToday ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                        {bucketDate?.getDate() || '--'}
                      </div>
                      <div className="mt-1 text-[10px] tracking-[0.02em] text-slate-400">
                        {bucketDate ? `${bucketDate.getMonth() + 1}月` : ''}
                      </div>
                    </button>

                    <div className={`flex min-w-0 items-stretch px-4 py-3 md:px-5 ${dragTargetDate === bucket.date ? 'bg-stone-100/30' : ''}`}>
                      <div className="flex min-h-full w-full items-center">
                        {bucket.items.length > 0 ? (
                          <div className="w-full space-y-0.5">
                            {bucket.items.map((entry) => (
                              <WeekTodoLineItem
                                key={`${bucket.date}-${entry.todo.id}`}
                                entry={entry}
                                isDragging={draggingWeekTodoId === entry.todo.id}
                                onDragStart={handleWeekItemDragStart}
                                onDragEnd={handleWeekItemDragEnd}
                                onTouchDragStart={handleTouchWeekItemDragStart}
                                onBadgeClick={handleWeekBadgeClick}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full py-2 text-[18px] italic tracking-[0.2em] text-slate-300">
                            ...
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>

        <FloatingButton
          onClick={() => setScreenMode('list')}
          title="切换回列表"
          ariaLabel="切换回列表"
          disableThemeStyle={!hasCustomIconTheme}
          className="text-white shadow-[0_14px_34px_rgba(15,23,42,0.16)]"
        >
          <UIIcon type="email" fallbackIcon={ListTodo} size={24} className="text-white" style={{ color: '#ffffff' }} />
        </FloatingButton>

        {isAIInputOpen && (
          <AITodoInputModal
            onClose={() => setIsAIInputOpen(false)}
            onGenerate={handleAIGenerate}
            isLoading={isAIGenerating}
          />
        )}

        {isAIConfirmOpen && (
          <AITodoConfirmModal
            onClose={() => setIsAIConfirmOpen(false)}
            onSave={handleAISave}
            initialTasks={aiParsedTasks}
            todoCategories={categories}
            activityCategories={activityCategories}
            scopes={scopes}
            autoLinkRules={autoLinkRules}
          />
        )}

        <TodoScheduleAssignModal
          isOpen={assignModalDate !== null}
          dateLabel={assignModalDateLabel}
          assignType={assignModalType}
          onAssignTypeChange={setAssignModalType}
          todos={assignableTodos}
          todoCategories={categories}
          activityCategories={activityCategories}
          onAssign={handleAssignTodoToDate}
          onCreate={handleCreateTodoForDate}
          onClose={() => setAssignModalDate(null)}
        />

        <TodoDatePickerModal
          isOpen={isWeekJumpPickerOpen}
          title="跳到某一天"
          value={weekJumpDateValue}
          initialMonthValue={weekJumpDateValue}
          onSelect={(value) => {
            const nextDate = parseDateKey(value);
            if (nextDate) {
              setWeekReferenceDate(nextDate);
            }
          }}
          onClose={() => setIsWeekJumpPickerOpen(false)}
        />

        <TodoScheduleQuickActionsModal
          isOpen={quickActionEntry !== null && quickActionType !== null}
          todo={quickActionEntry?.todo || null}
          badgeType={quickActionType}
          currentDateLabel={quickActionDateLabel}
          onMoveDate={handleQuickActionMove}
          onClearDate={handleQuickActionClearDate}
          onOpenDetail={handleQuickActionOpenDetail}
          onComplete={handleQuickActionComplete}
          onClose={() => {
            setQuickActionEntry(null);
            setQuickActionType(null);
          }}
        />

        {duplicateModalNode}

        {touchDragPreview && (
          <div
            className="pointer-events-none fixed z-[140] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white/92 px-3 py-2 text-sm text-stone-700 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
            style={{ left: touchDragPreview.x, top: touchDragPreview.y }}
          >
            <div className="max-w-[12rem] truncate">{touchDragPreview.title}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="flex h-full relative"
      style={{
        backgroundColor: hasBackground ? 'transparent' : '#faf9f6'
      }}
    >
      {/* 闁煎啿鏈▍娆撳炊閸撗冾暬閻?*/}
      {hasBackground && (
        <div 
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'translateZ(0)'
          }}
        />
      )}
      
      {/* 闁稿繈鍔岄惇顒勫础婵犲洠鍋撹箛鏃€顫栭梺顒夊枤閸嶇數浠?- 閻熸洖妫涘ú濠囧极缂堢娀鍤嬪☉鎾愁儏瀹曟劙鏌堥妸銉ョ€?*/}
      <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'rgba(250, 249, 246, 0.5)' }}></div>
      
      {/* Left Sidebar - Todo Categories */}
      <div
        className={`flex-shrink-0 flex flex-col overflow-y-auto pt-6 pb-20 pl-0 pr-2 no-scrollbar z-0 transition-all duration-300 relative ${isSidebarOpen ? 'w-auto md:min-w-[12rem]' : 'w-16 items-center'}`}
      >
        <div className="flex-1 w-full">
          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`
                  flex items-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-600 hover:text-stone-800'
                  }
                  ${!isSidebarOpen ? 'justify-center w-12 h-12 md:w-14 md:h-14' : 'w-full h-12 md:h-14 px-4'}
                `}
                title={!isSidebarOpen ? category.name : undefined}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
                )}
                <IconRenderer 
                  icon={category.icon} 
                  uiIcon={category.uiIcon}
                  size={20}
                  className={`text-xl flex-shrink-0 ${isSelected ? 'opacity-100' : 'opacity-100'}`} 
                />
                {isSidebarOpen && (
                  <span className={`text-sm md:text-base whitespace-nowrap transition-all ${isSelected ? 'font-bold' : 'font-medium'}`}>
                    {category.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowCompletedTodos(prev => !prev)}
          className={`mt-2 mb-2 p-2 rounded-full text-stone-400 hover:bg-white/50 hover:text-stone-500 transition-all active:scale-95 ${isSidebarOpen ? 'self-end mr-4' : 'mx-auto'}`}
          title={showCompletedTodos ? 'Hide Completed Todos' : 'Show Completed Todos'}
        >
          {showCompletedTodos ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>

        {/* View Mode Toggle Button */}
        <button
          onClick={() => setViewMode(prev => prev === 'loose' ? 'compact' : 'loose')}
          className={`mb-2 p-2 rounded-full text-stone-400 hover:bg-white/50 hover:text-stone-500 transition-all active:scale-95 ${isSidebarOpen ? 'self-end mr-4' : 'mx-auto'}`}
          title={viewMode === 'loose' ? "Switch to Compact View" : "Switch to Loose View"}
        >
          {viewMode === 'loose' ? <Rows size={20} /> : <LayoutList size={20} />}
        </button>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`mt-1 p-2 rounded-full text-stone-400 hover:bg-white/50 hover:text-stone-500 transition-all active:scale-95 ${isSidebarOpen ? 'self-end mr-4' : 'mx-auto'}`}
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Right Content - Task List */}
      <div 
        className="flex-1 overflow-hidden flex flex-col p-5 md:p-10 rounded-tl-[2rem] shadow-[-5px_0_20px_rgba(0,0,0,0.08)] z-10 ml-[-10px] relative"
        id="todo-content"
      >
        {/* 闁告锕埀顒€绻戝Σ鎴︽儌閸婄喎顥忛梺顒夊枤閸嶇數浠?- 闂侇偄绻戝Σ鎴炴償閿旂晫澹岄柟璇″枤閺併倝骞嬮悿顖ｅ晭缂傚喚鍠栨慨鈺呭箑娴ｇ晫娈堕柡?*/}
        <div 
          className={`absolute inset-0 -z-10 rounded-tl-[2rem] ${useReducedEffects ? '' : 'backdrop-blur-sm'}`}
          style={{
            backgroundColor: `rgba(255, 255, 255, ${panelOverlayOpacity})`
          }}
        />

        {/* Header */}
        <div className="mb-6 flex items-center justify-between mt-2 md:mt-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
              {selectedCategory.name}
              <span className="text-stone-300 text-lg font-normal">Tasks</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAIInputOpen(true)}
              className="theme-icon-button"
              title="AI Add Task"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={() => onAddTodo(selectedCategoryId)}
              className="floating-button w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          {filteredTodos.map((todo, index) => (
            <SwipeableTodoItem
              key={todo.id}
              todo={todo}
              categories={categories}
              activityCategories={activityCategories}
              scopes={scopes}
              onToggle={onToggleTodo}
              onEdit={onEditTodo}
              onStartFocus={onStartFocus}
              onDuplicate={handleOpenDuplicateModal}
              viewMode={viewMode}
              isFirst={index === 0}
              isLast={index === filteredTodos.length - 1}
            />
          ))}

          {filteredTodos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-stone-300">
              <MoreHorizontal size={40} className="mb-4 opacity-50" />
              <p className="text-sm font-serif italic">No tasks yet.</p>
            </div>
          )}
        </div>
      </div>

      <FloatingButton
        onClick={() => setScreenMode((prev) => prev === 'list' ? 'week' : 'list')}
        title={screenMode === 'list' ? '切换到周视图' : '切换回列表'}
        ariaLabel={screenMode === 'list' ? '切换到周视图' : '切换回列表'}
        disableThemeStyle={!hasCustomIconTheme}
        className="text-white"
      >
        {screenMode === 'list' ? (
          <UIIcon type="manage" fallbackIcon={CalendarDays} size={24} className="text-white" style={{ color: '#ffffff' }} />
        ) : (
          <UIIcon type="email" fallbackIcon={ListTodo} size={24} className="text-white" style={{ color: '#ffffff' }} />
        )}
      </FloatingButton>

      {isAIInputOpen && (
        <AITodoInputModal
          onClose={() => setIsAIInputOpen(false)}
          onGenerate={handleAIGenerate}
          isLoading={isAIGenerating}
        />
      )}

      {isAIConfirmOpen && (
        <AITodoConfirmModal
          onClose={() => setIsAIConfirmOpen(false)}
          onSave={handleAISave}
          initialTasks={aiParsedTasks}
          todoCategories={categories}
          activityCategories={activityCategories}
          scopes={scopes}
          autoLinkRules={autoLinkRules}
        />
      )}

      {duplicateModalNode}
    </div>
  );
};


