/**
 * @file AIBackfillChatInitialization.ts
 * @input Persisted persona/session/profile payloads plus built-in persona prompt constants
 * @output AI chat storage keys, default personas, and normalization helpers for rehydrating modal state
 * @pos Component Support (AI Integration)
 * @description Moves the large persistence/bootstrap normalization layer out of AIBackfillChatModal so startup state restoration stays pure and isolated from the runtime orchestration logic.
 * @updated 2026-06-07: Added weekly/monthly newspaper writeback result normalization so periodic AI newspaper cards persist across chat reloads.
 * @updated 2026-05-16: Normalized legacy garbled background-debug labels during chat-state hydration so older persisted assistant messages render readable Chinese titles.
 * @updated 2026-05-16: Moved custom prompt blocks into a global store, with legacy persona-bound block migration during initial chat-state hydration.
 * @updated 2026-05-16: Normalized per-block enabled flags for persona custom prompt blocks and defaulted legacy blocks to enabled.
 * @updated 2026-05-16: Normalized persona-scoped custom prompt blocks so extra labeled prompt snippets persist across AI chat sessions.
 * @updated 2026-05-15: Extracted built-in personas, storage keys, and persisted chat-state normalization from AIBackfillChatModal.
 */
import { BUILTIN_PERSONA_SYSTEM_PROMPTS } from '../../constants/aiPersonaSystemPrompts';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import { monthlyReviewTemplateService } from '../../services/monthlyReviewTemplateService';
import { weeklyReviewTemplateService } from '../../services/weeklyReviewTemplateService';
import { normalizeAssistantDisplayParts } from '../../utils/assistantMessageParts';
import { normalizeAssistantReasoningSummary } from '../../utils/assistantReasoning';
import { normalizeDreamRetryYearMonth } from './AIBackfillChatDreamFlow';
import {
  createDefaultChatSession,
  loadInitialChatStateFromStorage,
  normalizeChatSessions
} from './AIBackfillChatSessionHelpers';
import type {
  AIChatCustomPromptBlock,
  AIChatDailyNewspaperWritebackResult,
  AIChatDailyReviewWritebackResult,
  AIChatDebugSection,
  AIChatDreamUpdateCard,
  AIChatMemoryUpdateSection,
  AIChatMessage,
  AIChatMonthlyNewspaperWritebackResult,
  AIChatMonthlyReviewWritebackResult,
  AIChatPersona,
  AIChatSession,
  AIChatUserProfile,
  AIChatWeeklyNewspaperWritebackResult,
  AIChatWeeklyReviewWritebackResult,
  ChatTone,
  InitialChatState
} from './AIBackfillChatShared';

export const CHAT_SESSIONS_KEY = 'lumostime_ai_chat_sessions_v1';
export const ACTIVE_SESSION_KEY = 'lumostime_ai_chat_active_session_v1';
export const CHAT_PERSONAS_KEY = 'lumostime_ai_chat_personas_v1';
export const CHAT_CUSTOM_PROMPT_BLOCKS_KEY = 'lumostime_ai_chat_custom_prompt_blocks_v1';
export const DEBUG_MODE_KEY = 'lumostime_ai_chat_debug_mode_v1';
export const USER_PROFILE_KEY = 'lumostime_ai_chat_user_profile_v1';

export const DEFAULT_AI_PERSONAS: AIChatPersona[] = [
  {
    id: 'builtin-default',
    name: '默认',
    avatarIcon: '🗂️',
    assistantSelfName: '',
    userCallName: '',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-default'],
    contextMessageLimit: 30,
    isBuiltIn: true
  },
  {
    id: 'builtin-banliang',
    name: '半两（小猫）',
    avatarIcon: '🐱',
    assistantSelfName: '半两',
    userCallName: '',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-banliang'],
    contextMessageLimit: 30,
    isBuiltIn: true
  },
  {
    id: 'builtin-shenyuqiu',
    name: '沈聿秋（教授）',
    avatarIcon: '📚',
    assistantSelfName: '',
    userCallName: '',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-shenyuqiu'],
    contextMessageLimit: 30,
    isBuiltIn: true
  },
  {
    id: 'builtin-suwanqing',
    name: '苏晚晴（姐姐）',
    avatarIcon: '💗',
    assistantSelfName: '',
    userCallName: '',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-suwanqing'],
    contextMessageLimit: 30,
    isBuiltIn: true
  }
];

