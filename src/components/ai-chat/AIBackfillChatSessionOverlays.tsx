/**
 * @file AIBackfillChatSessionOverlays.tsx
 * @input Session list state, rename/delete UI state, theme tokens, and session-creation callbacks
 * @output History-session overlay and new-session dialog for AIBackfillChatModal
 * @pos Component Support (AI Integration)
 * @description Extracts the session-history and session-creation overlays out of AIBackfillChatModal so the modal can focus on orchestration while these presentation-heavy surfaces preserve their existing behavior.
 * @updated 2026-07-22: Replaced legacy fixed session-list text colors with shared theme tokens for dark-mode readability.
 * @updated 2026-05-15: Extracted the history overlay and new-session dialog from AIBackfillChatModal.
 */
import React from 'react';
import { Check, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react';
import type { AIChatPersona, AIChatSession } from './AIBackfillChatShared';
import { PersonaAvatar } from './AIBackfillChatShared';

interface AIChatSessionOverlayTheme {
  activeBg: string;
  activeBorder: string;
  avatarBg: string;
  avatarShadow: string;
  cardShadow: string;
  cardShadowStrong: string;
  chipBorder: string;
  inputBg: string;
  overlayDark: string;
  panelBg: string;
  panelBgStrong: string;
  panelBorder: string;
  primaryButtonBg: string;
  primaryButtonBorder: string;
  primaryButtonText: string;
  textMuted: string;
  textPrimary: string;
}

interface AIBackfillChatHistoryOverlayProps {
  activeSessionId: string;
  deleteConfirmSessionId: string | null;
  editingSessionId: string | null;
  editingSessionTitle: string;
  formatConversationTime: (value: number) => string;
  getSessionPersona: (session: AIChatSession) => AIChatPersona;
  isOpen: boolean;
  onClose: () => void;
  onCommitRenameSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onEditSessionTitleChange: (value: string) => void;
  onOpenNewSessionDialog: () => void;
  onSelectSession: (sessionId: string) => void;
  onStartRenameSession: (session: AIChatSession) => void;
  onToggleDeleteSession: (sessionId: string) => void;
  onCancelRenameSession: () => void;
  onCancelDeleteSession: () => void;
  sortedSessions: AIChatSession[];
  theme: AIChatSessionOverlayTheme;
}

interface AIBackfillChatNewSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGenericSession: () => void;
  onOpenMonthlyReviewTemplateSelection: () => void;
  onOpenWeeklyReviewTemplateSelection: () => void;
  theme: AIChatSessionOverlayTheme;
}

