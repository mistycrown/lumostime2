/**
 * @file TodoQuickActionsModal.tsx
 * @input Quick-action visibility, todo item, action callbacks
 * @output Shared todo quick-actions sheet UI for list rows and week-view badges
 * @pos Component
 * @description A reusable bottom sheet that exposes lightweight todo planning and completion actions without opening the full todo detail editor first.
 * @updated 2026-04-21: Added pin/unpin quick action support plus pinned-state metadata for today-schedule prioritization.
 * @updated 2026-04-21: Switched backdrop dismissal to pointer-down handling so opening clicks no longer immediately close the shared sheet on desktop.
 * @updated 2026-04-20: Extracted from TodoView so todo-list taps and week badges can share one quick-actions sheet implementation.
 */
import React from 'react';
import { CalendarDays, Flag, PanelRightOpen, Check, CheckCircle2, Pin, X } from 'lucide-react';
import { TodoItem } from '../types';
import { parseDateKey } from '../utils/todoScheduleUtils';

interface TodoQuickActionsModalProps {
  isOpen: boolean;
  todo: TodoItem | null;
  onMoveDate: (type: 'scheduled' | 'deadline', mode: 'today' | 'tomorrow' | 'nextWeek') => void;
  onClearDate: (type: 'scheduled' | 'deadline') => void;
  onOpenDetail: () => void;
  onComplete: () => void;
  onUndoComplete: () => void;
  onTogglePin: () => void;
  onClose: () => void;
}

export const TodoQuickActionsModal: React.FC<TodoQuickActionsModalProps> = ({
  isOpen,
  todo,
  onMoveDate,
  onClearDate,
  onOpenDetail,
  onComplete,
  onUndoComplete,
  onTogglePin,
  onClose
}) => {
  if (!isOpen || !todo) return null;

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
    { label: 'Pin', value: todo.pin ? 'On' : null },
    { label: 'Arrange', value: formatQuickActionDate(todo.scheduledDate) },
    { label: 'Due', value: formatQuickActionDate(todo.deadlineDate) },
    { label: 'Completed', value: formatQuickActionDateTime(todo.completedAt) }
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-[rgba(15,23,42,0.12)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm md:items-center md:pb-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-[26rem] overflow-hidden rounded-[2rem] border border-stone-200 bg-[#faf9f6] shadow-[0_26px_70px_rgba(15,23,42,0.14)]"
        onPointerDown={(event) => event.stopPropagation()}
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
                <div className="grid grid-cols-[0.8fr_0.8fr_1.1fr]">
                  <button
                    type="button"
                    onClick={() => onMoveDate('scheduled', 'today')}
                    className="flex items-center justify-center whitespace-nowrap px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    <span>今</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDate('scheduled', 'tomorrow')}
                    className="flex items-center justify-center whitespace-nowrap border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    <span>明</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDate('scheduled', 'nextWeek')}
                    className="flex items-center justify-center whitespace-nowrap border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
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
                <div className="grid grid-cols-[0.8fr_0.8fr_1.1fr]">
                  <button
                    type="button"
                    onClick={() => onMoveDate('deadline', 'today')}
                    className="flex items-center justify-center whitespace-nowrap px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    今
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDate('deadline', 'tomorrow')}
                    className="flex items-center justify-center whitespace-nowrap border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
                  >
                    明
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDate('deadline', 'nextWeek')}
                    className="flex items-center justify-center whitespace-nowrap border-l border-stone-100 px-4 py-3 text-center text-sm text-stone-700 transition-colors hover:bg-white"
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

            <button
              type="button"
              onClick={onTogglePin}
              className="flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
            >
              <Pin size={13} className={`${todo.pin ? 'text-stone-600' : 'text-stone-400'} rotate-[28deg]`} />
              <span>{todo.pin ? '取消 Pin' : 'Pin'}</span>
            </button>

            {todo.isCompleted && (
              <button
                type="button"
                onClick={onUndoComplete}
                className="flex w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:border-stone-300 hover:bg-white"
              >
                <CheckCircle2 size={16} className="text-stone-400" />
                <span>取消完成</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