const PERSONA_PRESET_ORDER = DEFAULT_AI_PERSONAS.map((persona) => persona.id);
export const PERSONA_EMOJI_CHOICES = ['✨', '🤖', '🌞', '🦊', '🦉', '🌿', '📚', '🎯'];

const clampNumber = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

export const clampContextLimit = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 30;
  }
  return clampNumber(Math.round(numeric), 0, 1000);
};

const isValidTone = (value: unknown): value is ChatTone => (
  value === 'normal' || value === 'system' || value === 'error' || value === 'pending'
);

const normalizeDebugSectionLabel = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.includes('Log Submitted')) {
    return '后台日志提交调试';
  }

  return trimmed;
};

const normalizeDebugSections = (value: unknown): AIChatDebugSection[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as AIChatDebugSection;
    const label = normalizeDebugSectionLabel(candidate.label);
    if (!label || !candidate.exchange) {
      return [];
    }

    return [{
      ...candidate,
      label
    }];
  });
};

const normalizeAppliedActions = (value: unknown): AppliedChatAction[] => (
  Array.isArray(value) ? value as AppliedChatAction[] : []
);

const normalizeMemoryUpdates = (value: unknown): AIChatMemoryUpdateSection[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AIChatMemoryUpdateSection>;
    if (typeof candidate.label !== 'string' || !Array.isArray(candidate.items)) {
      return [];
    }

    const items = candidate.items
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);

    if (!candidate.label.trim() || items.length === 0) {
      return [];
    }

    return [{
      label: candidate.label.trim(),
      items
    }];
  });
};

const normalizeReminderUpdates = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : []
);

const normalizeCustomPromptBlocks = (value: unknown): AIChatCustomPromptBlock[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AIChatCustomPromptBlock>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
    const content = typeof candidate.content === 'string' ? candidate.content.trim() : '';
    const enabled = typeof candidate.enabled === 'boolean' ? candidate.enabled : true;

    if (!id || (!title && !content)) {
      return [];
    }

    return [{
      id,
      title,
      content,
      enabled
    }];
  });
};

const normalizeLegacyPersonaBoundCustomPromptBlocks = (value: unknown): AIChatCustomPromptBlock[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const blocks: AIChatCustomPromptBlock[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const candidate = item as { customPromptBlocks?: unknown };
    normalizeCustomPromptBlocks(candidate.customPromptBlocks).forEach((block) => {
      const fingerprint = `${block.title}\u0000${block.content}\u0000${block.enabled ? '1' : '0'}`;
      if (seen.has(fingerprint)) {
        return;
      }
      seen.add(fingerprint);
      blocks.push(block);
    });
  });

  return blocks;
};

const normalizeDreamUpdates = (value: unknown): AIChatDreamUpdateCard[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AIChatDreamUpdateCard>;
    const topicId = typeof candidate.topicId === 'string' ? candidate.topicId.trim() : '';
    const topicTitle = typeof candidate.topicTitle === 'string' ? candidate.topicTitle.trim() : '';
    const content = typeof candidate.content === 'string' ? candidate.content.trim() : '';
    const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt.trim() : '';
    if (!topicId || !topicTitle || !content || !updatedAt) {
      return [];
    }

    return [{
      topicId,
      topicTitle,
      action: candidate.action === 'created' || candidate.action === 'deleted' ? candidate.action : 'updated',
      content,
      ...(typeof candidate.observedRangeStart === 'string' && candidate.observedRangeStart.trim()
        ? { observedRangeStart: candidate.observedRangeStart.trim() }
        : {}),
      ...(typeof candidate.observedRangeEnd === 'string' && candidate.observedRangeEnd.trim()
        ? { observedRangeEnd: candidate.observedRangeEnd.trim() }
        : {}),
      updatedAt
    }];
  });
};

const normalizeRetryInput = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
);

const normalizeRetrySourceUserMessageId = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
);

const normalizeDailyReviewWritebackResult = (value: unknown): AIChatDailyReviewWritebackResult | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<AIChatDailyReviewWritebackResult>;
  if (
    typeof candidate.dailyReviewId !== 'string'
    || typeof candidate.date !== 'string'
    || typeof candidate.title !== 'string'
    || typeof candidate.preview !== 'string'
  ) {
    return undefined;
  }

  return {
    dailyReviewId: candidate.dailyReviewId.trim(),
    date: candidate.date.trim(),
    title: candidate.title.trim(),
    preview: candidate.preview.trim(),
    createdReview: candidate.createdReview === true,
    mergeMode: candidate.mergeMode === 'overwrite' ? 'overwrite' : 'create'
  };
};

