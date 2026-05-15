/**
 * @file AIBackfillChatPersonaSettingsSection.tsx
 * @input Active persona state, user-avatar state, theme tokens, upload refs, and persona-management callbacks
 * @output Persona-settings branch for the AI settings overlay
 * @pos Component Support (AI Integration)
 * @description Extracts the persona-management branch out of AIBackfillChatModal so the modal can keep AI settings orchestration while this section preserves the existing persona and avatar editing UI.
 * @updated 2026-05-15: Extracted the persona settings branch from AIBackfillChatModal.
 */
import React from 'react';
import { Loader2, Plus, RotateCcw, Sparkles, Trash2, Upload } from 'lucide-react';
import { CustomSelect } from '../CustomSelect';
import {
  PersonaAvatar,
  UserAvatar,
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
  onCancelDeletePersona: () => void;
  onCancelEmojiAvatarEdit: () => void;
  onCancelUserEmojiAvatarEdit: () => void;
  onCreatePersona: () => void;
  onDeleteCurrentPersona: () => void | Promise<void>;
  onEmojiDraftChange: (value: string) => void;
  onResetUserAvatar: () => void | Promise<void>;
  onSelectEmoji: (emoji: string) => void;
  onSelectUserEmoji: (emoji: string) => void;
  onToggleDeletePersona: () => void;
  onUpdateCurrentPersona: (patch: Partial<AIChatPersona>) => void;
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
  onCancelDeletePersona,
  onCancelEmojiAvatarEdit,
  onCancelUserEmojiAvatarEdit,
  onCreatePersona,
  onDeleteCurrentPersona,
  onEmojiDraftChange,
  onResetUserAvatar,
  onSelectEmoji,
  onSelectUserEmoji,
  onToggleDeletePersona,
  onUpdateCurrentPersona,
  onUseEmojiAvatar,
  onUseUserEmojiAvatar,
  onUserAvatarUpload,
  onUserEmojiDraftChange,
  personas,
  theme,
  userAvatarInputRef,
  userEmojiDraft,
  userProfile
}) => (
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
        </div>
      </div>
    </section>

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
              默认
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
                    key={`user-${emoji}`}
                    onClick={() => onSelectUserEmoji(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded-[0.7rem] border text-lg transition-colors hover:bg-white"
                    style={{
                      borderColor: userEmojiDraft.trim() === emoji ? theme.activeBorder : theme.panelBorder,
                      backgroundColor: userEmojiDraft.trim() === emoji ? theme.activeBg : theme.panelBgStrong,
                      color: userEmojiDraft.trim() === emoji ? theme.textPrimary : theme.textSecondary,
                      boxShadow: userEmojiDraft.trim() === emoji ? `0 0 0 1px ${accentMix(8, 'rgba(0,0,0,0.02)')}` : undefined
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
                    backgroundColor: theme.chipBg,
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
