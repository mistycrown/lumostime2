/**
 * @file TimelineQuickColorSidebar.tsx
 * @input Record categories, active quick-color activity, continuous mode, and drag/select callbacks
 * @output A compact right-side activity picker with continuous-mode control for click-to-range and direct-drag timeline record creation
 * @pos Component
 * @description Renders first-level record categories and second-level activities for the Chronicle quick-color split panel.
 * @updated 2026-07-30: Replaced the top-right count badge with a batch label and flattened the checkbox affordance to a single square.
 * @updated 2026-07-30: Added the continuous-create checkbox and kept selected rows unfilled while preserving the checkmark.
 * @updated 2026-07-30: Makes activity drags easier to start by waiting for a clearer horizontal leftward gesture before locking the intent.
 * @updated 2026-07-30: Removed per-label UI icons so quick coloring is represented by color swatches only.
 * @updated 2026-07-30: Added quick-color activity selection and direct timeline drag support.
 * @updated 2026-07-30: Uses the shared responsive 26%-70% split ratio instead of a fixed pixel width.
 * @updated 2026-07-30: Shares the row pointer-drag lifecycle with the todo sidebar through a common hook.
 */
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, GripVertical, Paintbrush } from 'lucide-react';
import { usePointerDrag } from '../hooks';
import { Category } from '../types';
import { toCssColor } from '../utils/colorUtils';
import { TIMELINE_SIDEBAR_MAX_RATIO, TIMELINE_SIDEBAR_MIN_RATIO } from '../utils/timelineSidebarRatioUtils';
import type { TimelineQuickColorActivity } from './TimelineScheduleCanvas';

interface TimelineQuickColorSidebarProps {
  categories: Category[];
  ratio: number;
  selectedTarget: TimelineQuickColorActivity | null;
  continuousMode: boolean;
  onSelectTarget: (target: TimelineQuickColorActivity) => void;
  onToggleContinuousMode: () => void;
  onActivityDragMove: (target: TimelineQuickColorActivity, clientX: number, clientY: number) => boolean;
  onActivityDragEnd: () => void;
  onActivityDrop: (target: TimelineQuickColorActivity, clientX: number, clientY: number) => boolean;
}

type ActivityDragIntent = 'pending' | 'drag' | 'scroll';

const ACTIVITY_DRAG_DISTANCE = 2;

const resolveActivityDragIntent = (deltaX: number, deltaY: number): ActivityDragIntent => {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX <= ACTIVITY_DRAG_DISTANCE && absY <= ACTIVITY_DRAG_DISTANCE) {
    return 'pending';
  }

  if (deltaX <= -ACTIVITY_DRAG_DISTANCE && absX >= absY) {
    return 'drag';
  }

  if (absY > absX && absY > ACTIVITY_DRAG_DISTANCE) {
    return 'scroll';
  }

  return 'pending';
};

const isSameTarget = (
  left: TimelineQuickColorActivity | null,
  right: TimelineQuickColorActivity
): boolean => (
  Boolean(left && left.categoryId === right.categoryId && left.activityId === right.activityId)
);

const buildQuickColorTargets = (categories: Category[]): Array<{
  category: Category;
  targets: TimelineQuickColorActivity[];
}> => (
  categories
    .map((category) => ({
      category,
      targets: category.activities.map((activity) => ({
        categoryId: category.id,
        activityId: activity.id,
        categoryName: category.name,
        activityName: activity.name,
        categoryIcon: category.icon,
        categoryUiIcon: category.uiIcon,
        activityIcon: activity.icon,
        activityUiIcon: activity.uiIcon,
        color: activity.color || category.themeColor || '#a8a29e'
      }))
    }))
    .filter((group) => group.targets.length > 0)
);