const normalizeDailyNewspaperWritebackResult = (value: unknown): AIChatDailyNewspaperWritebackResult | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<AIChatDailyNewspaperWritebackResult>;
  if (
    typeof candidate.dailyReviewId !== 'string'
    || typeof candidate.date !== 'string'
    || typeof candidate.title !== 'string'
    || typeof candidate.preview !== 'string'
  ) {
    return undefined;
  }

  return {
    dailyReviewId: candidate.dailyReviewId.trim(),
    date: candidate.date.trim(),
    title: candidate.title.trim(),
    preview: candidate.preview.trim(),
    createdReview: candidate.createdReview === true,
    mergeMode: candidate.mergeMode === 'overwrite' ? 'overwrite' : 'create'
  };
};

const normalizeWeeklyReviewWritebackResult = (value: unknown): AIChatWeeklyReviewWritebackResult | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<AIChatWeeklyReviewWritebackResult>;
  if (
    typeof candidate.weeklyReviewId !== 'string'
    || typeof candidate.weekStartDate !== 'string'
    || typeof candidate.weekEndDate !== 'string'
    || typeof candidate.title !== 'string'
    || typeof candidate.preview !== 'string'
  ) {
    return undefined;
  }

  return {
    weeklyReviewId: candidate.weeklyReviewId.trim(),
    weekStartDate: candidate.weekStartDate.trim(),
    weekEndDate: candidate.weekEndDate.trim(),
    title: candidate.title.trim(),
    preview: candidate.preview.trim(),
    createdReview: candidate.createdReview === true,
    mergeMode: candidate.mergeMode === 'overwrite' ? 'overwrite' : 'create'
  };
};

const normalizeWeeklyNewspaperWritebackResult = (value: unknown): AIChatWeeklyNewspaperWritebackResult | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<AIChatWeeklyNewspaperWritebackResult>;
  if (
    typeof candidate.weeklyReviewId !== 'string'
    || typeof candidate.weekStartDate !== 'string'
    || typeof candidate.weekEndDate !== 'string'
    || typeof candidate.title !== 'string'
    || typeof candidate.preview !== 'string'
  ) {
    return undefined;
  }

  return {
    weeklyReviewId: candidate.weeklyReviewId.trim(),
    weekStartDate: candidate.weekStartDate.trim(),
    weekEndDate: candidate.weekEndDate.trim(),
    title: candidate.title.trim(),
    preview: candidate.preview.trim(),
    createdReview: candidate.createdReview === true,
    mergeMode: candidate.mergeMode === 'overwrite' ? 'overwrite' : 'create'
  };
};

const normalizeMonthlyReviewWritebackResult = (value: unknown): AIChatMonthlyReviewWritebackResult | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<AIChatMonthlyReviewWritebackResult>;
  if (
    typeof candidate.monthlyReviewId !== 'string'
    || typeof candidate.monthStartDate !== 'string'
    || typeof candidate.monthEndDate !== 'string'
    || typeof candidate.title !== 'string'
    || typeof candidate.preview !== 'string'
  ) {
    return undefined;
  }

  return {
    monthlyReviewId: candidate.monthlyReviewId.trim(),
    monthStartDate: candidate.monthStartDate.trim(),
    monthEndDate: candidate.monthEndDate.trim(),
    title: candidate.title.trim(),
    preview: candidate.preview.trim(),
    createdReview: candidate.createdReview === true,
    mergeMode: candidate.mergeMode === 'overwrite' ? 'overwrite' : 'create'
  };
};

const normalizeMonthlyNewspaperWritebackResult = (value: unknown): AIChatMonthlyNewspaperWritebackResult | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<AIChatMonthlyNewspaperWritebackResult>;
  if (
    typeof candidate.monthlyReviewId !== 'string'
    || typeof candidate.monthStartDate !== 'string'
    || typeof candidate.monthEndDate !== 'string'
    || typeof candidate.title !== 'string'
    || typeof candidate.preview !== 'string'
  ) {
    return undefined;
  }

  return {
    monthlyReviewId: candidate.monthlyReviewId.trim(),
    monthStartDate: candidate.monthStartDate.trim(),
    monthEndDate: candidate.monthEndDate.trim(),
    title: candidate.title.trim(),
    preview: candidate.preview.trim(),
    createdReview: candidate.createdReview === true,
    mergeMode: candidate.mergeMode === 'overwrite' ? 'overwrite' : 'create'
  };
};

