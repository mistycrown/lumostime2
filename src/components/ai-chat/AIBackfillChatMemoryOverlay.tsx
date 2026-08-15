/**
 * @file AIBackfillChatMemoryOverlay.tsx
 * @input Assistant memory snapshot, reminder snapshot, memory/reminder draft state, theme tokens, and callback handlers
 * @output Full-screen assistant memory overlay for manual memory and reminder management
 * @pos Component Support (AI Integration)
 * @description Extracts the long-term-memory viewer out of AIBackfillChatModal so the modal can stay focused on orchestration while this overlay keeps its existing UI and event behavior.
 * @updated 2026-07-22: Added a shared dark-theme hook for memory cards, inputs, and actions.
 * @updated 2026-05-15: Extracted the assistant memory overlay from AIBackfillChatModal.
 */
import React from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import type {
  AssistantEditableMemoryListKey,
  AssistantMemory,
  AssistantReminder
} from '../../types/assistant';
import { formatAssistantDateTimeForDisplay } from '../../utils/assistantTime';
import {
  ASSISTANT_EDITABLE_MEMORY_SECTION_META,
  type AssistantEditableMemoryDeleteTarget,
  type AssistantReminderDeleteTarget,
  type AssistantReminderDrafts
} from './AIBackfillChatShared';

interface AIChatMemoryOverlayTheme {
  activeBg: string;
  activeBorder: string;
  chipBorder: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  inputBg: string;
  panelBg: string;
  panelBorder: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
}

interface AIBackfillChatMemoryOverlayProps {
  assistantMemorySnapshot: AssistantMemory;
  assistantReminderSnapshot: AssistantReminder[];
  assistantEditableMemoryComposerKey: AssistantEditableMemoryListKey | null;
  assistantEditableMemoryDrafts: Record<AssistantEditableMemoryListKey, string>;
  assistantEditableMemoryDeleteTarget: AssistantEditableMemoryDeleteTarget | null;
  assistantReminderDrafts: AssistantReminderDrafts;
  isAssistantReminderComposerOpen: boolean;
  assistantReminderDeleteTarget: AssistantReminderDeleteTarget | null;
  theme: AIChatMemoryOverlayTheme;
  onClearMemory: () => void;
  onClose: () => void;
  onOpenEditableMemoryComposer: (key: AssistantEditableMemoryListKey) => void;
  onUpdateEditableMemoryDraft: (key: AssistantEditableMemoryListKey, value: string) => void;
  onCancelEditableMemoryComposer: (key: AssistantEditableMemoryListKey) => void;
  onSaveEditableMemoryEntry: (key: AssistantEditableMemoryListKey) => void;
  onToggleEditableMemoryDelete: (key: AssistantEditableMemoryListKey, value: string) => void;
  onCancelEditableMemoryDelete: () => void;
  onConfirmEditableMemoryDelete: (key: AssistantEditableMemoryListKey, value: string) => void;
  onOpenReminderComposer: () => void;
  onUpdateReminderDraft: (key: keyof AssistantReminderDrafts, value: string) => void;
  onCancelReminderComposer: () => void;
  onSaveReminder: () => void;
  onToggleReminderDelete: (id: string) => void;
  onCancelReminderDelete: () => void;
  onConfirmReminderDelete: (id: string) => void;
}

