/**
 * @file useAIBackfillChatPersonaProfile.ts
 * @input Active chat persona, user profile, prompt blocks, shortcuts, and their state setters
 * @output Persona/profile editing handlers including avatar upload and local image cleanup
 * @pos Component Support (AI Integration)
 * @description Keeps persona and profile editing workflows out of the main AI chat coordinator.
 * @updated 2026-09-22: Extracted persona, prompt-block, shortcut, and avatar handlers from AIBackfillChatModal.
 * @updated 2026-09-23: Returns the custom-prompt deletion handler used by the settings panel.
 */
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { AIChatPersona, AIChatSession, AIChatShortcut, AIChatUserProfile, AIChatCustomPromptBlock } from './AIBackfillChatShared';
import { DEFAULT_AI_PERSONAS, clampContextLimit } from './AIBackfillChatInitialization';
import { imageService } from '../../services/imageService';

type AddToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;

export interface AIBackfillChatPersonaProfileOptions {
  activePersona: AIChatPersona;
  activeSession: AIChatSession | null;
  addToast: AddToast;
  emojiDraft: string;
  handleCreateSessionWithPersona: (personaId: string) => void;
  mutateSession: (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => void;
  personas: AIChatPersona[];
  sessions: AIChatSession[];
  setCustomPromptBlocks: Dispatch<SetStateAction<AIChatCustomPromptBlock[]>>;
  setDeleteConfirmPersonaId: Dispatch<SetStateAction<string | null>>;
  setEmojiDraft: Dispatch<SetStateAction<string>>;
  setIsEmojiEditorOpen: Dispatch<SetStateAction<boolean>>;
  setIsUploadingAvatar: Dispatch<SetStateAction<boolean>>;
  setIsUploadingUserAvatar: Dispatch<SetStateAction<boolean>>;
  setIsUserEmojiEditorOpen: Dispatch<SetStateAction<boolean>>;
  setPersonas: Dispatch<SetStateAction<AIChatPersona[]>>;
  setSessions: Dispatch<SetStateAction<AIChatSession[]>>;
  setShortcuts: Dispatch<SetStateAction<AIChatShortcut[]>>;
  setUserEmojiDraft: Dispatch<SetStateAction<string>>;
  setUserProfile: Dispatch<SetStateAction<AIChatUserProfile>>;
  userEmojiDraft: string;
  userProfile: AIChatUserProfile;
}

export const useAIBackfillChatPersonaProfile = ({
  activePersona,
  activeSession,
  addToast,
  emojiDraft,
  handleCreateSessionWithPersona,
  mutateSession,
  personas,
  sessions,
  setCustomPromptBlocks,
  setDeleteConfirmPersonaId,
  setEmojiDraft,
  setIsEmojiEditorOpen,
  setIsUploadingAvatar,
  setIsUploadingUserAvatar,
  setIsUserEmojiEditorOpen,
  setPersonas,
  setSessions,
  setShortcuts,
  setUserEmojiDraft,
  setUserProfile,
  userEmojiDraft,
  userProfile
}: AIBackfillChatPersonaProfileOptions) => {
  const updateUserProfile = (patch: Partial<AIChatUserProfile>) => {
    setUserProfile((prev) => ({
      ...prev,
      ...patch
    }));
  };

  const ensureEditablePersona = (): AIChatPersona => {
    if (!activeSession || !activePersona.isBuiltIn) {
      return activePersona;
    }

    const clonedPersona: AIChatPersona = {
      ...activePersona,
      id: crypto.randomUUID(),
      isBuiltIn: false,
      name: `${activePersona.name} 自定义`
    };

    setPersonas((prev) => [...prev, clonedPersona]);
    mutateSession(activeSession.id, (session) => ({
      ...session,
      personaId: clonedPersona.id
    }));

    return clonedPersona;
  };

  const handleApplyPersonaPreset = (personaId: string) => {
    if (!personaId || personaId === activeSession?.personaId) {
      return;
    }

    handleCreateSessionWithPersona(personaId);
  };

  const handleCreatePersona = () => {
    const newPersona: AIChatPersona = {
      id: crypto.randomUUID(),
      name: '新的人设',
      avatarIcon: '✨',
      assistantSelfName: '',
      userCallName: '',
      systemPrompt: '',
      contextMessageLimit: 30,
      isBuiltIn: false
    };

    setPersonas((prev) => [...prev, newPersona]);
    handleCreateSessionWithPersona(newPersona.id);
  };

  const handleDeleteCurrentPersona = async () => {
    if (activePersona.isBuiltIn) {
      return;
    }

    const deletingPersonaId = activePersona.id;
    const fallbackPersonaId = DEFAULT_AI_PERSONAS[0]?.id || personas[0]?.id;
    if (!fallbackPersonaId || fallbackPersonaId === deletingPersonaId) {
      return;
    }

    if (activePersona.avatarImage) {
      try {
        await imageService.deleteImage(activePersona.avatarImage);
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to delete persona avatar image', error);
      }
    }

    setPersonas((prev) => prev.filter((persona) => persona.id !== deletingPersonaId));
    setSessions((prev) => prev.map((session) => (
      session.personaId === deletingPersonaId
        ? { ...session, personaId: fallbackPersonaId, updatedAt: Date.now() }
        : session
    )));
    setDeleteConfirmPersonaId(null);
    setIsEmojiEditorOpen(false);
    addToast('success', '已删除人设');
  };

  const updateCurrentPersona = (patch: Partial<AIChatPersona>) => {
    const editablePersona = ensureEditablePersona();

    setPersonas((prev) => prev.map((persona) => (
      persona.id === editablePersona.id
        ? {
          ...persona,
          ...patch,
          contextMessageLimit: clampContextLimit(patch.contextMessageLimit ?? persona.contextMessageLimit)
        }
        : persona
    )));
  };

  const handleAddCustomPromptBlock = (): string => {
    const blockId = crypto.randomUUID();
    setCustomPromptBlocks((prev) => [...prev, {
      id: blockId,
      title: '',
      content: '',
      enabled: true
    }]);
    return blockId;
  };

  const handleUpdateCustomPromptBlock = (
    blockId: string,
    patch: { title?: string; content?: string; enabled?: boolean }
  ) => {
    setCustomPromptBlocks((prev) => prev.map((block) => (
      block.id === blockId ? { ...block, ...patch } : block
    )));
  };

  const handleDeleteCustomPromptBlock = (blockId: string) => {
    setCustomPromptBlocks((prev) => prev.filter((block) => block.id !== blockId));
  };

  const handleAddShortcut = (): string => {
    const shortcutId = crypto.randomUUID();
    setShortcuts((prev) => [...prev, {
      id: shortcutId,
      title: '',
      content: '',
      enabled: true
    }]);
    return shortcutId;
  };

  const handleUpdateShortcut = (
    shortcutId: string,
    patch: Partial<Pick<AIChatShortcut, 'title' | 'content' | 'enabled'>>
  ) => {
    setShortcuts((prev) => prev.map((shortcut) => (
      shortcut.id === shortcutId ? { ...shortcut, ...patch } : shortcut
    )));
  };

  const handleDeleteShortcut = (shortcutId: string) => {
    setShortcuts((prev) => prev.filter((shortcut) => shortcut.id !== shortcutId));
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      addToast('warning', '请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast('warning', '图片大小不能超过 10MB');
      return;
    }

    const previousAvatarImage = activePersona.avatarImage;
    setIsEmojiEditorOpen(false);
    setIsUploadingAvatar(true);
    try {
      const filename = await imageService.saveImage(file);
      if (previousAvatarImage) {
        await imageService.deleteImage(previousAvatarImage).catch((error) => {
          console.error('[AIBackfillChatModal] Failed to delete previous avatar image', error);
        });
      }

      setPersonas((prev) => prev.map((persona) => (
        persona.id === activePersona.id
          ? { ...persona, avatarImage: filename, avatarIcon: persona.avatarIcon || '✨' }
          : persona
      )));
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to upload persona avatar', error);
      addToast('error', '头像上传失败，请重试');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUseEmojiAvatar = () => {
    setEmojiDraft(activePersona.avatarIcon || '✨');
    setIsEmojiEditorOpen(true);
  };

  const handleCancelEmojiAvatarEdit = () => {
    setEmojiDraft(activePersona.avatarIcon || '✨');
    setIsEmojiEditorOpen(false);
  };

  const handleApplyEmojiAvatar = async () => {
    const trimmedEmoji = emojiDraft.trim() || '✨';
    const previousAvatarImage = activePersona.avatarImage;

    if (previousAvatarImage) {
      try {
        await imageService.deleteImage(previousAvatarImage);
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to delete avatar image when switching to emoji', error);
      }
    }

    setPersonas((prev) => prev.map((persona) => (
      persona.id === activePersona.id
        ? { ...persona, avatarIcon: trimmedEmoji, avatarImage: undefined }
        : persona
    )));
    setIsEmojiEditorOpen(false);
  };

  const handleUserAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      addToast('warning', '请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast('warning', '图片大小不能超过 10MB');
      return;
    }

    const previousAvatarImage = userProfile.avatarImage;
    setIsUserEmojiEditorOpen(false);
    setIsUploadingUserAvatar(true);
    try {
      const filename = await imageService.saveImage(file);
      if (previousAvatarImage) {
        await imageService.deleteImage(previousAvatarImage).catch((error) => {
          console.error('[AIBackfillChatModal] Failed to delete previous user avatar image', error);
        });
      }

      updateUserProfile({ avatarImage: filename });
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to upload user avatar', error);
      addToast('error', '用户头像上传失败，请重试');
    } finally {
      setIsUploadingUserAvatar(false);
    }
  };

  const handleUseUserEmojiAvatar = () => {
    setUserEmojiDraft(userProfile.avatarIcon || '');
    setIsUserEmojiEditorOpen(true);
  };

  const handleCancelUserEmojiAvatarEdit = () => {
    setUserEmojiDraft(userProfile.avatarIcon || '');
    setIsUserEmojiEditorOpen(false);
  };

  const handleApplyUserEmojiAvatar = async () => {
    const previousAvatarImage = userProfile.avatarImage;
    if (previousAvatarImage) {
      try {
        await imageService.deleteImage(previousAvatarImage);
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to delete user avatar image when switching to emoji', error);
      }
    }

    updateUserProfile({
      avatarIcon: userEmojiDraft.trim(),
      avatarImage: undefined
    });
    setIsUserEmojiEditorOpen(false);
  };

  const handleResetUserAvatar = async () => {
    const previousAvatarImage = userProfile.avatarImage;
    if (previousAvatarImage) {
      try {
        await imageService.deleteImage(previousAvatarImage);
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to delete user avatar image on reset', error);
      }
    }

    setUserProfile({ avatarIcon: '' });
    setUserEmojiDraft('');
    setIsUserEmojiEditorOpen(false);
  };

  return {
    handleAddCustomPromptBlock,
    handleAddShortcut,
    handleApplyEmojiAvatar,
    handleApplyPersonaPreset,
    handleApplyUserEmojiAvatar,
    handleAvatarUpload,
    handleCancelEmojiAvatarEdit,
    handleCancelUserEmojiAvatarEdit,
    handleCreatePersona,
    handleDeleteCurrentPersona,
    handleDeleteCustomPromptBlock,
    handleDeleteShortcut,
    handleUpdateCustomPromptBlock,
    handleUpdateShortcut,
    handleUserAvatarUpload,
    handleUseEmojiAvatar,
    handleUseUserEmojiAvatar,
    handleResetUserAvatar,
    updateCurrentPersona,
    ensureEditablePersona
  };
};