const normalizeTemplateMeta = (value: unknown): AIChatSession['templateMeta'] | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.templateType === 'weekly_review') {
    const normalizedWeekStartDate = typeof candidate.weekStartDate === 'string'
      ? candidate.weekStartDate.trim()
      : '';
    const normalizedWeekEndDate = typeof candidate.weekEndDate === 'string'
      ? candidate.weekEndDate.trim()
      : '';
    const hasResolvedWeek = Boolean(normalizedWeekStartDate && normalizedWeekEndDate);
    const selectedRangeLabel = (
      candidate.selectedRangeLabel === '本周'
      || candidate.selectedRangeLabel === '上周'
      || candidate.selectedRangeLabel === 'custom_date'
    )
      ? candidate.selectedRangeLabel
      : undefined;
    const methodId = (
      candidate.methodId === 'pdca'
      || candidate.methodId === 'systems'
      || candidate.methodId === 'cbt'
      || candidate.methodId === 'narrative'
    )
      ? candidate.methodId
      : undefined;
    const methodLabel = typeof candidate.methodLabel === 'string' && candidate.methodLabel.trim()
      ? candidate.methodLabel.trim()
      : (methodId
        ? weeklyReviewTemplateService.listMethodOptions().find((item) => item.id === methodId)?.title || '系统复盘'
        : undefined);
    const stage = (
      candidate.stage === 'select_range'
      || candidate.stage === 'select_method'
      || candidate.stage === 'ready'
    )
      ? candidate.stage
      : (hasResolvedWeek && methodId ? 'ready' : 'select_range');

    return {
      templateType: 'weekly_review',
      stage,
      ...(normalizedWeekStartDate ? { weekStartDate: normalizedWeekStartDate } : {}),
      ...(normalizedWeekEndDate ? { weekEndDate: normalizedWeekEndDate } : {}),
      ...(selectedRangeLabel ? { selectedRangeLabel } : {}),
      ...(methodId ? { methodId } : {}),
      ...(methodLabel ? { methodLabel } : {}),
      ...(candidate.pendingWriteIntent ? { pendingWriteIntent: true } : {})
    };
  }

  if (candidate.templateType === 'monthly_review') {
    const normalizedMonthStartDate = typeof candidate.monthStartDate === 'string'
      ? candidate.monthStartDate.trim()
      : '';
    const normalizedMonthEndDate = typeof candidate.monthEndDate === 'string'
      ? candidate.monthEndDate.trim()
      : '';
    const hasResolvedMonth = Boolean(normalizedMonthStartDate && normalizedMonthEndDate);
    const selectedRangeLabel = (
      candidate.selectedRangeLabel === '本月'
      || candidate.selectedRangeLabel === '上月'
      || candidate.selectedRangeLabel === 'custom_date'
    )
      ? candidate.selectedRangeLabel
      : undefined;
    const methodId = (
      candidate.methodId === 'pdca'
      || candidate.methodId === 'systems'
      || candidate.methodId === 'cbt'
      || candidate.methodId === 'narrative'
    )
      ? candidate.methodId
      : undefined;
    const methodLabel = typeof candidate.methodLabel === 'string' && candidate.methodLabel.trim()
      ? candidate.methodLabel.trim()
      : (methodId
        ? monthlyReviewTemplateService.listMethodOptions().find((item) => item.id === methodId)?.title || '系统复盘'
        : undefined);
    const stage = (
      candidate.stage === 'select_range'
      || candidate.stage === 'select_method'
      || candidate.stage === 'ready'
    )
      ? candidate.stage
      : (hasResolvedMonth && methodId ? 'ready' : 'select_range');

    return {
      templateType: 'monthly_review',
      stage,
      ...(normalizedMonthStartDate ? { monthStartDate: normalizedMonthStartDate } : {}),
      ...(normalizedMonthEndDate ? { monthEndDate: normalizedMonthEndDate } : {}),
      ...(selectedRangeLabel ? { selectedRangeLabel } : {}),
      ...(methodId ? { methodId } : {}),
      ...(methodLabel ? { methodLabel } : {}),
      ...(candidate.pendingWriteIntent ? { pendingWriteIntent: true } : {})
    };
  }

  return undefined;
};

const normalizeMessageContent = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed && !['null', 'undefined'].includes(trimmed.toLowerCase())
    ? trimmed
    : undefined;
};

