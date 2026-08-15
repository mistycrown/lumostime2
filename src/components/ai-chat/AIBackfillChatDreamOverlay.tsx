/**
 * @file AIBackfillChatDreamOverlay.tsx
 * @input Dream snapshot, active topic/entries, draft state, theme tokens, and Dream management callbacks
 * @output Full-screen Dream viewer overlay for aspect and entry management
 * @pos Component Support (AI Integration)
 * @description Extracts the Dream viewer UI out of AIBackfillChatModal so the modal can stay focused on state orchestration and command handling while this overlay preserves the existing interactions.
 * @updated 2026-07-22: Added a shared dark-theme hook for Dream controls, tabs, and content surfaces.
 * @updated 2026-05-15: Extracted the Dream viewer overlay from AIBackfillChatModal.
 */
import React from 'react';
import { Check, Pencil, Trash2, X, XCircle } from 'lucide-react';
import type { DreamEntry, DreamState, DreamTopic } from '../../types/assistant';
import { formatAssistantDateTimeForDisplay } from '../../utils/assistantTime';
import type { DreamEntryDrafts, DreamTopicDrafts } from './AIBackfillChatShared';

interface AIChatDreamOverlayTheme {
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
}

interface AIBackfillChatDreamOverlayProps {
  activeDreamEntries: DreamEntry[];
  activeDreamTopic: DreamTopic | null;
  dreamSnapshot: DreamState;
  dreamEntryDeleteTargetId: string | null;
  dreamEntryDrafts: DreamEntryDrafts;
  dreamTopicDeleteTargetId: string | null;
  dreamTopicDrafts: DreamTopicDrafts;
  editingDreamEntryId: string | null;
  editingDreamTopicId: string | null;
  isDreamResetConfirmOpen: boolean;
  isDreamTopicComposerOpen: boolean;
  isDreamTopicNoteExpanded: boolean;
  theme: AIChatDreamOverlayTheme;
  onCancelDreamEntryDelete: () => void;
  onCancelDreamEntryEditor: () => void;
  onCancelDreamReset: () => void;
  onCancelDreamTopicComposer: () => void;
  onCancelDreamTopicDelete: () => void;
  onClose: () => void;
  onConfirmDreamEntryDelete: (entryId: string) => void;
  onConfirmDreamReset: () => void;
  onConfirmDreamTopicDelete: (topicId: string) => void;
  onOpenDreamEntryEditor: (entry: DreamEntry) => void;
  onOpenDreamTopicComposer: (topic?: DreamTopic) => void;
  onRunDream: () => void;
  onSaveDreamEntry: (entryId: string) => void;
  onSaveDreamTopic: () => void;
  onSelectDreamTopic: (topicId: string) => void;
  onToggleDreamEntryDelete: (entryId: string) => void;
  onToggleDreamResetConfirm: () => void;
  onToggleDreamTopicDelete: (topicId: string) => void;
  onToggleDreamTopicEnabled: (topic: DreamTopic) => void;
  onToggleTopicNoteExpanded: () => void;
  onUpdateDreamEntryDraft: (value: string) => void;
  onUpdateDreamTopicDraft: (key: keyof DreamTopicDrafts, value: string) => void;
}

