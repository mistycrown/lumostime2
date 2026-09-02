/**
 * @file AIBackfillChatAssistantSettingsSection.tsx
 * @input Assistant agent config state, interval and quiet-hours drafts/errors, scheduled-task state, theme tokens, and event handlers
 * @output Reusable background-assistant settings section for the AI chat settings panel
 * @pos Component Support (AI Integration)
 * @description Extracts the large background-assistant settings render tree from AIBackfillChatModal while leaving all state mutation logic in the parent modal.
 * @updated 2026-09-03: Removed the polling-frequency input and retained only the random check-in minimum and maximum intervals.
 * @updated 2026-05-16: Added the log-submission trigger settings block with a multi-tag selector for post-log assistant reactions.
 * @updated 2026-05-15: Extracted the assistant settings section from AIBackfillChatModal.
 */
import React from 'react';
import { XCircle } from 'lucide-react';
import type { Category } from '../../types';
import type { AssistantAgentConfig, AssistantReminder, AssistantScheduledTask } from '../../types/assistant';
import { TagMultipleAssociation } from '../TagMultipleAssociation';
import { AIBackfillChatScheduledTaskSection } from './AIBackfillChatScheduledTaskSection';
import type {
  AssistantAgentIntervalDrafts,
  AssistantAgentIntervalErrors,
  AssistantAgentIntervalField,
  AssistantAgentQuietHoursDrafts,
  AssistantAgentQuietHoursErrors,
  AssistantAgentQuietHoursField,
  AssistantLetterDraftErrors,
  AssistantLetterDrafts,
  AssistantScheduledTaskDeleteTarget,
  AssistantScheduledTaskDrafts
} from './AIBackfillChatShared';

interface AIChatAssistantSettingsTheme {
  activeBg: string;
  activeBorder: string;
  chipBg: string;
  chipBorder: string;
  inputBg: string;
  panelBg: string;
  panelBorder: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
}

interface AIBackfillChatAssistantSettingsSectionProps {
  assistantAgentConfig: AssistantAgentConfig;
  categories: Category[];
  assistantAgentIntervalDrafts: AssistantAgentIntervalDrafts;
  assistantAgentIntervalErrors: AssistantAgentIntervalErrors;
  assistantAgentQuietHoursDrafts: AssistantAgentQuietHoursDrafts;
  assistantAgentQuietHoursErrors: AssistantAgentQuietHoursErrors;
  assistantLetterDrafts: AssistantLetterDrafts;
  assistantLetterDraftErrors: AssistantLetterDraftErrors;
  nextLetterPreview: string;
  assistantScheduledTaskDrafts: AssistantScheduledTaskDrafts;
  isAssistantScheduledTaskComposerOpen: boolean;
  assistantScheduledTaskSnapshot: AssistantScheduledTask[];
  assistantScheduledTaskDeleteTarget: AssistantScheduledTaskDeleteTarget | null;
  assistantReminderSnapshot: AssistantReminder[];
  theme: AIChatAssistantSettingsTheme;
  onUpdateAgentConfig: (patch: Partial<AssistantAgentConfig>) => void;
  onIntervalDraftChange: (field: AssistantAgentIntervalField, value: string) => void;
  onCommitIntervalDraft: (field: AssistantAgentIntervalField) => void;
  onToggleQuietHours: () => void;
  onQuietHoursDraftChange: (field: AssistantAgentQuietHoursField, value: string) => void;
  onCommitQuietHoursDraft: () => void;
  onToggleLetterEnabled: () => void;
  onLetterDraftChange: (field: keyof AssistantLetterDrafts, value: string) => void;
  onCommitLetterDraft: () => void;
  onOpenScheduledTaskComposer: () => void;
  onUpdateScheduledTaskDraft: <K extends keyof AssistantScheduledTaskDrafts>(
    key: K,
    value: AssistantScheduledTaskDrafts[K]
  ) => void;
  onToggleScheduledTaskWeekday: (weekday: number) => void;
  onCancelScheduledTaskComposer: () => void;
  onSaveScheduledTask: () => void;
  onToggleScheduledTaskEnabled: (task: AssistantScheduledTask) => void;
  onToggleScheduledTaskDelete: (id: string) => void;
  onCancelScheduledTaskDelete: () => void;
  onConfirmScheduledTaskDelete: (id: string) => void;
  onOpenDreamViewer: () => void;
  onOpenAssistantMemoryViewer: () => void;
  onOpenAssistantBackgroundHistoryViewer: () => void;
  onOpenAssistantLetterHistoryViewer: () => void;
}