const normalizeMessages = (value: unknown, getLocalDateStr: (date: Date) => string): AIChatMessage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AIChatMessage>;
    if (typeof candidate.id !== 'string' || (candidate.role !== 'user' && candidate.role !== 'assistant')) {
      return [];
    }

    if (typeof candidate.content !== 'string' || typeof candidate.createdAt !== 'number') {
      return [];
    }

    if (candidate.tone && !isValidTone(candidate.tone)) {
      return [];
    }

    const normalizedDisplayParts = candidate.role === 'assistant'
      ? normalizeAssistantDisplayParts(candidate.displayParts, candidate.content)
      : undefined;
    const normalizedReasoning = candidate.role === 'assistant'
      ? normalizeAssistantReasoningSummary(candidate.reasoning)
      : undefined;
    const normalizedContent = normalizeMessageContent(candidate.content)
      || (
        candidate.role === 'assistant'
        && normalizedDisplayParts?.length
          ? normalizedDisplayParts.join('\n')
          : undefined
      );
    if (!normalizedContent) {
      return [];
    }

    const normalizedMessage: AIChatMessage = {
      id: candidate.id,
      role: candidate.role,
      content: normalizedContent,
      ...(normalizedReasoning ? { reasoning: normalizedReasoning } : {}),
      ...(normalizedDisplayParts ? { displayParts: normalizedDisplayParts } : {}),
      createdAt: candidate.createdAt,
      ...(candidate.tone ? { tone: candidate.tone } : {}),
      ...(typeof candidate.backgroundDebugHistoryId === 'string' && candidate.backgroundDebugHistoryId.trim()
        ? { backgroundDebugHistoryId: candidate.backgroundDebugHistoryId.trim() }
        : {}),
      ...(candidate.debugSections ? { debugSections: normalizeDebugSections(candidate.debugSections) } : {}),
      ...(candidate.appliedActions ? { appliedActions: normalizeAppliedActions(candidate.appliedActions) } : {}),
      ...(candidate.memoryUpdates ? { memoryUpdates: normalizeMemoryUpdates(candidate.memoryUpdates) } : {}),
      ...(candidate.dreamUpdates ? { dreamUpdates: normalizeDreamUpdates(candidate.dreamUpdates) } : {}),
      ...(candidate.reminderUpdates ? { reminderUpdates: normalizeReminderUpdates(candidate.reminderUpdates) } : {}),
      ...(normalizeDailyReviewWritebackResult(candidate.dailyReviewWriteback)
        ? { dailyReviewWriteback: normalizeDailyReviewWritebackResult(candidate.dailyReviewWriteback) }
        : {}),
      ...(normalizeDailyNewspaperWritebackResult(candidate.dailyNewspaperWriteback)
        ? { dailyNewspaperWriteback: normalizeDailyNewspaperWritebackResult(candidate.dailyNewspaperWriteback) }
        : {}),
      ...(normalizeWeeklyNewspaperWritebackResult(candidate.weeklyNewspaperWriteback)
        ? { weeklyNewspaperWriteback: normalizeWeeklyNewspaperWritebackResult(candidate.weeklyNewspaperWriteback) }
        : {}),
      ...(normalizeWeeklyReviewWritebackResult(candidate.weeklyReviewWriteback)
        ? { weeklyReviewWriteback: normalizeWeeklyReviewWritebackResult(candidate.weeklyReviewWriteback) }
        : {}),
      ...(normalizeMonthlyNewspaperWritebackResult(candidate.monthlyNewspaperWriteback)
        ? { monthlyNewspaperWriteback: normalizeMonthlyNewspaperWritebackResult(candidate.monthlyNewspaperWriteback) }
        : {}),
      ...(normalizeMonthlyReviewWritebackResult(candidate.monthlyReviewWriteback)
        ? { monthlyReviewWriteback: normalizeMonthlyReviewWritebackResult(candidate.monthlyReviewWriteback) }
        : {}),
      ...(normalizeRetryInput(candidate.retryInput) ? { retryInput: normalizeRetryInput(candidate.retryInput) } : {}),
      ...(normalizeRetrySourceUserMessageId(candidate.retrySourceUserMessageId)
        ? { retrySourceUserMessageId: normalizeRetrySourceUserMessageId(candidate.retrySourceUserMessageId) }
        : {}),
      ...(normalizeDreamRetryYearMonth(candidate.dreamRetryYearMonth, getLocalDateStr)
        ? { dreamRetryYearMonth: normalizeDreamRetryYearMonth(candidate.dreamRetryYearMonth, getLocalDateStr) }
        : {})
    };

    if (normalizedMessage.tone === 'pending') {
      return [];
    }

    return [normalizedMessage];
  });
};