export const AIBackfillChatDreamOverlay: React.FC<AIBackfillChatDreamOverlayProps> = ({
  activeDreamEntries,
  activeDreamTopic,
  dreamSnapshot,
  dreamEntryDeleteTargetId,
  dreamEntryDrafts,
  dreamTopicDeleteTargetId,
  dreamTopicDrafts,
  editingDreamEntryId,
  editingDreamTopicId,
  isDreamResetConfirmOpen,
  isDreamTopicComposerOpen,
  isDreamTopicNoteExpanded,
  theme,
  onCancelDreamEntryDelete,
  onCancelDreamEntryEditor,
  onCancelDreamReset,
  onCancelDreamTopicComposer,
  onCancelDreamTopicDelete,
  onClose,
  onConfirmDreamEntryDelete,
  onConfirmDreamReset,
  onConfirmDreamTopicDelete,
  onOpenDreamEntryEditor,
  onOpenDreamTopicComposer,
  onRunDream,
  onSaveDreamEntry,
  onSaveDreamTopic,
  onSelectDreamTopic,
  onToggleDreamEntryDelete,
  onToggleDreamResetConfirm,
  onToggleDreamTopicDelete,
  onToggleDreamTopicEnabled,
  onToggleTopicNoteExpanded,
  onUpdateDreamEntryDraft,
  onUpdateDreamTopicDraft
}) => (
  <div className="ai-chat-overlay absolute inset-0 z-20 bg-[rgba(15,23,42,0.12)] backdrop-blur-[10px]">
    <div
      className="flex h-full flex-col bg-[linear-gradient(180deg,#f7f5f1_0%,#f3f1ec_100%)]"
      style={{
        paddingTop: 'var(--app-safe-area-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="ai-chat-overlay-header flex h-14 items-center justify-between border-b border-[rgba(32,28,25,0.12)] bg-[rgba(247,245,241,0.92)] px-4 backdrop-blur-md">
        <div>
          <h3 className="font-serif text-[1.02rem] font-bold leading-none text-[#201c19]">Dream</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenDreamTopicComposer()}
            className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/70"
            style={{
              borderColor: 'rgba(32,28,25,0.14)',
              backgroundColor: 'rgba(255,255,255,0.38)',
              color: theme.textSecondary
            }}
          >
            新增 aspect
          </button>
          <button
            onClick={onRunDream}
            className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/80"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-color) 22%, rgba(32,28,25,0.14))',
              backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, rgba(255,255,255,0.55))',
              color: theme.textPrimary
            }}
          >
            运行 dream
          </button>
          <button
            onClick={onToggleDreamResetConfirm}
            className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/80"
            style={{
              borderColor: 'rgba(157,84,77,0.22)',
              backgroundColor: 'rgba(196,111,79,0.07)',
              color: '#9d544d'
            }}
          >
            重置
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[0.7rem] border transition-colors hover:bg-white/70"
            style={{
              borderColor: 'rgba(32,28,25,0.14)',
              backgroundColor: 'rgba(255,255,255,0.38)',
              color: '#5f5a54'
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6">
          {isDreamResetConfirmOpen && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-y py-4 text-xs"
              style={{
                borderColor: 'rgba(157,84,77,0.22)',
                color: '#9d544d'
              }}
            >
              <span>确认重置 Dream 吗？这会恢复默认 aspect 和提示词，并清空全部 Dream 观察。</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCancelDreamReset}
                  className="rounded-[0.65rem] border px-3 py-2 font-medium transition-colors hover:bg-white/70"
                  style={{
                    borderColor: 'rgba(32,28,25,0.14)',
                    backgroundColor: 'rgba(255,255,255,0.26)',
                    color: '#71685f'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={onConfirmDreamReset}
                  className="rounded-[0.65rem] border px-3 py-2 font-medium transition-colors hover:bg-white/70"
                  style={{
                    borderColor: 'rgba(157,84,77,0.24)',
                    backgroundColor: 'rgba(196,111,79,0.09)',
                    color: '#9d544d'
                  }}
                >
                  确认重置
                </button>
              </div>
            </div>
          )}

          {isDreamTopicComposerOpen && (
            <div
              className="border-y px-0 py-5"
              style={{ borderColor: 'rgba(32,28,25,0.12)' }}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:gap-6">
                <div>
                  <p className="font-serif text-[1.02rem] leading-7 text-[#231f1b]">
                    {editingDreamTopicId ? '编辑 Dream aspect' : '新增 Dream aspect'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    保持标题简洁，用备注补充长期关注重点。
                  </p>
                </div>
                <div className="grid gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">aspect 标题</span>
                    <input
                      value={dreamTopicDrafts.title}
                      onChange={(event) => onUpdateDreamTopicDraft('title', event.target.value)}
                      placeholder="比如：内在特征"
                      className="w-full rounded-[0.6rem] border px-3 py-2 text-[13px] outline-none"
                      style={{
                        borderColor: 'rgba(32,28,25,0.14)',
                        backgroundColor: 'rgba(255,255,255,0.56)',
                        color: theme.textPrimary
                      }}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">备注</span>
                    <textarea
                      value={dreamTopicDrafts.note}
                      onChange={(event) => onUpdateDreamTopicDraft('note', event.target.value)}
                      placeholder="比如：长期关注用户的价值取向、情绪习惯和内在需求。"
                      rows={3}
                      className="w-full resize-none rounded-[0.6rem] border px-3 py-3 text-[13px] leading-6 outline-none"
                      style={{
                        borderColor: 'rgba(32,28,25,0.14)',
                        backgroundColor: 'rgba(255,255,255,0.56)',
                        color: theme.textPrimary
                      }}
                    />
                  </label>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={onCancelDreamTopicComposer}
                      className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/70"
                      style={{
                        borderColor: 'rgba(32,28,25,0.14)',
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        color: theme.textMuted
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={onSaveDreamTopic}
                      className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/80"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-color) 22%, rgba(32,28,25,0.14))',
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, rgba(255,255,255,0.55))',
                        color: theme.textPrimary
                      }}
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isDreamTopicComposerOpen && dreamSnapshot.topics.length === 0 ? (
            <div
              className="border-y py-10 text-[13px] leading-7 text-stone-500"
              style={{ borderColor: 'rgba(32,28,25,0.12)' }}
            >
              还没有 Dream aspect。先新增几个你希望我长期关注的主题，再运行 `dream`。
            </div>
          ) : !isDreamTopicComposerOpen ? (
            <div className="min-h-0 flex flex-1 flex-col">
              <div className="pb-3" style={{ borderColor: 'rgba(32,28,25,0.12)' }}>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">Aspect 目录</p>
              </div>
              <div
                className="overflow-x-auto border-b pb-px"
                style={{ borderColor: 'rgba(32,28,25,0.12)' }}
              >
                <div className="flex min-w-max items-end gap-5">
                  {dreamSnapshot.topics.map((topic) => {
                    const isActive = activeDreamTopic?.id === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => onSelectDreamTopic(topic.id)}
                        className={`dream-aspect-tab pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors border-b-2 ${
                          isActive
                            ? 'dream-aspect-tab-active font-bold'
                            : 'hover:text-stone-600'
                        }`}
                        style={{
                          borderBottomColor: isActive
                            ? '#201c19'
                            : 'transparent',
                          color: isActive
                            ? '#201c19'
                            : (topic.enabled ? '#78716c' : '#b0a79e')
                        }}
                      >
                        {topic.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeDreamTopic && (
                <section className="min-w-0 pt-5">
                  <div className="border-b pb-5" style={{ borderColor: 'rgba(32,28,25,0.12)' }}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-[1.5rem] leading-[1.2] text-[#231f1b]">{activeDreamTopic.title}</p>
                        <div className="mt-3 max-w-3xl space-y-2">
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">长期提示</p>
                          <p
                            className={`text-[0.92rem] leading-[1.95] text-stone-500 ${
                              isDreamTopicNoteExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                            }`}
                            title={activeDreamTopic.note || '暂无备注'}
                          >
                            {activeDreamTopic.note
                              ? activeDreamTopic.note
                              : '暂无备注'}
                          </p>
                          {activeDreamTopic.note && activeDreamTopic.note.length > 120 && (
                            <button
                              type="button"
                              onClick={onToggleTopicNoteExpanded}
                              className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500 transition-colors hover:text-stone-700"
                            >
                              {isDreamTopicNoteExpanded ? '收起提示' : '展开提示'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start text-xs sm:flex-col sm:items-center">
                        <button
                          onClick={() => onToggleDreamTopicEnabled(activeDreamTopic)}
                          className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70"
                          style={{
                            borderColor: activeDreamTopic.enabled
                              ? 'color-mix(in srgb, var(--accent-color) 24%, rgba(32,28,25,0.14))'
                              : 'rgba(32,28,25,0.14)',
                            backgroundColor: activeDreamTopic.enabled
                              ? 'color-mix(in srgb, var(--accent-color) 5%, rgba(255,255,255,0.5))'
                              : 'rgba(255,255,255,0.26)',
                            color: activeDreamTopic.enabled ? theme.textPrimary : theme.textMuted
                          }}
                          title={activeDreamTopic.enabled ? '停用 aspect' : '启用 aspect'}
                          aria-label={activeDreamTopic.enabled ? '停用 aspect' : '启用 aspect'}
                        >
                          {activeDreamTopic.enabled ? <Check size={14} /> : <XCircle size={14} />}
                        </button>
                        <button
                          onClick={() => onOpenDreamTopicComposer(activeDreamTopic)}
                          className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70"
                          style={{
                            borderColor: 'rgba(32,28,25,0.14)',
                            backgroundColor: 'rgba(255,255,255,0.26)',
                            color: theme.textSecondary
                          }}
                          title="编辑 aspect"
                          aria-label="编辑 aspect"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onToggleDreamTopicDelete(activeDreamTopic.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70"
                          style={{
                            borderColor: 'rgba(157,84,77,0.22)',
                            backgroundColor: 'rgba(196,111,79,0.07)',
                            color: '#9d544d'
                          }}
                          title="删除 aspect"
                          aria-label="删除 aspect"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {dreamTopicDeleteTargetId === activeDreamTopic.id && (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 border-b py-4 text-xs"
                      style={{
                        borderColor: 'rgba(157,84,77,0.22)',
                        color: '#9d544d'
                      }}
                    >
                      <span>确认删除这个 Dream aspect 以及下面的所有观察条目？</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={onCancelDreamTopicDelete}
                          className="flex h-8 min-w-8 items-center justify-center rounded-[0.65rem] border px-2 transition-colors hover:bg-white/70"
                          style={{
                            borderColor: 'rgba(32,28,25,0.14)',
                            backgroundColor: 'rgba(255,255,255,0.26)',
                            color: '#71685f'
                          }}
                          title="取消删除"
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={() => onConfirmDreamTopicDelete(activeDreamTopic.id)}
                          className="flex h-8 min-w-8 items-center justify-center rounded-[0.65rem] border px-2 transition-colors hover:bg-white/70"
                          style={{
                            borderColor: 'rgba(157,84,77,0.24)',
                            backgroundColor: 'rgba(196,111,79,0.09)',
                            color: '#9d544d'
                          }}
                          title="确认删除"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className="divide-y"
                    style={{ borderColor: 'rgba(32,28,25,0.1)' }}
                  >
                    {activeDreamEntries.length === 0 ? (
                      <div className="py-10 text-[13px] leading-7 text-stone-500">
                        这个 aspect 下面还没有 Dream 观察。运行一次 `dream` 之后，我会把整理出来的内容放在这里。
                      </div>
                    ) : (
                      activeDreamEntries.map((entry) => (
                        <article key={entry.id} className="py-5 first:pt-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              {editingDreamEntryId === entry.id ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={dreamEntryDrafts.content}
                                    onChange={(event) => onUpdateDreamEntryDraft(event.target.value)}
                                    rows={4}
                                    className="w-full resize-none rounded-[0.6rem] border px-3 py-3 text-[13px] leading-7 outline-none"
                                    style={{
                                      borderColor: 'rgba(32,28,25,0.14)',
                                      backgroundColor: 'rgba(255,255,255,0.56)',
                                      color: theme.textPrimary
                                    }}
                                  />
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    <button
                                      onClick={onCancelDreamEntryEditor}
                                      className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/70"
                                      style={{
                                        borderColor: 'rgba(32,28,25,0.14)',
                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                        color: theme.textMuted
                                      }}
                                    >
                                      取消
                                    </button>
                                    <button
                                      onClick={() => onSaveDreamEntry(entry.id)}
                                      className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/80"
                                      style={{
                                        borderColor: 'color-mix(in srgb, var(--accent-color) 22%, rgba(32,28,25,0.14))',
                                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, rgba(255,255,255,0.55))',
                                        color: theme.textPrimary
                                      }}
                                    >
                                      保存
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap break-words text-[0.94rem] leading-[1.95] text-stone-700">
                                  {entry.content}
                                </p>
                              )}
                            </div>
                            {editingDreamEntryId !== entry.id && (
                              <div className="flex shrink-0 flex-wrap items-center gap-2 self-start text-xs sm:flex-col sm:items-center">
                                <button
                                  onClick={() => onOpenDreamEntryEditor(entry)}
                                  disabled={editingDreamEntryId === entry.id}
                                  className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70 disabled:cursor-default disabled:opacity-45"
                                  style={{
                                    borderColor: 'rgba(32,28,25,0.14)',
                                    backgroundColor: 'rgba(255,255,255,0.26)',
                                    color: theme.textSecondary
                                  }}
                                  title="编辑条目"
                                  aria-label="编辑条目"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => onToggleDreamEntryDelete(entry.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70"
                                  style={{
                                    borderColor: 'rgba(157,84,77,0.22)',
                                    backgroundColor: 'rgba(196,111,79,0.07)',
                                    color: '#9d544d'
                                  }}
                                  title="删除条目"
                                  aria-label="删除条目"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.12em] text-stone-500">
                            <span>观察窗口 {entry.observedRangeStart} - {entry.observedRangeEnd}</span>
                            <span>状态 {entry.status}</span>
                            <span>更新于 {formatAssistantDateTimeForDisplay(entry.updatedAt)}</span>
                          </div>
                          {entry.sourceSummary && (
                            <p className="mt-2 text-xs leading-6 text-stone-500">
                              来源：{entry.sourceSummary}
                            </p>
                          )}
                          {dreamEntryDeleteTargetId === entry.id && (
                            <div
                              className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs"
                              style={{
                                borderColor: 'rgba(157,84,77,0.22)',
                                color: '#9d544d'
                              }}
                            >
                              <span>确认删除这一条 Dream 观察？</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={onCancelDreamEntryDelete}
                                  className="rounded-[0.65rem] border px-3 py-2 font-medium transition-colors hover:bg-white/70"
                                  style={{
                                    borderColor: 'rgba(32,28,25,0.14)',
                                    backgroundColor: 'rgba(255,255,255,0.26)',
                                    color: '#71685f'
                                  }}
                                >
                                  取消
                                </button>
                                <button
                                  onClick={() => onConfirmDreamEntryDelete(entry.id)}
                                  className="rounded-[0.65rem] border px-3 py-2 font-medium transition-colors hover:bg-white/70"
                                  style={{
                                    borderColor: 'rgba(157,84,77,0.24)',
                                    backgroundColor: 'rgba(196,111,79,0.09)',
                                    color: '#9d544d'
                                  }}
                                >
                                  确认删除
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  </div>
);
