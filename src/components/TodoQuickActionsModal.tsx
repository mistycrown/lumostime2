/**
 * @file TodoQuickActionsModal.tsx
 * @input Quick-action visibility, todo item, action callbacks
 * @output Shared todo quick-actions sheet UI for list rows and week-view badges
 * @pos Component
 * @description A reusable bottom sheet that exposes lightweight todo planning and completion actions without opening the full todo detail editor first.
 * @updated 2026-06-14: Added visualViewport-based mobile keyboard avoidance and scrollable sheet bounds so inline title editing stays visible above the soft keyboard.
 * @updated 2026-06-13: Added inline todo title editing inside the sheet header with auto-save on blur, styled with a print-inspired bottom border and no focus ring to prevent visual shifts.
 * @updated 2026-05-14: Reworked the `Maybe` quick-action row into one shared outer pill that contains the main `Maybe` picker plus inline `今 / 明 / +7` shortcuts, and renamed the arrange/due `下周` shortcuts to `+7`.
 * @updated 2026-05-14: Expanded the `Maybe` summary text under the title to show every future candidate date in order instead of collapsing multiple dates into a `+n` count.
 * @updated 2026-05-14: Moved the recurring skip icon into each skip action button so the shortcut row matches the shared quick-action button structure.
 * @updated 2026-05-14: Added recurring `Skip 当前轮次 / Skip到` quick actions on one shared row, so recurring todos can skip the next occurrence directly or skip that next run while choosing one future `Maybe Date` destination.
 * @updated 2026-05-14: Added a `Maybe` quick action that opens the shared multi-date picker with the current task's `maybeDates`, so list-row quick actions can edit tentative future dates for any task type, including recurring todos.
 * @updated 2026-05-13: Changed quick `升级为项目` to reuse the centered category picker so quick reminders must choose a target standard category before upgrading.
 * @updated 2026-05-13: Matched the centered move-category picker width to the parent quick-actions sheet so the nested dialog feels aligned instead of detached.
 * @updated 2026-05-13: Added a centered `移动分类` picker for non-subtask todos so category changes can stay inside the shared quick-actions flow.
 * @updated 2026-05-13: Added a compact recurrence-rule summary under the title so recurring todos still expose their repeat cadence after arrange/due metadata is hidden.
 * @updated 2026-05-13: Hide arrange/due quick actions for recurring todos so date-mutually-exclusive tasks no longer expose conflicting schedule shortcuts.
 * @updated 2026-05-13: Hide the detail-editor shortcut for quick reminder todos so small-task interactions stay lightweight and inline-first.
 * @updated 2026-05-05: Ignores the same just-opened touch click for action buttons too, so tapping a bottom todo row no longer flashes the sheet and instantly fires a quick action underneath the finger.
 * @updated 2026-05-05: Moved backdrop dismissal onto the backdrop click itself so outside taps close the current sheet without click-through opening the todo row underneath, while the existing open-time close guard still blocks same-tap flash-closes.
 * @updated 2026-05-05: Split normal backdrop dismissal from forced hardware-back dismissal so row taps can still open the sheet without the same click instantly closing it.
 * @updated 2026-05-04: Registered with the shared Android back-handler stack and consumed backdrop clicks so the sheet closes before app exit or underlying todo taps can fire.
 * @updated 2026-04-27: Added an inline two-step delete action so the shared todo quick-actions sheet can remove tasks without opening the full detail editor.
 * @updated 2026-04-21: Added pin/unpin quick action support plus pinned-state metadata for today-schedule prioritization.
 * @updated 2026-04-21: Switched backdrop dismissal to pointer-down handling so opening clicks no longer immediately close the shared sheet on desktop.
 * @updated 2026-04-20: Extracted from TodoView so todo-list taps and week badges can share one quick-actions sheet implementation.
 */
import React, { useEffect, useState, useRef } from 'react';
import { ArrowRightLeft, CalendarDays, Check, CheckCircle2, Flag, PanelRightOpen, Pin, SkipForward, Trash2, X } from 'lucide-react';
import { TodoCategory, TodoItem } from '../types';
import { formatDateKey, formatTodoRecurrenceSummary, normalizeMaybeDates, parseDateKey } from '../utils/todoScheduleUtils';
import { registerHardwareBackHandler } from '../utils/hardwareBackHandlerStack';
import { isTodoQuickActionInteractionGuardActive } from '../hooks/useTodoQuickActions';
import { isQuickTodo } from '../utils/todoKindUtils';
import { IconRenderer } from './IconRenderer';
import { TodoDatePickerModal } from './TodoDatePickerModal';

