/**
 * @file TodoView.tsx
 * @input Todos, Categories, Scopes
 * @output Todo Status Updates, Edit Triggers, Focus Timer Start
 * @pos View (Main Tab)
 * @description The main To-Do list interface. Displays tasks grouped by category, supports swipe actions, and now includes reserved `小事` / `未来` buckets plus a week planning view with schedule and history badges.
 * @updated 2026-05-13: Reworded the empty-state copy for the reserved `小事` and `未来` buckets so each system list explains its scheduling constraints when empty.
 * @updated 2026-05-13: Added a reserved `未来` project bucket alongside `小事`, rendered it as a dedicated sidebar system category, and hid its todos from the quick schedule popup opened from week/month day numbers.
 * @updated 2026-05-13: Lowered the Todo sidebar utility trio again so the bottom expand/collapse button sits closer to the Record view reference position above the fixed navigation.
 * @updated 2026-05-13: Nudged the Todo sidebar utility buttons lower by trimming the left rail's bottom reserve so the bottom trio sits closer to the fixed navigation.
 * @updated 2026-05-13: Added a bottom-pinned virtual `小事` group with inline quick capture, while keeping quick reminders visible in shared schedule views and blocking their timer affordances.
 * @updated 2026-05-11: Added an explicit month-view entry jump signal from the parent schedule screen so opening `月视图` now replays the same `本月` jump after the calendar mounts, instead of sometimes staying at the rolling window's top month.
 * @updated 2026-05-11: Routed month-view date numeral taps into the shared quick-add schedule modal so monthly and weekly planners now open the same fast create flow for a chosen day.
 * @updated 2026-05-11: Passed activity-category, todo-category, and scope metadata into the month planner so its display-settings hidden filter can reuse custom-filter syntax against rendered todo entries.
 * @updated 2026-05-10: Rebuilt schedule-week navigation around one parent-owned Monday `weekStart` so the standard week view and `八宫格` now share the same source of truth for labels and switching.
 * @updated 2026-05-10: Unified schedule-week navigation around a Monday-based week reference so the header range, week picker, and bento week pages stay in sync while switching dates.
 * @updated 2026-05-10: Week schedule rows now append inline `@父任务` context for visible subtasks and keep the combined title on a single truncating line.
 * @updated 2026-05-10: Added a third `八宫格` schedule mode that reuses the real todo schedule data and drag-to-move rules inside a one-screen-per-week 2x4 bento layout with mini-calendar linking.
 * @updated 2026-05-10: Passed the schedule page's reduced-effects preference into the monthly calendar path so month-view rendering can dial back heavy visuals together with the rest of the Todo background shell.
 * @updated 2026-05-10: Let the monthly schedule view go edge-to-edge inside the schedule page and inherit the same custom-background rendering as the week planner instead of locking the month grid to white boxed surfaces.
 * @updated 2026-05-10: Replaced the monthly placeholder with a reference-style rolling month schedule backed by the same real Arrange / Due / Repeat / Done / Trace data as the week planner, and added month-view-specific type marker colors for each daily item.
 * @updated 2026-05-06: Captured active touch pointers for todo-row swipes and stopped release-target filtering so left-swipe complete and undo actions no longer intermittently fail when the finger drifts off the row or lifts over a child element.
 * @updated 2026-05-06: Removed the display-settings button dot indicator so the left sidebar utility icons now share the same clean Lucide-only appearance.
 * @updated 2026-05-05: Replaced the completed-visibility eye button with a dedicated display-settings modal, added compact-mode metadata toggles, and lowered the sidebar utility controls closer to the fixed bottom navigation.
 * @updated 2026-05-05: Category lists now only group incomplete todos before completed ones and otherwise preserve the incoming todo order from batch-management saves, while compact rows keep symbol-only date suffixes fully visible.
 * @updated 2026-05-05: Restored completed-row undo on a left swipe, while still passing the quick-actions open timestamp into the shared bottom sheet so lower-row taps cannot instantly trigger a mounted quick action.
 * @updated 2026-05-05: Stopped completed rows from undoing via left swipe, so accidental lower-list taps no longer reopen finished todos by mistake.
 * @updated 2026-05-05: Reserved bottom navigation space in list mode too, so lower todo rows no longer sit underneath the fixed footer hit area.
 * @updated 2026-05-05: Restored recurring and normal incomplete rows onto the same swipe/tap gesture path while keeping completed rows out of left-swipe undo.
 * @updated 2026-05-05: Replaced todo-row tap/swipe heuristics with an axis-locked gesture classifier so lower-list taps no longer get swallowed or accidentally toggle completion during scrolling.
 * @updated 2026-05-05: Reworked the custom-background surface stack so the whole todo page gets one shared base scrim and the right content panel adds a second warm overlay, eliminating sidebar seams without separate left-rail patches.
 * @updated 2026-05-05: Softened the custom-background sidebar scrim with a warm bridge into the main panel so the todo layout no longer shows a visible wallpaper seam.
 * @updated 2026-05-04: Added a custom-background-only sidebar scrim so the todo left rail stays readable over wallpaper textures.
 * @updated 2026-04-27: Routed the shared quick-actions sheet into todo deletion and added an inline two-tap delete entry for list and week-view action bars.
 * @updated 2026-04-25: Hide unfinished subtasks from todo-list rendering whenever their parent task is completed, while preserving child state and restoring the rows when the parent is reopened.
 * @updated 2026-04-25: Keep the todo page floating list-week switchers on the active color-scheme button style even when the UI icon theme stays default.
 * @updated 2026-04-25: Let floating list-week switchers inherit button theme colors when the default UI theme falls back to Lucide icons.
 * @updated 2026-04-26: Let the AI unread badge use the shared overlap positioning so it sits slightly inside the circular button edge instead of feeling detached.
 * @updated 2026-04-22: The todo-page AI magic button now opens the app-level shared AI window so closing the modal does not interrupt an in-flight request.
 * @updated 2026-04-22: Routed the todo-page AI magic button into the shared AI chat workspace and removed the old standalone AI todo parse/confirm flow.
 * @updated 2026-04-22: Narrowed the `今` filter count to only standalone todos whose own arranged or due date is today, excluding pin-only and overdue entries.
 * @updated 2026-04-22: Made expanded subtask rows in the virtual schedule view respect the sidebar's hide-completed toggle, so completed child rows disappear together with other completed todos.
 * @updated 2026-04-22: Hid redundant linked-activity and scope badges for child rows rendered directly beneath their parent so nested subtasks no longer repeat inherited metadata.
 * @updated 2026-04-22: Fixed the `排期 -> 今` hierarchy filtering so pin-only todos stay visible in the virtual today list instead of being dropped after section counts are computed.
 * @updated 2026-04-21 13:56: Made virtual-schedule parent hierarchy capsules expandable so parent rows can reveal matching child todos inline without duplicate standalone child rows.
 * @updated 2026-04-21 13:44: Abbreviated compact virtual-schedule labels such as `Arrange` and `Repeat` to three-letter forms.
 * @updated 2026-04-21 13:36: Nudged the compact `0/1` hierarchy capsule upward again for a tighter visual center alignment.
 * @updated 2026-04-21 13:31: Removed compact-list gaps between adjacent todo rows and nudged the compact `0/1` hierarchy capsule upward a bit more.
 * @updated 2026-04-21 13:22: Nudged the compact-mode hierarchy capsule slightly upward so the `0/1` badge aligns more naturally with neighboring inline metadata.
 * @updated 2026-04-21 13:14: Normalized hierarchy and metadata badge heights so the `0/1` capsule sits on the same vertical center line as neighboring containers.
 * @updated 2026-04-21 13:02: Removed the remaining compact-mode subtask branch marker so child rows rely only on indentation and hierarchy badges.
 * @updated 2026-04-21 12:55: Hid parent-title badges for child rows already rendered under their parent, while standalone scheduled subtasks now show `@` plus the first four parent-title characters.
 * @updated 2026-04-21 12:46: Removed the loose-mode curved subtask branch marker while keeping the compact-mode hierarchy connector.
 * @updated 2026-04-21 12:39: Kept loose-mode hierarchy, pin, link, and scope badges in a shared single-row wrap container so labels only wrap when space actually runs out.
 * @updated 2026-04-21 12:27: Simplified hierarchy badges to compact counts and four-character parent-title labels without extra `子任务` wording.
 * @updated 2026-04-21 12:18: Restored parent/subtask hierarchy cues inside the virtual schedule list by showing child progress on parent rows and parent labels on scheduled subtasks.
 * @updated 2026-04-21 11:46: Pinned todos now rise to the top of category lists, with icon-only compact chips and icon-plus-text loose chips.
 * @updated 2026-04-21 11:25: Added todo pin support so the today schedule tab can pin items to the top and show a matching `Pin` label.
 * @updated 2026-04-21 10:29: Let week-view `Trace` and `Done` badges open the shared quick-actions sheet just like `Arrange` and `Due`.
 * @updated 2026-04-21 10:16: Forced multi-badge week-view status labels onto a compact single line so abbreviated badges no longer wrap.
 * @updated 2026-04-21 10:02: Tightened multi-badge week-view status spacing and split the virtual `今` schedule list into today and overdue unfinished sections.
 * @updated 2026-04-21 09:11: Shortened multi-badge week-view status labels to three-letter abbreviations for non-`Due` and non-`Done` states.
 * @updated 2026-04-21 00:56: Applied the `Bilbo Swash Caps` font to the week-view left date numerals for a more decorative calendar column.
 * @updated 2026-04-21 00:43: Excluded the inline start-focus button from the row's quick-action gesture handling so mobile taps can launch focus without opening the shared sheet.
 * @updated 2026-04-21 00:34: Stopped todo-row click bubbling when opening quick actions so desktop clicks no longer reopen and immediately dismiss the shared action sheet.
 * @updated 2026-04-21 00:18: Shortened the virtual schedule filter chips under `排期` from `今天 / 明天 / 本周` to `今 / 明 / 周`.
 * @updated 2026-04-21 00:10: Unified todo-row tap targets across the whole card and tightened touch gesture suppression so mobile taps no longer get swallowed on active items.
 * @updated 2026-04-20 22:22: Added conservative left/right week-switch swipes inside the week planning scroll area, while ignoring row drag handles and date controls to reduce accidental triggers.
 * @updated 2026-04-20 22:05: Moved the week-view `本周` action into the header's top-right corner so it reads as a separate jump-to-current-week control.
 * @updated 2026-04-20 21:58: Split the right-swipe background styling so detail and duplicate states use clearly different colors while keeping the same gesture thresholds.
 * @updated 2026-04-20 21:48: Mounted the shared todo quick-actions sheet above both list and week layouts so list-row taps render it in the active screen.
 * @updated 2026-04-20 21:44: Softened completed progress indicators by lowering the fill opacity in both compact and loose todo cards.
 * @updated 2026-04-20 21:34: Let detailed progress bars span the full card width so top-right schedule markers no longer shrink them.
 * @updated 2026-04-20 21:18: Extracted shared todo quick-actions UI/control logic and switched todo-row touch handling onto a unified pointer flow.
 * @updated 2026-04-20 20:56: Prevented touch ghost-clicks from instantly dismissing todo quick actions after tap-open on mobile.
 * @updated 2026-04-20 20:43: Fixed mobile todo-row taps to reliably open quick actions, and split right-swipe into a light detail-open gesture plus a deeper duplicate gesture.
 * @updated 2026-04-20 20:18: Switched todo-row primary taps to open the quick-actions sheet first, while keeping full detail editing available from the sheet header.
 * @updated 2026-04-20 19:50: Moved detailed-list arranged/due markers into the right action rail as stacked text-only rows and clamped loose titles to two lines.
 * @updated 2026-04-20 19:39: Moved detailed-list arranged/due markers onto the title row and reduced them to icon-only capsules.
 * @updated 2026-04-20 19:32: Added detailed-list date markers for arranged and due todos while keeping compact rows unchanged.
 * @updated 2026-04-20 18:46: Shortened quick-action move labels to single-character `今 / 明` and widened the `下周` column to prevent wrapping.
 * @updated 2026-04-20 18:43: Added a tomorrow shortcut to the week-view quick-actions sheet for both Arrange and Due date moves.
 * @updated 2026-04-20 19:08: Added a top-pinned virtual schedule category with today, tomorrow, and this-week list filters.
 * @updated 2026-04-20 18:38: Added an undo-complete quick action for completed items in the week-view badge editor.
 * @updated 2026-04-20 18:12: Added touch edge auto-scroll for week-view dragging and reduced redundant badge combinations in the rendered week rows.
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
import React, { useState, useMemo, useRef } from 'react';
import { Scope, TodoItem, TodoCategory, Category, AutoLinkRule, Log, TodoDuplicateOptions } from '../types';
import { PlayCircle, CheckCircle2, Plus, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, LayoutList, Rows, Sparkles, SlidersHorizontal, CalendarDays, Flag, Repeat2, TrendingUp, ListTodo, CircleAlert, PanelRightOpen, Pin } from 'lucide-react';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useToast } from '../contexts/ToastContext';
import { IconRenderer } from '../components/IconRenderer';
import { useBackgroundDisplay } from '../hooks/useBackgroundDisplay';
import { FloatingButton } from '../components/FloatingButton';
import { UIIcon } from '../components/UIIcon';
import {
  TodoDateEntry,
  TodoScheduleMatch,
  TodoScheduleRange,
  WeekTodoEntry,
  buildWeekTodoBuckets,
  formatWeekTodoLineTitle,
  formatDateKey,
  getStartOfWeek,
  getTodayDateKey,
  getTodoScheduleMatches,
  getWeekDates,
  parseDateKey
} from '../utils/todoScheduleUtils';
import { TodoScheduleAssignModal } from '../components/TodoScheduleAssignModal';
import { TodoDatePickerModal } from '../components/TodoDatePickerModal';
import { TodoDisplaySettingsModal, type TodoCompactDisplaySettings } from '../components/TodoDisplaySettingsModal';
import { TodoDuplicateModal } from '../components/TodoDuplicateModal';
import { TodoQuickActionsModal } from '../components/TodoQuickActionsModal';
import { TodoMonthView } from '../components/TodoMonthView';
import { TodoBentoWeekView } from '../components/TodoBentoWeekView';
import { useTodoQuickActions } from '../hooks/useTodoQuickActions';
import { getTodoRowGestureIntent, getTodoRowReleaseAction, TodoRowGestureIntent } from '../utils/todoRowInteraction';
import { buildTodoTreeItems, getCompletedDirectChildCount, getDirectChildCount, getDirectChildTodosForDisplay, getParentTodo, isIncompleteSubtaskHiddenByCompletedParent } from '../utils/todoHierarchyUtils';
import { formatTodoCompactScheduleSummary, formatTodoInlineDate, orderTodoItemsByCompletionGroups } from '../utils/todoListDisplayUtils';
import { useAIChatWindow } from '../contexts/AIChatWindowContext';
import { UnreadCountBadge } from '../components/UnreadCountBadge';
import { isQuickTodo } from '../utils/todoKindUtils';
import {
  ensureQuickTodoCategory,
  FUTURE_TODO_CATEGORY_ID,
  FUTURE_TODO_CATEGORY_NAME,
  getRealTodoCategories,
  getStandardTodoCategories,
  isFutureTodoCategoryId,
  QUICK_TODO_CATEGORY_ID,
  QUICK_TODO_CATEGORY_NAME
} from '../utils/todoQuickCategoryUtils';


interface TodoViewProps {
  todos: TodoItem[];
  logs: Log[];
  categories: TodoCategory[];
  activityCategories: Category[];
  scopes: Scope[];
  onToggleTodo: (id: string) => void;
  onEditTodo: (todo: TodoItem) => void;
  onAddTodo: (categoryId: string, draft?: Partial<TodoItem>) => void;
  onStartFocus: (todo: TodoItem) => void;
  onDuplicateTodo: (todo: TodoItem, options: TodoDuplicateOptions) => void;
  onSaveTodo: (todo: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
  autoLinkRules?: AutoLinkRule[];
}

// Sub-component for Swipeable Item
const SwipeableTodoItem: React.FC<{
  todo: TodoItem;
  categories: TodoCategory[];
  activityCategories: Category[];
  scopes: Scope[];
  onToggle: (id: string) => void;
  onOpenDetail: (todo: TodoItem) => void;
  onOpenQuickActions: (todo: TodoItem) => void;
  onStartFocus: (todo: TodoItem) => void;
  onDuplicate: (todo: TodoItem) => void;
  viewMode: 'loose' | 'compact';
  scheduleMatchLabels?: string[];
  scheduleLabelStyle?: 'default' | 'schedule';
  hierarchyDepth?: 0 | 1;
  parentTitle?: string;
  childSummary?: { completed: number; total: number } | null;
  isExpanded?: boolean;
  onToggleChildren?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  compactDisplaySettings: TodoCompactDisplaySettings;
}> = ({
  todo,
  categories,
  activityCategories,
  scopes,
  onToggle,
  onOpenDetail,
  onOpenQuickActions,
  onStartFocus,
  onDuplicate,
  viewMode,
  scheduleMatchLabels = [],
  scheduleLabelStyle = 'default',
  hierarchyDepth = 0,
  parentTitle,
  childSummary = null,
  isExpanded = false,
  onToggleChildren,
  isFirst = false,
  isLast = false,
  compactDisplaySettings
}) => {
  const [translateX, setTranslateX] = useState(0);
  const isQuickReminder = isQuickTodo(todo);
  const canQuickToggle = true;
  const quickToggleDirection: 'left' = 'left';
  const shouldShowCompactScheduleLabels = viewMode !== 'compact' || compactDisplaySettings.showScheduleType;
  const visibleScheduleMatchLabels = shouldShowCompactScheduleLabels
    ? scheduleMatchLabels.slice(0, VIRTUAL_SCHEDULE_MATCH_LIMIT)
    : [];
  const hiddenScheduleMatchCount = shouldShowCompactScheduleLabels
    ? Math.max(0, scheduleMatchLabels.length - visibleScheduleMatchLabels.length)
    : 0;
  const scheduledDateLabel = formatTodoInlineDate(todo.scheduledDate);
  const deadlineDateLabel = formatTodoInlineDate(todo.deadlineDate);
  const compactScheduleSummary = viewMode === 'compact' && compactDisplaySettings.showScheduleTime
    ? formatTodoCompactScheduleSummary(todo)
    : null;
  const hasLooseDateMarkers = viewMode === 'loose' && Boolean(scheduledDateLabel || deadlineDateLabel);
  const progressRatio = (todo.completedUnits || 0) / (todo.totalAmount || 1);
  const progressPercentage = Math.round(progressRatio * 100);
  const progressBarWidth = Math.min(100, Math.max(0, progressRatio * 100));
  const canStartFocus = !todo.isCompleted && !isQuickReminder;
  const canSwipeRightActions = !isQuickReminder;
  const showLooseRightActions = viewMode === 'loose' && (hasLooseDateMarkers || canStartFocus);
  const completedProgressOpacity = todo.isCompleted ? 0.38 : 1;
  const baseLooseBadgeClass = 'inline-flex min-h-[1.5rem] max-w-full items-center gap-1 whitespace-nowrap rounded-md border border-stone-200 bg-white/50 px-1.5 py-0.5 text-[11px] font-medium leading-none text-stone-500 align-middle';
  const baseCompactBadgeClass = 'inline-flex max-w-full items-center gap-1 whitespace-nowrap';
  const hierarchyBadgeClass = viewMode === 'compact'
    ? 'relative -translate-y-1 inline-flex max-w-full items-center gap-1 rounded-full border border-stone-200 bg-white/80 px-2 py-0.5 font-medium leading-none text-stone-500 text-[10px]'
    : 'inline-flex min-h-[1.5rem] max-w-full items-center gap-1 whitespace-nowrap rounded-full border border-stone-200 bg-white/80 px-2 py-0.5 font-medium leading-none text-stone-500 text-[11px] align-middle';

  // Constants
  const detailSwipeDistance = canSwipeRightActions ? 36 : Number.MAX_SAFE_INTEGER;
  const duplicateSwipeDistance = canSwipeRightActions ? 100 : Number.MAX_SAFE_INTEGER;
  const minSwipeDistance = 100;
  const maxSwipeDistance = 150; // Limit drag visual
  const shouldSuppressClickRef = useRef(false);
  const pointerStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const gestureIntentRef = useRef<TodoRowGestureIntent>('pending');

  const releaseCapturedPointer = (target: HTMLDivElement, pointerId: number | null) => {
    if (pointerId === null) {
      return;
    }

    try {
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // Some touch environments can report stale capture state during teardown.
    }
  };

  const resetPointerGesture = () => {
    pointerStartPointRef.current = null;
    activePointerIdRef.current = null;
    gestureIntentRef.current = 'pending';
    setTranslateX(0);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    if (shouldIgnoreTodoPrimaryInteraction(event.target)) {
      resetPointerGesture();
      shouldSuppressClickRef.current = false;
      return;
    }
    shouldSuppressClickRef.current = false;
    pointerStartPointRef.current = { x: event.clientX, y: event.clientY };
    activePointerIdRef.current = event.pointerId;
    gestureIntentRef.current = 'pending';
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore environments that do not support capture for this pointer type.
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    if (activePointerIdRef.current !== event.pointerId || pointerStartPointRef.current === null) return;
    const diffX = event.clientX - pointerStartPointRef.current.x;
    const diffY = event.clientY - pointerStartPointRef.current.y;

    if (gestureIntentRef.current === 'pending') {
      gestureIntentRef.current = getTodoRowGestureIntent({
        diffX,
        diffY,
        canQuickToggle,
        quickToggleDirection
      });
    }

    if (gestureIntentRef.current !== 'swipe') {
      setTranslateX(0);
      return;
    }

    if (!canSwipeRightActions && diffX > 0) {
      setTranslateX(0);
      return;
    }

    if (diffX < 0 && quickToggleDirection !== 'left') {
      setTranslateX(0);
      return;
    }

    // Allow swipe in both directions but clamp
    if (Math.abs(diffX) < maxSwipeDistance) {
      setTranslateX(diffX);
    } else {
      // Clamp to max distance, keeping sign
      setTranslateX(diffX > 0 ? maxSwipeDistance : -maxSwipeDistance);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    releaseCapturedPointer(event.currentTarget, activePointerIdRef.current);
    if (activePointerIdRef.current !== event.pointerId || pointerStartPointRef.current === null) {
      resetPointerGesture();
      return;
    }

    const diffX = event.clientX - pointerStartPointRef.current.x;
    const diffY = event.clientY - pointerStartPointRef.current.y;
    const releaseAction = getTodoRowReleaseAction({
      diffX,
      diffY,
      canQuickToggle,
      quickToggleDirection,
      gestureIntent: gestureIntentRef.current,
      detailSwipeDistance,
      duplicateSwipeDistance,
      completeSwipeDistance: minSwipeDistance
    });
    let handledGesture = releaseAction !== 'none';

    if (releaseAction === 'openQuickActions') {
      onOpenQuickActions(todo);
    } else if (releaseAction === 'duplicate') {
      onDuplicate(todo);
    } else if (releaseAction === 'openDetail') {
      onOpenDetail(todo);
    } else if (releaseAction === 'toggleComplete') {
      onToggle(todo.id);
    }

    shouldSuppressClickRef.current = handledGesture;

    if (handledGesture) {
      event.preventDefault();
    }

    resetPointerGesture();
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    releaseCapturedPointer(event.currentTarget, activePointerIdRef.current);
    resetPointerGesture();
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
  const isNestedChildRow = hierarchyDepth === 1 && !parentTitle;
  const visibleLinkedDetails = isNestedChildRow
    ? null
    : (viewMode === 'compact' && !compactDisplaySettings.showLinkedTag ? null : linkedDetails);
  const visibleLinkedScopes = isNestedChildRow
    ? []
    : (viewMode === 'compact' && !compactDisplaySettings.showLinkedScope ? [] : linkedScopes);

  const { isPrivacyMode } = usePrivacy();

  // 閻犱緤绱曢悾濠氬捶閸℃凹娼￠柡宥呭槻缁?
  const getRoundedClass = () => {
    if (viewMode !== 'compact') return 'rounded-2xl';
    if (isFirst && isLast) return 'rounded-xl';
    if (isFirst) return 'rounded-t-xl';
    if (isLast) return 'rounded-b-xl';
    return '';
  };

  const handlePrimaryClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (shouldIgnoreTodoPrimaryInteraction(event.target)) {
      return;
    }

    if (shouldSuppressClickRef.current) {
      shouldSuppressClickRef.current = false;
      return;
    }

    onOpenQuickActions(todo);
  };

  const isDuplicateSwipeState = translateX > duplicateSwipeDistance;
  const rightSwipeActionLabel = isDuplicateSwipeState
    ? 'DUPLICATE'
    : 'DETAIL';
  const rightSwipeActionIcon = isDuplicateSwipeState
    ? <Plus size={20} />
    : <PanelRightOpen size={20} />;
  const rightSwipeBackgroundClass = isDuplicateSwipeState
    ? 'bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_100%)]'
    : 'bg-[linear-gradient(135deg,#6b7f93_0%,#516274_100%)]';
  const hierarchyBadges = (parentTitle || childSummary) ? (
    <>
      {childSummary && childSummary.total > 0 && (
        onToggleChildren ? (
          <button
            type="button"
            data-todo-primary-ignore="true"
            onClick={(event) => {
              event.stopPropagation();
              onToggleChildren();
            }}
            className={`${hierarchyBadgeClass} transition-colors hover:border-stone-300 hover:text-stone-700`}
          >
            <ChevronRight size={10} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            <span>{childSummary.completed}/{childSummary.total}</span>
          </button>
        ) : (
          <span className={hierarchyBadgeClass}>
            <span>{childSummary.completed}/{childSummary.total}</span>
          </span>
        )
      )}
      {parentTitle && (
        <span className={hierarchyBadgeClass}>
          <span>@{truncateHierarchyLabel(parentTitle)}</span>
        </span>
      )}
    </>
  ) : null;
  const hasMetaBadges = Boolean(
    hierarchyBadges ||
    visibleScheduleMatchLabels.length > 0 ||
    hiddenScheduleMatchCount > 0 ||
    visibleLinkedDetails ||
    visibleLinkedScopes.length > 0
  );

  return (
    <div className={`relative overflow-hidden select-none touch-pan-y group ${viewMode === 'compact' ? `mb-0 ${getRoundedClass()}` : 'mb-3 rounded-2xl'}`}>
      {/* Background Actions (Right Swipe -> Detail / Duplicate) */}
      <div
        className={`absolute inset-0 flex items-center justify-start pl-6 text-white font-bold tracking-wider z-0 transition-[opacity,background-color,transform] duration-200 ${rightSwipeBackgroundClass} ${viewMode === 'compact' ? getRoundedClass() : 'rounded-2xl'}`}
        style={{ opacity: translateX > 0 ? 1 : 0 }}
      >
        <span className={`flex items-center gap-2 transition-transform duration-200 ${isDuplicateSwipeState ? 'scale-105' : 'scale-100'}`}>
          {rightSwipeActionIcon} {rightSwipeActionLabel}
        </span>
      </div>

      {/* Background Actions (Left Swipe -> Complete/Uncomplete) */}
      <div
        className={`absolute inset-0 flex items-center justify-end pr-6 text-white font-bold tracking-wider z-0 transition-opacity duration-200 ${todo.isCompleted ? 'bg-stone-400' : 'bg-green-500'} ${viewMode === 'compact' ? getRoundedClass() : 'rounded-2xl'}`}
        style={{ opacity: quickToggleDirection === 'left' && translateX < 0 ? 1 : 0 }}
      >
        <span className="flex items-center gap-2">
          {todo.isCompleted ? 'UNDO' : 'COMPLETE'} <CheckCircle2 size={20} />
        </span>
      </div>

      {/* Foreground Content */}
      <div
        className={`
          relative z-10 transition-transform duration-200
          ${viewMode === 'compact'
            ? `flex gap-3 p-3 border-b border-stone-100 min-h-[3.5rem] items-center ${getRoundedClass()}`
            : `grid ${showLooseRightActions ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-1'} gap-x-3 gap-y-3 p-4 rounded-2xl border min-h-[5rem] mb-0 items-start`
          }
          ${todo.isCompleted
            ? (viewMode === 'compact' ? 'bg-stone-50/50' : 'bg-stone-50/80 backdrop-blur-md border-stone-100') // Compact completed style
            : (viewMode === 'compact' ? 'bg-white' : 'bg-white/80 backdrop-blur-md border-stone-100 shadow-sm')
          }
        `}
        style={{ transform: `translateX(${translateX}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={handlePrimaryClick}
      >
        {/* Content (Click to Open Quick Actions) */}
        <div className={`flex-1 cursor-pointer ${todo.isCompleted ? 'opacity-60' : ''} ${viewMode === 'compact' ? 'flex items-center gap-2 min-w-0' : 'py-0.5'}`}>
          <div className={`flex gap-2 flex-1 min-w-0 ${viewMode === 'compact' ? 'items-center' : 'items-start'}`}>
            <div className={`min-w-0 flex-1 font-bold ${viewMode === 'compact' ? 'text-sm leading-tight' : 'text-base leading-snug line-clamp-2'} transition-all duration-500`}>
              {viewMode === 'compact' ? (
                <span className="flex min-w-0 items-baseline">
                  <span className={`min-w-0 flex-1 truncate ${todo.isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                    {todo.title}
                  </span>
                  {compactScheduleSummary && (
                    <span className="shrink-0 text-[11px] font-medium leading-none text-stone-400">
                      {compactScheduleSummary}
                    </span>
                  )}
                </span>
              ) : (
                <span className={todo.isCompleted ? 'text-stone-400 line-through' : 'text-stone-800'}>
                  {todo.title}
                </span>
              )}
            </div>

            {/* Progress Circle - Only in Compact Mode for Progress Tasks */}
            {todo.isProgress && viewMode === 'compact' && compactDisplaySettings.showProgressIndicator && (
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
                    style={{ opacity: completedProgressOpacity }}
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Note - Hide in Compact Mode */}
          {viewMode === 'loose' && todo.note && (
            <div className={`text-xs text-stone-400 mt-1 line-clamp-1 ${isPrivacyMode ? 'blur-sm select-none transition-all duration-500' : 'transition-all duration-500'}`}>{todo.note}</div>
          )}

          {viewMode === 'compact' && hierarchyBadges && (
            <div className={`mt-1.5 flex flex-wrap items-center gap-2 ${viewMode === 'compact' ? 'text-[10px]' : 'text-[11px]'}`}>
              {hierarchyBadges}
            </div>
          )}

          {/* Linked Tags/Scopes */}
          {hasMetaBadges && (
          <div className={`flex items-center gap-x-1.5 gap-y-1 flex-wrap flex-shrink-0 ${viewMode === 'compact' ? 'mt-0' : 'mt-1.5'}`}>
            {viewMode === 'loose' && hierarchyBadges}
            {visibleScheduleMatchLabels.map((label) => (
              scheduleLabelStyle === 'schedule' ? (
                <span
                  key={label}
                  className={viewMode === 'compact' ? `${baseCompactBadgeClass} text-[11px] text-stone-500 font-medium` : baseLooseBadgeClass}
                >
                  <span className="text-stone-300 font-sans">{'⁎'}</span>
                  <span>{getVisibleScheduleLabel(label, scheduleLabelStyle, viewMode)}</span>
                </span>
              ) : label === PIN_SCHEDULE_MATCH_LABEL ? (
                <span
                  key={label}
                  className={viewMode === 'compact' ? `${baseCompactBadgeClass} text-[11px] text-stone-500 font-medium` : baseLooseBadgeClass}
                >
                  <Pin size={10} className="rotate-[28deg] text-stone-400" />
                  {viewMode === 'loose' && <span>Pin</span>}
                </span>
              ) : (
                <span
                  key={label}
                  className={viewMode === 'compact' ? `${baseCompactBadgeClass} text-[11px] text-stone-500 font-medium` : baseLooseBadgeClass}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-300"></span>
                  <span>{label}</span>
                </span>
              )
            ))}
            {hiddenScheduleMatchCount > 0 && (
              <span
                className={`text-[10px] uppercase tracking-[0.16em] text-stone-400 ${viewMode === 'compact' ? 'px-1.5 py-0.5 rounded-full border border-stone-200/80 bg-white/80' : 'px-2 py-1 rounded-full border border-stone-200 bg-white/80'}`}
              >
                +{hiddenScheduleMatchCount}
              </span>
            )}
            {visibleLinkedDetails && (
              <span className={viewMode === 'compact' ? `${baseCompactBadgeClass} text-[11px] text-stone-500 font-medium` : baseLooseBadgeClass}>
                <span className="text-stone-300 font-sans">#</span>
                {viewMode === 'loose' ? (
                  <>
                    <IconRenderer icon={visibleLinkedDetails.categoryIcon} uiIcon={visibleLinkedDetails.categoryUiIcon} className="text-xs" />
                    <span className="opacity-90">{visibleLinkedDetails.categoryName}</span>
                    <span className="text-stone-300 px-0.5">/</span>
                    <IconRenderer icon={visibleLinkedDetails.activityIcon} uiIcon={visibleLinkedDetails.activityUiIcon} className="text-xs" />
                    <span className="opacity-90">{visibleLinkedDetails.activityName}</span>
                  </>
                ) : (
                  <IconRenderer icon={visibleLinkedDetails.activityIcon} uiIcon={visibleLinkedDetails.activityUiIcon} className="text-xs" />
                )}
              </span>
            )}
            {visibleLinkedScopes.map((scope, idx) => (
              <span key={idx} className={viewMode === 'compact' ? `${baseCompactBadgeClass} text-[11px] text-stone-500 font-medium` : baseLooseBadgeClass}>
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
          )}

        </div>

        {/* Right Actions Column */}
        {(viewMode === 'compact' || showLooseRightActions) && (
          <div className={`flex items-end ${viewMode === 'compact' ? 'items-center pl-2' : 'min-w-fit flex-col justify-between self-stretch pl-2'}`}>
            {viewMode === 'loose' && (
              hasLooseDateMarkers ? (
                <div className="flex flex-col items-end gap-0.5 pt-0.5 text-[11px] font-medium text-stone-400">
                  {scheduledDateLabel && (
                    <span className="inline-flex items-center gap-1 leading-none">
                      <CalendarDays size={11} className="text-stone-350" />
                      <span>{scheduledDateLabel}</span>
                    </span>
                  )}
                  {deadlineDateLabel && (
                    <span className="inline-flex items-center gap-1 leading-none">
                      <Flag size={11} className="text-stone-350" />
                      <span>{deadlineDateLabel}</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex-1"></div>
              )
            )}

            {/* Bottom Right: Start Focus */}
            {canStartFocus && (
              <button
                data-todo-primary-ignore="true"
                onClick={(e) => { e.stopPropagation(); onStartFocus(todo); }}
                className={`text-stone-300 hover:text-orange-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 ${viewMode === 'compact' ? '' : 'pt-2'}`}
              >
                <PlayCircle size={viewMode === 'compact' ? 20 : 26} />
              </button>
            )}
          </div>
        )}

        {/* Progress Bar - Only in Loose Mode */}
        {todo.isProgress && viewMode === 'loose' && (
          <div className={showLooseRightActions ? 'col-span-2 min-w-0' : 'min-w-0'}>
            <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium mb-1.5 uppercase tracking-wider">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressBarWidth}%`, opacity: completedProgressOpacity }}
              />
            </div>
            <div className="mt-1 text-[10px] text-stone-400 text-right font-mono">
              {todo.completedUnits} / {todo.totalAmount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const shouldIgnoreTodoPrimaryInteraction = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest('[data-todo-primary-ignore="true"], button, a, input, textarea, select, [role="button"]')
  );
};

const WEEKDAY_ROW_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const VIRTUAL_SCHEDULE_CATEGORY_ID = '__virtual_schedule__';
const VIRTUAL_SCHEDULE_CATEGORY_NAME = '排期';
const VIRTUAL_SCHEDULE_MATCH_LIMIT = 4;

const truncateHierarchyLabel = (value: string, maxLength = 4): string => {
  const characters = Array.from(value);
  if (characters.length <= maxLength) {
    return value;
  }

  return `${characters.slice(0, maxLength).join('')}…`;
};

const VIRTUAL_SCHEDULE_FILTERS: Array<{ id: TodoScheduleRange; label: string }> = [
  { id: 'today', label: '今' },
  { id: 'tomorrow', label: '明' },
  { id: 'thisWeek', label: '周' }
];

const PIN_SCHEDULE_MATCH_LABEL = 'Pin';

const TODO_SCHEDULE_MATCH_LABELS: Record<TodoScheduleMatch['kind'], string> = {
  deadline: 'Due',
  scheduled: 'Arrange',
  recurring: 'Repeat'
};

const COMPACT_SCHEDULE_LABELS: Record<string, string> = {
  Arrange: 'Arr',
  Repeat: 'Rep',
  Pin: 'Pin',
  Due: 'Due'
};

const TODO_SCHEDULE_MATCH_PRIORITY: Record<TodoScheduleMatch['kind'], number> = {
  deadline: 0,
  scheduled: 1,
  recurring: 2
};

interface TodoListEntry {
  todo: TodoItem;
  scheduleMatchLabels: string[];
  scheduleMatches: TodoScheduleMatch[];
  hierarchyDepth?: 0 | 1;
  parentTitle?: string;
  childSummary?: { completed: number; total: number } | null;
}

interface TodoListSection {
  dateKey: string;
  label: string;
  entries: TodoListEntry[];
}

type TodoScheduleViewMode = 'week' | 'month' | 'bento';

interface TodoTreeEntryGroup {
  parentEntry: TodoListEntry;
  childEntries: TodoListEntry[];
  childCount: number;
  completedChildCount: number;
}

const TODO_COMPACT_DISPLAY_SETTINGS_STORAGE_KEY = 'todoCompactDisplaySettings';
const TODO_SCHEDULE_VIEW_MODE_STORAGE_KEY = 'todoScheduleViewMode';
const DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS: TodoCompactDisplaySettings = {
  showLinkedTag: true,
  showLinkedScope: true,
  showScheduleType: true,
  showProgressIndicator: true,
  showScheduleTime: true
};

const normalizeTodoCompactDisplaySettings = (value: unknown): TodoCompactDisplaySettings => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS };
  }

  const candidate = value as Partial<Record<keyof TodoCompactDisplaySettings, unknown>>;

  return {
    showLinkedTag: typeof candidate.showLinkedTag === 'boolean' ? candidate.showLinkedTag : DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS.showLinkedTag,
    showLinkedScope: typeof candidate.showLinkedScope === 'boolean' ? candidate.showLinkedScope : DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS.showLinkedScope,
    showScheduleType: typeof candidate.showScheduleType === 'boolean' ? candidate.showScheduleType : DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS.showScheduleType,
    showProgressIndicator: typeof candidate.showProgressIndicator === 'boolean' ? candidate.showProgressIndicator : DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS.showProgressIndicator,
    showScheduleTime: typeof candidate.showScheduleTime === 'boolean' ? candidate.showScheduleTime : DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS.showScheduleTime
  };
};