const normalizePersonas = (value: unknown): AIChatPersona[] => {
  const personaMap = new Map<string, AIChatPersona>();
  const defaultPersonaMap = new Map<string, AIChatPersona>();
  DEFAULT_AI_PERSONAS.forEach((persona) => {
    personaMap.set(persona.id, persona);
    defaultPersonaMap.set(persona.id, persona);
  });

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }

      const candidate = item as Partial<AIChatPersona>;
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
        return;
      }

      if (defaultPersonaMap.has(candidate.id)) {
        personaMap.set(candidate.id, defaultPersonaMap.get(candidate.id)!);
        return;
      }

      if (candidate.isBuiltIn) {
        return;
      }

      personaMap.set(candidate.id, {
        id: candidate.id,
        name: candidate.name.trim() || '未命名人设',
        avatarIcon: typeof candidate.avatarIcon === 'string' && candidate.avatarIcon.trim()
          ? candidate.avatarIcon.trim()
          : '✨',
        ...(typeof candidate.avatarImage === 'string' && candidate.avatarImage.trim()
          ? { avatarImage: candidate.avatarImage.trim() }
          : {}),
        assistantSelfName: typeof candidate.assistantSelfName === 'string'
          ? candidate.assistantSelfName.trim()
          : '',
        userCallName: typeof candidate.userCallName === 'string'
          ? candidate.userCallName.trim()
          : '',
        systemPrompt: typeof candidate.systemPrompt === 'string' ? candidate.systemPrompt : '',
        contextMessageLimit: clampContextLimit(candidate.contextMessageLimit),
        isBuiltIn: Boolean(candidate.isBuiltIn)
      });
    });
  }

  const builtinIds = new Set(PERSONA_PRESET_ORDER);
  const personas = Array.from(personaMap.values());

  return personas.sort((left, right) => {
    const leftBuiltin = builtinIds.has(left.id);
    const rightBuiltin = builtinIds.has(right.id);
    if (leftBuiltin && rightBuiltin) {
      return PERSONA_PRESET_ORDER.indexOf(left.id) - PERSONA_PRESET_ORDER.indexOf(right.id);
    }
    if (leftBuiltin) return -1;
    if (rightBuiltin) return 1;
    return left.name.localeCompare(right.name, 'zh-CN');
  });
};

const normalizeUserProfile = (value: unknown): AIChatUserProfile => {
  if (!value || typeof value !== 'object') {
    return {
      avatarIcon: ''
    };
  }

  const candidate = value as Partial<AIChatUserProfile>;
  return {
    avatarIcon: typeof candidate.avatarIcon === 'string' ? candidate.avatarIcon.trim() : '',
    ...(typeof candidate.avatarImage === 'string' && candidate.avatarImage.trim()
      ? { avatarImage: candidate.avatarImage.trim() }
      : {})
  };
};

export const createDefaultSession = (
  personaId: string,
  options?: {
    title?: string;
    messages?: AIChatMessage[];
    templateMeta?: AIChatSession['templateMeta'];
  }
): AIChatSession => createDefaultChatSession(personaId, options);

export const normalizePersistedSessions = (
  value: unknown,
  personas: AIChatPersona[],
  getLocalDateStr: (date: Date) => string
): AIChatSession[] => (
  normalizeChatSessions(
    value,
    personas,
    (messagesValue) => normalizeMessages(messagesValue, getLocalDateStr),
    normalizeTemplateMeta,
    personas[0]?.id || DEFAULT_AI_PERSONAS[0].id
  )
);

export const loadInitialChatState = (getLocalDateStr: (date: Date) => string): InitialChatState => (
  loadInitialChatStateFromStorage({
    keys: {
      activeSessionKey: ACTIVE_SESSION_KEY,
      chatPersonasKey: CHAT_PERSONAS_KEY,
      chatSessionsKey: CHAT_SESSIONS_KEY,
      customPromptBlocksKey: CHAT_CUSTOM_PROMPT_BLOCKS_KEY,
      debugModeKey: DEBUG_MODE_KEY,
      userProfileKey: USER_PROFILE_KEY
    },
    normalizePersonas,
    normalizeSessions: (value, personas) => normalizePersistedSessions(value, personas, getLocalDateStr),
    normalizeUserProfile,
    normalizeCustomPromptBlocks: (value, rawPersonasValue) => {
      const normalized = normalizeCustomPromptBlocks(value);
      return normalized.length > 0
        ? normalized
        : normalizeLegacyPersonaBoundCustomPromptBlocks(rawPersonasValue);
    }
  })
);