type CategoryPickerMode = 'move' | 'upgrade' | null;

const QUICK_ACTION_KEYBOARD_INSET_THRESHOLD = 80;

interface TodoQuickActionsModalProps {
  isOpen: boolean;
  todo: TodoItem | null;
  todoCategories: TodoCategory[];
  onMoveDate: (type: 'scheduled' | 'deadline', mode: 'today' | 'tomorrow' | 'nextWeek') => void;
  onClearDate: (type: 'scheduled' | 'deadline') => void;
  onOpenDetail: () => void;
  onComplete: () => void;
  onUndoComplete: () => void;
  onTogglePin: () => void;
  onEditMaybeDates: (values: string[]) => void;
  onSkipNextRecurrence: () => void;
  onSkipToMaybeDate: (dateKey: string) => void;
  onMoveCategory: (categoryId: string) => void;
  onUpgradeToProject?: (categoryId: string) => void;
  onDelete: () => void;
  onClose: () => void;
  onForceClose?: () => void;
  openedAt?: number;
  showUpgradeToProject?: boolean;
  onUpdateTitle?: (title: string) => void;
}

export const TodoQuickActionsModal: React.FC<TodoQuickActionsModalProps> = ({
  isOpen,
  todo,
  todoCategories,
  onMoveDate,
  onClearDate,
  onOpenDetail,
  onComplete,
  onUndoComplete,
  onTogglePin,
  onEditMaybeDates,
  onSkipNextRecurrence,
  onSkipToMaybeDate,
  onMoveCategory,
  onUpgradeToProject,
  onDelete,
  onClose,
  onForceClose,
  openedAt = 0,
  showUpgradeToProject = false,
  onUpdateTitle
}) => {
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [categoryPickerMode, setCategoryPickerMode] = useState<CategoryPickerMode>(null);
  const [isMaybePickerOpen, setIsMaybePickerOpen] = useState(false);
  const [isSkipToPickerOpen, setIsSkipToPickerOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const isEscapeRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const visualViewportBaselineRef = useRef<{ height: number; width: number }>({ height: 0, width: 0 });

  useEffect(() => {
    setIsDeleteConfirming(false);
    setCategoryPickerMode(null);
    setIsMaybePickerOpen(false);
    setIsSkipToPickerOpen(false);
    setIsEditingTitle(false);
    setEditedTitle(todo?.title || '');
    isEscapeRef.current = false;
  }, [isOpen, todo?.id, todo?.title]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    return registerHardwareBackHandler(() => {
      if (isMaybePickerOpen) {
        setIsMaybePickerOpen(false);
        return true;
      }

      if (isSkipToPickerOpen) {
        setIsSkipToPickerOpen(false);
        return true;
      }

      if (categoryPickerMode) {
        setCategoryPickerMode(null);
        return true;
      }

      if (isDeleteConfirming) {
        setIsDeleteConfirming(false);
        return true;
      }

      if (onForceClose) {
        onForceClose();
      } else {
        onClose();
      }
      return true;
    });
  }, [categoryPickerMode, isDeleteConfirming, isMaybePickerOpen, isOpen, isSkipToPickerOpen, onClose, onForceClose]);

  useEffect(() => {
    if (!isOpen) {
      visualViewportBaselineRef.current = { height: 0, width: 0 };
      setKeyboardBottomInset(0);
      return;
    }

    if (typeof window === 'undefined' || !window.visualViewport) {
      setKeyboardBottomInset(0);
      return;
    }

    const viewport = window.visualViewport;
    let frameId: number | null = null;

    const getKeyboardBottomInset = () => {
      const currentVisibleHeight = viewport.height + viewport.offsetTop;
      const currentViewportWidth = viewport.width;

      if (currentVisibleHeight <= 0 || currentViewportWidth <= 0) {
        return 0;
      }

      const baseline = visualViewportBaselineRef.current;
      const widthDelta = Math.abs(currentViewportWidth - baseline.width);

      if (baseline.height === 0 || widthDelta > 120 || currentVisibleHeight > baseline.height) {
        visualViewportBaselineRef.current = { height: currentVisibleHeight, width: currentViewportWidth };
        return 0;
      }

      const baselineInset = baseline.height - currentVisibleHeight;
      const layoutViewportInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const inset = Math.round(Math.max(baselineInset, layoutViewportInset));

      return inset > QUICK_ACTION_KEYBOARD_INSET_THRESHOLD ? inset : 0;
    };

    const syncKeyboardBottomInset = () => {
      const nextInset = getKeyboardBottomInset();
      setKeyboardBottomInset((current) => (current === nextInset ? current : nextInset));

      if (nextInset > 0 && document.activeElement === titleInputRef.current) {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
        frameId = window.requestAnimationFrame(() => {
          titleInputRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        });
      }
    };

    syncKeyboardBottomInset();
    viewport.addEventListener('resize', syncKeyboardBottomInset);
    viewport.addEventListener('scroll', syncKeyboardBottomInset);

    return () => {
      viewport.removeEventListener('resize', syncKeyboardBottomInset);
      viewport.removeEventListener('scroll', syncKeyboardBottomInset);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isOpen]);

  if (!isOpen || !todo) return null;

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    if (isEscapeRef.current) {
      isEscapeRef.current = false;
      return;
    }
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== todo.title) {
      onUpdateTitle?.(trimmedTitle);
    } else {
      setEditedTitle(todo.title);
    }
  };

  const showDetailShortcut = !isQuickTodo(todo);
  const isRecurringTodo = Boolean(todo.recurrenceRule);
  const canMoveCategory = !todo.parentTodoId && todoCategories.length > 1;
  const canUpgradeToProject = Boolean(showUpgradeToProject && onUpgradeToProject && isQuickTodo(todo) && todoCategories.length > 0);
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
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })}`;
  };

  const scheduledQuickActionValue = formatQuickActionDate(todo.scheduledDate);
  const deadlineQuickActionValue = formatQuickActionDate(todo.deadlineDate);
  const maybeQuickActionValue = (() => {
    const normalizedMaybeDates = normalizeMaybeDates(todo.maybeDates);
    if (!normalizedMaybeDates || normalizedMaybeDates.length === 0) {
      return null;
    }

    return normalizedMaybeDates
      .map((dateKey) => formatQuickActionDate(dateKey) || dateKey)
      .join(', ');
  })();
  const recurrenceSummary = formatTodoRecurrenceSummary(todo.recurrenceRule);

  const quickActionDateRows = [
    { key: 'pin', label: 'Pin', value: todo.pin ? 'On' : null },
    { key: 'recurrence', label: '', value: recurrenceSummary },
    { key: 'scheduled', label: '安排', value: formatQuickActionDate(todo.scheduledDate) },
    { key: 'deadline', label: '截止', value: formatQuickActionDate(todo.deadlineDate) },
    { key: 'maybe', label: 'Maybe', value: maybeQuickActionValue },
    { key: 'completed', label: '完成', value: formatQuickActionDateTime(todo.completedAt) }
  ].filter((item): item is { key: string; label: string; value: string } => Boolean(item.value));
  const visibleQuickActionDateRows = isRecurringTodo
    ? quickActionDateRows.filter((item) => item.key !== 'scheduled' && item.key !== 'deadline')
    : quickActionDateRows;

  const handleBackdropPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.stopPropagation();
  };

  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (categoryPickerMode) {
      setCategoryPickerMode(null);
      return;
    }

    if (isMaybePickerOpen) {
      setIsMaybePickerOpen(false);
      return;
    }

    if (isSkipToPickerOpen) {
      setIsSkipToPickerOpen(false);
      return;
    }

    onClose();
  };

  const withActionGuard = <T extends HTMLElement>(
    action: () => void
  ): React.MouseEventHandler<T> => (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.detail !== 0 && isTodoQuickActionInteractionGuardActive(openedAt)) {
      return;
    }

    action();
  };

  const categoryPickerTitle = categoryPickerMode === 'upgrade' ? '升级到哪个分类？' : '移动到哪个分类？';
  const categoryPickerLabel = categoryPickerMode === 'upgrade' ? 'Upgrade Project' : 'Move Category';
  const handleQuickMaybeDate = (dayOffset: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);

    onEditMaybeDates([
      ...(todo.maybeDates || []),
      formatDateKey(targetDate)
    ]);
  };
  const sheetMaxHeight = `calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${keyboardBottomInset}px - 4rem)`;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-[rgba(15,23,42,0.12)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm md:items-center md:pb-4"
      style={{
        paddingBottom: `calc(1rem + env(safe-area-inset-bottom) + ${keyboardBottomInset}px)`,
        transition: 'padding-bottom 180ms ease-out'
      }}
      onPointerDown={handleBackdropPointerDown}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[26rem] overflow-y-auto overscroll-contain rounded-[2rem] border border-stone-200 bg-[#faf9f6] shadow-[0_26px_70px_rgba(15,23,42,0.14)]"
        style={{
          maxHeight: sheetMaxHeight,
          transition: 'max-height 180ms ease-out'
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-stone-200 px-5 py-4 pr-24">
          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Quick Actions</div>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="mt-1 w-full border-x-0 border-t-0 border-b border-stone-300 bg-transparent px-1 pb-0.5 text-lg font-medium text-stone-800 outline-none focus:border-stone-400 focus:ring-0 focus:outline-none"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  isEscapeRef.current = true;
                  setEditedTitle(todo.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
            />
          ) : (
            <div
              className="mt-1 text-lg font-medium text-stone-800 cursor-pointer hover:bg-stone-100/60 rounded px-1 -mx-1 transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {todo.title}
            </div>
          )}
          {visibleQuickActionDateRows.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
              {visibleQuickActionDateRows.map((item) => (
                <span key={`${item.label}-${item.value}`} className="inline-flex min-w-0 items-center gap-1.5">
                  {item.label && <span className="shrink-0 uppercase tracking-[0.18em] text-stone-400">{item.label}</span>}
                  <span className="text-stone-500">{item.value}</span>
                </span>
              ))}
            </div>
          )}
          <div className="absolute right-5 top-4 flex items-center gap-2">
            {showDetailShortcut && (
              <button
              type="button"
              onClick={withActionGuard(onOpenDetail)}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-600"
              title="打开详情"
            >
              <PanelRightOpen size={16} />
              </button>
            )}
            {!todo.isCompleted && (
              <button
                type="button"
                onClick={withActionGuard(onComplete)}
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
            <div className={isRecurringTodo ? 'hidden' : 'grid grid-cols-2 gap-2'}>
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80">
                <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  <CalendarDays size={12} className="text-stone-400" />
                  <span>安排到</span>
                </div>
                <div className="grid grid-cols-[0.8fr_0.8fr_1.1fr]">
                  <button
                    type="button"
                    onClick={withActionGuard(() => onMoveDate('scheduled', 'today'))}
                    className="flex items-center justify-center whitespace-nowrap px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    <span>今</span>
                  </button>
                  <button
                    type="button"
                    onClick={withActionGuard(() => onMoveDate('scheduled', 'tomorrow'))}
                    className="flex items-center justify-center whitespace-nowrap border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    <span>明</span>
                  </button>
                  <button
                    type="button"
                    onClick={withActionGuard(() => onMoveDate('scheduled', 'nextWeek'))}
                    className="flex items-center justify-center whitespace-nowrap border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    <span>+7</span>
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white/80">
                <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  <Flag size={12} className="text-stone-400" />
                  <span>截止到</span>
                </div>
                <div className="grid grid-cols-[0.8fr_0.8fr_1.1fr]">
                  <button
                    type="button"
                    onClick={withActionGuard(() => onMoveDate('deadline', 'today'))}
                    className="flex items-center justify-center whitespace-nowrap px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    今
                  </button>
                  <button
                    type="button"
                    onClick={withActionGuard(() => onMoveDate('deadline', 'tomorrow'))}
                    className="flex items-center justify-center whitespace-nowrap border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    明
                  </button>
                  <button
                    type="button"
                    onClick={withActionGuard(() => onMoveDate('deadline', 'nextWeek'))}
                    className="flex items-center justify-center whitespace-nowrap border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    +7
                  </button>
                </div>
              </div>
            </div>

            <div className={isRecurringTodo ? 'hidden' : 'grid grid-cols-2 gap-2'}>
              <button
                type="button"
                onClick={withActionGuard(() => onClearDate('scheduled'))}
                className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <X size={16} className="text-stone-400" />
                <span>清除安排日期</span>
              </button>

              <button
                type="button"
                onClick={withActionGuard(() => onClearDate('deadline'))}
                className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <X size={16} className="text-stone-400" />
                <span>清除截止日期</span>
              </button>
            </div>

            {isRecurringTodo && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={withActionGuard(onSkipNextRecurrence)}
                  className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
                >
                  <SkipForward size={15} className="text-stone-400" />
                  <span>Skip 当前轮次</span>
                </button>
                <button
                  type="button"
                  onClick={withActionGuard(() => setIsSkipToPickerOpen(true))}
                  className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
                >
                  <SkipForward size={15} className="text-stone-400" />
                  <span>Skip到</span>
                </button>
              </div>
            )}

            <div className="flex items-center rounded-2xl border border-stone-200 bg-white/80 pr-2">
              <button
                type="button"
                onClick={withActionGuard(() => setIsMaybePickerOpen(true))}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-l-2xl px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-white"
              >
                <CalendarDays size={15} className="text-stone-400" />
                <span>Maybe</span>
              </button>
              <div className="flex items-center pl-1">
                  <button
                    type="button"
                    onClick={withActionGuard(() => handleQuickMaybeDate(0))}
                    className="flex items-center justify-center whitespace-nowrap px-3 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    今
                  </button>
                  <span className="h-4 w-px bg-stone-200" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={withActionGuard(() => handleQuickMaybeDate(1))}
                    className="flex items-center justify-center whitespace-nowrap px-3 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    明
                  </button>
                  <span className="h-4 w-px bg-stone-200" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={withActionGuard(() => handleQuickMaybeDate(7))}
                    className="flex items-center justify-center whitespace-nowrap px-3 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    +7
                  </button>
              </div>
            </div>

            <button
              type="button"
              onClick={withActionGuard(onTogglePin)}
              className="flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
            >
              <Pin size={13} className={`${todo.pin ? 'text-stone-600' : 'text-stone-400'} rotate-[28deg]`} />
              <span>{todo.pin ? '取消 Pin' : 'Pin'}</span>
            </button>

            {canMoveCategory && (
              <button
                type="button"
                onClick={withActionGuard(() => setCategoryPickerMode('move'))}
                className="flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <ArrowRightLeft size={15} className="text-stone-400" />
                <span>移动分类</span>
              </button>
            )}

            {canUpgradeToProject && (
              <button
                type="button"
                onClick={withActionGuard(() => setCategoryPickerMode('upgrade'))}
                className="flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <PanelRightOpen size={15} className="text-stone-400" />
                <span>升级为项目</span>
              </button>
            )}

            {todo.isCompleted && (
              <button
                type="button"
                onClick={withActionGuard(onUndoComplete)}
                className="flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <CheckCircle2 size={16} className="text-stone-400" />
                <span>取消完成</span>
              </button>
            )}

            <button
              type="button"
              onClick={withActionGuard(() => {
                if (isDeleteConfirming) {
                  onDelete();
                  return;
                }

                setIsDeleteConfirming(true);
              })}
              className={`flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                isDeleteConfirming
                  ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100'
                  : 'border-stone-200 bg-white/80 text-stone-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <Trash2 size={16} className={isDeleteConfirming ? 'text-red-500' : 'text-stone-400'} />
              <span>{isDeleteConfirming ? '确认删除？' : '删除任务'}</span>
            </button>
          </div>
        </div>
      </div>

      <TodoDatePickerModal
        isOpen={isMaybePickerOpen}
        title="选择 Maybe Date"
        values={todo.maybeDates}
        mode="multi-date"
        onSelect={() => {}}
        onSelectMultiple={onEditMaybeDates}
        onClear={() => onEditMaybeDates([])}
        onClose={() => setIsMaybePickerOpen(false)}
      />

      <TodoDatePickerModal
        isOpen={isSkipToPickerOpen}
        title="选择 Skip 到哪里"
        mode="date"
        minDate="future"
        onSelect={onSkipToMaybeDate}
        onClose={() => setIsSkipToPickerOpen(false)}
      />

      {categoryPickerMode && (
        <div
          className="absolute inset-0 z-[131] flex items-center justify-center bg-[rgba(15,23,42,0.08)] px-4"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="w-full max-w-[26rem] rounded-[1.75rem] border border-stone-200 bg-[#faf9f6] p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
            <div className="mb-3 px-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone-400">{categoryPickerLabel}</div>
              <div className="mt-1 text-base font-medium text-stone-800">{categoryPickerTitle}</div>
            </div>

            <div className="space-y-2">
              {todoCategories.map((category) => {
                const isCurrentCategory = category.id === todo.categoryId;
                const isDisabled = categoryPickerMode === 'move' ? isCurrentCategory : false;

                return (
                  <button
                    key={category.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={withActionGuard(() => {
                      if (categoryPickerMode === 'upgrade' && onUpgradeToProject) {
                        onUpgradeToProject(category.id);
                        return;
                      }

                      onMoveCategory(category.id);
                    })}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isDisabled
                        ? 'cursor-default border-stone-200 bg-stone-100/80 text-stone-400'
                        : 'border-stone-200 bg-white/85 text-stone-700 hover:border-stone-300 hover:bg-white'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <IconRenderer icon={category.icon} uiIcon={category.uiIcon} className="text-sm text-stone-500" />
                      <span className="truncate text-sm">{category.name}</span>
                    </span>
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-stone-400">
                      {isCurrentCategory ? '当前' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={withActionGuard(() => setCategoryPickerMode(null))}
              className="mt-3 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-500 transition-colors hover:border-stone-300 hover:bg-white"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