export const AIBackfillChatHistoryOverlay: React.FC<AIBackfillChatHistoryOverlayProps> = ({
  activeSessionId,
  deleteConfirmSessionId,
  editingSessionId,
  editingSessionTitle,
  formatConversationTime,
  getSessionPersona,
  isOpen,
  onCancelDeleteSession,
  onCancelRenameSession,
  onClose,
  onCommitRenameSession,
  onDeleteSession,
  onEditSessionTitleChange,
  onOpenNewSessionDialog,
  onSelectSession,
  onStartRenameSession,
  onToggleDeleteSession,
  sortedSessions,
  theme
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10 backdrop-blur-[10px]" style={{ backgroundColor: theme.overlayDark }}>
      <div
        className="absolute inset-3 flex flex-col overflow-hidden rounded-[0.95rem] border sm:inset-4"
        style={{
          borderColor: theme.panelBorder,
          backgroundColor: theme.panelBg,
          boxShadow: theme.cardShadowStrong
        }}
      >
        <div
          className="flex items-start justify-between border-b px-5 py-4 backdrop-blur"
          style={{
            borderColor: theme.panelBorder,
            backgroundColor: theme.panelBg
          }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: theme.textPrimary }}>历史对话</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] border transition-colors"
            style={{
              borderColor: theme.chipBorder,
              backgroundColor: theme.panelBg,
              color: theme.textMuted
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b px-5 py-4" style={{ borderColor: theme.panelBorder }}>
          <button
            onClick={onOpenNewSessionDialog}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[0.8rem] border px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              borderColor: theme.primaryButtonBorder,
              backgroundColor: theme.primaryButtonBg,
              color: theme.primaryButtonText,
              boxShadow: `0 0 0 1px ${theme.primaryButtonBorder}`
            }}
          >
            <MessageSquarePlus size={16} />
            新建对话
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-2">
            {sortedSessions.map((session) => {
              const sessionPersona = getSessionPersona(session);
              const lastMessage = [...session.messages].reverse().find((message) => message.tone !== 'pending');
              const isEditing = editingSessionId === session.id;
              const isDeleteConfirming = deleteConfirmSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className="w-full rounded-[0.85rem] border px-4 py-3 text-left transition-all"
                  style={
                    session.id === activeSessionId
                      ? {
                        borderColor: theme.activeBorder,
                        backgroundColor: theme.activeBg,
                        boxShadow: theme.cardShadow
                      }
                      : {
                        borderColor: theme.panelBorder,
                        backgroundColor: theme.panelBg
                      }
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      onClick={() => {
                        if (isEditing) {
                          return;
                        }
                        onSelectSession(session.id);
                      }}
                      className={`flex min-w-0 flex-1 items-start gap-3 text-left ${isEditing ? '' : 'cursor-pointer'}`}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] border text-base"
                        style={{
                          borderColor: theme.panelBorder,
                          backgroundColor: theme.avatarBg,
                          boxShadow: theme.avatarShadow
                        }}
                      >
                        <PersonaAvatar persona={sessionPersona} iconClassName="text-base" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          {isEditing ? (
                            <input
                              value={editingSessionTitle}
                              onChange={(event) => onEditSessionTitleChange(event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  onCommitRenameSession(session.id);
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  onCancelRenameSession();
                                }
                              }}
                              className="w-full rounded-[0.7rem] border px-3 py-1.5 text-sm font-semibold outline-none"
                              style={{
                                borderColor: theme.chipBorder,
                                backgroundColor: theme.inputBg,
                                color: theme.textPrimary
                              }}
                              autoFocus
                            />
                          ) : (
                            <p className="truncate font-serif text-[1.05rem]" style={{ color: theme.textPrimary }}>{session.title}</p>
                          )}
                          <span className="shrink-0 text-[11px]" style={{ color: theme.textMuted }}>
                            {formatConversationTime(session.updatedAt)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs" style={{ color: theme.textSecondary }}>
                          {lastMessage?.content || '还没有消息'}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: theme.textMuted }}>
                          <span>{sessionPersona.name}</span>
                          <span>·</span>
                          <span>{session.contextCacheEnabled ? `上下文 ${sessionPersona.contextMessageLimit}轮` : '单轮'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => onCommitRenameSession(session.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ced8ca] bg-[#edf3ea] text-[#556a52] transition-colors hover:bg-[#e5eee1]"
                            title="保存名称"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={onCancelRenameSession}
                            className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#e3d8ca] bg-[#fff8f0] text-[#736a61] transition-colors hover:bg-[#f2e9de]"
                            title="取消重命名"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onStartRenameSession(session)}
                            className="rounded-[0.7rem] p-2 text-[#897f75] transition-colors hover:bg-[#f1e8dd] hover:text-[#2f2a26]"
                            title="重命名对话"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => onToggleDeleteSession(session.id)}
                            className="rounded-[0.7rem] p-2 text-[#897f75] transition-colors hover:bg-[#f8e9e6] hover:text-[#b35b50]"
                            title="删除对话"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isDeleteConfirming && !isEditing && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#e4c1bc] pt-3 text-xs text-[#9d544d]">
                      <span>删除后不能恢复，确认删除？</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={onCancelDeleteSession}
                          className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ddd6ce] bg-transparent text-[#71685f] transition-colors hover:bg-[#fffaf3]"
                          title="取消删除"
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteSession(session.id)}
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AIBackfillChatNewSessionDialog: React.FC<AIBackfillChatNewSessionDialogProps> = ({
  isOpen,
  onClose,
  onCreateGenericSession,
  onOpenMonthlyReviewTemplateSelection,
  onOpenWeeklyReviewTemplateSelection,
  theme
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-5 backdrop-blur-sm">
      <div
        className="w-full max-w-sm overflow-hidden rounded-[1.4rem] border"
        style={{
          borderColor: theme.panelBorder,
          backgroundColor: theme.panelBg,
          boxShadow: theme.cardShadowStrong
        }}
      >
        <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: theme.panelBorder }}>
          <div>
            <h3 className="text-base font-bold text-stone-800">新建对话</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-colors"
            style={{
              borderColor: theme.chipBorder,
              backgroundColor: theme.panelBg,
              color: theme.textMuted
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-5">
          <button
            onClick={onCreateGenericSession}
            className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
            style={{
              borderColor: theme.panelBorder,
              backgroundColor: theme.panelBgStrong,
              color: theme.textPrimary
            }}
          >
            <div className="text-sm font-semibold">普通对话</div>
          </button>
          <button
            onClick={onOpenWeeklyReviewTemplateSelection}
            className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
            style={{
              borderColor: theme.panelBorder,
              backgroundColor: theme.panelBgStrong,
              color: theme.textPrimary
            }}
          >
            <div className="text-sm font-semibold">模板对话：周复盘</div>
          </button>
          <button
            onClick={onOpenMonthlyReviewTemplateSelection}
            className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
            style={{
              borderColor: theme.panelBorder,
              backgroundColor: theme.panelBgStrong,
              color: theme.textPrimary
            }}
          >
            <div className="text-sm font-semibold">模板对话：月复盘</div>
          </button>
        </div>
      </div>
    </div>
  );
};