const filterVisibleTodos = (todos: TodoItem[], showCompletedTodos: boolean): TodoItem[] =>
  todos.filter((todo) => (showCompletedTodos || !todo.isCompleted) && !isIncompleteSubtaskHiddenByCompletedParent(todos, todo));

const filterQuickTodos = (todos: TodoItem[]): TodoItem[] => todos.filter((todo) => isQuickTodo(todo));
const filterProjectTodos = (todos: TodoItem[]): TodoItem[] => todos.filter((todo) => !isQuickTodo(todo));

const buildScheduleMatchLabels = (matches: TodoScheduleMatch[]): string[] => {
  const labels: string[] = [];
  const seenKinds = new Set<TodoScheduleMatch['kind']>();

  matches.forEach((match) => {
    if (seenKinds.has(match.kind)) {
      return;
    }

    seenKinds.add(match.kind);
    labels.push(TODO_SCHEDULE_MATCH_LABELS[match.kind]);
  });

  return labels;
};

const buildTodoListEntry = (
  todo: TodoItem,
  scheduleMatches: TodoScheduleMatch[],
  options?: { includePinLabel?: boolean }
): TodoListEntry => ({
  todo,
  scheduleMatches,
  scheduleMatchLabels: [
    ...(options?.includePinLabel && todo.pin ? [PIN_SCHEDULE_MATCH_LABEL] : []),
    ...buildScheduleMatchLabels(scheduleMatches)
  ]
});