export const AIBackfillChatAssistantSettingsSection: React.FC<AIBackfillChatAssistantSettingsSectionProps> = ({
  assistantAgentConfig,
  categories,
  assistantAgentIntervalDrafts,
  assistantAgentIntervalErrors,
  assistantAgentQuietHoursDrafts,
  assistantAgentQuietHoursErrors,
  assistantLetterDrafts,
  assistantLetterDraftErrors,
  nextLetterPreview,
  assistantScheduledTaskDrafts,
  isAssistantScheduledTaskComposerOpen,
  assistantScheduledTaskSnapshot,
  assistantScheduledTaskDeleteTarget,
  assistantReminderSnapshot,
  theme,
  onUpdateAgentConfig,
  onIntervalDraftChange,
  onCommitIntervalDraft,
  onToggleQuietHours,
  onQuietHoursDraftChange,
  onCommitQuietHoursDraft,
  onToggleLetterEnabled,
  onLetterDraftChange,
  onCommitLetterDraft,
  onOpenScheduledTaskComposer,
  onUpdateScheduledTaskDraft,
  onToggleScheduledTaskWeekday,
  onCancelScheduledTaskComposer,
  onSaveScheduledTask,
  onToggleScheduledTaskEnabled,
  onToggleScheduledTaskDelete,
  onCancelScheduledTaskDelete,
  onConfirmScheduledTaskDelete,
  onOpenDreamViewer,
  onOpenAssistantMemoryViewer,
  onOpenAssistantBackgroundHistoryViewer,
  onOpenAssistantLetterHistoryViewer
}) => (
  <section
    className="border-t pt-5"
    style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)' }}
  >
    <div className="mb-4 flex min-h-[3.25rem] items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-stone-800">后台助理</p>
      </div>
      <span
        className="rounded-[0.75rem] border px-3 py-1 text-xs font-medium"
        style={{
          borderColor: theme.chipBorder,
          backgroundColor: theme.chipBg,
          color: theme.textMuted
        }}
      >
        Android
      </span>
    </div>

    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: theme.panelBorder }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>开启后台助理</p>
        </div>
        <button
          onClick={() => onUpdateAgentConfig({ enabled: !assistantAgentConfig.enabled })}
          className="inline-flex min-w-[72px] items-center justify-center rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors"
          style={assistantAgentConfig.enabled
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
          {assistantAgentConfig.enabled ? '已开启' : '未开启'}
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>check-in 间隔</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">最低间隔（分钟）</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={assistantAgentIntervalDrafts.minCheckinMinutes}
                onChange={(event) => onIntervalDraftChange('minCheckinMinutes', event.target.value)}
                onBlur={() => onCommitIntervalDraft('minCheckinMinutes')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCommitIntervalDraft('minCheckinMinutes');
                  }
                }}
                aria-invalid={!!assistantAgentIntervalErrors.minCheckinMinutes}
                className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                style={{
                  borderColor: assistantAgentIntervalErrors.minCheckinMinutes ? '#ef4444' : theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
              {assistantAgentIntervalErrors.minCheckinMinutes ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                  <XCircle size={15} aria-hidden="true" />
                </span>
              ) : null}
            </div>
            {assistantAgentIntervalErrors.minCheckinMinutes ? (
              <span className="mt-1 block text-xs font-medium text-red-500" role="alert">
                {assistantAgentIntervalErrors.minCheckinMinutes}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">最高间隔（分钟）</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={assistantAgentIntervalDrafts.maxCheckinMinutes}
                onChange={(event) => onIntervalDraftChange('maxCheckinMinutes', event.target.value)}
                onBlur={() => onCommitIntervalDraft('maxCheckinMinutes')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCommitIntervalDraft('maxCheckinMinutes');
                  }
                }}
                aria-invalid={!!assistantAgentIntervalErrors.maxCheckinMinutes}
                className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                style={{
                  borderColor: assistantAgentIntervalErrors.maxCheckinMinutes ? '#ef4444' : theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
              {assistantAgentIntervalErrors.maxCheckinMinutes ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                  <XCircle size={15} aria-hidden="true" />
                </span>
              ) : null}
            </div>
            {assistantAgentIntervalErrors.maxCheckinMinutes ? (
              <span className="mt-1 block text-xs font-medium text-red-500" role="alert">
                {assistantAgentIntervalErrors.maxCheckinMinutes}
              </span>
            ) : null}
          </label>
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: theme.panelBorder }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>夜间保护时间（只拦随机 check-in）</p>
          </div>
          <button
            onClick={onToggleQuietHours}
            className="inline-flex min-w-[72px] items-center justify-center rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors"
            style={assistantAgentConfig.quietHoursEnabled
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
            {assistantAgentConfig.quietHoursEnabled ? '已开启' : '未开启'}
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">开始保护时间</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="2300"
                value={assistantAgentQuietHoursDrafts.quietHoursStart}
                onChange={(event) => onQuietHoursDraftChange('quietHoursStart', event.target.value)}
                onBlur={onCommitQuietHoursDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCommitQuietHoursDraft();
                  }
                }}
                aria-invalid={!!assistantAgentQuietHoursErrors.quietHoursStart}
                className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                style={{
                  borderColor: assistantAgentQuietHoursErrors.quietHoursStart ? '#ef4444' : theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
              {assistantAgentQuietHoursErrors.quietHoursStart ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                  <XCircle size={15} aria-hidden="true" />
                </span>
              ) : null}
            </div>
            {assistantAgentQuietHoursErrors.quietHoursStart ? (
              <span className="mt-1 block text-xs font-medium text-red-500" role="alert">
                {assistantAgentQuietHoursErrors.quietHoursStart}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">结束保护时间</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0800"
                value={assistantAgentQuietHoursDrafts.quietHoursEnd}
                onChange={(event) => onQuietHoursDraftChange('quietHoursEnd', event.target.value)}
                onBlur={onCommitQuietHoursDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCommitQuietHoursDraft();
                  }
                }}
                aria-invalid={!!assistantAgentQuietHoursErrors.quietHoursEnd}
                className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                style={{
                  borderColor: assistantAgentQuietHoursErrors.quietHoursEnd ? '#ef4444' : theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
              {assistantAgentQuietHoursErrors.quietHoursEnd ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                  <XCircle size={15} aria-hidden="true" />
                </span>
              ) : null}
            </div>
            {assistantAgentQuietHoursErrors.quietHoursEnd ? (
              <span className="mt-1 block text-xs font-medium text-red-500" role="alert">
                {assistantAgentQuietHoursErrors.quietHoursEnd}
              </span>
            ) : null}
          </label>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 border-t pt-4" style={{ borderColor: theme.panelBorder }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>开启长期记忆</p>
        </div>
        <button
          onClick={() => onUpdateAgentConfig({ longTermMemoryEnabled: !assistantAgentConfig.longTermMemoryEnabled })}
          className="inline-flex min-w-[72px] items-center justify-center rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors"
          style={assistantAgentConfig.longTermMemoryEnabled
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
          {assistantAgentConfig.longTermMemoryEnabled ? '已开启' : '未开启'}
        </button>
      </div>

      <div className="border-t pt-4" style={{ borderColor: theme.panelBorder }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>日志提交触发</p>
            <p className="mt-1 text-xs leading-5" style={{ color: theme.textMuted }}>
              新建日志或结束专注后生成记录时，若命中选中标签，就自动发一次后台 System 提示。
            </p>
          </div>
          <button
            onClick={() => onUpdateAgentConfig({
              logSubmissionTriggerEnabled: !assistantAgentConfig.logSubmissionTriggerEnabled
            })}
            className="inline-flex min-w-[72px] items-center justify-center rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors"
            style={assistantAgentConfig.logSubmissionTriggerEnabled
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
            {assistantAgentConfig.logSubmissionTriggerEnabled ? '已开启' : '未开启'}
          </button>
        </div>

        {assistantAgentConfig.logSubmissionTriggerEnabled && (
          <div
            className="mt-4 rounded-[1rem] border px-4 py-4"
            style={{
              borderColor: theme.panelBorder,
              backgroundColor: theme.panelBg
            }}
          >
            <p className="mb-3 text-xs leading-5" style={{ color: theme.textMuted }}>
              命中任一标签就触发。
            </p>
            <TagMultipleAssociation
              categories={categories}
              selectedActivityIds={assistantAgentConfig.logSubmissionTriggerActivityIds}
              onChange={(activityIds) => onUpdateAgentConfig({
                logSubmissionTriggerActivityIds: activityIds
              })}
              description=""
            />
          </div>
        )}
      </div>

      <div className="border-t pt-4" style={{ borderColor: theme.panelBorder }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>AI 来信</p>
            <p className="mt-1 text-xs leading-5" style={{ color: theme.textMuted }}>
              按频率和时间窗定期生成一封独立来信，并保存在来信记录里。
            </p>
          </div>
          <button
            onClick={onToggleLetterEnabled}
            className="inline-flex min-w-[72px] items-center justify-center rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors"
            style={assistantAgentConfig.letterEnabled
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
            {assistantAgentConfig.letterEnabled ? '已开启' : '未开启'}
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">来信频率（天）</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={assistantLetterDrafts.letterFrequencyDays}
                onChange={(event) => onLetterDraftChange('letterFrequencyDays', event.target.value)}
                onBlur={onCommitLetterDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCommitLetterDraft();
                  }
                }}
                aria-invalid={!!assistantLetterDraftErrors.letterFrequencyDays}
                className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                style={{
                  borderColor: assistantLetterDraftErrors.letterFrequencyDays ? '#ef4444' : theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
              {assistantLetterDraftErrors.letterFrequencyDays ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                  <XCircle size={15} aria-hidden="true" />
                </span>
              ) : null}
            </div>
            {assistantLetterDraftErrors.letterFrequencyDays ? (
              <span className="mt-1 block text-xs font-medium text-red-500" role="alert">
                {assistantLetterDraftErrors.letterFrequencyDays}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">开始时间</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="2000"
                value={assistantLetterDrafts.letterWindowStart}
                onChange={(event) => onLetterDraftChange('letterWindowStart', event.target.value)}
                onBlur={onCommitLetterDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCommitLetterDraft();
                  }
                }}
                aria-invalid={!!assistantLetterDraftErrors.letterWindowStart}
                className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                style={{
                  borderColor: assistantLetterDraftErrors.letterWindowStart ? '#ef4444' : theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
              {assistantLetterDraftErrors.letterWindowStart ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                  <XCircle size={15} aria-hidden="true" />
                </span>
              ) : null}
            </div>
            {assistantLetterDraftErrors.letterWindowStart ? (
              <span className="mt-1 block text-xs font-medium text-red-500" role="alert">
                {assistantLetterDraftErrors.letterWindowStart}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">结束时间</span>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="2200"
                value={assistantLetterDrafts.letterWindowEnd}
                onChange={(event) => onLetterDraftChange('letterWindowEnd', event.target.value)}
                onBlur={onCommitLetterDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onCommitLetterDraft();
                  }
                }}
                aria-invalid={!!assistantLetterDraftErrors.letterWindowEnd}
                className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                style={{
                  borderColor: assistantLetterDraftErrors.letterWindowEnd ? '#ef4444' : theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
              />
              {assistantLetterDraftErrors.letterWindowEnd ? (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                  <XCircle size={15} aria-hidden="true" />
                </span>
              ) : null}
            </div>
            {assistantLetterDraftErrors.letterWindowEnd ? (
              <span className="mt-1 block text-xs font-medium text-red-500" role="alert">
                {assistantLetterDraftErrors.letterWindowEnd}
              </span>
            ) : null}
          </label>
        </div>

        <div
          className="mt-4 rounded-[1rem] border px-4 py-3"
          style={{
            borderColor: theme.panelBorder,
            backgroundColor: theme.panelBg
          }}
        >
          <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
            下一次来信
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: theme.textPrimary }}>
            {nextLetterPreview || '开启并保存后会自动计算'}
          </p>
          <div className="mt-3 flex justify-end">
            <button
              onClick={onOpenAssistantLetterHistoryViewer}
              className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
              style={{
                borderColor: theme.chipBorder,
                backgroundColor: theme.inputBg,
                color: theme.textSecondary
              }}
            >
              查看来信记录
            </button>
          </div>
        </div>
      </div>

      <AIBackfillChatScheduledTaskSection
        assistantScheduledTaskDrafts={assistantScheduledTaskDrafts}
        isAssistantScheduledTaskComposerOpen={isAssistantScheduledTaskComposerOpen}
        assistantScheduledTaskSnapshot={assistantScheduledTaskSnapshot}
        assistantScheduledTaskDeleteTarget={assistantScheduledTaskDeleteTarget}
        assistantReminderSnapshot={assistantReminderSnapshot}
        theme={theme}
        onOpenComposer={onOpenScheduledTaskComposer}
        onUpdateDraft={onUpdateScheduledTaskDraft}
        onToggleWeekday={onToggleScheduledTaskWeekday}
        onCancelComposer={onCancelScheduledTaskComposer}
        onSave={onSaveScheduledTask}
        onToggleEnabled={onToggleScheduledTaskEnabled}
        onToggleDelete={onToggleScheduledTaskDelete}
        onCancelDelete={onCancelScheduledTaskDelete}
        onConfirmDelete={onConfirmScheduledTaskDelete}
      />

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={onOpenDreamViewer}
          className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.panelBg,
            color: theme.textSecondary
          }}
        >
          打开 Dream
        </button>
        <button
          onClick={onOpenAssistantMemoryViewer}
          className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.panelBg,
            color: theme.textSecondary
          }}
        >
          查看长期记忆
        </button>
        <button
          onClick={onOpenAssistantBackgroundHistoryViewer}
          className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
          style={{
            borderColor: theme.chipBorder,
            backgroundColor: theme.panelBg,
            color: theme.textSecondary
          }}
        >
          查看后台调用记录
        </button>
      </div>
    </div>
  </section>
);
