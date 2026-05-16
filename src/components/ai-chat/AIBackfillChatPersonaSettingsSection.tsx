/**
 * @file AIBackfillChatPersonaSettingsSection.tsx
 * @input Active persona state, user-avatar state, theme tokens, upload refs, and persona-management callbacks
 * @output Persona-settings branch for the AI settings overlay
 * @pos Component Support (AI Integration)
 * @description Extracts the persona-management branch out of AIBackfillChatModal so the modal can keep AI settings orchestration while this section preserves the existing persona and avatar editing UI.
 * @updated 2026-05-16: Switched custom prompt blocks to a flat list with modal editing so the settings page avoids nested card-in-card editing.
 * @updated 2026-05-16: Added per-item enable toggles for custom prompt blocks so each extra rule can be included or skipped independently.
 * @updated 2026-05-16: Added a separated custom-prompt-block editor with multi-item add/delete controls under persona settings.
 * @updated 2026-05-15: Extracted the persona settings branch from AIBackfillChatModal.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Plus, RotateCcw, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { CustomSelect } from '../CustomSelect';
import {
  PersonaAvatar,
  UserAvatar,
  type AIChatCustomPromptBlock,
  type AIChatPersona,
  type AIChatUserProfile
} from './AIBackfillChatShared';

interface AIChatPersonaSettingsTheme {
  activeBg: string;
  activeBorder: string;
  avatarBg: string;
  avatarShadow: string;
  chipBg: string;
  chipBorder: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  inputBg: string;
  panelBg: string;
  panelBgStrong: string;
  panelBorder: string;
  primaryButtonBg: string;
  primaryButtonBorder: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
}

interface AIBackfillChatPersonaSettingsSectionProps {
  accentMix: (accentWeight: number, fallbackColor?: string) => string;
  activePersona: AIChatPersona;
  activeSessionPersonaId: string;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  customPromptBlocks: AIChatCustomPromptBlock[];
  deleteConfirmPersonaId: string | null;
  emojiChoices: string[];
  emojiDraft: string;
  isEmojiEditorOpen: boolean;
  isUploadingAvatar: boolean;
  isUploadingUserAvatar: boolean;
  isUserEmojiEditorOpen: boolean;
  onApplyEmojiAvatar: () => void | Promise<void>;
  onApplyPersonaPreset: (personaId: string) => void;
  onApplyUserEmojiAvatar: () => void | Promise<void>;
  onAvatarUpload: React.ChangeEventHandler<HTMLInputElement>;
  onAddCustomPromptBlock: () => string;
  onCancelDeletePersona: () => void;
  onCancelEmojiAvatarEdit: () => void;
  onCancelUserEmojiAvatarEdit: () => void;
  onCreatePersona: () => void;
  onDeleteCustomPromptBlock: (blockId: string) => void;
  onDeleteCurrentPersona: () => void | Promise<void>;
  onEmojiDraftChange: (value: string) => void;
  onResetUserAvatar: () => void | Promise<void>;
  onSelectEmoji: (emoji: string) => void;
  onSelectUserEmoji: (emoji: string) => void;
  onToggleDeletePersona: () => void;
  onUpdateCurrentPersona: (patch: Partial<AIChatPersona>) => void;
  onUpdateCustomPromptBlock: (blockId: string, patch: { title?: string; content?: string; enabled?: boolean }) => void;
  onUseEmojiAvatar: () => void;
  onUseUserEmojiAvatar: () => void;
  onUserAvatarUpload: React.ChangeEventHandler<HTMLInputElement>;
  onUserEmojiDraftChange: (value: string) => void;
  personas: AIChatPersona[];
  theme: AIChatPersonaSettingsTheme;
  userAvatarInputRef: React.RefObject<HTMLInputElement | null>;
  userEmojiDraft: string;
  userProfile: AIChatUserProfile;
}

export const AIBackfillChatPersonaSettingsSection: React.FC<AIBackfillChatPersonaSettingsSectionProps> = ({
  accentMix,
  activePersona,
  activeSessionPersonaId,
  avatarInputRef,
  customPromptBlocks,
  deleteConfirmPersonaId,
  emojiChoices,
  emojiDraft,
  isEmojiEditorOpen,
  isUploadingAvatar,
  isUploadingUserAvatar,
  isUserEmojiEditorOpen,
  onApplyEmojiAvatar,
  onApplyPersonaPreset,
  onApplyUserEmojiAvatar,
  onAvatarUpload,
  onAddCustomPromptBlock,
  onCancelDeletePersona,
  onCancelEmojiAvatarEdit,
  onCancelUserEmojiAvatarEdit,
  onCreatePersona,
  onDeleteCustomPromptBlock,
  onDeleteCurrentPersona,
  onEmojiDraftChange,
  onResetUserAvatar,
  onSelectEmoji,
  onSelectUserEmoji,
  onToggleDeletePersona,
  onUpdateCurrentPersona,
  onUpdateCustomPromptBlock,
  onUseEmojiAvatar,
  onUseUserEmojiAvatar,
  onUserAvatarUpload,
  onUserEmojiDraftChange,
  personas,
  theme,
  userAvatarInputRef,
  userEmojiDraft,
  userProfile
}) => {
  const [editingCustomPromptBlockId, setEditingCustomPromptBlockId] = React.useState<string | null>(null);
  const [customPromptBlockDraft, setCustomPromptBlockDraft] = React.useState<AIChatCustomPromptBlock | null>(null);

  const editingCustomPromptBlock = editingCustomPromptBlockId
    ? customPromptBlocks.find((block) => block.id === editingCustomPromptBlockId) || null
    : null;

  React.useEffect(() => {
    if (!editingCustomPromptBlock) {
      setCustomPromptBlockDraft(null);
      if (editingCustomPromptBlockId) {
        setEditingCustomPromptBlockId(null);
      }
      return;
    }

    setCustomPromptBlockDraft(editingCustomPromptBlock);
  }, [editingCustomPromptBlock, editingCustomPromptBlockId]);

  const handleOpenCustomPromptBlockEditor = (blockId: string) => {
    setEditingCustomPromptBlockId(blockId);
  };

  const handleCloseCustomPromptBlockEditor = () => {
    setEditingCustomPromptBlockId(null);
    setCustomPromptBlockDraft(null);
  };

  const handleCreateCustomPromptBlock = () => {
    const blockId = onAddCustomPromptBlock();
    setEditingCustomPromptBlockId(blockId);
  };

  const handleSaveCustomPromptBlock = () => {
    if (!editingCustomPromptBlockId || !customPromptBlockDraft) {
      return;
    }

    onUpdateCustomPromptBlock(editingCustomPromptBlockId, {
      title: customPromptBlockDraft.title,
      content: customPromptBlockDraft.content,
      enabled: customPromptBlockDraft.enabled
    });
    handleCloseCustomPromptBlockEditor();
  };

  const handleDeleteEditingCustomPromptBlock = () => {
    if (!editingCustomPromptBlockId) {
      return;
    }

    onDeleteCustomPromptBlock(editingCustomPromptBlockId);
    handleCloseCustomPromptBlockEditor();
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex min-h-[3.25rem] items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-stone-800">选择人设</p>
          </div>
          <button
            onClick={onCreatePersona}
            className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium text-[#4b5563] transition-colors hover:bg-white"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-color) 14%, #d8dde6)',
              backgroundColor: 'color-mix(in srgb, var(--accent-color) 4%, white)'
            }}
          >
            <Plus size={14} />
            添加人设
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">选择人设后会新建对话</span>
            <CustomSelect
              value={activeSessionPersonaId}
              onChange={onApplyPersonaPreset}
              options={personas.map((persona) => ({
                value: persona.id,
                label: `${persona.name || '未命名人设'}${persona.isBuiltIn ? ' · 内置' : ' · 自定义'}`
              }))}
              className="w-full"
            />
          </div>

          <span
            className="inline-flex h-[2.625rem] items-center rounded-[0.75rem] border px-3 text-xs font-medium"
            style={{
              borderColor: theme.chipBorder,
              backgroundColor: theme.chipBg,
              color: theme.textMuted
            }}
          >
            {activePersona.isBuiltIn ? '当前窗口：内置模板' : '当前窗口：自定义人设'}
          </span>
        </div>
      </section>

      <section
        className="border-t pt-5"
        style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)' }}
      >
        <div className="mb-4 flex min-h-[3.25rem] items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-stone-800">人设内容</p>
          </div>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onAvatarUpload}
        />

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.95rem] border text-2xl"
                style={{
                  borderColor: theme.panelBorder,
                  backgroundColor: theme.avatarBg,
                  boxShadow: theme.avatarShadow
                }}
              >
                <PersonaAvatar persona={activePersona} iconClassName="text-2xl" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold" style={{ color: theme.textPrimary }}>
                  {activePersona.name || '未命名人设'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={onUseEmojiAvatar}
                className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.avatarBg,
                  color: theme.textSecondary
                }}
              >
                <Sparkles size={14} />
                Emoji
              </button>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.avatarBg,
                  color: theme.textSecondary
                }}
              >
                {isUploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isUploadingAvatar ? '上传中' : '上传图片'}
              </button>
              {!activePersona.isBuiltIn && (
                <button
                  onClick={onToggleDeletePersona}
                  className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    borderColor: theme.dangerBorder,
                    backgroundColor: theme.dangerBg,
                    color: theme.dangerText
                  }}
                >
                  <Trash2 size={14} />
                  删除人设
                </button>
              )}
            </div>

            {isEmojiEditorOpen && (
              <div
                className="rounded-[0.85rem] border p-3"
                style={{
                  borderColor: theme.panelBorder,
                  backgroundColor: theme.panelBg
                }}
              >
                <div className="flex flex-wrap gap-2">
                  {emojiChoices.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onSelectEmoji(emoji)}
                      className={`flex h-10 w-10 items-center justify-center rounded-[0.7rem] border text-lg transition-colors ${
                        emojiDraft.trim() === emoji ? 'shadow-[0_0_0_1px_rgba(0,0,0,0.03)]' : 'hover:bg-white'
                      }`}
                      style={emojiDraft.trim() === emoji
                        ? {
                          borderColor: theme.activeBorder,
                          backgroundColor: theme.activeBg,
                          color: theme.textPrimary
                        }
                        : {
                          borderColor: theme.panelBorder,
                          backgroundColor: theme.panelBgStrong,
                          color: theme.textSecondary
                        }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div
                  className="mt-3 rounded-[0.75rem] border px-3 py-3"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.inputBg
                  }}
                >
                  <input
                    value={emojiDraft}
                    onChange={(event) => onEmojiDraftChange(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: theme.textPrimary }}
                    placeholder="输入一个 Emoji，例如 ✨"
                  />
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={onCancelEmojiAvatarEdit}
                    className="rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white"
                    style={{
                      borderColor: theme.chipBorder,
                      backgroundColor: theme.inputBg,
                      color: theme.textSecondary
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => void onApplyEmojiAvatar()}
                    className="rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium text-white transition-colors"
                    style={{
                      borderColor: theme.primaryButtonBorder,
                      backgroundColor: theme.primaryButtonBg
                    }}
                  >
                    保存 Emoji
                  </button>
                </div>
              </div>
            )}

            {deleteConfirmPersonaId === activePersona.id && !activePersona.isBuiltIn && (
              <div
                className="rounded-[0.85rem] border p-3 text-xs"
                style={{
                  borderColor: theme.dangerBorder,
                  backgroundColor: theme.dangerBg,
                  color: theme.dangerText
                }}
              >
                <p>确认删除这个人设？</p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={onCancelDeletePersona}
                    className="rounded-[0.75rem] border px-3 py-1.5 font-medium transition-colors hover:bg-white"
                    style={{
                      borderColor: theme.chipBorder,
                      backgroundColor: theme.avatarBg,
                      color: theme.textSecondary
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => void onDeleteCurrentPersona()}
                    className="rounded-[0.75rem] border px-3 py-1.5 font-medium text-white transition-colors"
                    style={{
                      borderColor: theme.dangerBorder,
                      backgroundColor: theme.dangerText
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone-500">名字</span>
                <input
                  value={activePersona.name}
                  onChange={(event) => onUpdateCurrentPersona({ name: event.target.value })}
                  className="w-full rounded-[1rem] border px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.textPrimary
                  }}
                  placeholder="可留空"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone-500">AI 自称</span>
                <input
                  value={activePersona.assistantSelfName}
                  onChange={(event) => onUpdateCurrentPersona({ assistantSelfName: event.target.value })}
                  className="w-full rounded-[1rem] border px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.textPrimary
                  }}
                  placeholder="可留空"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-500">对用户称呼</span>
              <input
                value={activePersona.userCallName}
                onChange={(event) => onUpdateCurrentPersona({ userCallName: event.target.value })}
                className="w-full rounded-[1rem] border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.inputBg,
                  color: theme.textPrimary
                }}
                placeholder="可留空"
              />
            </label>

            {!activePersona.isBuiltIn && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone-500">自定义提示词</span>
                <textarea
                  value={activePersona.systemPrompt}
                  onChange={(event) => onUpdateCurrentPersona({ systemPrompt: event.target.value })}
                  className="min-h-[220px] w-full rounded-[0.85rem] border px-4 py-3 text-sm leading-7 outline-none"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.textPrimary
                  }}
                  placeholder="补充这个人设的语气、风格、偏好、边界条件。"
                />
              </label>
            )}

            <div
              className="border-t pt-4"
              style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)' }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: theme.textPrimary }}>自定义提示词块</p>
                </div>
                <button
                  onClick={handleCreateCustomPromptBlock}
                  className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.avatarBg,
                    color: theme.textSecondary
                  }}
                >
                  <Plus size={14} />
                  添加条目
                </button>
              </div>

              {customPromptBlocks.length === 0 ? (
                <div className="py-3 text-sm" style={{ color: theme.textMuted }}>
                  还没有额外提示词块。你可以按条补充文风设置、语言风格等要求。
                </div>
              ) : (
                <div className="border-y" style={{ borderColor: theme.panelBorder }}>
                  {customPromptBlocks.map((block, index) => (
                    <div
                      key={block.id}
                      className="flex items-start justify-between gap-4 border-b px-0 py-4 last:border-b-0"
                      style={{ borderColor: theme.panelBorder }}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenCustomPromptBlockEditor(block.id)}
                        className="min-w-0 flex-1 bg-transparent text-left"
                      >
                        <div className="mb-2 flex items-center gap-3">
                          <span className="text-xs font-medium" style={{ color: theme.textMuted }}>
                            条目 {index + 1}
                          </span>
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              borderColor: block.enabled ? theme.activeBorder : theme.chipBorder,
                              backgroundColor: block.enabled ? theme.activeBg : theme.avatarBg,
                              color: block.enabled ? theme.textPrimary : theme.textMuted
                            }}
                          >
                            {block.enabled ? '已启用' : '已停用'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="truncate text-sm font-semibold" style={{ color: theme.textPrimary }}>
                            {block.title.trim() || '未命名条目'}
                          </p>
                          <p className="line-clamp-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                            {block.content.trim() || '点击编辑这个提示词块'}
                          </p>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateCustomPromptBlock(block.id, { enabled: !block.enabled })}
                          className="inline-flex items-center rounded-[0.7rem] border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white"
                          style={{
                            borderColor: block.enabled ? theme.activeBorder : theme.chipBorder,
                            backgroundColor: block.enabled ? theme.activeBg : theme.avatarBg,
                            color: block.enabled ? theme.textPrimary : theme.textMuted
                          }}
                        >
                          {block.enabled ? '停用' : '启用'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCustomPromptBlockEditor(block.id)}
                          className="text-xs transition-colors hover:text-stone-900"
                          style={{ color: theme.textMuted }}
                        >
                          编辑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {customPromptBlockDraft && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-stone-900/40 backdrop-blur-sm animate-fadeIn pb-[env(safe-area-inset-bottom)] md:items-center"
          onClick={handleCloseCustomPromptBlockEditor}
        >
          <div
            className="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-[#faf9f6] shadow-2xl animate-slideUp md:h-auto md:max-h-[85vh] md:max-w-2xl md:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 bg-white/50 p-6">
              <button
                onClick={handleCloseCustomPromptBlockEditor}
                className="rounded-full p-2 -ml-2 text-stone-500 transition-colors hover:bg-stone-100"
              >
                <X size={24} />
              </button>
              <div className="flex flex-col items-center">
                <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">Prompt Block</span>
                <span className="text-base font-bold text-stone-900">编辑提示词块</span>
              </div>
              <div className="w-10" />
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium" style={{ color: theme.textMuted }}>
                  发送时{customPromptBlockDraft.enabled ? '会' : '不会'}拼进 AI 提示词
                </span>
                <button
                  onClick={() => setCustomPromptBlockDraft((current) => (
                    current
                      ? { ...current, enabled: !current.enabled }
                      : current
                  ))}
                  className="inline-flex items-center rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                  style={{
                    borderColor: customPromptBlockDraft.enabled ? theme.activeBorder : theme.chipBorder,
                    backgroundColor: customPromptBlockDraft.enabled ? theme.activeBg : theme.avatarBg,
                    color: customPromptBlockDraft.enabled ? theme.textPrimary : theme.textMuted
                  }}
                >
                  {customPromptBlockDraft.enabled ? '已启用' : '已停用'}
                </button>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone-500">标题</span>
                <input
                  value={customPromptBlockDraft.title}
                  onChange={(event) => setCustomPromptBlockDraft((current) => (
                    current
                      ? { ...current, title: event.target.value }
                      : current
                  ))}
                  className="w-full rounded-[0.95rem] border px-3 py-2.5 text-sm outline-none"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.textPrimary
                  }}
                  placeholder="例如：文风设置"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-stone-500">内容</span>
                <textarea
                  value={customPromptBlockDraft.content}
                  onChange={(event) => setCustomPromptBlockDraft((current) => (
                    current
                      ? { ...current, content: event.target.value }
                      : current
                  ))}
                  className="min-h-[220px] w-full rounded-[0.95rem] border px-4 py-3 text-sm leading-7 outline-none"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.textPrimary
                  }}
                  placeholder="写下这一条需要额外发送给 AI 的提示词。"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-stone-100 bg-white/50 px-6 py-4">
              <button
                onClick={handleDeleteEditingCustomPromptBlock}
                className="inline-flex items-center gap-1.5 rounded-[0.8rem] border px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  borderColor: theme.dangerBorder,
                  backgroundColor: theme.dangerBg,
                  color: theme.dangerText
                }}
              >
                <Trash2 size={14} />
                删除条目
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCloseCustomPromptBlockEditor}
                  className="rounded-[0.8rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.textSecondary
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCustomPromptBlock}
                  className="rounded-[0.8rem] border px-3 py-2 text-xs font-medium text-white transition-colors"
                  style={{
                    borderColor: theme.primaryButtonBorder,
                    backgroundColor: theme.primaryButtonBg
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <section
        className="border-t pt-5"
        style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)' }}
      >
        <div className="mb-4 flex min-h-[3.25rem] items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-stone-800">用户头像</p>
          </div>
          <span
            className="rounded-[0.75rem] border px-3 py-1 text-xs font-medium"
            style={{
              borderColor: theme.chipBorder,
              backgroundColor: theme.chipBg,
              color: theme.textMuted
            }}
          >
            全局设置
          </span>
        </div>

        <input
          ref={userAvatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUserAvatarUpload}
        />

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <div className="flex items-center gap-4">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.95rem] border text-2xl"
              style={{
                borderColor: theme.panelBorder,
                backgroundColor: theme.avatarBg,
                boxShadow: theme.avatarShadow
              }}
            >
              <UserAvatar profile={userProfile} iconClassName="text-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>当前用户头像</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onUseUserEmojiAvatar}
                className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.avatarBg,
                  color: theme.textSecondary
                }}
              >
                <Sparkles size={14} />
                Emoji
              </button>
              <button
                onClick={() => userAvatarInputRef.current?.click()}
                disabled={isUploadingUserAvatar}
                className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.avatarBg,
                  color: theme.textSecondary
                }}
              >
                {isUploadingUserAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isUploadingUserAvatar ? '上传中' : '上传图片'}
              </button>
              <button
                onClick={() => void onResetUserAvatar()}
                className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                style={{
                  borderColor: theme.chipBorder,
                  backgroundColor: theme.avatarBg,
                  color: theme.textSecondary
                }}
              >
                <RotateCcw size={14} />
                重置
              </button>
            </div>

            {isUserEmojiEditorOpen && (
              <div
                className="rounded-[0.85rem] border p-3"
                style={{
                  borderColor: theme.panelBorder,
                  backgroundColor: theme.panelBg
                }}
              >
                <div className="flex flex-wrap gap-2">
                  {emojiChoices.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onSelectUserEmoji(emoji)}
                      className={`flex h-10 w-10 items-center justify-center rounded-[0.7rem] border text-lg transition-colors ${
                        userEmojiDraft.trim() === emoji ? 'shadow-[0_0_0_1px_rgba(0,0,0,0.03)]' : 'hover:bg-white'
                      }`}
                      style={userEmojiDraft.trim() === emoji
                        ? {
                          borderColor: theme.activeBorder,
                          backgroundColor: theme.activeBg,
                          color: theme.textPrimary
                        }
                        : {
                          borderColor: theme.panelBorder,
                          backgroundColor: theme.panelBgStrong,
                          color: theme.textSecondary
                        }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div
                  className="mt-3 rounded-[0.75rem] border px-3 py-3"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.inputBg
                  }}
                >
                  <input
                    value={userEmojiDraft}
                    onChange={(event) => onUserEmojiDraftChange(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: theme.textPrimary }}
                    placeholder="输入一个 Emoji，例如 🙂"
                  />
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={onCancelUserEmojiAvatarEdit}
                    className="rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white"
                    style={{
                      borderColor: theme.chipBorder,
                      backgroundColor: theme.inputBg,
                      color: theme.textSecondary
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => void onApplyUserEmojiAvatar()}
                    className="rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium text-white transition-colors"
                    style={{
                      borderColor: theme.primaryButtonBorder,
                      backgroundColor: theme.primaryButtonBg
                    }}
                  >
                    保存 Emoji
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