export const AIBackfillChatMemoryOverlay: React.FC<AIBackfillChatMemoryOverlayProps> = ({
  assistantMemorySnapshot,
  assistantReminderSnapshot,
  assistantEditableMemoryComposerKey,
  assistantEditableMemoryDrafts,
  assistantEditableMemoryDeleteTarget,
  assistantReminderDrafts,
  isAssistantReminderComposerOpen,
  assistantReminderDeleteTarget,
  theme,
  onClearMemory,
  onClose,
  onOpenEditableMemoryComposer,
  onUpdateEditableMemoryDraft,
  onCancelEditableMemoryComposer,
  onSaveEditableMemoryEntry,
  onToggleEditableMemoryDelete,
  onCancelEditableMemoryDelete,
  onConfirmEditableMemoryDelete,
  onOpenReminderComposer,
  onUpdateReminderDraft,
  onCancelReminderComposer,
  onSaveReminder,
  onToggleReminderDelete,
  onCancelReminderDelete,
  onConfirmReminderDelete
}) => (
  <div className="ai-chat-overlay absolute inset-0 z-20 bg-[rgba(15,23,42,0.14)] backdrop-blur-[10px]">
    <div
      className="flex h-full flex-col bg-[#f3f4f6]"
      style={{
        paddingTop: 'var(--app-safe-area-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="ai-chat-overlay-header flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-4 backdrop-blur-md">
        <div>
          <h3 className="font-serif text-lg font-bold leading-none text-[#201c19]">长期记忆</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearMemory}
            className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
            style={{
              borderColor: theme.dangerBorder,
              backgroundColor: theme.dangerBg,
              color: theme.dangerText
            }}
          >
            清空长期记忆
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#cfd8e3] hover:bg-[#f9fafb] hover:text-[#111827]"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-4xl space-y-4">
          <div
            className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
              backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">状态摘要</p>
                <p className="text-sm leading-6 text-stone-700">{assistantMemorySnapshot.lastKnownState || '暂无'}</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">工作记忆摘要</p>
                <p className="text-sm leading-6 text-stone-700">{assistantMemorySnapshot.workingMemorySummary || '暂无'}</p>
              </div>
            </div>
          </div>

          {(Object.keys(ASSISTANT_EDITABLE_MEMORY_SECTION_META) as AssistantEditableMemoryListKey[]).map((key) => {
            const sectionMeta = ASSISTANT_EDITABLE_MEMORY_SECTION_META[key];
            const items = assistantMemorySnapshot[key];
            const isComposerOpen = assistantEditableMemoryComposerKey === key;

            return (
              <div
                key={key}
                className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-xl text-[#231f1b]">{sectionMeta.label}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{sectionMeta.helperText}</p>
                  </div>
                  <button
                    onClick={() => onOpenEditableMemoryComposer(key)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[0.75rem] border text-xs font-medium transition-colors hover:bg-white"
                    style={{
                      borderColor: theme.chipBorder,
                      backgroundColor: theme.panelBg,
                      color: theme.textSecondary
                    }}
                    title={`新增${sectionMeta.label}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {isComposerOpen && (
                  <div
                    className="mt-4 border px-4 py-4"
                    style={{
                      borderColor: theme.panelBorder,
                      backgroundColor: theme.panelBg
                    }}
                  >
                    <textarea
                      value={assistantEditableMemoryDrafts[key]}
                      onChange={(event) => onUpdateEditableMemoryDraft(key, event.target.value)}
                      placeholder={sectionMeta.placeholder}
                      rows={3}
                      className="w-full resize-none rounded-[0.75rem] border px-3 py-3 text-sm leading-6 outline-none"
                      style={{
                        borderColor: theme.chipBorder,
                        backgroundColor: theme.inputBg,
                        color: theme.textPrimary
                      }}
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => onCancelEditableMemoryComposer(key)}
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
                        onClick={() => onSaveEditableMemoryEntry(key)}
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
                  {items.length === 0 ? (
                    <div
                      className="rounded-[0.85rem] border border-dashed px-4 py-4 text-sm leading-6 text-stone-500"
                      style={{
                        borderColor: theme.panelBorder,
                        backgroundColor: theme.panelBg
                      }}
                    >
                      {sectionMeta.emptyLabel}
                    </div>
                  ) : (
                    items.map((item) => {
                      const isDeleteConfirming = (
                        assistantEditableMemoryDeleteTarget?.key === key
                        && assistantEditableMemoryDeleteTarget.value === item
                      );

                      return (
                        <div
                          key={`${key}-${item}`}
                          className="rounded-[0.85rem] border px-4 py-3"
                          style={{
                            borderColor: theme.panelBorder,
                            backgroundColor: 'rgba(255,255,255,0.84)'
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
                              {item}
                            </p>
                            <button
                              onClick={() => onToggleEditableMemoryDelete(key, item)}
                              className="rounded-[0.7rem] p-2 text-[#897f75] transition-colors hover:bg-[#f8e9e6] hover:text-[#b35b50]"
                              title="删除这条记忆"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {isDeleteConfirming && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e4c1bc] pt-3 text-xs text-[#9d544d]">
                              <span>确认删除这条记忆？</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={onCancelEditableMemoryDelete}
                                  className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ddd6ce] bg-transparent text-[#71685f] transition-colors hover:bg-[#fffaf3]"
                                  title="取消删除"
                                >
                                  <X size={14} />
                                </button>
                                <button
                                  onClick={() => onConfirmEditableMemoryDelete(key, item)}
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
          })}

          <div
            className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
              backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-xl text-[#231f1b]">活跃 reminders</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">日期填 YYYYMMDD；时间填 HHMM。</p>
              </div>
              <button
                onClick={onOpenReminderComposer}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[0.75rem] border text-xs font-medium transition-colors hover:bg-white"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.panelBg,
                  color: theme.textSecondary
                }}
                title="新增 reminder"
              >
                <Plus size={14} />
              </button>
            </div>

            {isAssistantReminderComposerOpen && (
              <div
                className="mt-4 border px-4 py-4"
                style={{
                  borderColor: theme.panelBorder,
                  backgroundColor: theme.panelBg
                }}
              >
                <textarea
                  value={assistantReminderDrafts.text}
                  onChange={(event) => onUpdateReminderDraft('text', event.target.value)}
                  placeholder="比如：周三上午记得回看导师邮件。"
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
                    <span className="text-xs font-medium text-stone-500">日期（YYYYMMDD）</span>
                    <input
                      value={assistantReminderDrafts.date}
                      onChange={(event) => onUpdateReminderDraft('date', event.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="20260427"
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
                    <span className="text-xs font-medium text-stone-500">时间（HHMM）</span>
                    <input
                      value={assistantReminderDrafts.hour}
                      onChange={(event) => onUpdateReminderDraft('hour', event.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="0930"
                      inputMode="numeric"
                      className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: theme.chipBorder,
                        backgroundColor: theme.inputBg,
                        color: theme.textPrimary
                      }}
                    />
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={onCancelReminderComposer}
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
                    onClick={onSaveReminder}
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
              {assistantReminderSnapshot.length === 0 ? (
                <div
                  className="rounded-[0.85rem] border border-dashed px-4 py-4 text-sm leading-6 text-stone-500"
                  style={{
                    borderColor: theme.panelBorder,
                    backgroundColor: theme.panelBg
                  }}
                >
                  暂无活跃 reminder。
                </div>
              ) : (
                assistantReminderSnapshot.map((reminder) => {
                  const isDeleteConfirming = assistantReminderDeleteTarget?.id === reminder.id;

                  return (
                    <div
                      key={reminder.id}
                      className="rounded-[0.85rem] border px-4 py-3"
                      style={{
                        borderColor: theme.panelBorder,
                        backgroundColor: 'rgba(255,255,255,0.84)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
                            {reminder.text}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-stone-500">
                            {formatAssistantDateTimeForDisplay(reminder.dueAt)} · {reminder.type}
                          </p>
                        </div>
                        <button
                          onClick={() => onToggleReminderDelete(reminder.id)}
                          className="rounded-[0.7rem] p-2 text-[#897f75] transition-colors hover:bg-[#f8e9e6] hover:text-[#b35b50]"
                          title="删除这条 reminder"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {isDeleteConfirming && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e4c1bc] pt-3 text-xs text-[#9d544d]">
                          <span>确认删除这条 reminder？</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={onCancelReminderDelete}
                              className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ddd6ce] bg-transparent text-[#71685f] transition-colors hover:bg-[#fffaf3]"
                              title="取消删除"
                            >
                              <X size={14} />
                            </button>
                            <button
                              onClick={() => onConfirmReminderDelete(reminder.id)}
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

          <div
            className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
              backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
            }}
          >
            <p className="mb-2 font-serif text-xl text-[#231f1b]">最近 agent 决策</p>
            <p className="mb-3 text-xs leading-5 text-stone-500">这里展示 AI 最近一次做了什么，用来帮助后续回合理解刚发生过的行为。</p>
            <div
              className="border px-4 py-4 text-sm leading-6"
              style={{
                borderColor: theme.panelBorder,
                backgroundColor: theme.panelBg,
                color: theme.textPrimary
              }}
            >
              {assistantMemorySnapshot.recentDecisions[0] || '暂无'}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