const getVisibleScheduleLabel = (
  label: string,
  scheduleLabelStyle: 'default' | 'schedule',
  viewMode: 'loose' | 'compact'
): string => (
  scheduleLabelStyle === 'schedule' && viewMode === 'compact'
    ? (COMPACT_SCHEDULE_LABELS[label] || label.slice(0, 3))
    : label
);

const decorateTodoListEntryWithHierarchy = (entry: TodoListEntry, todos: TodoItem[]): TodoListEntry => {
  const parentTodo = getParentTodo(todos, entry.todo);
  const childCount = getDirectChildCount(todos, entry.todo.id);

  return {
    ...entry,
    hierarchyDepth: parentTodo ? 1 : 0,
    parentTitle: parentTodo?.title,
    childSummary: childCount > 0
      ? {
          completed: getCompletedDirectChildCount(todos, entry.todo.id),
          total: childCount
        }
      : null
  };
};

const sortTodoListEntries = (
  left: TodoListEntry,
  right: TodoListEntry,
  options?: { pinFirst?: boolean }
): number => {
  if (options?.pinFirst && Boolean(left.todo.pin) !== Boolean(right.todo.pin)) {
    return Number(Boolean(right.todo.pin)) - Number(Boolean(left.todo.pin));
  }

  if (left.todo.isCompleted !== right.todo.isCompleted) {
    return Number(left.todo.isCompleted) - Number(right.todo.isCompleted);
  }

  const leftFirstMatch = left.scheduleMatches[0];
  const rightFirstMatch = right.scheduleMatches[0];

  if (leftFirstMatch && rightFirstMatch) {
    const dateDiff = leftFirstMatch.dateKey.localeCompare(rightFirstMatch.dateKey);
    if (dateDiff !== 0) return dateDiff;

    const priorityDiff = TODO_SCHEDULE_MATCH_PRIORITY[leftFirstMatch.kind] - TODO_SCHEDULE_MATCH_PRIORITY[rightFirstMatch.kind];
    if (priorityDiff !== 0) return priorityDiff;
  }

  return left.todo.title.localeCompare(right.todo.title, 'zh-CN');
};

