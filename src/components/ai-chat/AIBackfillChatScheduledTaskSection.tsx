/**
 * @file AIBackfillChatScheduledTaskSection.tsx
 * @input Scheduled-task drafts, task snapshot, reminder snapshot, theme tokens, and scheduled-task handlers
 * @output Reusable scheduled-task management section for the assistant settings panel
 * @pos Component Support (AI Integration)
 * @description Extracts the scheduled-task card UI from AIBackfillChatModal while preserving its existing interactions and state flow.
 * @updated 2026-05-15: Extracted the scheduled-task settings section from AIBackfillChatModal.
 */
import React from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import type { AssistantReminder, AssistantScheduledTask } from '../../types/assistant';
import { formatAssistantDateTimeForDisplay } from '../../utils/assistantTime';
import { normalizeMonthlyDayInput, parseMonthlyDayInput } from '../../utils/todoScheduleUtils';
import {
  ASSISTANT_SCHEDULED_TASK_WEEKDAY_OPTIONS,
  formatAssistantScheduledTaskRecurrence,
  type AssistantScheduledTaskDeleteTarget,
  type AssistantScheduledTaskDrafts
} from './AIBackfillChatShared';

interface AIChatScheduledTaskSectionTheme {
  activeBg: string;
  activeBorder: string;
  chipBorder: string;
  inputBg: string;
  panelBg: string;
  panelBorder: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
}

interface AIBackfillChatScheduledTaskSectionProps {
  assistantScheduledTaskDrafts: AssistantScheduledTaskDrafts;
  isAssistantScheduledTaskComposerOpen: boolean;
  assistantScheduledTaskSnapshot: AssistantScheduledTask[];
  assistantScheduledTaskDeleteTarget: AssistantScheduledTaskDeleteTarget | null;
  assistantReminderSnapshot: AssistantReminder[];
  theme: AIChatScheduledTaskSectionTheme;
  onOpenComposer: () => void;
  onUpdateDraft: <K extends keyof AssistantScheduledTaskDrafts>(
    key: K,
    value: AssistantScheduledTaskDrafts[K]
  ) => void;
  onToggleWeekday: (weekday: number) => void;
  onCancelComposer: () => void;
  onSave: () => void;
  onToggleEnabled: (task: AssistantScheduledTask) => void;
  onToggleDelete: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
}