const ActivityRow: React.FC<{
  target: TimelineQuickColorActivity;
  selected: boolean;
  onSelect: () => void;
  onDragMove: (clientX: number, clientY: number) => boolean;
  onDragEnd: () => void;
  onDrop: (clientX: number, clientY: number) => boolean;
}> = ({ target, selected, onSelect, onDragMove, onDragEnd, onDrop }) => {
  const color = toCssColor(target.color || '#a8a29e', 'fill');
  const { beginDrag, dragFeedback, isDragging } = usePointerDrag({
    threshold: ACTIVITY_DRAG_DISTANCE,
    resolveIntent: resolveActivityDragIntent,
    onSelect,
    onDragMove,
    onDragEnd,
    onDrop
  });

  return (
    <div className={`group flex w-full items-center gap-2 px-2 transition-opacity ${isDragging ? 'opacity-45' : ''}`}>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <button
        type="button"
        onPointerDown={(event) => beginDrag(event)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onSelect();
        }}
        className={`flex min-w-0 flex-1 touch-pan-y items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${
          selected
            ? 'text-stone-900 dark:text-stone-50'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-50'
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-bold leading-5">{target.activityName}</span>
        {selected ? <Check size={14} className="shrink-0 text-stone-500 dark:text-stone-300" /> : <GripVertical size={14} className="shrink-0 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-stone-600" />}
      </button>
      {dragFeedback && typeof document !== 'undefined' && createPortal(
        <div
          className={`pointer-events-none fixed z-[80] flex max-w-[min(17rem,calc(100vw-2rem))] -translate-y-1/2 items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold shadow-[0_10px_26px_rgba(28,25,23,0.16)] backdrop-blur-sm transition-colors ${dragFeedback.isTarget ? 'border-stone-400 bg-[#fdfbf7]/95 text-stone-800 dark:border-stone-500 dark:bg-stone-900/95 dark:text-stone-100' : 'border-stone-200 bg-[#fdfbf7]/90 text-stone-500 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300'}`}
          style={{ left: `${dragFeedback.x + 16}px`, top: `${dragFeedback.y - 12}px` }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dragFeedback.isTarget ? color : '#a8a29e' }} />
          <span className="truncate">{target.activityName}</span>
        </div>,
        document.body
      )}
    </div>
  );
};

export const TimelineQuickColorSidebar: React.FC<TimelineQuickColorSidebarProps> = ({
  categories,
  ratio,
  selectedTarget,
  continuousMode,
  onSelectTarget,
  onToggleContinuousMode,
  onActivityDragMove,
  onActivityDragEnd,
  onActivityDrop
}) => {
  const groups = useMemo(() => buildQuickColorTargets(categories), [categories]);

  return (
    <aside
      className="flex h-full min-w-0 shrink-0 flex-col bg-[#fdfbf7]/95 shadow-[-10px_0_30px_rgba(28,25,23,0.04)] backdrop-blur-md dark:bg-stone-900/95"
      style={{ width: `${ratio * 100}%`, minWidth: `${TIMELINE_SIDEBAR_MIN_RATIO * 100}%`, maxWidth: `${TIMELINE_SIDEBAR_MAX_RATIO * 100}%` }}
      aria-label="快速着色"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-800">
        <div className="flex min-w-0 items-center gap-2">
          <Paintbrush size={15} className="shrink-0 text-stone-400" />
          <span className="truncate text-sm font-bold text-stone-800 dark:text-stone-100">快速着色</span>
        </div>
        <button
          type="button"
          onClick={onToggleContinuousMode}
          className={`flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 text-[10px] font-bold transition-colors ${
            continuousMode
              ? 'text-stone-700 dark:text-stone-100'
              : 'text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200'
          }`}
          title={continuousMode ? '关闭连续创建' : '开启连续创建'}
          aria-label={continuousMode ? '关闭连续创建' : '开启连续创建'}
          aria-pressed={continuousMode}
        >
          <span className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${
            continuousMode
              ? 'border-stone-600 bg-stone-100 dark:border-stone-200 dark:bg-stone-800'
              : 'border-stone-300 dark:border-stone-600'
          }`}>
            {continuousMode && <Check size={11} strokeWidth={3} />}
          </span>
          <span>批量</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-64 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map(({ category, targets }) => {
          const categoryColor = toCssColor(category.themeColor || '#a8a29e', 'fill');
          return (
            <section key={category.id} className="border-b border-stone-100 pb-3 last:border-b-0 dark:border-stone-800">
              <div className="flex items-center justify-between px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColor }} aria-hidden="true" />
                  <span className="truncate">{category.name}</span>
                </span>
                <span>{targets.length}</span>
              </div>
              <div className="space-y-0.5">
                {targets.map((target) => (
                  <ActivityRow
                    key={`${target.categoryId}:${target.activityId}`}
                    target={target}
                    selected={isSameTarget(selectedTarget, target)}
                    onSelect={() => onSelectTarget(target)}
                    onDragMove={(clientX, clientY) => onActivityDragMove(target, clientX, clientY)}
                    onDragEnd={onActivityDragEnd}
                    onDrop={(clientX, clientY) => onActivityDrop(target, clientX, clientY)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
};