const buildFallbackChildTodoEntry = (todo: TodoItem): TodoListEntry => ({
  todo,
  scheduleMatches: [],
  scheduleMatchLabels: todo.pin ? [PIN_SCHEDULE_MATCH_LABEL] : []
});

const isHierarchyTodo = (todo: TodoItem, todos: TodoItem[]): boolean => (
  Boolean(todo.parentTodoId) || getDirectChildCount(todos, todo.id) > 0
);

const buildOverdueScheduleMatches = (todo: TodoItem, todayDateKey: string): TodoScheduleMatch[] => {
  const matches: TodoScheduleMatch[] = [];

  if (todo.deadlineDate && todo.deadlineDate < todayDateKey) {
    matches.push({ dateKey: todo.deadlineDate, kind: 'deadline' });
  }

  if (todo.scheduledDate && todo.scheduledDate < todayDateKey) {
    matches.push({ dateKey: todo.scheduledDate, kind: 'scheduled' });
  }

  return matches.sort((left, right) => {
    if (left.dateKey !== right.dateKey) {
      return left.dateKey.localeCompare(right.dateKey);
    }

    return TODO_SCHEDULE_MATCH_PRIORITY[left.kind] - TODO_SCHEDULE_MATCH_PRIORITY[right.kind];
  });
};

const formatScheduleSectionLabel = (dateKey: string, todayDateKey: string, tomorrowDateKey: string): string => {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;

  const weekdayLabel = WEEKDAY_ROW_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1];

  if (dateKey === todayDateKey) {
    return `今天 · ${date.getMonth() + 1}.${date.getDate()}`;
  }

  if (dateKey === tomorrowDateKey) {
    return `明天 · ${date.getMonth() + 1}.${date.getDate()}`;
  }

  return `${weekdayLabel} · ${date.getMonth() + 1}.${date.getDate()}`;
};

type WeekBadgeKey = 'deadline' | 'scheduled' | 'recurring' | 'completed' | 'inProgress';
type WeekQuickActionBadgeKey = 'deadline' | 'scheduled' | 'completed' | 'inProgress';

interface WeekBadgeDescriptor {
  key: WeekBadgeKey;
  label: string;
  color: string;
  overdue?: boolean;
}

const getWeekBadgeDisplayLabel = (badge: WeekBadgeDescriptor, badgeCount: number): string => {
  if (badgeCount <= 1) {
    return badge.label;
  }

  if (badge.key === 'deadline' || badge.key === 'completed') {
    return badge.label;
  }

  return badge.label.slice(0, 3);
};