export const AIBackfillChatScheduledTaskSection: React.FC<AIBackfillChatScheduledTaskSectionProps> = ({
  assistantScheduledTaskDrafts,
  isAssistantScheduledTaskComposerOpen,
  assistantScheduledTaskSnapshot,
  assistantScheduledTaskDeleteTarget,
  assistantReminderSnapshot,
  theme,
  onOpenComposer,
  onUpdateDraft,
  onToggleWeekday,
  onCancelComposer,
  onSave,
  onToggleEnabled,
  onToggleDelete,
  onCancelDelete,
  onConfirmDelete
}) => (
  <div className="border-t pt-4" style={{ borderColor: theme.panelBorder }}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>定时任务</p>
      </div>
      <button
        onClick={onOpenComposer}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[0.75rem] border text-xs font-medium transition-colors hover:bg-white"
        style={{
          borderColor: theme.chipBorder,
          backgroundColor: theme.panelBg,
          color: theme.textSecondary
        }}
        title="新增定时任务"
      >
        <Plus size={14} />
      </button>
    </div>

    {isAssistantScheduledTaskComposerOpen && (
      <div className="mt-4 border-t pt-4" style={{ borderColor: theme.panelBorder }}>
        <textarea
          value={assistantScheduledTaskDrafts.text}
          onChange={(event) => onUpdateDraft('text', event.target.value)}
          placeholder="比如：每周一提醒我交周报。"
          rows={3}
          className="w-full resize-none rounded-[0.75rem] border px-3 py-3 text-sm leading-6 outline-none"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.inputBg,
            color: theme.textPrimary
          }}
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-stone-500">触发时间（HHMM）</span>
            <input
              type="text"
              value={assistantScheduledTaskDrafts.time}
              onChange={(event) => onUpdateDraft('time', event.target.value.replace(/[^\d]/g, '').slice(0, 4))}
              placeholder="0800"
              inputMode="numeric"
              className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: theme.chipBorder,
                backgroundColor: theme.inputBg,
                color: theme.textPrimary
              }}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-stone-500">循环间隔</span>
            <input
              type="text"
              inputMode="numeric"
              value={assistantScheduledTaskDrafts.interval}
              onChange={(event) => onUpdateDraft('interval', event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
              className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: theme.chipBorder,
                backgroundColor: theme.inputBg,
                color: theme.textPrimary
              }}
            />
          </label>
        </div>

        <div className="mt-3">
          <span className="mb-2 block text-xs font-medium text-stone-500">循环模式</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'daily' as const, label: '每天' },
              { value: 'weekly' as const, label: '每周' },
              { value: 'monthly' as const, label: '每月' }
            ].map((option) => {
              const isSelected = assistantScheduledTaskDrafts.frequency === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUpdateDraft('frequency', option.value)}
                  className="rounded-[0.75rem] border px-2 py-2 text-xs font-medium transition-colors"
                  style={isSelected
                    ? {
                      borderColor: theme.activeBorder,
                      backgroundColor: theme.activeBg,
                      color: theme.textPrimary
                    }
                    : {
                      borderColor: theme.chipBorder,
                      backgroundColor: theme.inputBg,
                      color: theme.textMuted
                    }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {assistantScheduledTaskDrafts.frequency === 'weekly' && (
          <div className="mt-3">
            <span className="mb-2 block text-xs font-medium text-stone-500">每周日期</span>
            <div className="grid grid-cols-7 gap-2">
              {ASSISTANT_SCHEDULED_TASK_WEEKDAY_OPTIONS.map((weekday) => {
                const isSelected = assistantScheduledTaskDrafts.weekdays.includes(weekday.value);
                return (
                  <button
                    key={weekday.value}
                    type="button"
                    onClick={() => onToggleWeekday(weekday.value)}
                    className="rounded-[0.75rem] border px-0 py-2 text-xs font-bold transition-colors"
                    style={isSelected
                      ? {
                        borderColor: theme.activeBorder,
                        backgroundColor: theme.activeBg,
                        color: theme.textPrimary
                      }
                      : {
                        borderColor: theme.chipBorder,
                        backgroundColor: theme.inputBg,
                        color: theme.textMuted
                      }}
                  >
                    {weekday.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {assistantScheduledTaskDrafts.frequency === 'monthly' && (
          <div className="mt-3 space-y-1.5">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-stone-500">每月日期</span>
              <input
                type="text"
                inputMode="numeric"
                value={assistantScheduledTaskDrafts.monthDaysInput}
                onChange={(event) => onUpdateDraft('monthDaysInput', normalizeMonthlyDayInput(event.target.value))}
                placeholder="例如 1 15 31"
                className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
            </label>
            {parseMonthlyDayInput(assistantScheduledTaskDrafts.monthDaysInput).includes(31) && (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textMuted
                }}
              >
                <input
                  type="checkbox"
                  checked={assistantScheduledTaskDrafts.fallbackToMonthEnd}
                  onChange={(event) => onUpdateDraft('fallbackToMonthEnd', event.target.checked)}
                  className="sr-only"
                />
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-[0.35rem] border transition-colors"
                  style={assistantScheduledTaskDrafts.fallbackToMonthEnd
                    ? {
                      borderColor: theme.activeBorder,
                      backgroundColor: theme.activeBorder,
                      color: theme.activeBg
                    }
                    : {
                      borderColor: theme.chipBorder,
                      backgroundColor: '#ffffff',
                      color: 'transparent'
                    }}
                >
                  <Check size={10} strokeWidth={3} />
                </span>
                <span>若当月没有 31 号，则自动定位到最后一天</span>
              </label>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onCancelComposer}
            className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
            style={{
              borderColor: theme.chipBorder,
              backgroundColor: theme.inputBg,
              color: theme.textMuted
            }}
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:brightness-[0.98]"
            style={{
              borderColor: theme.activeBorder,
              backgroundColor: theme.activeBg,
              color: theme.textPrimary
            }}
          >
            保存
          </button>
        </div>
      </div>
    )}

    <div className="mt-4 space-y-3">
      {assistantScheduledTaskSnapshot.length === 0 ? (
        <div
          className="rounded-[0.85rem] border border-dashed px-4 py-4 text-sm leading-6 text-stone-500"
          style={{
            borderColor: theme.panelBorder,
            backgroundColor: theme.panelBg
          }}
        >
          暂无定时任务。
        </div>
      ) : (
        assistantScheduledTaskSnapshot.map((task) => {
          const isDeleteConfirming = assistantScheduledTaskDeleteTarget?.id === task.id;
          const linkedReminder = task.pendingReminderId
            ? assistantReminderSnapshot.find((reminder) => reminder.id === task.pendingReminderId)
            : undefined;
          const upcomingDueAt = linkedReminder?.dueAt || task.nextTriggerAt;

          return (
            <div
              key={task.id}
              className="rounded-[0.85rem] border px-4 py-3"
              style={{
                borderColor: theme.panelBorder,
                backgroundColor: 'rgba(255,255,255,0.84)'
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
                    {task.text}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {formatAssistantScheduledTaskRecurrence(task)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    下次触发：{formatAssistantDateTimeForDisplay(upcomingDueAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onToggleEnabled(task)}
                    className="inline-flex min-w-[60px] items-center justify-center rounded-[0.7rem] border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                    style={task.enabled
                      ? {
                        borderColor: theme.activeBorder,
                        backgroundColor: theme.activeBg,
                        color: theme.textPrimary
                      }
                      : {
                        borderColor: theme.chipBorder,
                        backgroundColor: theme.inputBg,
                        color: theme.textMuted
                      }}
                  >
                    {task.enabled ? '已开启' : '未开启'}
                  </button>
                  <button
                    onClick={() => onToggleDelete(task.id)}
                    className="rounded-[0.7rem] p-2 text-[#897f75] transition-colors hover:bg-[#f8e9e6] hover:text-[#b35b50]"
                    title="删除这条定时任务"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isDeleteConfirming && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e4c1bc] pt-3 text-xs text-[#9d544d]">
                  <span>确认删除这条定时任务？</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onCancelDelete}
                      className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ddd6ce] bg-transparent text-[#71685f] transition-colors hover:bg-[#fffaf3]"
                      title="取消删除"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => onConfirmDelete(task.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ba6256] bg-[#c46f4f] text-[#fff8f2] transition-colors hover:bg-[#b95f43]"
                      title="确认删除"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  </div>
);