const WeekTodoLineItem: React.FC<{
  entry: WeekTodoEntry;
  isDragging: boolean;
  onDragStart: (entry: WeekTodoEntry, event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onTouchDragStart: (entry: WeekTodoEntry, event: React.TouchEvent<HTMLDivElement>) => void;
  onBadgeClick: (entry: WeekTodoEntry, badgeKey: WeekQuickActionBadgeKey) => void;
}> = ({ entry, isDragging, onDragStart, onDragEnd, onTouchDragStart, onBadgeClick }) => {
  const { todo, badges, parentTitle } = entry;
  const isHistoricalOnly = !badges.scheduled && !badges.deadline && !badges.recurring && (badges.completed || badges.inProgress);
  const iconClassName = isHistoricalOnly ? 'text-stone-300' : 'text-stone-400';
  const titleClassName = isHistoricalOnly ? 'text-stone-400' : 'text-stone-700';
  const parentTitleClassName = isHistoricalOnly ? 'text-stone-300' : 'text-stone-400';
  const fullTitle = formatWeekTodoLineTitle(entry);
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
  const hasMultipleBadges = orderedBadges.length > 1;
  const dragBadgeKey: 'scheduled' | 'deadline' | null = badges.deadline ? 'deadline' : badges.scheduled ? 'scheduled' : null;

  return (
    <div
      data-week-row-item="true"
      className={`flex w-full items-center gap-2 py-1 text-left ${isDragging ? 'opacity-40' : ''}`}
    >
      <span className="shrink-0 self-center flex h-4 w-4 items-center justify-center">
        {leadingIcon}
      </span>
      <div
        data-week-drag-handle="true"
        data-week-swipe-ignore={dragBadgeKey ? 'true' : undefined}
        draggable={dragBadgeKey !== null}
        onDragStart={(event) => dragBadgeKey && onDragStart(entry, event)}
        onDragEnd={onDragEnd}
        onTouchStart={(event) => dragBadgeKey && onTouchDragStart(entry, event)}
        className={`min-w-0 flex-1 ${dragBadgeKey ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className={`truncate text-[14px] font-medium leading-5 ${titleClassName}`} title={fullTitle}>
          <span>{todo.title}</span>
          {parentTitle && (
            <span className={parentTitleClassName}>{` @${parentTitle}`}</span>
          )}
        </div>
      </div>
      <div className={`shrink-0 flex items-center justify-end gap-1 whitespace-nowrap text-[9px] uppercase leading-none ${hasMultipleBadges ? 'tracking-[0.08em]' : 'tracking-[0.16em]'}`}>
        {orderedBadges.map((badge) => (
          badge.key === 'scheduled' || badge.key === 'deadline' || badge.key === 'completed' || badge.key === 'inProgress' ? (
            <span
              key={badge.key}
              data-week-badge-trigger="true"
              data-week-swipe-ignore="true"
              onClick={() => onBadgeClick(entry, badge.key)}
              className="inline-flex cursor-pointer items-center justify-end gap-1 whitespace-nowrap rounded-full px-1 py-0.5 text-right transition-colors hover:bg-stone-100/70"
              style={{ color: badge.color }}
            >
              {badge.overdue && <CircleAlert size={10} className="-translate-y-px shrink-0 text-red-500" />}
              <span>{getWeekBadgeDisplayLabel(badge, hasMultipleBadges ? orderedBadges.length : 1)}</span>
            </span>
          ) : (
            <span key={badge.key} className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-right" style={{ color: badge.color }}>
              {badge.overdue && <CircleAlert size={10} className="-translate-y-px shrink-0 text-red-500" />}
              <span>{getWeekBadgeDisplayLabel(badge, hasMultipleBadges ? orderedBadges.length : 1)}</span>
            </span>
          )
        ))}
      </div>
    </div>
  );
};

export const TodoView: React.FC<TodoViewProps> = ({ todos, logs, categories, activityCategories, scopes, onToggleTodo, onEditTodo, onAddTodo, onStartFocus, onDuplicateTodo, onSaveTodo, onDeleteTodo, autoLinkRules = [] }) => {
  const normalizedTodoCategories = useMemo(() => ensureQuickTodoCategory(categories), [categories]);
  const projectTodoCategories = useMemo(() => getRealTodoCategories(normalizedTodoCategories), [normalizedTodoCategories]);
  const standardTodoCategories = useMemo(() => getStandardTodoCategories(normalizedTodoCategories), [normalizedTodoCategories]);
  const futureTodoCategory = useMemo(
    () => projectTodoCategories.find((category) => category.id === FUTURE_TODO_CATEGORY_ID) || null,
    [projectTodoCategories]
  );
  const defaultProjectCategoryId = projectTodoCategories[0]?.id || '';
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(VIRTUAL_SCHEDULE_CATEGORY_ID);
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState<TodoScheduleRange>('today');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [expandedParentIds, setExpandedParentIds] = useState<Record<string, boolean>>({});
  const { backgroundUrl, hasBackground, panelOverlayOpacity, useReducedEffects } = useBackgroundDisplay();
  const pageOverlayOpacity = hasBackground
    ? Math.min(0.64, Math.max(0.46, panelOverlayOpacity + 0.06))
    : 0.5;
  const pageSurfaceColor = `rgba(250, 249, 246, ${pageOverlayOpacity})`;
  const panelLayerOpacity = hasBackground
    ? Math.max(0.18, panelOverlayOpacity - 0.08)
    : panelOverlayOpacity;
  const panelSurfaceColor = `rgba(250, 249, 246, ${panelLayerOpacity})`;
  const { addToast } = useToast();
  const [screenMode, setScreenMode] = useState<'list' | 'week'>(() => {
    const saved = localStorage.getItem('todoScreenMode');
    return saved === 'week' ? 'week' : 'list';
  });
  const [scheduleWeekStart, setScheduleWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
  const [draggingWeekTodoId, setDraggingWeekTodoId] = useState<string | null>(null);
  const [draggingWeekEntry, setDraggingWeekEntry] = useState<WeekTodoEntry | null>(null);
  const [dragTargetDate, setDragTargetDate] = useState<string | null>(null);
  const [touchDragPreview, setTouchDragPreview] = useState<{ x: number; y: number; title: string } | null>(null);
  const [isTouchWeekDragging, setIsTouchWeekDragging] = useState(false);
  const [assignModalDate, setAssignModalDate] = useState<string | null>(null);
  const [assignModalType, setAssignModalType] = useState<'scheduled' | 'deadline'>('scheduled');
  const [isWeekJumpPickerOpen, setIsWeekJumpPickerOpen] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState<TodoScheduleViewMode>(() => {
    const saved = localStorage.getItem(TODO_SCHEDULE_VIEW_MODE_STORAGE_KEY);
    return saved === 'month' || saved === 'bento' ? saved : 'week';
  });
  const [monthViewEntryJumpSignal, setMonthViewEntryJumpSignal] = useState(0);
  const [isScheduleViewMenuOpen, setIsScheduleViewMenuOpen] = useState(false);
  const [duplicatingTodo, setDuplicatingTodo] = useState<TodoItem | null>(null);
  const [isQuickAddInputVisible, setIsQuickAddInputVisible] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const weekScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scheduleViewMenuRef = useRef<HTMLDivElement | null>(null);
  const quickAddInputRef = useRef<HTMLInputElement | null>(null);
  const touchDragActivatedRef = useRef(false);
  const touchDraggingWeekEntryRef = useRef<WeekTodoEntry | null>(null);
  const touchDragTargetDateRef = useRef<string | null>(null);
  const touchDragPointRef = useRef<{ x: number; y: number; title: string } | null>(null);
  const touchDragFrameRef = useRef<number | null>(null);
  const touchAutoScrollFrameRef = useRef<number | null>(null);
  const touchAutoScrollSpeedRef = useRef(0);
  const weekSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const weekSwipeAxisRef = useRef<'x' | 'y' | null>(null);
  const weekSwipeEligibleRef = useRef(false);
  const previousScheduleScreenStateRef = useRef<{
    screenMode: 'list' | 'week';
    scheduleViewMode: TodoScheduleViewMode;
  } | null>(null);
  const {
    quickActionTodo,
    quickActionOpenedAt,
    openQuickActions,
    closeQuickActions,
    handleQuickActionMove,
    handleQuickActionOpenDetail,
    handleQuickActionComplete,
    handleQuickActionUndoComplete,
    handleQuickActionClearDate,
    handleQuickActionTogglePin,
    handleQuickActionUpgradeToProject,
    handleQuickActionDelete
  } = useTodoQuickActions({ onSaveTodo, onEditTodo, onDeleteTodo, projectCategoryId: defaultProjectCategoryId });

  // 濞?localStorage 閻犲洩顕цぐ鍥偨閵婏箑鐓曞☉鎾筹攻椤愬ジ鏌呮径瀣仴闁汇劌瀚～瀣炊閻愵儫浣割嚕?
  const [viewMode, setViewMode] = useState<'loose' | 'compact'>(() => {
    const saved = localStorage.getItem('todoViewMode');
    return (saved === 'compact' || saved === 'loose') ? saved : 'loose';
  });
  const [showCompletedTodos, setShowCompletedTodos] = useState<boolean>(() => {
    const saved = localStorage.getItem('todoShowCompleted');
    return saved !== 'false';
  });
  const [compactDisplaySettings, setCompactDisplaySettings] = useState<TodoCompactDisplaySettings>(() => {
    const saved = localStorage.getItem(TODO_COMPACT_DISPLAY_SETTINGS_STORAGE_KEY);

    if (!saved) {
      return { ...DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS };
    }

    try {
      return normalizeTodoCompactDisplaySettings(JSON.parse(saved));
    } catch (error) {
      console.error('[TodoView] Failed to parse compact display settings', error);
      return { ...DEFAULT_TODO_COMPACT_DISPLAY_SETTINGS };
    }
  });
  const { openAIChat, unreadCount } = useAIChatWindow();

  React.useEffect(() => {
    if (selectedCategoryId !== QUICK_TODO_CATEGORY_ID) {
      setIsQuickAddInputVisible(false);
      setQuickAddTitle('');
      return;
    }

    if (isQuickAddInputVisible) {
      quickAddInputRef.current?.focus();
    }
  }, [isQuickAddInputVisible, selectedCategoryId]);

  // 鐟?viewMode 闁衡偓閻熸澘缍侀柡鍐啇缁辨繃绌卞┑鍡欐憼闁?localStorage
  React.useEffect(() => {
    localStorage.setItem('todoViewMode', viewMode);
  }, [viewMode]);

  React.useEffect(() => {
    localStorage.setItem('todoShowCompleted', showCompletedTodos ? 'true' : 'false');
  }, [showCompletedTodos]);

  React.useEffect(() => {
    localStorage.setItem(TODO_COMPACT_DISPLAY_SETTINGS_STORAGE_KEY, JSON.stringify(compactDisplaySettings));
  }, [compactDisplaySettings]);

  React.useEffect(() => {
    localStorage.setItem(TODO_SCHEDULE_VIEW_MODE_STORAGE_KEY, scheduleViewMode);
  }, [scheduleViewMode]);

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

  // 闁告帗绻傞～鎰板礌閺嶎厸鍋撴径澶庡幀闁汇劌瀚崹搴ｇ尵娴兼瑧绐楀┑鈥冲€归悘澶娾柦閳╁啯绠掗梺顐㈩槷閼垫垶绂掔拋宕囩Э闁告帒妫涚悮顐︽晬瀹€鍕笡閻犱降鍊濋埀顒€顦懙鎴犵箔椤戣法顏卞☉?
  React.useEffect(() => {
    if (screenMode === 'week') {
      return;
    }

    if (isWeekJumpPickerOpen) {
      setIsWeekJumpPickerOpen(false);
    }
  }, [isWeekJumpPickerOpen, screenMode]);

  React.useEffect(() => {
    const previousState = previousScheduleScreenStateRef.current;
    const isEnteringMonthView = screenMode === 'week'
      && scheduleViewMode === 'month'
      && (
        previousState === null
        || previousState.screenMode !== 'week'
        || previousState.scheduleViewMode !== 'month'
      );

    if (isEnteringMonthView) {
      setScheduleWeekStart(getStartOfWeek(new Date()));
      setMonthViewEntryJumpSignal((previous) => previous + 1);
    }

    previousScheduleScreenStateRef.current = {
      screenMode,
      scheduleViewMode
    };
  }, [scheduleViewMode, screenMode]);

  React.useEffect(() => {
    if (!isScheduleViewMenuOpen) {
      return;
    }

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (scheduleViewMenuRef.current?.contains(event.target)) {
        return;
      }

      setIsScheduleViewMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isScheduleViewMenuOpen]);

  React.useEffect(() => {
    if (selectedCategoryId === VIRTUAL_SCHEDULE_CATEGORY_ID || selectedCategoryId === QUICK_TODO_CATEGORY_ID) {
      return;
    }

    if (!projectTodoCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(VIRTUAL_SCHEDULE_CATEGORY_ID);
    }
  }, [projectTodoCategories, selectedCategoryId]);

  const isVirtualScheduleCategory = selectedCategoryId === VIRTUAL_SCHEDULE_CATEGORY_ID;
  const isVirtualQuickCategory = selectedCategoryId === QUICK_TODO_CATEGORY_ID;
  const isVirtualCategory = isVirtualScheduleCategory || isVirtualQuickCategory;
  const isWeekScheduleView = scheduleViewMode === 'week';
  const selectedCategory = projectTodoCategories.find((category) => category.id === selectedCategoryId) || null;
  const primaryCategoryId = defaultProjectCategoryId;
  const todayDateKey = getTodayDateKey();
  const todayDate = parseDateKey(todayDateKey) || new Date();
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(todayDate.getDate() + 1);
  const tomorrowDateKey = formatDateKey(tomorrowDate);

  // 濠碘€冲€归悘澶娾柦閳╁啯绠掗柛鎺戞鐞氼偊鏁嶇仦鐐枖缂佲偓閾忓厜鏁勯柣妯垮煐閳ь兛娴囬埀顒€濂旂粭澶愬及椤栨氨鈹涙繝?
  if (projectTodoCategories.length === 0) {
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

  const scheduleEntriesByFilter = useMemo<Record<TodoScheduleRange, TodoListEntry[]>>(() => {
    const referenceDate = parseDateKey(todayDateKey) || new Date();

    const buildEntries = (range: TodoScheduleRange): TodoListEntry[] => (
      filterVisibleTodos(todos, showCompletedTodos)
        .map((todo) => {
          const scheduleMatches = getTodoScheduleMatches(todo, range, referenceDate);

          return decorateTodoListEntryWithHierarchy(
            buildTodoListEntry(todo, scheduleMatches, {
              includePinLabel: range === 'today'
            }),
            todos
          );
        })
        .filter((entry) => entry.scheduleMatches.length > 0)
        .sort((left, right) => sortTodoListEntries(left, right, { pinFirst: range === 'today' }))
    );

    return {
      today: buildEntries('today'),
      tomorrow: buildEntries('tomorrow'),
      thisWeek: buildEntries('thisWeek')
    };
  }, [todos, showCompletedTodos, todayDateKey, tomorrowDateKey]);

  const pinnedTodayEntries = useMemo<TodoListEntry[]>(() => {
    const referenceDate = parseDateKey(todayDateKey) || new Date();

    return filterVisibleTodos(todos, showCompletedTodos)
      .filter((todo) => todo.pin)
      .map((todo) => {
        const todayMatches = getTodoScheduleMatches(todo, 'today', referenceDate);
        const overdueMatches = buildOverdueScheduleMatches(todo, todayDateKey);
        const combinedMatches = todayMatches.length > 0 ? todayMatches : overdueMatches;

        return decorateTodoListEntryWithHierarchy(
          buildTodoListEntry(todo, combinedMatches, {
            includePinLabel: true
          }),
          todos
        );
      })
      .sort((left, right) => sortTodoListEntries(left, right, { pinFirst: true }));
  }, [todos, showCompletedTodos, todayDateKey]);

  const nonPinnedTodayEntries = useMemo<TodoListEntry[]>(
    () => scheduleEntriesByFilter.today.filter((entry) => !entry.todo.pin),
    [scheduleEntriesByFilter]
  );

  const overdueTodayEntries = useMemo<TodoListEntry[]>(() => {
    const visibleTodayEntryIds = new Set([
      ...nonPinnedTodayEntries.map((entry) => entry.todo.id),
      ...pinnedTodayEntries.map((entry) => entry.todo.id)
    ]);

    return filterVisibleTodos(todos, false)
      .filter((todo) => !visibleTodayEntryIds.has(todo.id))
      .map((todo) => {
        const scheduleMatches = buildOverdueScheduleMatches(todo, todayDateKey);

        return decorateTodoListEntryWithHierarchy(
          buildTodoListEntry(todo, scheduleMatches, {
            includePinLabel: true
          }),
          todos
        );
      })
      .filter((entry) => entry.scheduleMatches.length > 0)
      .sort((left, right) => sortTodoListEntries(left, right, { pinFirst: true }));
  }, [todos, nonPinnedTodayEntries, pinnedTodayEntries, todayDateKey]);

  const todayFilterCount = useMemo<number>(() => (
    filterVisibleTodos(todos, showCompletedTodos)
      .filter((todo) => !todo.pin)
      .filter((todo) => todo.scheduledDate === todayDateKey || todo.deadlineDate === todayDateKey)
      .filter((todo) => !isHierarchyTodo(todo, todos))
      .length
  ), [todos, showCompletedTodos, todayDateKey]);

  const virtualScheduleVisibleCounts = useMemo<Record<TodoScheduleRange, number>>(() => ({
    today: todayFilterCount,
    tomorrow: scheduleEntriesByFilter.tomorrow.length,
    thisWeek: scheduleEntriesByFilter.thisWeek.length
  }), [scheduleEntriesByFilter, todayFilterCount]);

  const selectedTodoEntries: TodoListEntry[] = isVirtualScheduleCategory
    ? scheduleEntriesByFilter[selectedScheduleFilter]
    : isVirtualQuickCategory
      ? orderTodoItemsByCompletionGroups(filterVisibleTodos(filterQuickTodos(todos), showCompletedTodos))
          .map((todo) => buildTodoListEntry(todo, [], { includePinLabel: true }))
      : orderTodoItemsByCompletionGroups(
          filterProjectTodos(
            todos
              .filter((todo) => todo.categoryId === selectedCategoryId)
              .filter((todo) => showCompletedTodos || !todo.isCompleted)
          )
        )
        .map((todo) => buildTodoListEntry(todo, [], { includePinLabel: true }));

  const selectedCategoryTreeGroups = useMemo<TodoTreeEntryGroup[]>(() => {
    if (isVirtualCategory) {
      return [];
    }

    const categoryTodos = filterProjectTodos(todos.filter((todo) => todo.categoryId === selectedCategoryId));
    const visibleCategoryTodos = orderTodoItemsByCompletionGroups(
      filterVisibleTodos(categoryTodos, showCompletedTodos)
    );
    const visibleTodoEntryMap = new Map(
      visibleCategoryTodos.map((todo) => [todo.id, buildTodoListEntry(todo, [], { includePinLabel: true })])
    );

    return buildTodoTreeItems(visibleCategoryTodos)
      .map((treeItem) => {
        const parentEntry = visibleTodoEntryMap.get(treeItem.todo.id);
        if (!parentEntry) {
          return null;
        }

        const childEntries = treeItem.children
          .map((childTodo) => visibleTodoEntryMap.get(childTodo.id))
          .filter(Boolean) as TodoListEntry[];

        return {
          parentEntry,
          childEntries,
          childCount: getDirectChildCount(categoryTodos, treeItem.todo.id),
          completedChildCount: getCompletedDirectChildCount(categoryTodos, treeItem.todo.id)
        };
      })
      .filter(Boolean) as TodoTreeEntryGroup[];
  }, [isVirtualCategory, selectedCategoryId, showCompletedTodos, todos]);

  const virtualScheduleEntriesForHierarchy = useMemo<TodoListEntry[]>(
    () => (
      !isVirtualScheduleCategory
        ? []
        : selectedScheduleFilter === 'today'
          ? [
              ...pinnedTodayEntries,
              ...nonPinnedTodayEntries,
              ...overdueTodayEntries
            ]
          : selectedTodoEntries
    ),
    [isVirtualScheduleCategory, selectedScheduleFilter, pinnedTodayEntries, nonPinnedTodayEntries, overdueTodayEntries, selectedTodoEntries]
  );

  const virtualScheduleTreeGroups = useMemo<Map<string, TodoTreeEntryGroup>>(() => {
    if (!isVirtualScheduleCategory) {
      return new Map();
    }

    const selectedEntryMap = new Map(
      virtualScheduleEntriesForHierarchy.map((entry) => [entry.todo.id, entry])
    );
    const groups = new Map<string, TodoTreeEntryGroup>();

    virtualScheduleEntriesForHierarchy.forEach((entry) => {
      const parentTodo = getParentTodo(todos, entry.todo);
      if (parentTodo && selectedEntryMap.has(parentTodo.id)) {
        return;
      }

      const childEntries = getDirectChildTodosForDisplay(todos, entry.todo.id, {
        incompleteFirst: true,
        includeCompleted: showCompletedTodos,
        hideIncompleteWhenParentCompleted: true
      })
        .map((childTodo) => selectedEntryMap.get(childTodo.id) || buildFallbackChildTodoEntry(childTodo));

      groups.set(entry.todo.id, {
        parentEntry: entry,
        childEntries,
        childCount: getDirectChildCount(todos, entry.todo.id),
        completedChildCount: getCompletedDirectChildCount(todos, entry.todo.id)
      });
    });

    return groups;
  }, [isVirtualScheduleCategory, virtualScheduleEntriesForHierarchy, todos, showCompletedTodos]);

  const virtualScheduleTopLevelEntryIds = useMemo(
    () => new Set(virtualScheduleTreeGroups.keys()),
    [virtualScheduleTreeGroups]
  );

  const selectedTodoEntriesForRender = useMemo<TodoListEntry[]>(
    () => (
      isVirtualScheduleCategory
        ? selectedTodoEntries.filter((entry) => virtualScheduleTopLevelEntryIds.has(entry.todo.id))
        : selectedTodoEntries
    ),
    [isVirtualScheduleCategory, selectedTodoEntries, virtualScheduleTopLevelEntryIds]
  );

  const selectedCategoryName = isVirtualScheduleCategory
    ? VIRTUAL_SCHEDULE_CATEGORY_NAME
    : isVirtualQuickCategory
      ? QUICK_TODO_CATEGORY_NAME
    : (selectedCategory?.name || projectTodoCategories[0].name);
  const selectedScheduleFilterMeta = VIRTUAL_SCHEDULE_FILTERS.find((filter) => filter.id === selectedScheduleFilter) || VIRTUAL_SCHEDULE_FILTERS[0];
  const selectedTodoSections = useMemo<TodoListSection[]>(() => {
    if (!isVirtualScheduleCategory) {
      return [];
    }

    if (selectedScheduleFilter === 'today') {
      const sections: TodoListSection[] = [];

      if (pinnedTodayEntries.length > 0) {
        sections.push({
          dateKey: '__pin__',
          label: 'Pin',
          entries: pinnedTodayEntries
        });
      }

      if (nonPinnedTodayEntries.length > 0) {
        sections.push({
          dateKey: todayDateKey,
          label: formatScheduleSectionLabel(todayDateKey, todayDateKey, tomorrowDateKey),
          entries: nonPinnedTodayEntries
        });
      }

      if (overdueTodayEntries.length > 0) {
        sections.push({
          dateKey: '__overdue__',
          label: '过期未完成',
          entries: overdueTodayEntries
        });
      }

      return sections;
    }

    if (selectedScheduleFilter !== 'thisWeek') {
      return [];
    }

    const sectionMap = new Map<string, TodoListSection>();

    selectedTodoEntries.forEach((entry) => {
      const firstMatch = entry.scheduleMatches[0];
      if (!firstMatch) {
        return;
      }

      const existingSection = sectionMap.get(firstMatch.dateKey);
      if (existingSection) {
        existingSection.entries.push(entry);
        return;
      }

      sectionMap.set(firstMatch.dateKey, {
        dateKey: firstMatch.dateKey,
        label: formatScheduleSectionLabel(firstMatch.dateKey, todayDateKey, tomorrowDateKey),
        entries: [entry]
      });
    });

    return Array.from(sectionMap.values()).sort((left, right) => left.dateKey.localeCompare(right.dateKey));
  }, [isVirtualScheduleCategory, selectedScheduleFilter, selectedTodoEntries, pinnedTodayEntries, nonPinnedTodayEntries, overdueTodayEntries, todayDateKey, tomorrowDateKey]);
  const selectedTodoSectionsForRender = useMemo<TodoListSection[]>(
    () => (
      isVirtualScheduleCategory
        ? selectedTodoSections
            .map((section) => ({
              ...section,
              entries: section.entries.filter((entry) => virtualScheduleTopLevelEntryIds.has(entry.todo.id))
            }))
            .filter((section) => section.entries.length > 0)
        : selectedTodoSections
    ),
    [isVirtualScheduleCategory, selectedTodoSections, virtualScheduleTopLevelEntryIds]
  );

  const hasSectionedTodoEntries = selectedTodoSectionsForRender.some((section) => section.entries.length > 0);
  const hasVisibleTodoEntries = hasSectionedTodoEntries || (
    isVirtualCategory
      ? selectedTodoEntriesForRender.length > 0
      : selectedCategoryTreeGroups.length > 0
  );

  const handleAddTodoClick = () => {
    const targetCategoryId = isVirtualScheduleCategory ? primaryCategoryId : selectedCategoryId;
    if (!targetCategoryId) {
      return;
    }

    if (isVirtualQuickCategory) {
      setIsQuickAddInputVisible(true);
      return;
    }

    if (isVirtualScheduleCategory) {
      if (selectedScheduleFilter === 'today') {
        onAddTodo(targetCategoryId, { scheduledDate: todayDateKey });
        return;
      }

      if (selectedScheduleFilter === 'tomorrow') {
        onAddTodo(targetCategoryId, { scheduledDate: tomorrowDateKey });
        return;
      }
    }

    onAddTodo(targetCategoryId);
  };

  const handleSubmitQuickTodo = () => {
    const title = quickAddTitle.trim();
    if (!title) {
      return;
    }

    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      categoryId: QUICK_TODO_CATEGORY_ID,
      kind: 'quick',
      title,
      isCompleted: false,
      pin: false,
      completedUnits: 0
    };

    onSaveTodo(newTodo);
    setQuickAddTitle('');
    setIsQuickAddInputVisible(true);
  };

  const weekTodos = useMemo(() => todos, [todos]);

  const weekBuckets = useMemo(
    () => buildWeekTodoBuckets(weekTodos, logs, scheduleWeekStart),
    [scheduleWeekStart, weekTodos, logs]
  );

  const weekDates = useMemo(() => getWeekDates(scheduleWeekStart), [scheduleWeekStart]);
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
  const weekJumpDateValue = formatDateKey(scheduleWeekStart);
  const weekSwipeLockDistance = 18;
  const weekSwipeTriggerDistance = 112;
  const weekSwipeDominanceRatio = 1.6;

  const shiftScheduleWeekStart = (dayOffset: number) => {
    setScheduleWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + dayOffset);
      return getStartOfWeek(next);
    });
  };

  const goToPreviousWeek = () => {
    shiftScheduleWeekStart(-7);
  };

  const goToNextWeek = () => {
    shiftScheduleWeekStart(7);
  };

  const goToCurrentWeek = () => {
    setScheduleWeekStart(getStartOfWeek(new Date()));
  };

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
    touchDragPointRef.current = null;
    touchAutoScrollSpeedRef.current = 0;
    if (touchAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(touchAutoScrollFrameRef.current);
      touchAutoScrollFrameRef.current = null;
    }
    if (touchDragFrameRef.current !== null) {
      window.cancelAnimationFrame(touchDragFrameRef.current);
      touchDragFrameRef.current = null;
    }
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

  const commitMonthDrop = (entryDate: string, entry: Pick<TodoDateEntry, 'todo' | 'badges'> | null) => {
    if (!entry) return;
    const targetTodo = todos.find((todo) => todo.id === entry.todo.id);

    if (!targetTodo) {
      return;
    }

    const shouldMoveDeadline = entry.badges.deadline;
    const shouldMoveScheduled = entry.badges.scheduled;
    if (!shouldMoveDeadline && !shouldMoveScheduled) {
      return;
    }

    const nextTodo: TodoItem = {
      ...targetTodo,
      deadlineDate: shouldMoveDeadline ? entryDate : targetTodo.deadlineDate,
      scheduledDate: shouldMoveScheduled ? entryDate : targetTodo.scheduledDate
    };

    onSaveTodo(nextTodo);
  };

  const handleScheduleEntryMove = (
    entry: Pick<TodoDateEntry, 'todo' | 'badges'>,
    targetDateKey: string
  ) => {
    commitMonthDrop(targetDateKey, entry);
  };

  const handleWeekDrop = (entryDate: string) => {
    if (!draggingWeekEntry) return;
    commitWeekDrop(entryDate, draggingWeekEntry);
  };

  const resetWeekSwipeGesture = () => {
    weekSwipeStartRef.current = null;
    weekSwipeAxisRef.current = null;
    weekSwipeEligibleRef.current = false;
  };

  const shouldIgnoreWeekSwipeTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest('[data-week-swipe-ignore="true"], button, a, input, textarea, select, [role="button"]')
    );
  };

  const handleWeekViewTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchDragActivatedRef.current || event.touches.length !== 1) {
      resetWeekSwipeGesture();
      return;
    }

    if (shouldIgnoreWeekSwipeTarget(event.target)) {
      resetWeekSwipeGesture();
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      resetWeekSwipeGesture();
      return;
    }

    weekSwipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    weekSwipeAxisRef.current = null;
    weekSwipeEligibleRef.current = true;
  };

  const handleWeekViewTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const swipeStart = weekSwipeStartRef.current;
    if (!weekSwipeEligibleRef.current || !swipeStart) return;

    if (touchDragActivatedRef.current || event.touches.length !== 1) {
      resetWeekSwipeGesture();
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (weekSwipeAxisRef.current === null) {
      if (absDeltaX < weekSwipeLockDistance && absDeltaY < weekSwipeLockDistance) {
        return;
      }

      weekSwipeAxisRef.current = absDeltaX > absDeltaY * weekSwipeDominanceRatio ? 'x' : 'y';
    }

    if (weekSwipeAxisRef.current === 'x') {
      event.preventDefault();
    }
  };

  const handleWeekViewTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const swipeStart = weekSwipeStartRef.current;
    if (!weekSwipeEligibleRef.current || !swipeStart || touchDragActivatedRef.current) {
      resetWeekSwipeGesture();
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      resetWeekSwipeGesture();
      return;
    }

    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const shouldSwitchWeek = absDeltaX >= weekSwipeTriggerDistance
      && absDeltaX > absDeltaY * weekSwipeDominanceRatio;

    if (shouldSwitchWeek) {
      event.preventDefault();
      if (deltaX > 0) {
        goToPreviousWeek();
      } else {
        goToNextWeek();
      }
    }

    resetWeekSwipeGesture();
  };

  const resolveDropDateFromPoint = (clientX: number, clientY: number): string | null => {
    const targetElement = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const dropContainer = targetElement?.closest('[data-week-drop-date]') as HTMLElement | null;
    return dropContainer?.dataset.weekDropDate || null;
  };

  const flushTouchDragPreview = () => {
    const point = touchDragPointRef.current;
    if (!point) {
      touchDragFrameRef.current = null;
      return;
    }

    const nextDate = resolveDropDateFromPoint(point.x, point.y);
    touchDragTargetDateRef.current = nextDate;
    setDragTargetDate((current) => current === nextDate ? current : nextDate);
    setTouchDragPreview((current) => (
      current
      && current.x === point.x
      && current.y === point.y
      && current.title === point.title
    )
      ? current
      : { ...point });
    touchDragFrameRef.current = null;
  };

  const queueTouchDragPreviewUpdate = (point: { x: number; y: number; title: string }) => {
    touchDragPointRef.current = point;
    if (touchDragFrameRef.current === null) {
      touchDragFrameRef.current = window.requestAnimationFrame(flushTouchDragPreview);
    }
  };

  const stopTouchAutoScroll = () => {
    touchAutoScrollSpeedRef.current = 0;
    if (touchAutoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(touchAutoScrollFrameRef.current);
      touchAutoScrollFrameRef.current = null;
    }
  };

  const stepTouchAutoScroll = () => {
    const container = weekScrollContainerRef.current;
    const point = touchDragPointRef.current;
    const speed = touchAutoScrollSpeedRef.current;

    if (!container || !point || speed === 0) {
      touchAutoScrollFrameRef.current = null;
      return;
    }

    const previousScrollTop = container.scrollTop;
    container.scrollTop += speed;
    queueTouchDragPreviewUpdate(point);

    if (container.scrollTop === previousScrollTop) {
      stopTouchAutoScroll();
      return;
    }

    touchAutoScrollFrameRef.current = window.requestAnimationFrame(stepTouchAutoScroll);
  };

  const updateTouchAutoScroll = (clientY: number) => {
    const container = weekScrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const threshold = Math.min(96, Math.max(56, rect.height * 0.16));
    let nextSpeed = 0;

    if (clientY < rect.top + threshold) {
      const intensity = (rect.top + threshold - clientY) / threshold;
      nextSpeed = -Math.max(6, intensity * 20);
    } else if (clientY > rect.bottom - threshold) {
      const intensity = (clientY - (rect.bottom - threshold)) / threshold;
      nextSpeed = Math.max(6, intensity * 20);
    }

    if (nextSpeed === 0) {
      stopTouchAutoScroll();
      return;
    }

    touchAutoScrollSpeedRef.current = nextSpeed;
    if (touchAutoScrollFrameRef.current === null) {
      touchAutoScrollFrameRef.current = window.requestAnimationFrame(stepTouchAutoScroll);
    }
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
    touchDragPointRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      title: entry.todo.title
    };
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

      queueTouchDragPreviewUpdate({
        x: touch.clientX,
        y: touch.clientY,
        title: activeEntry.todo.title
      });
      updateTouchAutoScroll(touch.clientY);
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
      stopTouchAutoScroll();
      if (touchDragFrameRef.current !== null) {
        window.cancelAnimationFrame(touchDragFrameRef.current);
        touchDragFrameRef.current = null;
      }
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [isTouchWeekDragging, weekTodos, onSaveTodo]);

  const handleWeekBadgeClick = (entry: WeekTodoEntry, _badgeKey: WeekQuickActionBadgeKey) => {
    if (touchDragActivatedRef.current) return;
    openQuickActions(entry.todo);
  };

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
      if (isFutureTodoCategoryId(todo.categoryId)) return false;
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
      pin: false,
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

  const toggleCompactDisplaySetting = (key: keyof TodoCompactDisplaySettings) => {
    setCompactDisplaySettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const displaySettingsModalNode = (
    <TodoDisplaySettingsModal
      isOpen={isDisplaySettingsOpen}
      showCompletedTodos={showCompletedTodos}
      compactDisplaySettings={compactDisplaySettings}
      onToggleShowCompletedTodos={() => setShowCompletedTodos((prev) => !prev)}
      onToggleCompactSetting={toggleCompactDisplaySetting}
      onClose={() => setIsDisplaySettingsOpen(false)}
      onForceClose={() => setIsDisplaySettingsOpen(false)}
    />
  );

  const duplicateModalNode = (
    <TodoDuplicateModal
      isOpen={duplicatingTodo !== null}
      todo={duplicatingTodo}
      onClose={handleCloseDuplicateModal}
      onConfirm={handleConfirmDuplicate}
    />
  );

  const todoQuickActionsModalNode = (
    <TodoQuickActionsModal
      isOpen={quickActionTodo !== null}
      todo={quickActionTodo}
      onMoveDate={handleQuickActionMove}
      onClearDate={handleQuickActionClearDate}
      onOpenDetail={handleQuickActionOpenDetail}
      onComplete={handleQuickActionComplete}
      onUndoComplete={handleQuickActionUndoComplete}
      onTogglePin={handleQuickActionTogglePin}
      onUpgradeToProject={handleQuickActionUpgradeToProject}
      onDelete={handleQuickActionDelete}
      onClose={closeQuickActions}
      onForceClose={() => closeQuickActions(true)}
      openedAt={quickActionOpenedAt}
      showUpgradeToProject={Boolean(quickActionTodo && isQuickTodo(quickActionTodo))}
    />
  );

  const selectScheduleViewMode = (mode: TodoScheduleViewMode) => {
    const currentWeekStart = getStartOfWeek(new Date());

    if (mode === 'bento' || mode === 'month') {
      setScheduleWeekStart(currentWeekStart);
    }

    setScheduleViewMode(mode);
    setIsScheduleViewMenuOpen(false);
  };

  const scheduleViewMenuNode = (
    <div ref={scheduleViewMenuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsScheduleViewMenuOpen((previous) => !previous)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
        title="切换排期视图"
        aria-label="切换排期视图"
        aria-expanded={isScheduleViewMenuOpen}
      >
        <ChevronDown size={15} />
      </button>

      {isScheduleViewMenuOpen && (
        <div className="absolute right-0 top-full z-30 mt-2 min-w-[7.25rem] overflow-hidden rounded-2xl border border-stone-200/80 bg-[#faf9f6]/95 p-1 shadow-[0_12px_30px_rgba(28,25,23,0.12)] backdrop-blur-sm">
          {([
            { id: 'week', label: '周视图-一列' },
            { id: 'bento', label: '周视图-两列' },
            { id: 'month', label: '月视图' }
          ] as Array<{ id: TodoScheduleViewMode; label: string }>).map((option) => {
            const isSelected = scheduleViewMode === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectScheduleViewMode(option.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] tracking-[0.08em] transition-colors ${
                  isSelected
                    ? 'bg-stone-100 text-slate-700'
                    : 'text-slate-500 hover:bg-stone-100/70 hover:text-slate-700'
                }`}
              >
                <span>{option.label}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-slate-500' : 'bg-transparent'}`}></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
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

        <div className={`relative z-10 flex h-full flex-col pb-[calc(3rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] ${isWeekScheduleView ? 'px-4 md:px-8' : ''} ${useReducedEffects ? '' : 'backdrop-blur-[2px]'}`}>
          {isWeekScheduleView ? (
            <>
              <div className="shrink-0 border-b border-stone-300/70">
                <div className="flex h-14 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-slate-500">
                    <button
                      type="button"
                      onClick={goToPreviousWeek}
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
                      onClick={goToNextWeek}
                      className="rounded-full p-1.5 transition-colors hover:bg-white/60 hover:text-slate-700"
                      title="下一周"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={goToCurrentWeek}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] tracking-[0.14em] transition-colors ${
                        isCurrentWeek
                          ? 'bg-stone-100 text-slate-600'
                          : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
                      }`}
                    >
                      本周
                    </button>
                    {scheduleViewMenuNode}
                  </div>
                </div>
              </div>

              <div
                ref={weekScrollContainerRef}
                className="min-h-0 flex-1 overflow-y-auto no-scrollbar"
                onTouchStart={handleWeekViewTouchStart}
                onTouchMove={handleWeekViewTouchMove}
                onTouchEnd={handleWeekViewTouchEnd}
                onTouchCancel={resetWeekSwipeGesture}
              >
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
                          data-week-date-trigger="true"
                          data-week-swipe-ignore="true"
                          onClick={() => {
                            setAssignModalDate(bucket.date);
                            setAssignModalType('scheduled');
                          }}
                          className="flex flex-col justify-center border-r border-stone-300/70 px-2 py-3 text-center transition-colors hover:bg-white/40 md:px-3"
                        >
                          <div className={`text-[12px] tracking-[0.02em] ${isToday ? 'text-stone-600' : 'text-stone-500'}`}>
                            {WEEKDAY_ROW_LABELS[index]}
                          </div>
                          <div
                            className={`mt-1 text-[19px] leading-none md:text-[22px] ${isToday ? 'font-semibold text-stone-800' : 'font-medium text-stone-700'}`}
                            style={{ fontFamily: "'Bilbo Swash Caps', 'Georgia', 'Times New Roman', cursive, serif" }}
                          >
                            {bucketDate?.getDate() || '--'}
                          </div>
                          <div className="mt-1 text-[10px] tracking-[0.02em] text-stone-400">
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
            </>
          ) : (
            scheduleViewMode === 'bento' ? (
              <TodoBentoWeekView
                todos={todos}
                todoCategories={categories}
                logs={logs}
                weekStartDate={scheduleWeekStart}
                headerWeekLabel={currentWeekLabel}
                isCurrentWeek={isCurrentWeek}
                onGoToPreviousWeek={goToPreviousWeek}
                onGoToNextWeek={goToNextWeek}
                onGoToCurrentWeek={goToCurrentWeek}
                onOpenWeekPicker={() => setIsWeekJumpPickerOpen(true)}
                onWeekStartChange={(weekStart) => setScheduleWeekStart(getStartOfWeek(weekStart))}
                onMoveScheduleEntry={handleScheduleEntryMove}
                useReducedEffects={useReducedEffects}
                viewMenuNode={scheduleViewMenuNode}
                onOpenTodo={openQuickActions}
                onOpenDay={(dateKey) => {
                  setAssignModalDate(dateKey);
                  setAssignModalType('scheduled');
                }}
              />
            ) : (
              <TodoMonthView
                todos={todos}
                todoCategories={categories}
                activityCategories={activityCategories}
                scopes={scopes}
                logs={logs}
                referenceDate={scheduleWeekStart}
                entryJumpSignal={monthViewEntryJumpSignal}
                onMoveScheduleEntry={handleScheduleEntryMove}
                onOpenDay={(dateKey) => {
                  setAssignModalDate(dateKey);
                  setAssignModalType('scheduled');
                }}
                onOpenDatePicker={() => setIsWeekJumpPickerOpen(true)}
                useReducedEffects={useReducedEffects}
                viewMenuNode={scheduleViewMenuNode}
                onOpenTodo={openQuickActions}
              />
            )
          )}
        </div>

        <FloatingButton
          onClick={() => setScreenMode('list')}
          title="切换回列表"
          ariaLabel="切换回列表"
          className="shadow-[0_14px_34px_rgba(15,23,42,0.16)]"
        >
          <UIIcon type="email" fallbackIcon={ListTodo} size={24} />
        </FloatingButton>

        <TodoScheduleAssignModal
          isOpen={assignModalDate !== null}
          dateLabel={assignModalDateLabel}
          assignType={assignModalType}
          onAssignTypeChange={setAssignModalType}
          todos={assignableTodos}
          allTodos={todos}
          todoCategories={normalizedTodoCategories}
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
              setScheduleWeekStart(getStartOfWeek(nextDate));
            }
          }}
          onClose={() => setIsWeekJumpPickerOpen(false)}
        />

        {todoQuickActionsModalNode}

        {displaySettingsModalNode}

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
      className="flex h-full relative pb-[calc(3rem+env(safe-area-inset-bottom))] md:pb-16"
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
      <div className="absolute inset-0 -z-10" style={{ backgroundColor: pageSurfaceColor }}></div>
      
      {/* Left Sidebar - Todo Categories */}
      <div
        className={`flex-shrink-0 flex flex-col overflow-y-auto pt-6 pb-4 pl-0 pr-2 no-scrollbar z-0 transition-all duration-300 relative md:pb-6 ${isSidebarOpen ? 'w-auto md:min-w-[12rem]' : 'w-16 items-center'}`}
      >
        <div className="relative z-10 flex-1 w-full">
          <button
            onClick={() => {
              setSelectedCategoryId(VIRTUAL_SCHEDULE_CATEGORY_ID);
              setSelectedScheduleFilter('today');
            }}
            className={`
              flex items-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
              ${isVirtualScheduleCategory
                ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                : 'text-stone-600 hover:text-stone-800'
              }
              ${!isSidebarOpen ? 'justify-center w-12 h-12 md:w-14 md:h-14' : 'w-full min-h-[3.5rem] px-4 py-3'}
            `}
            title={!isSidebarOpen ? VIRTUAL_SCHEDULE_CATEGORY_NAME : undefined}
          >
            {isVirtualScheduleCategory && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
            )}
            <IconRenderer icon="📅" uiIcon="ui:calendar" size={20} className="flex-shrink-0" />
            {isSidebarOpen && (
              <div className={`min-w-0 text-sm md:text-base whitespace-nowrap transition-all ${isVirtualScheduleCategory ? 'font-bold' : 'font-medium'}`}>
                {VIRTUAL_SCHEDULE_CATEGORY_NAME}
              </div>
            )}
          </button>

          <div className={`${isSidebarOpen ? 'mx-4 my-3' : 'mx-auto my-3 w-8'} border-t border-stone-200/80`}></div>

          {standardTodoCategories.map((category) => {
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

          <div className={`${isSidebarOpen ? 'mx-4 my-3' : 'mx-auto my-3 w-8'} border-t border-stone-200/80`}></div>

          <button
            onClick={() => setSelectedCategoryId(FUTURE_TODO_CATEGORY_ID)}
            className={`
              flex items-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
              ${selectedCategoryId === FUTURE_TODO_CATEGORY_ID
                ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                : 'text-stone-600 hover:text-stone-800'
              }
              ${!isSidebarOpen ? 'justify-center w-12 h-12 md:w-14 md:h-14' : 'w-full min-h-[3.5rem] px-4 py-3'}
            `}
            title={!isSidebarOpen ? FUTURE_TODO_CATEGORY_NAME : undefined}
          >
            {selectedCategoryId === FUTURE_TODO_CATEGORY_ID && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
            )}
            <IconRenderer
              icon={futureTodoCategory?.icon || '🔭'}
              uiIcon={futureTodoCategory?.uiIcon}
              size={20}
              className="flex-shrink-0"
            />
            {isSidebarOpen && (
              <div className={`min-w-0 text-sm md:text-base whitespace-nowrap transition-all ${selectedCategoryId === FUTURE_TODO_CATEGORY_ID ? 'font-bold' : 'font-medium'}`}>
                {FUTURE_TODO_CATEGORY_NAME}
              </div>
            )}
          </button>

          <button
            onClick={() => setSelectedCategoryId(QUICK_TODO_CATEGORY_ID)}
            className={`
              flex items-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
              ${isVirtualQuickCategory
                ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                : 'text-stone-600 hover:text-stone-800'
              }
              ${!isSidebarOpen ? 'justify-center w-12 h-12 md:w-14 md:h-14' : 'w-full min-h-[3.5rem] px-4 py-3'}
            `}
            title={!isSidebarOpen ? QUICK_TODO_CATEGORY_NAME : undefined}
          >
            {isVirtualQuickCategory && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
            )}
            <IconRenderer icon="🧾" uiIcon="ui:bill" size={20} className="flex-shrink-0" />
            {isSidebarOpen && (
              <div className={`min-w-0 text-sm md:text-base whitespace-nowrap transition-all ${isVirtualQuickCategory ? 'font-bold' : 'font-medium'}`}>
                {QUICK_TODO_CATEGORY_NAME}
              </div>
            )}
          </button>
        </div>

        <div className={`relative z-10 mt-3 flex flex-col gap-2 ${isSidebarOpen ? 'items-end pr-4' : 'items-center'}`}>
          <button
            onClick={() => setIsDisplaySettingsOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-all hover:bg-white/50 hover:text-stone-500 active:scale-95"
            title="显示设置"
          >
            <SlidersHorizontal size={20} />
          </button>

          <button
            onClick={() => setViewMode(prev => prev === 'loose' ? 'compact' : 'loose')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-all hover:bg-white/50 hover:text-stone-500 active:scale-95"
            title={viewMode === 'loose' ? '切换到紧缩视图' : '切换到松散视图'}
          >
            {viewMode === 'loose' ? <Rows size={20} /> : <LayoutList size={20} />}
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-all hover:bg-white/50 hover:text-stone-500 active:scale-95"
            title={isSidebarOpen ? '收起侧栏' : '展开侧栏'}
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
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
            backgroundColor: panelSurfaceColor
          }}
        />

        {/* Header */}
        <div className="mb-6 flex items-center justify-between mt-2 md:mt-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
              {selectedCategoryName}
              <span className="text-stone-300 text-lg font-normal">Tasks</span>
            </h1>
            {isVirtualScheduleCategory && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {VIRTUAL_SCHEDULE_FILTERS.map((filter) => {
                  const isActive = selectedScheduleFilter === filter.id;
                  const visibleCount = virtualScheduleVisibleCounts[filter.id];

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setSelectedScheduleFilter(filter.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] tracking-[0.12em] transition-all ${
                        isActive
                          ? 'border-stone-300 bg-white text-stone-800 shadow-sm'
                          : 'border-stone-200 bg-white/55 text-stone-500 hover:border-stone-300 hover:bg-white/80'
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] tracking-[0.08em] ${isActive ? 'bg-stone-100 text-stone-600' : 'bg-stone-100/70 text-stone-400'}`}>
                        {visibleCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAIChat({ targetDate: todayDate })}
              className="theme-icon-button relative overflow-visible"
              title="AI 助理"
            >
              <Sparkles size={16} />
              <UnreadCountBadge count={unreadCount} />
            </button>
            <button
              onClick={handleAddTodoClick}
              className="floating-button w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom))] no-scrollbar">
          {isVirtualQuickCategory && isQuickAddInputVisible && (
            <div className="mb-4 px-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">Quick Add</div>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickAddInputVisible(false);
                    setQuickAddTitle('');
                  }}
                  className="text-xs text-stone-400 transition-colors hover:text-stone-600"
                >
                  收起
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={quickAddInputRef}
                  type="text"
                  value={quickAddTitle}
                  onChange={(event) => setQuickAddTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSubmitQuickTodo();
                    } else if (event.key === 'Escape') {
                      setIsQuickAddInputVisible(false);
                      setQuickAddTitle('');
                    }
                  }}
                  placeholder="输入一个小事标题"
                  className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white/92 px-4 py-3 text-sm text-stone-700 outline-none transition-colors focus:border-stone-300"
                />
                <button
                  type="button"
                  onClick={handleSubmitQuickTodo}
                  disabled={!quickAddTitle.trim()}
                  className={`shrink-0 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    quickAddTitle.trim()
                      ? 'bg-stone-900 text-white hover:bg-stone-800'
                      : 'bg-stone-100 text-stone-300'
                  }`}
                >
                  添加
                </button>
              </div>
            </div>
          )}

          {isVirtualScheduleCategory && (selectedScheduleFilter === 'thisWeek' || selectedScheduleFilter === 'today')
            ? selectedTodoSectionsForRender.map((section) => (
              <section key={section.dateKey} className="mb-6">
                <div className="mb-2 flex items-center gap-3 px-1">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                    {section.label}
                  </div>
                  <div className="h-px flex-1 bg-stone-200/80"></div>
                </div>
                {section.entries.map((entry, index) => {
                  const group = virtualScheduleTreeGroups.get(entry.todo.id);
                  const isExpanded = Boolean(expandedParentIds[entry.todo.id]);

                  return (
                    <React.Fragment key={entry.todo.id}>
                      <SwipeableTodoItem
                        todo={entry.todo}
                        categories={categories}
                        activityCategories={activityCategories}
                        scopes={scopes}
                        onToggle={onToggleTodo}
                        onOpenDetail={onEditTodo}
                        onOpenQuickActions={openQuickActions}
                        onStartFocus={onStartFocus}
                        onDuplicate={handleOpenDuplicateModal}
                        viewMode={viewMode}
                        scheduleMatchLabels={entry.scheduleMatchLabels}
                        scheduleLabelStyle="schedule"
                        hierarchyDepth={entry.hierarchyDepth}
                        parentTitle={entry.parentTitle}
                        childSummary={group && group.childCount > 0 ? {
                          completed: group.completedChildCount,
                          total: group.childCount
                        } : entry.childSummary}
                        isExpanded={isExpanded}
                        onToggleChildren={group && group.childEntries.length > 0 ? () => {
                          setExpandedParentIds((prev) => ({
                            ...prev,
                            [entry.todo.id]: !prev[entry.todo.id]
                          }));
                        } : undefined}
                        isFirst={index === 0}
                        isLast={index === section.entries.length - 1 && !(isExpanded && group && group.childEntries.length > 0)}
                        compactDisplaySettings={compactDisplaySettings}
                      />

                      {isExpanded && group && group.childEntries.length > 0 && (
                        <div className={`ml-4 border-l border-stone-200/80 pl-3 ${viewMode === 'compact' ? 'mt-0' : 'mt-1'}`}>
                          {group.childEntries.map((childEntry, childIndex) => (
                            <SwipeableTodoItem
                              key={childEntry.todo.id}
                              todo={childEntry.todo}
                              categories={categories}
                              activityCategories={activityCategories}
                              scopes={scopes}
                              onToggle={onToggleTodo}
                              onOpenDetail={onEditTodo}
                              onOpenQuickActions={openQuickActions}
                              onStartFocus={onStartFocus}
                              onDuplicate={handleOpenDuplicateModal}
                              viewMode={viewMode}
                              scheduleMatchLabels={childEntry.scheduleMatchLabels}
                              scheduleLabelStyle="schedule"
                              hierarchyDepth={1}
                              isFirst={childIndex === 0}
                              isLast={childIndex === group.childEntries.length - 1}
                              compactDisplaySettings={compactDisplaySettings}
                            />
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </section>
            ))
            : isVirtualScheduleCategory
              ? selectedTodoEntriesForRender.map((entry, index) => {
                const group = virtualScheduleTreeGroups.get(entry.todo.id);
                const isExpanded = Boolean(expandedParentIds[entry.todo.id]);

                return (
                  <React.Fragment key={entry.todo.id}>
                    <SwipeableTodoItem
                      todo={entry.todo}
                      categories={categories}
                      activityCategories={activityCategories}
                      scopes={scopes}
                      onToggle={onToggleTodo}
                      onOpenDetail={onEditTodo}
                      onOpenQuickActions={openQuickActions}
                      onStartFocus={onStartFocus}
                      onDuplicate={handleOpenDuplicateModal}
                      viewMode={viewMode}
                      scheduleMatchLabels={entry.scheduleMatchLabels}
                      scheduleLabelStyle="schedule"
                      hierarchyDepth={entry.hierarchyDepth}
                      parentTitle={entry.parentTitle}
                      childSummary={group && group.childCount > 0 ? {
                        completed: group.completedChildCount,
                        total: group.childCount
                      } : entry.childSummary}
                      isExpanded={isExpanded}
                      onToggleChildren={group && group.childEntries.length > 0 ? () => {
                        setExpandedParentIds((prev) => ({
                          ...prev,
                          [entry.todo.id]: !prev[entry.todo.id]
                        }));
                      } : undefined}
                      isFirst={index === 0}
                      isLast={index === selectedTodoEntriesForRender.length - 1 && !(isExpanded && group && group.childEntries.length > 0)}
                      compactDisplaySettings={compactDisplaySettings}
                    />

                    {isExpanded && group && group.childEntries.length > 0 && (
                      <div className={`ml-4 border-l border-stone-200/80 pl-3 ${viewMode === 'compact' ? 'mt-0' : 'mt-1'}`}>
                        {group.childEntries.map((childEntry, childIndex) => (
                          <SwipeableTodoItem
                            key={childEntry.todo.id}
                            todo={childEntry.todo}
                            categories={categories}
                            activityCategories={activityCategories}
                            scopes={scopes}
                            onToggle={onToggleTodo}
                            onOpenDetail={onEditTodo}
                            onOpenQuickActions={openQuickActions}
                            onStartFocus={onStartFocus}
                            onDuplicate={handleOpenDuplicateModal}
                            viewMode={viewMode}
                            scheduleMatchLabels={childEntry.scheduleMatchLabels}
                            scheduleLabelStyle="schedule"
                            hierarchyDepth={1}
                            isFirst={childIndex === 0}
                            isLast={childIndex === group.childEntries.length - 1}
                            compactDisplaySettings={compactDisplaySettings}
                          />
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              })
              : isVirtualQuickCategory
                ? selectedTodoEntriesForRender.map((entry, index) => (
                  <SwipeableTodoItem
                    key={entry.todo.id}
                    todo={entry.todo}
                    categories={categories}
                    activityCategories={activityCategories}
                    scopes={scopes}
                    onToggle={onToggleTodo}
                    onOpenDetail={onEditTodo}
                    onOpenQuickActions={openQuickActions}
                    onStartFocus={onStartFocus}
                    onDuplicate={handleOpenDuplicateModal}
                    viewMode={viewMode}
                    scheduleMatchLabels={entry.scheduleMatchLabels}
                    isFirst={index === 0}
                    isLast={index === selectedTodoEntriesForRender.length - 1}
                    compactDisplaySettings={compactDisplaySettings}
                  />
                ))
              : selectedCategoryTreeGroups.map((group, groupIndex) => {
                const isExpanded = Boolean(expandedParentIds[group.parentEntry.todo.id]);

                return (
                  <section key={group.parentEntry.todo.id} className={viewMode === 'compact' ? 'mb-0' : 'mb-3'}>
                    <SwipeableTodoItem
                      todo={group.parentEntry.todo}
                      categories={categories}
                      activityCategories={activityCategories}
                      scopes={scopes}
                      onToggle={onToggleTodo}
                      onOpenDetail={onEditTodo}
                      onOpenQuickActions={openQuickActions}
                      onStartFocus={onStartFocus}
                      onDuplicate={handleOpenDuplicateModal}
                      viewMode={viewMode}
                      scheduleMatchLabels={group.parentEntry.scheduleMatchLabels}
                      childSummary={group.childCount > 0 ? {
                        completed: group.completedChildCount,
                        total: group.childCount
                      } : null}
                      isExpanded={isExpanded}
                      onToggleChildren={group.childCount > 0 ? () => {
                        setExpandedParentIds((prev) => ({
                          ...prev,
                          [group.parentEntry.todo.id]: !prev[group.parentEntry.todo.id]
                        }));
                      } : undefined}
                      isFirst={groupIndex === 0}
                      isLast={groupIndex === selectedCategoryTreeGroups.length - 1 && !(isExpanded && group.childEntries.length > 0)}
                      compactDisplaySettings={compactDisplaySettings}
                    />

                    {isExpanded && group.childEntries.length > 0 && (
                      <div className={`ml-4 border-l border-stone-200/80 pl-3 ${viewMode === 'compact' ? 'mt-0' : 'mt-1'}`}>
                        {group.childEntries.map((entry, childIndex) => (
                          <SwipeableTodoItem
                            key={entry.todo.id}
                            todo={entry.todo}
                            categories={categories}
                            activityCategories={activityCategories}
                            scopes={scopes}
                            onToggle={onToggleTodo}
                            onOpenDetail={onEditTodo}
                            onOpenQuickActions={openQuickActions}
                            onStartFocus={onStartFocus}
                            onDuplicate={handleOpenDuplicateModal}
                            viewMode={viewMode}
                            scheduleMatchLabels={entry.scheduleMatchLabels}
                            hierarchyDepth={1}
                            isFirst={childIndex === 0}
                            isLast={childIndex === group.childEntries.length - 1}
                            compactDisplaySettings={compactDisplaySettings}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

          {!hasVisibleTodoEntries && (
            <div className="flex flex-col items-center justify-center py-20 text-stone-300">
              <MoreHorizontal size={40} className="mb-4 opacity-50" />
              <p className="text-sm font-serif italic">
                {isVirtualScheduleCategory
                  ? `${selectedScheduleFilterMeta.label}没有排期任务。`
                  : isVirtualQuickCategory
                    ? '小事无类型不可计时，可排期。在这里添加可快速完成的事件备忘'
                    : selectedCategoryId === FUTURE_TODO_CATEGORY_ID
                      ? '未来事项不在排期中展示，可存档未来可能做的事情'
                      : 'No tasks yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <FloatingButton
        onClick={() => setScreenMode((prev) => prev === 'list' ? 'week' : 'list')}
        title={screenMode === 'list' ? '切换到排期' : '切换回列表'}
        ariaLabel={screenMode === 'list' ? '切换到排期' : '切换回列表'}
      >
        {screenMode === 'list' ? (
          <UIIcon type="manage" fallbackIcon={CalendarDays} size={24} />
        ) : (
          <UIIcon type="email" fallbackIcon={ListTodo} size={24} />
        )}
      </FloatingButton>

      {todoQuickActionsModalNode}

      {displaySettingsModalNode}

      {duplicateModalNode}
    </div>
  );
};


