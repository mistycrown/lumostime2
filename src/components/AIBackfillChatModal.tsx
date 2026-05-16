/**
 * @file AIBackfillChatModal.tsx
 * @input Unified AI chat sessions, local logs/todos/categories/scopes, and user natural-language messages
 * @output Full-screen AI time assistant with session history, persona settings, quick context cache, and direct log/todo application
 * @pos Component (AI Integration)
 * @description Provides the shared AI workspace for chat, backfill, and todo creation. Sessions persist locally, persona style is configurable per session, and recent context can be toggled into the formal AI request path.
 * @updated 2026-05-16: Added event-driven background assistant reactions for selected newly submitted logs, including linked todo and scope context.
 * @updated 2026-05-16: Added persona-level custom prompt blocks in AI settings so each persona can append multiple labeled extra prompt snippets to outgoing AI requests.
 * @updated 2026-05-15: Continued the refactor by extracting the conversation pane, Dream command flow, review command/writeback helpers, weekly/monthly template session flow helpers, shared chat types/helpers, memory/Dream/debug/background/session/settings overlays, the persona/call settings sections, and the session/template helper layer into `src/components/ai-chat/`, reducing local file size while preserving behavior.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  Check,
  History,
  Pencil,
  Send,
  Square,
  Undo2,
  X,
  XCircle
} from 'lucide-react';
import {
  aiService,
  type AIDebugExchange,
  type AIBackfillToolCall,
  type AIConversationTurn,
  type AITodoToolCall,
  type AITodoUpdateToolCall,
  type AICreateSubtaskToolCall,
  type AIEditLogToolCall
} from '../services/aiService';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useReview } from '../contexts/ReviewContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { AppView } from '../types';
import type { DailyReview, Log, MonthlyReview, TodoItem, TodoRecurrenceRule, WeeklyReview } from '../types';
import type {
  AssistantAgentConfig,
  AssistantEditableMemoryListKey,
  AssistantMemory,
  AssistantNativeDiagnosticEntry,
  AssistantReasoningSummary,
  AssistantReminder,
  AssistantScheduledTask,
  AssistantSystemTrigger,
  DreamEntry,
  DreamState,
  DreamTopic,
  DreamUpdateCard
} from '../types/assistant';
import { formatDateKey } from '../utils/aiBackfillUtils';
import { getLocalDateStr } from '../utils/dateUtils';
import {
  formatAssistantDateTimeForDisplay,
  formatAssistantLocalDateTime,
  normalizeAssistantDateTime,
  parseAssistantDateTime
} from '../utils/assistantTime';
import { buildAssistantDisplayParts } from '../utils/assistantMessageParts';
import { buildNativeDiagnosticDebugExchange } from '../utils/assistantNativeDebug';
import { normalizeAssistantQuietHoursValue } from '../utils/assistantQuietHours';
import { resolveLatestOrdinaryAssistantBackgroundSession } from '../utils/assistantBackgroundSessionUtils';
import {
  ASSISTANT_LOG_SUBMITTED_EVENT,
  buildAssistantLogSubmissionTrigger,
  buildAssistantLogSubmissionUserMessage,
  matchesAssistantLogSubmissionTrigger,
  type AssistantLogSubmittedEventDetail,
  upsertLogForAssistantContext
} from '../utils/assistantLogSubmissionTrigger';
import { getTodoProgressTrackingMode } from '../utils/todoProgressUtils';
import AssistantAgent from '../plugins/AssistantAgentPlugin';
import { assistantAgentConfigService } from '../services/assistantAgentConfigService';
import { assistantMemoryService } from '../services/assistantMemoryService';
import { dreamService } from '../services/dreamService';
import { assistantPromptService } from '../services/assistantPromptService';
import { assistantReminderQueueService } from '../services/assistantReminderQueueService';
import { assistantScheduledTaskService } from '../services/assistantScheduledTaskService';
import {
  assistantOrchestratorService,
  type AssistantBackgroundCallHistoryEntry
} from '../services/assistantOrchestratorService';
import { assistantTurnService } from '../services/assistantTurnService';
import { assistantContextBuilder } from '../services/assistantContextBuilder';
import {
  assistantActionExecutor,
  applyLogDelete,
  applyLogSave,
  applyTodoSave,
  type AppliedChatAction,
  type AppliedCreateLogAction,
  type AppliedCreateSubtaskAction,
  type AppliedCreateTodoAction,
  type AppliedEditLogAction,
  type AppliedUpdateTodoAction,
  type AppliedActionStatus
} from '../services/assistantActionExecutor';
import {
  weeklyReviewTemplateService,
  type WeeklyReviewMethodId,
  type WeeklyReviewTemplateSelectionResult,
  type WeeklyReviewTemplateSessionMeta
} from '../services/weeklyReviewTemplateService';
import {
  monthlyReviewTemplateService,
  type MonthlyReviewMethodId,
  type MonthlyReviewTemplateSelectionResult,
  type MonthlyReviewTemplateSessionMeta
} from '../services/monthlyReviewTemplateService';
import { dailyReviewTemplateService } from '../services/dailyReviewTemplateService';
import type { AssistantToolCall, AssistantUnifiedTurnOutput } from '../types/assistant';
import {
  AIChatDebugViewerOverlay,
  AssistantBackgroundHistoryOverlay
} from './ai-chat/AIBackfillChatOverlays';
import { AIBackfillChatAssistantSettingsSection } from './ai-chat/AIBackfillChatAssistantSettingsSection';
import { renderAppliedChatAction } from './ai-chat/AIBackfillChatAppliedActionRenderer';
import { AIBackfillChatCallSettingsSection } from './ai-chat/AIBackfillChatCallSettingsSection';
import { AIBackfillChatConversationPane } from './ai-chat/AIBackfillChatConversationPane';
import {
  normalizeDreamRetryYearMonth,
  parseDreamMonthSelection,
  runDreamCommand as runDreamCommandFlow
} from './ai-chat/AIBackfillChatDreamFlow';
import {
  prepareForegroundTurn,
  runOrdinaryForegroundTurn
} from './ai-chat/AIBackfillChatForegroundTurn';
import { AIBackfillChatDreamOverlay } from './ai-chat/AIBackfillChatDreamOverlay';
import {
  ACTIVE_SESSION_KEY,
  CHAT_CUSTOM_PROMPT_BLOCKS_KEY,
  CHAT_PERSONAS_KEY,
  CHAT_SESSIONS_KEY,
  clampContextLimit,
  createDefaultSession,
  DEBUG_MODE_KEY,
  DEFAULT_AI_PERSONAS,
  loadInitialChatState,
  normalizePersistedSessions,
  PERSONA_EMOJI_CHOICES,
  USER_PROFILE_KEY
} from './ai-chat/AIBackfillChatInitialization';
import { AIBackfillChatMemoryOverlay } from './ai-chat/AIBackfillChatMemoryOverlay';
import { AIBackfillChatPersonaSettingsSection } from './ai-chat/AIBackfillChatPersonaSettingsSection';
import {
  runDailyNewspaperCommand as runDailyNewspaperCommandFlow,
  runDailyNewspaperOverwriteConfirmation as runDailyNewspaperOverwriteConfirmationFlow,
  runDailyReviewNarrativeCommand as runDailyReviewNarrativeCommandFlow,
  runDailyReviewNarrativeOverwriteConfirmation as runDailyReviewNarrativeOverwriteConfirmationFlow,
  runMonthlyReviewNarrativeWritebackCommand as runMonthlyReviewNarrativeWritebackCommandFlow,
  runWeeklyReviewNarrativeWritebackCommand as runWeeklyReviewNarrativeWritebackCommandFlow
} from './ai-chat/AIBackfillChatReviewCommands';
import {
  runDailyNewspaperWriteback as runDailyNewspaperWritebackFlow,
  runDailyReviewNarrativeWriteback as runDailyReviewNarrativeWritebackFlow,
  runMonthlyReviewNarrativeWriteback as runMonthlyReviewNarrativeWritebackFlow,
  runWeeklyReviewNarrativeWriteback as runWeeklyReviewNarrativeWritebackFlow
} from './ai-chat/AIBackfillChatReviewWriteback';
import { AIBackfillChatSettingsOverlay } from './ai-chat/AIBackfillChatSettingsOverlay';
import {
  AIBackfillChatHistoryOverlay,
  AIBackfillChatNewSessionDialog
} from './ai-chat/AIBackfillChatSessionOverlays';
import {
  createMonthlyReviewTemplateSession,
  createWeeklyReviewTemplateSession,
  runMonthlyReviewTemplateChatTurn,
  runMonthlyReviewTemplateGuidedSelection,
  runMonthlyReviewTemplateOpeningTurn as runMonthlyReviewTemplateOpeningTurnFlow,
  runWeeklyReviewTemplateChatTurn,
  runWeeklyReviewTemplateGuidedSelection,
  runWeeklyReviewTemplateOpeningTurn as runWeeklyReviewTemplateOpeningTurnFlow
} from './ai-chat/AIBackfillChatTemplateFlow';
import {
  appendSystemMessageToChatSession,
  appendUserMessageToChatSession,
  buildConversationHistoryFromSessionMessages,
  buildRetryConversationHistory as buildRetryConversationHistoryFromSessions,
  mutateChatSessions,
  narrowConversationHistoryForTimeSensitiveTurn,
  replaceSessionMessage,
  resolveMonthlyReviewTemplateRangeMeta,
  resolveMonthlyReviewTemplateSessionMeta,
  resolveWeeklyReviewTemplateRangeMeta,
  resolveWeeklyReviewTemplateSessionMeta,
  safeJsonParse,
  sortChatSessionsByUpdatedAt,
  updateSessionAppliedActionStatus,
  updateWeeklyReviewTemplateStageInSessions
} from './ai-chat/AIBackfillChatSessionHelpers';
import {
  TIME_SENSITIVE_MESSAGE_PATTERN,
  buildAssistantCurrentTimeSnapshot,
  buildBackgroundSummaryDebugExchange,
  buildDebugBlocks,
  buildMemoryUpdateSections,
  buildPersonaPrompt,
  createSessionTitleFromUserMessage,
  dedupeStringArray,
  formatActionDate,
  formatAssistantReminderSnapshot,
  formatConversationTime,
  formatDateLabel,
  formatLocalDateTimeContext,
  formatTimeRange,
  getAssistantBackgroundRequestStatusLabel,
  getAssistantBackgroundTriggerLabel,
  getErrorDebugSections,
  getRetryableAIErrorMessage,
  isAbortError,
  normalizeAssistantNativeDiagnostics
} from './ai-chat/AIBackfillChatHelpers';
import {
  type AIChatDailyReviewWritebackResult,
  type AIChatDebugSection,
  type AIChatDreamUpdateCard,
  type AIChatDailyNewspaperWritebackResult,
  type AIChatMemoryUpdateSection,
  type AIChatMessage,
  type AIChatMonthlyReviewWritebackResult,
  type AIChatCustomPromptBlock,
  type AIChatPersona,
  type AIChatSession,
  type AIChatUserProfile,
  type AIChatWeeklyReviewWritebackResult,
  type AISettingsMainTab,
  type AssistantAgentIntervalDrafts,
  type AssistantAgentIntervalField,
  type AssistantAgentQuietHoursDrafts,
  type AssistantAgentQuietHoursField,
  type AssistantBackgroundTimelineEntry,
  type AssistantBackgroundTurnRequestOptions,
  type AssistantEditableMemoryDeleteTarget,
  type AssistantReminderDeleteTarget,
  type AssistantReminderDrafts,
  type AssistantScheduledTaskDeleteTarget,
  type AssistantScheduledTaskDrafts,
  type ChatTone,
  type DailyNewspaperWritebackConfirmationState,
  type DailyReviewWritebackConfirmationState,
  type DebugViewerState,
  type DreamEntryDrafts,
  type DreamMonthRangeSelection,
  type DreamMonthSelectionState,
  type DreamTopicDrafts,
  type InitialChatState,
  DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS,
  DEFAULT_ASSISTANT_REMINDER_DRAFTS,
  DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS,
  DEFAULT_DREAM_ENTRY_DRAFTS,
  DEFAULT_DREAM_TOPIC_DRAFTS,
  DREAM_MONTH_SELECTION_INVALID_PROMPT,
  DREAM_MONTH_SELECTION_PROMPT,
  LOG_EDIT_REQUEST_PATTERN,
  LOG_EDIT_SUCCESS_REPLY_PATTERN,
  MOBILE_KEYBOARD_INSET_THRESHOLD,
  ASSISTANT_EDITABLE_MEMORY_SECTION_META,
  ASSISTANT_SCHEDULED_TASK_WEEKDAY_OPTIONS,
  PersonaAvatar,
  buildAssistantAgentIntervalDrafts,
  buildAssistantAgentQuietHoursDrafts,
  buildAssistantScheduledTaskRecurrenceRule,
  buildAssistantScheduledTaskTime,
  buildManualAssistantReminderDueAt,
  formatAssistantScheduledTaskRecurrence,
  validateAssistantAgentIntervalDrafts,
  validateAssistantAgentQuietHoursDrafts
} from './ai-chat/AIBackfillChatShared';

const CHAT_MARKDOWN_COMPONENTS = {
  h1: ({ node, ...props }: any) => <h1 className="mb-3 mt-1 text-[1.05rem] font-bold leading-7" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="mb-3 mt-1 text-base font-bold leading-7" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="mb-2 mt-1 text-[15px] font-semibold leading-6" {...props} />,
  p: ({ node, ...props }: any) => <p className="mb-3 last:mb-0 leading-6" {...props} />,
  strong: ({ node, ...props }: any) => (
    <strong
      className="rounded-[0.25rem] bg-[rgba(180,138,82,0.14)] px-1 py-[0.05rem] font-black text-[1.02em] text-stone-950"
      {...props}
    />
  ),
  em: ({ node, ...props }: any) => <em className="italic" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="my-3 list-disc space-y-1 pl-5" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="my-3 list-decimal space-y-1 pl-5" {...props} />,
  li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="my-3 rounded-r-[0.7rem] border-l-[3px] border-[rgba(120,113,108,0.38)] bg-[rgba(0,0,0,0.03)] py-1.5 pl-3 pr-2 italic"
      {...props}
    />
  ),
  code: ({ node, inline, className, children, ...props }: any) => (
    inline
      ? (
        <code
          className="rounded-[0.35rem] bg-[rgba(0,0,0,0.08)] px-1.5 py-0.5 text-[0.92em]"
          {...props}
        >
          {children}
        </code>
      )
      : (
        <code className={className} {...props}>
          {children}
        </code>
      )
  ),
  pre: ({ node, ...props }: any) => (
    <pre
      className="my-3 overflow-x-auto rounded-[0.75rem] bg-[rgba(0,0,0,0.08)] px-3 py-2 text-[13px] leading-6"
      {...props}
    />
  ),
  hr: ({ node, ...props }: any) => <hr className="my-4 border-[rgba(120,113,108,0.22)]" {...props} />,
  a: ({ node, ...props }: any) => <a className="underline underline-offset-2" {...props} />
};

interface AIBackfillChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate?: Date;
  targetSessionId?: string;
  targetMessageId?: string;
  initialInputText?: string;
  registerBackHandler?: (handler: (() => boolean) | null) => void;
  onUnreadAssistantMessage?: (count?: number) => void;
  onMarkRead?: () => void;
}

interface ActiveRequestRef {
  controller: AbortController;
  sessionId: string;
  pendingMessageId: string;
}

interface ForegroundSendOptions {
  replaceMessageId?: string;
  retrySourceUserMessageId?: string;
}

const ASSISTANT_CHAT_UPDATED_EVENT = assistantOrchestratorService.getAssistantDecisionEventName();
const ASSISTANT_MULTI_BUBBLE_REVEAL_DELAY_MS = 540;
const ASSISTANT_MULTI_BUBBLE_REVEAL_DURATION_MS = 320;
const ASSISTANT_MULTI_BUBBLE_REVEAL_INITIAL_SCALE = 0.975;
const ASSISTANT_MULTI_BUBBLE_REVEAL_BASE_OFFSET_PX = 10;
const ASSISTANT_MULTI_BUBBLE_REVEAL_MAX_OFFSET_PX = 18;

const accentMix = (accentPercent: number, baseColor: string): string => (
  `color-mix(in srgb, var(--accent-color) ${accentPercent}%, ${baseColor})`
);

const ACCENT_AI_CHAT_THEME = {
  shellBg: accentMix(8, '#f4efe7'),
  shellLayerBg: accentMix(4, '#fbf8f2'),
  panelBg: accentMix(3, '#fffdf8'),
  panelBgStrong: accentMix(5, '#faf5ec'),
  panelBgSoft: accentMix(7, '#f8f2e8'),
  panelBgMuted: accentMix(9, '#f2eadf'),
  panelBorder: accentMix(16, '#ddd3c6'),
  panelBorderStrong: accentMix(26, '#d4c6b6'),
  chipBg: accentMix(8, '#fffaf4'),
  chipBorder: accentMix(18, '#ddd1c3'),
  chipBorderStrong: accentMix(28, '#d1c0ad'),
  inputBg: accentMix(6, '#f8f2e8'),
  inputBgStrong: accentMix(10, '#f1e7da'),
  activeBg: accentMix(12, '#fff8f0'),
  activeBorder: accentMix(30, '#d5c5b3'),
  avatarBg: accentMix(4, '#ffffff'),
  textPrimary: '#201c19',
  textSecondary: '#655d55',
  textMuted: '#8b8176',
  textFaint: '#a19386',
  primaryButtonBg: accentMix(56, '#2f2b28'),
  primaryButtonHoverBg: accentMix(64, '#2b2623'),
  primaryButtonBorder: accentMix(30, '#2f2b28'),
  primaryButtonText: '#fffaf3',
  successBg: '#edf3ea',
  successBorder: '#ced8ca',
  successText: '#556a52',
  undoneBg: accentMix(7, '#f1ebe3'),
  undoneBorder: accentMix(16, '#ddd2c4'),
  undoneText: '#7a7067',
  dangerBg: accentMix(8, '#f8e9e6'),
  dangerBorder: accentMix(20, '#e2b4ab'),
  dangerText: '#9d544d',
  pendingBg: accentMix(6, '#f3eee7'),
  pendingBorder: accentMix(12, '#ddd3c8'),
  codeBg: '#2d2926',
  codeBorder: '#433a34',
  codeText: '#efe7db',
  overlayDark: 'rgba(32, 25, 19, 0.18)',
  overlayLight: 'rgba(247, 241, 233, 0.94)',
  cardShadow: '0 4px 12px rgba(52, 38, 27, 0.025)',
  cardShadowStrong: '0 8px 18px rgba(52, 38, 27, 0.04)',
  avatarShadow: '0 2px 8px rgba(52, 38, 27, 0.035)'
} as const;

const getAIChatTheme = (isDefaultTheme: boolean) => {
  if (isDefaultTheme) {
    return {
      shellBg: '#f5f5f5',
      shellLayerBg: '#fafafa',
      panelBg: '#ffffff',
      panelBgStrong: '#fafafa',
      panelBgSoft: '#f5f5f5',
      panelBgMuted: '#f0f0f0',
      panelBorder: '#e7e5e4',
      panelBorderStrong: '#d6d3d1',
      chipBg: '#fafaf9',
      chipBorder: '#e7e5e4',
      chipBorderStrong: '#d6d3d1',
      inputBg: '#f5f5f4',
      inputBgStrong: '#f0f0ef',
      activeBg: '#f5f5f4',
      activeBorder: '#d6d3d1',
      avatarBg: '#ffffff',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#78716c',
      textFaint: '#a8a29e',
      primaryButtonBg: '#1c1917',
      primaryButtonHoverBg: '#292524',
      primaryButtonBorder: '#1c1917',
      primaryButtonText: '#ffffff',
      successBg: '#f5f5f4',
      successBorder: '#d6d3d1',
      successText: '#57534e',
      undoneBg: '#fafaf9',
      undoneBorder: '#e7e5e4',
      undoneText: '#78716c',
      dangerBg: '#f5f5f4',
      dangerBorder: '#d6d3d1',
      dangerText: '#57534e',
      pendingBg: '#fafaf9',
      pendingBorder: '#e7e5e4',
      codeBg: '#2d2926',
      codeBorder: '#433a34',
      codeText: '#efe7db',
      overlayDark: 'rgba(0, 0, 0, 0.18)',
      overlayLight: 'rgba(250, 250, 250, 0.94)',
      cardShadow: '0 4px 12px rgba(0, 0, 0, 0.025)',
      cardShadowStrong: '0 8px 18px rgba(0, 0, 0, 0.04)',
      avatarShadow: '0 2px 8px rgba(0, 0, 0, 0.035)'
    } as const;
  }

  return ACCENT_AI_CHAT_THEME;
};

const clampNumber = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

export const AIBackfillChatModal: React.FC<AIBackfillChatModalProps> = ({
  isOpen,
  onClose,
  targetDate,
  targetSessionId,
  targetMessageId,
  initialInputText,
  registerBackHandler,
  onUnreadAssistantMessage,
  onMarkRead
}) => {
  const [initialState] = useState<InitialChatState>(() => loadInitialChatState(getLocalDateStr));
  const [personas, setPersonas] = useState<AIChatPersona[]>(initialState.personas);
  const [customPromptBlocks, setCustomPromptBlocks] = useState<AIChatCustomPromptBlock[]>(initialState.customPromptBlocks);
  const [sessions, setSessions] = useState<AIChatSession[]>(initialState.sessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialState.activeSessionId);
  const [debugMode, setDebugMode] = useState<boolean>(initialState.debugMode);
  const [userProfile, setUserProfile] = useState<AIChatUserProfile>(initialState.userProfile);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isPersonaPanelOpen, setIsPersonaPanelOpen] = useState(false);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [activeSettingsMainTab, setActiveSettingsMainTab] = useState<AISettingsMainTab>('persona');
  const [debugViewer, setDebugViewer] = useState<DebugViewerState | null>(null);
  const [expandedDebugBlockKeys, setExpandedDebugBlockKeys] = useState<Set<string>>(new Set());
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState('');
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);
  const [deleteConfirmPersonaId, setDeleteConfirmPersonaId] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEmojiEditorOpen, setIsEmojiEditorOpen] = useState(false);
  const [emojiDraft, setEmojiDraft] = useState('');
  const [isUploadingUserAvatar, setIsUploadingUserAvatar] = useState(false);
  const [isUserEmojiEditorOpen, setIsUserEmojiEditorOpen] = useState(false);
  const [userEmojiDraft, setUserEmojiDraft] = useState('');
  const [assistantAgentConfig, setAssistantAgentConfig] = useState<AssistantAgentConfig>(() => assistantAgentConfigService.getConfig());
  const [assistantAgentIntervalDrafts, setAssistantAgentIntervalDrafts] = useState<AssistantAgentIntervalDrafts>(() => (
    buildAssistantAgentIntervalDrafts(assistantAgentConfigService.getConfig())
  ));
  const [assistantAgentQuietHoursDrafts, setAssistantAgentQuietHoursDrafts] = useState<AssistantAgentQuietHoursDrafts>(() => (
    buildAssistantAgentQuietHoursDrafts(assistantAgentConfigService.getConfig())
  ));
  const [assistantMemorySnapshot, setAssistantMemorySnapshot] = useState<AssistantMemory>(() => assistantMemoryService.getMemory());
  const [dreamSnapshot, setDreamSnapshot] = useState<DreamState>(() => dreamService.getState());
  const [assistantReminderSnapshot, setAssistantReminderSnapshot] = useState<AssistantReminder[]>(() => assistantReminderQueueService.listReminders());
  const [assistantScheduledTaskSnapshot, setAssistantScheduledTaskSnapshot] = useState<AssistantScheduledTask[]>(
    () => assistantScheduledTaskService.listTasks()
  );
  const [isAssistantMemoryViewerOpen, setIsAssistantMemoryViewerOpen] = useState(false);
  const [isDreamViewerOpen, setIsDreamViewerOpen] = useState(false);
  const [dreamMonthSelectionState, setDreamMonthSelectionState] = useState<DreamMonthSelectionState | null>(null);
  const [dailyReviewWritebackConfirmation, setDailyReviewWritebackConfirmation] = useState<DailyReviewWritebackConfirmationState | null>(null);
  const [dailyNewspaperWritebackConfirmation, setDailyNewspaperWritebackConfirmation] = useState<DailyNewspaperWritebackConfirmationState | null>(null);
  const [selectedDreamTopicId, setSelectedDreamTopicId] = useState('');
  const [isDreamTopicNoteExpanded, setIsDreamTopicNoteExpanded] = useState(false);
  const [dreamTopicDrafts, setDreamTopicDrafts] = useState<DreamTopicDrafts>(DEFAULT_DREAM_TOPIC_DRAFTS);
  const [isDreamTopicComposerOpen, setIsDreamTopicComposerOpen] = useState(false);
  const [editingDreamTopicId, setEditingDreamTopicId] = useState<string | null>(null);
  const [isDreamResetConfirmOpen, setIsDreamResetConfirmOpen] = useState(false);
  const [dreamTopicDeleteTargetId, setDreamTopicDeleteTargetId] = useState<string | null>(null);
  const [editingDreamEntryId, setEditingDreamEntryId] = useState<string | null>(null);
  const [dreamEntryDrafts, setDreamEntryDrafts] = useState<DreamEntryDrafts>(DEFAULT_DREAM_ENTRY_DRAFTS);
  const [dreamEntryDeleteTargetId, setDreamEntryDeleteTargetId] = useState<string | null>(null);
  const [assistantEditableMemoryDrafts, setAssistantEditableMemoryDrafts] = useState<Record<AssistantEditableMemoryListKey, string>>(
    DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS
  );
  const [assistantEditableMemoryComposerKey, setAssistantEditableMemoryComposerKey] = useState<AssistantEditableMemoryListKey | null>(null);
  const [assistantEditableMemoryDeleteTarget, setAssistantEditableMemoryDeleteTarget] = useState<AssistantEditableMemoryDeleteTarget | null>(null);
  const [assistantReminderDrafts, setAssistantReminderDrafts] = useState<AssistantReminderDrafts>(DEFAULT_ASSISTANT_REMINDER_DRAFTS);
  const [isAssistantReminderComposerOpen, setIsAssistantReminderComposerOpen] = useState(false);
  const [assistantReminderDeleteTarget, setAssistantReminderDeleteTarget] = useState<AssistantReminderDeleteTarget | null>(null);
  const [assistantScheduledTaskDrafts, setAssistantScheduledTaskDrafts] = useState<AssistantScheduledTaskDrafts>(
    DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS
  );
  const [isAssistantScheduledTaskComposerOpen, setIsAssistantScheduledTaskComposerOpen] = useState(false);
  const [assistantScheduledTaskDeleteTarget, setAssistantScheduledTaskDeleteTarget] = useState<AssistantScheduledTaskDeleteTarget | null>(null);
  const [assistantBackgroundCallHistory, setAssistantBackgroundCallHistory] = useState<AssistantBackgroundCallHistoryEntry[]>(() => assistantOrchestratorService.listBackgroundCallHistory());
  const [assistantNativeDiagnostics, setAssistantNativeDiagnostics] = useState<AssistantNativeDiagnosticEntry[]>([]);
  const [isAssistantBackgroundHistoryViewerOpen, setIsAssistantBackgroundHistoryViewerOpen] = useState(false);
  const [expandedMemoryUpdateMessageIds, setExpandedMemoryUpdateMessageIds] = useState<Set<string>>(() => new Set());
  const [expandedReasoningMessageIds, setExpandedReasoningMessageIds] = useState<Set<string>>(() => new Set());
  const [expandedDreamUpdateMessageIds, setExpandedDreamUpdateMessageIds] = useState<Set<string>>(() => new Set());
  const [expandedReminderUpdateMessageIds, setExpandedReminderUpdateMessageIds] = useState<Set<string>>(() => new Set());
  const [revealedAssistantPartCounts, setRevealedAssistantPartCounts] = useState<Record<string, number>>({});
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const activeRequestRef = useRef<ActiveRequestRef | null>(null);
  const isOpenRef = useRef(isOpen);
  const wasOpenRef = useRef(isOpen);
  const processingDueReminderIdsRef = useRef<Set<string>>(new Set());
  const assistantPartRevealTimeoutsRef = useRef<Map<string, number[]>>(new Map());
  const revealedAssistantPartCountsRef = useRef<Record<string, number>>({});
  const hydratedRevealSessionIdsRef = useRef<Set<string>>(new Set());
  const assistantRevealTargetCountsRef = useRef<Map<string, number>>(new Map());
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const userAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageElementRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const handleMessageElementRef = useCallback((messageId: string, node: HTMLDivElement | null) => {
    if (node) {
      messageElementRefs.current.set(messageId, node);
      return;
    }

    messageElementRefs.current.delete(messageId);
  }, []);
  const handledNavigationKeyRef = useRef('');
  const handledAssistantTriggerIdsRef = useRef<Set<string>>(new Set());
  const hasCompletedStartupReminderCatchupRef = useRef(false);
  const visualViewportBaselineRef = useRef<{ height: number; width: number }>({ height: 0, width: 0 });

  const { logs, setLogs, todos, setTodos, todoCategories, isReady: isDataReady, usesFallbackSeedData } = useData();
  const {
    dailyReviews,
    setDailyReviews,
    weeklyReviews,
    setWeeklyReviews,
    monthlyReviews,
    setMonthlyReviews,
    reviewTemplates,
    checkTemplates,
    isReady: isReviewReady
  } = useReview();
  const { activeSessions } = useSession();
  const { categories, scopes, isReady: isCategoryScopeReady } = useCategoryScope();
  const {
    setCurrentView,
    setEditingLog,
    setInitialLogTimes,
    setIsAddModalOpen,
    setEditingTodo,
    setNewTodoDraft,
    setIsTodoModalOpen,
    setTodoCategoryToAdd,
    setCurrentReviewDate,
    setCurrentDailyReviewInitialTab,
    setIsDailyReviewOpen,
    setCurrentDailyNewspaperDate,
    setIsDailyNewspaperOpen,
    setCurrentWeeklyReviewStart,
    setCurrentWeeklyReviewEnd,
    setCurrentWeeklyReviewInitialTab,
    setIsWeeklyReviewOpen,
    setCurrentMonthlyReviewStart,
    setCurrentMonthlyReviewEnd,
    setCurrentMonthlyReviewInitialTab,
    setIsMonthlyReviewOpen
  } = useNavigation();
  const { addToast } = useToast();
  const { autoLinkRules, autoApplyAutoLinkRules, colorScheme } = useSettings();
  const AI_CHAT_THEME = useMemo(() => getAIChatTheme(colorScheme === 'default'), [colorScheme]);

  const defaultTargetDate = useMemo(() => {
    if (targetDate) {
      const clone = new Date(targetDate);
      clone.setHours(12, 0, 0, 0);
      return clone;
    }

    return new Date();
  }, [targetDate]);

  const defaultDateKey = useMemo(() => formatDateKey(defaultTargetDate), [defaultTargetDate]);
  const isAssistantBackgroundContextReady = isDataReady
    && isReviewReady
    && isCategoryScopeReady
    && !usesFallbackSeedData;
  const personaMap = useMemo(() => new Map(personas.map((persona) => [persona.id, persona])), [personas]);
  const assistantAgentIntervalErrors = useMemo(
    () => validateAssistantAgentIntervalDrafts(assistantAgentIntervalDrafts),
    [assistantAgentIntervalDrafts]
  );
  const assistantAgentQuietHoursErrors = useMemo(
    () => validateAssistantAgentQuietHoursDrafts(
      assistantAgentQuietHoursDrafts,
      assistantAgentConfig.quietHoursEnabled
    ),
    [assistantAgentConfig.quietHoursEnabled, assistantAgentQuietHoursDrafts]
  );
  const weeklyReviewMethodOptions = useMemo(
    () => weeklyReviewTemplateService.listMethodOptions(),
    []
  );
  const monthlyReviewMethodOptions = useMemo(
    () => monthlyReviewTemplateService.listMethodOptions(),
    []
  );
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0] || null,
    [activeSessionId, sessions]
  );
  const activeWeeklyReviewShortcutOptions = useMemo(() => {
    if (activeSession?.templateMeta?.templateType !== 'weekly_review') {
      return [];
    }

    if (activeSession.templateMeta.stage === 'select_range') {
      return [
        { key: 'current', label: '本周', value: '本周' },
        { key: 'previous', label: '上周', value: '上周' }
      ];
    }

    if (activeSession.templateMeta.stage === 'select_method') {
      return weeklyReviewMethodOptions.map((method) => ({
        key: method.id,
        label: method.title,
        value: method.title
      }));
    }

    return [];
  }, [activeSession, weeklyReviewMethodOptions]);
  const activeMonthlyReviewShortcutOptions = useMemo(() => {
    if (activeSession?.templateMeta?.templateType !== 'monthly_review') {
      return [];
    }

    if (activeSession.templateMeta.stage === 'select_range') {
      return [
        { key: 'current', label: '本月', value: '本月' },
        { key: 'previous', label: '上月', value: '上月' }
      ];
    }

    if (activeSession.templateMeta.stage === 'select_method') {
      return monthlyReviewMethodOptions.map((method) => ({
        key: method.id,
        label: method.title,
        value: method.title
      }));
    }

    return [];
  }, [activeSession, monthlyReviewMethodOptions]);
  const activeDreamTopic = useMemo<DreamTopic | null>(() => (
    dreamSnapshot.topics.find((topic) => topic.id === selectedDreamTopicId)
    || dreamSnapshot.topics[0]
    || null
  ), [dreamSnapshot.topics, selectedDreamTopicId]);
  const activeDreamEntries = useMemo(() => (
    activeDreamTopic
      ? dreamSnapshot.entries.filter((entry) => entry.topicId === activeDreamTopic.id)
      : []
  ), [activeDreamTopic, dreamSnapshot.entries]);
  const scrollToLatestMessage = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);
  const shouldUseVisualViewportKeyboardInset = !(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
  const getKeyboardBottomInset = useCallback(() => {
    if (!shouldUseVisualViewportKeyboardInset || typeof window === 'undefined' || !window.visualViewport) {
      return 0;
    }

    const viewport = window.visualViewport;
    const currentVisibleHeight = viewport.height + viewport.offsetTop;
    const currentViewportWidth = viewport.width;

    if (currentVisibleHeight <= 0 || currentViewportWidth <= 0) {
      return 0;
    }

    const baseline = visualViewportBaselineRef.current;
    const widthDelta = Math.abs(currentViewportWidth - baseline.width);

    if (baseline.height === 0 || widthDelta > 120) {
      visualViewportBaselineRef.current = { height: currentVisibleHeight, width: currentViewportWidth };
      return 0;
    }

    if (currentVisibleHeight > baseline.height) {
      visualViewportBaselineRef.current = { height: currentVisibleHeight, width: currentViewportWidth };
      return 0;
    }

    const inset = Math.round(baseline.height - currentVisibleHeight);
    return inset > MOBILE_KEYBOARD_INSET_THRESHOLD ? inset : 0;
  }, [shouldUseVisualViewportKeyboardInset]);
  const clearAssistantPartRevealTimeouts = useCallback((messageId?: string) => {
    if (messageId) {
      const handles = assistantPartRevealTimeoutsRef.current.get(messageId) || [];
      handles.forEach((handle) => window.clearTimeout(handle));
      assistantPartRevealTimeoutsRef.current.delete(messageId);
      return;
    }

    assistantPartRevealTimeoutsRef.current.forEach((handles) => {
      handles.forEach((handle) => window.clearTimeout(handle));
    });
    assistantPartRevealTimeoutsRef.current.clear();
  }, []);
  const toggleMemoryUpdateExpansion = useCallback((messageId: string) => {
    setExpandedMemoryUpdateMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const toggleReasoningExpansion = useCallback((messageId: string) => {
    setExpandedReasoningMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);
  const toggleDreamUpdateExpansion = useCallback((messageId: string) => {
    setExpandedDreamUpdateMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);
  const toggleReminderUpdateExpansion = useCallback((messageId: string) => {
    setExpandedReminderUpdateMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!dreamSnapshot.topics.some((topic) => topic.id === selectedDreamTopicId)) {
      setSelectedDreamTopicId(dreamSnapshot.topics[0]?.id || '');
    }
  }, [dreamSnapshot.topics, selectedDreamTopicId]);

  useEffect(() => {
    setIsDreamTopicNoteExpanded(false);
  }, [selectedDreamTopicId]);

  useEffect(() => {
    if (editingDreamEntryId && !dreamSnapshot.entries.some((entry) => entry.id === editingDreamEntryId)) {
      resetDreamEntryUi();
    }
  }, [dreamSnapshot.entries, editingDreamEntryId]);
  const activePersona = useMemo(
    () => (activeSession ? personaMap.get(activeSession.personaId) : undefined) || personas[0] || DEFAULT_AI_PERSONAS[0],
    [activeSession, personaMap, personas]
  );
  const shouldUseNativeReminderTriggerDispatch = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const assistantBackgroundTimeline = useMemo<AssistantBackgroundTimelineEntry[]>(() => {
    const visibleNativeWakeEvents = assistantNativeDiagnostics.filter((entry) => (
      entry.type === 'checkin_dispatched'
      || entry.type === 'manual_trigger_dispatched'
      || entry.type === 'reminder_due_dispatched'
    ));
    const nativeRequestEvents = assistantNativeDiagnostics.filter((entry) => (
      entry.type === 'native_request_started'
      || entry.type === 'native_request_completed'
      || entry.type === 'native_request_failed'
    ));
    const nativeByTriggerId = new Map<string, AssistantNativeDiagnosticEntry>();
    visibleNativeWakeEvents.forEach((entry) => {
      if (entry.triggerId) {
        nativeByTriggerId.set(entry.triggerId, entry);
      }
    });
    const nativeRequestByTriggerId = new Map<string, {
      startedAt?: string;
      completedAt?: string;
      status?: AssistantBackgroundTimelineEntry['requestStatus'];
      outcomeSummary?: string;
      message?: string;
      errorMessage?: string;
      debugExchange?: AIDebugExchange;
    }>();
    nativeRequestEvents.forEach((entry) => {
      const triggerId = entry.triggerId?.trim();
      if (!triggerId) {
        return;
      }

      const current = nativeRequestByTriggerId.get(triggerId) || {};
      if (entry.type === 'native_request_started') {
        nativeRequestByTriggerId.set(triggerId, {
          ...current,
          startedAt: entry.context?.requestedAt || entry.createdAt,
          status: 'pending'
        });
        return;
      }

      if (entry.type === 'native_request_completed') {
        const debugExchange = buildNativeDiagnosticDebugExchange(entry);
        nativeRequestByTriggerId.set(triggerId, {
          ...current,
          startedAt: current.startedAt || entry.context?.requestedAt,
          completedAt: entry.context?.completedAt || entry.createdAt,
          status: 'completed',
          outcomeSummary: entry.context?.decisionSummary || '原生后台请求已完成',
          message: entry.context?.assistantReply || undefined,
          ...(debugExchange ? { debugExchange } : {})
        });
        return;
      }

      const debugExchange = buildNativeDiagnosticDebugExchange(entry);
      nativeRequestByTriggerId.set(triggerId, {
        ...current,
        startedAt: current.startedAt || entry.context?.requestedAt,
        completedAt: entry.createdAt,
        status: 'failed',
        outcomeSummary: '原生后台请求失败了',
        errorMessage: entry.context?.error || entry.message,
        ...(debugExchange ? { debugExchange } : {})
      });
    });

    const usedNativeIds = new Set<string>();
    const mergedEntries: AssistantBackgroundTimelineEntry[] = assistantBackgroundCallHistory.map((entry) => {
      const nativeEvent = entry.triggerId ? nativeByTriggerId.get(entry.triggerId) : undefined;
      const nativeRequest = entry.triggerId ? nativeRequestByTriggerId.get(entry.triggerId) : undefined;
      if (nativeEvent) {
        usedNativeIds.add(nativeEvent.id);
      }

      const trimmedMessage = entry.message?.trim() || '';
      const trimmedDecisionSummary = entry.decisionSummary?.trim() || '';
      const outcomeSummary = entry.status === 'failed'
        ? '这次后台请求失败了'
        : trimmedDecisionSummary && trimmedDecisionSummary !== trimmedMessage
          ? trimmedDecisionSummary
          : entry.action === 'reply' && trimmedMessage
            ? '这次请求成功并返回了一条消息'
            : entry.action === 'silent'
              ? '这次请求成功，但选择了静默'
              : '这次请求已完成';

      return {
        id: entry.id,
        ...(entry.triggerId ? { triggerId: entry.triggerId } : {}),
        triggerType: entry.triggerType || nativeEvent?.triggerType,
        ...(entry.persistedMessageId ? { persistedMessageId: entry.persistedMessageId } : {}),
        wakeAt: nativeEvent?.createdAt || entry.requestedAt,
        requestStartedAt: nativeRequest?.startedAt || entry.requestedAt,
        requestCompletedAt: nativeRequest?.completedAt || entry.completedAt,
        requestStatus: entry.status === 'failed'
          ? 'failed'
          : entry.status === 'pending'
            ? 'pending'
            : 'completed',
        outcomeSummary,
        ...(trimmedMessage && trimmedMessage !== outcomeSummary ? { message: trimmedMessage } : {}),
        ...(entry.errorMessage?.trim() ? { errorMessage: entry.errorMessage.trim() } : {}),
        ...(entry.debugExchange
          ? { debugExchange: entry.debugExchange }
          : nativeRequest?.debugExchange
            ? { debugExchange: nativeRequest.debugExchange }
            : {})
      };
    });

    visibleNativeWakeEvents.forEach((entry) => {
      if (usedNativeIds.has(entry.id)) {
        return;
      }

      const nativeRequest = entry.triggerId ? nativeRequestByTriggerId.get(entry.triggerId) : undefined;

      mergedEntries.push({
        id: entry.id,
        ...(entry.triggerId ? { triggerId: entry.triggerId } : {}),
        triggerType: entry.triggerType,
        wakeAt: entry.createdAt,
        requestStartedAt: nativeRequest?.startedAt,
        requestCompletedAt: nativeRequest?.completedAt,
        requestStatus: nativeRequest?.status || 'not_started',
        outcomeSummary: nativeRequest?.outcomeSummary || '原生已经醒来并派发 trigger，但 Web 侧还没有开始请求',
        ...(nativeRequest?.message ? { message: nativeRequest.message } : {}),
        ...(nativeRequest?.errorMessage ? { errorMessage: nativeRequest.errorMessage } : {}),
        ...(nativeRequest?.debugExchange ? { debugExchange: nativeRequest.debugExchange } : {})
      });
    });

    return mergedEntries.sort((left, right) => {
      const leftTime = Date.parse(left.requestCompletedAt || left.requestStartedAt || left.wakeAt || '') || 0;
      const rightTime = Date.parse(right.requestCompletedAt || right.requestStartedAt || right.wakeAt || '') || 0;
      return rightTime - leftTime;
    });
  }, [assistantBackgroundCallHistory, assistantNativeDiagnostics]);

  const resolveMessageDebugViewer = useCallback((message: AIChatMessage): DebugViewerState | null => {
    if (!debugMode || message.role !== 'assistant') {
      return null;
    }

    if (message.debugSections && message.debugSections.length > 0) {
      return {
        title: `${activePersona.assistantSelfName || 'AI'} 调试`,
        sections: message.debugSections
      };
    }

    const normalizedMessage = message.content.trim();
    const matchedBackgroundEntry = assistantBackgroundCallHistory.find((entry) => {
      if (entry.persistedMessageId === message.id) {
        return true;
      }

      if (message.backgroundDebugHistoryId && entry.id === message.backgroundDebugHistoryId) {
        return true;
      }

      if (message.tone !== 'system' || !activeSession || entry.targetSessionId !== activeSession.id) {
        return false;
      }

      if ((entry.message?.trim() || '') !== normalizedMessage) {
        return false;
      }

      const entryTime = Date.parse(entry.completedAt || entry.requestedAt || '');
      return Number.isFinite(entryTime) && Math.abs(entryTime - message.createdAt) <= 2 * 60 * 1000;
    });

    if (!matchedBackgroundEntry) {
      return null;
    }

    return {
      title: `后台请求调试 · ${getAssistantBackgroundTriggerLabel(matchedBackgroundEntry.triggerType)}`,
      sections: [{
        label: '后台 AI 调用',
        exchange: matchedBackgroundEntry.debugExchange || buildBackgroundSummaryDebugExchange(matchedBackgroundEntry)
      }]
    };
  }, [
    activePersona.assistantSelfName,
    activeSession,
    assistantBackgroundCallHistory,
    debugMode
  ]);

  useEffect(() => {
    setEmojiDraft(activePersona.avatarIcon || '✨');
    setIsEmojiEditorOpen(false);
  }, [activePersona.id, activePersona.avatarIcon]);

  useEffect(() => {
    setExpandedDebugBlockKeys(new Set());
  }, [debugViewer]);

  useEffect(() => {
    setUserEmojiDraft(userProfile.avatarIcon || '');
    setIsUserEmojiEditorOpen(false);
  }, [userProfile.avatarIcon, userProfile.avatarImage]);

  useEffect(() => {
    revealedAssistantPartCountsRef.current = revealedAssistantPartCounts;
  }, [revealedAssistantPartCounts]);

  useEffect(() => {
    return () => {
      clearAssistantPartRevealTimeouts();
    };
  }, [clearAssistantPartRevealTimeouts]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const { id: sessionId, messages } = activeSession;

    if (!hydratedRevealSessionIdsRef.current.has(sessionId)) {
      hydratedRevealSessionIdsRef.current.add(sessionId);
      setRevealedAssistantPartCounts((current) => {
        const next = { ...current };
        messages.forEach((message) => {
          const totalParts = message.displayParts && message.displayParts.length > 0
            ? message.displayParts.length
            : 1;
          next[message.id] = totalParts;
          assistantRevealTargetCountsRef.current.set(message.id, totalParts);
        });
        return next;
      });
      return;
    }

    const immediateUpdates: Record<string, number> = {};

    messages.forEach((message) => {
      const totalParts = message.displayParts && message.displayParts.length > 0
        ? message.displayParts.length
        : 1;
      const currentRevealed = revealedAssistantPartCountsRef.current[message.id] ?? 0;
      const currentTarget = assistantRevealTargetCountsRef.current.get(message.id) ?? 0;
      const isAnimatableAssistantMessage = message.role === 'assistant'
        && (message.tone || 'normal') === 'normal'
        && totalParts > 1;

      if (isAnimatableAssistantMessage && totalParts > currentRevealed && totalParts > currentTarget) {
        clearAssistantPartRevealTimeouts(message.id);

        const startCount = Math.max(1, currentRevealed || 1);
        immediateUpdates[message.id] = startCount;
        assistantRevealTargetCountsRef.current.set(message.id, totalParts);

        const handles: number[] = [];
        for (let count = startCount + 1; count <= totalParts; count += 1) {
          const handle = window.setTimeout(() => {
            setRevealedAssistantPartCounts((current) => ({
              ...current,
              [message.id]: count
            }));
          }, ASSISTANT_MULTI_BUBBLE_REVEAL_DELAY_MS * (count - startCount));
          handles.push(handle);
        }

        assistantPartRevealTimeoutsRef.current.set(message.id, handles);
        return;
      }

      if (currentRevealed !== totalParts && !isAnimatableAssistantMessage) {
        immediateUpdates[message.id] = totalParts;
      }

      if (!currentTarget || totalParts > currentTarget) {
        assistantRevealTargetCountsRef.current.set(message.id, totalParts);
      }
    });

    if (Object.keys(immediateUpdates).length > 0) {
      setRevealedAssistantPartCounts((current) => ({
        ...current,
        ...immediateUpdates
      }));
    }
  }, [activeSession, clearAssistantPartRevealTimeouts]);

  const todoUpdateContext = useMemo(() => (
    todos.map((todo) => {
      const parentTodo = todo.parentTodoId
        ? todos.find((candidate) => candidate.id === todo.parentTodoId)
        : undefined;
      const todoCategory = todoCategories.find((category) => category.id === todo.categoryId);
      const linkedCategory = todo.linkedCategoryId
        ? categories.find((category) => category.id === todo.linkedCategoryId)
        : undefined;
      const linkedActivity = todo.linkedActivityId
        ? linkedCategory?.activities.find((activity) => activity.id === todo.linkedActivityId)
          || categories.flatMap((category) => category.activities).find((activity) => activity.id === todo.linkedActivityId)
        : undefined;

      return {
        id: todo.id,
        title: todo.title,
        path: parentTodo ? `${parentTodo.title} / ${todo.title}` : todo.title,
        categoryId: todo.categoryId,
        categoryName: todoCategory?.name || '',
        isCompleted: todo.isCompleted,
        parentTodoId: todo.parentTodoId,
        parentTodoTitle: parentTodo?.title,
        linkedCategoryId: todo.linkedCategoryId,
        linkedActivityId: todo.linkedActivityId,
        linkedActivityName: linkedActivity?.name,
        scheduledDate: todo.scheduledDate,
        deadlineDate: todo.deadlineDate,
        pin: Boolean(todo.pin)
      };
    })
  ), [categories, todoCategories, todos]);

  const subtaskParentContext = useMemo(() => (
    todos
      .filter((todo) => !todo.parentTodoId && !todo.recurrenceRule)
      .map((todo) => {
        const todoCategory = todoCategories.find((category) => category.id === todo.categoryId);
        const linkedCategory = todo.linkedCategoryId
          ? categories.find((category) => category.id === todo.linkedCategoryId)
          : undefined;
        const linkedActivity = todo.linkedActivityId
          ? linkedCategory?.activities.find((activity) => activity.id === todo.linkedActivityId)
            || categories.flatMap((category) => category.activities).find((activity) => activity.id === todo.linkedActivityId)
          : undefined;

        return {
          id: todo.id,
          title: todo.title,
          categoryId: todo.categoryId,
          categoryName: todoCategory?.name || '',
          linkedActivityId: todo.linkedActivityId,
          linkedActivityName: linkedActivity?.name,
          defaultScopeIds: todo.defaultScopeIds,
          defaultScopeNames: (todo.defaultScopeIds || [])
            .map((scopeId) => scopes.find((scope) => scope.id === scopeId)?.name)
            .filter((name): name is string => Boolean(name))
        };
      })
  ), [categories, scopes, todoCategories, todos]);

  const logEditContext = useMemo(() => (
    [...logs]
      .sort((left, right) => right.startTime - left.startTime)
      .slice(0, 40)
      .map((log) => {
        const category = categories.find((item) => item.id === log.categoryId);
        const activity = category?.activities.find((item) => item.id === log.activityId)
          || categories.flatMap((item) => item.activities).find((item) => item.id === log.activityId);
        const linkedTodo = log.linkedTodoId
          ? todos.find((todo) => todo.id === log.linkedTodoId)
          : undefined;

        return {
          id: log.id,
          date: formatDateKey(new Date(log.startTime)),
          startTime: `${String(new Date(log.startTime).getHours()).padStart(2, '0')}:${String(new Date(log.startTime).getMinutes()).padStart(2, '0')}`,
          endTime: `${String(new Date(log.endTime).getHours()).padStart(2, '0')}:${String(new Date(log.endTime).getMinutes()).padStart(2, '0')}`,
          categoryId: log.categoryId,
          categoryName: category?.name || '',
          activityId: log.activityId,
          activityName: activity?.name || log.title || '',
          note: log.note,
          linkedTodoId: log.linkedTodoId,
          linkedTodoTitle: linkedTodo?.title
        };
      })
  ), [categories, logs, todos]);

  const activeNavigationKey = isOpen && targetSessionId
    ? `${targetSessionId}:${targetMessageId || ''}`
    : '';
  const hasPendingNavigation = Boolean(activeNavigationKey)
    && handledNavigationKeyRef.current !== activeNavigationKey;
  const hasResolvablePendingNavigation = hasPendingNavigation
    && Boolean(targetSessionId)
    && sessions.some((session) => session.id === targetSessionId);

  useEffect(() => {
    if (hasResolvablePendingNavigation) {
      return;
    }

    scrollToLatestMessage();
  }, [activeSession?.messages, activeSessionId, hasResolvablePendingNavigation, isLoading, scrollToLatestMessage]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!isOpen || wasOpen || hasResolvablePendingNavigation) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollToLatestMessage('auto');
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [hasResolvablePendingNavigation, isOpen, scrollToLatestMessage]);

  useEffect(() => {
    if (!isOpen) {
      visualViewportBaselineRef.current = { height: 0, width: 0 };
      setKeyboardBottomInset(0);
      return;
    }

    if (!shouldUseVisualViewportKeyboardInset || typeof window === 'undefined' || !window.visualViewport) {
      setKeyboardBottomInset(0);
      return;
    }

    const viewport = window.visualViewport;
    let frameId: number | null = null;

    const syncKeyboardBottomInset = () => {
      const nextInset = getKeyboardBottomInset();
      setKeyboardBottomInset((current) => (current === nextInset ? current : nextInset));

      if (nextInset > 0 && document.activeElement === composerTextareaRef.current) {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
        frameId = window.requestAnimationFrame(() => {
          scrollToLatestMessage('auto');
        });
      }
    };

    syncKeyboardBottomInset();
    viewport.addEventListener('resize', syncKeyboardBottomInset);
    viewport.addEventListener('scroll', syncKeyboardBottomInset);

    return () => {
      viewport.removeEventListener('resize', syncKeyboardBottomInset);
      viewport.removeEventListener('scroll', syncKeyboardBottomInset);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [getKeyboardBottomInset, isOpen, scrollToLatestMessage, shouldUseVisualViewportKeyboardInset]);

  useEffect(() => {
    localStorage.setItem(CHAT_PERSONAS_KEY, JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
    localStorage.setItem(CHAT_CUSTOM_PROMPT_BLOCKS_KEY, JSON.stringify(customPromptBlocks));
  }, [customPromptBlocks]);

  useEffect(() => {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem(DEBUG_MODE_KEY, String(debugMode));
  }, [debugMode]);

  useEffect(() => {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (sessions.length === 0) {
      const fallbackSession = createDefaultSession(personas[0]?.id || DEFAULT_AI_PERSONAS[0].id);
      setSessions([fallbackSession]);
      setActiveSessionId(fallbackSession.id);
      return;
    }

    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, personas, sessions]);

  useEffect(() => {
    if (isOpen) {
      onMarkRead?.();
    }
  }, [isOpen, onMarkRead]);

  useEffect(() => {
    if (!isOpen || !initialInputText) {
      return;
    }

    if (activeSession?.templateMeta) {
      const nextSession = createDefaultSession(activeSession.personaId);
      setSessions((prev) => [...prev, nextSession]);
      setActiveSessionId(nextSession.id);
      return;
    }

    setInputText(initialInputText);
  }, [activeSession, initialInputText, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      handledNavigationKeyRef.current = '';
      return;
    }

    if (!targetSessionId || !hasPendingNavigation) {
      return;
    }

    if (!sessions.some((session) => session.id === targetSessionId)) {
      handledNavigationKeyRef.current = activeNavigationKey;
      return;
    }

    if (activeSessionId !== targetSessionId) {
      setActiveSessionId(targetSessionId);
      return;
    }

    window.requestAnimationFrame(() => {
      if (targetMessageId) {
        const targetElement = messageElementRefs.current.get(targetMessageId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          handledNavigationKeyRef.current = activeNavigationKey;
          return;
        }
      }

      scrollToLatestMessage();
      handledNavigationKeyRef.current = activeNavigationKey;
    });
  }, [
    activeNavigationKey,
    activeSession?.messages,
    activeSessionId,
    hasPendingNavigation,
    isOpen,
    sessions,
    scrollToLatestMessage,
    targetMessageId,
    targetSessionId
  ]);

  useEffect(() => {
    if (activeSession && !personaMap.has(activeSession.personaId)) {
      setSessions((prev) => prev.map((session) => (
        session.id === activeSession.id
          ? {
            ...session,
            personaId: personas[0]?.id || DEFAULT_AI_PERSONAS[0].id,
            updatedAt: session.updatedAt
          }
          : session
      )));
    }
  }, [activeSession, personaMap, personas]);

  useEffect(() => (
    () => {
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
    }
  ), []);

  const sortedSessions = useMemo(() => sortChatSessionsByUpdatedAt(sessions), [sessions]);
  const resolveSessionPersona = useCallback((session: AIChatSession) => (
    personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0]
  ), [personaMap, personas]);

  const buildConversationHistoryFromMessages = (
    session: AIChatSession,
    messages: AIChatMessage[]
  ): AIConversationTurn[] => {
    const sessionPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
    return buildConversationHistoryFromSessionMessages(messages, {
      contextCacheEnabled: session.contextCacheEnabled,
      contextMessageLimit: sessionPersona.contextMessageLimit,
      formatCreatedAt: formatAssistantLocalDateTime
    });
  };

  const buildConversationHistory = (session: AIChatSession): AIConversationTurn[] => (
    buildConversationHistoryFromMessages(session, session.messages)
  );

  const getBackgroundPersonaDisplayName = useCallback((targetSession?: AIChatSession): string => {
    if (!targetSession) {
      return 'AI';
    }

    return personaMap.get(targetSession.personaId)?.name
      || assistantOrchestratorService.getBackgroundPersonaDisplayName(targetSession.id)
      || 'AI';
  }, [personaMap]);

  const narrowHistoryForTimeSensitiveTurn = useCallback((
    history: AIConversationTurn[],
    sourceText: string
  ): AIConversationTurn[] => narrowConversationHistoryForTimeSensitiveTurn(
    history,
    sourceText,
    TIME_SENSITIVE_MESSAGE_PATTERN
  ), []);

  const buildRetryConversationHistory = (
    sessionId: string,
    retrySourceUserMessageId?: string
  ): AIConversationTurn[] => buildRetryConversationHistoryFromSessions({
    buildConversationHistoryFromMessages,
    conversationHistoryCache,
    retrySourceUserMessageId,
    sessionId,
    sessions
  });

  const conversationHistoryCache = useMemo(
    () => new Map(
      sessions.map((session) => [session.id, buildConversationHistory(session)])
    ),
    [personas, personaMap, sessions]
  );

  const reloadPersistedChatSessions = () => {
    setSessions(normalizePersistedSessions(
      safeJsonParse<unknown>(localStorage.getItem(CHAT_SESSIONS_KEY), []),
      personas,
      getLocalDateStr
    ));
  };

  const refreshAssistantMemorySnapshot = () => {
    setAssistantMemorySnapshot(assistantMemoryService.getMemory());
  };

  const refreshDreamSnapshot = () => {
    setDreamSnapshot(dreamService.getState());
  };

  const refreshAssistantScheduledTaskSnapshot = () => {
    setAssistantScheduledTaskSnapshot(assistantScheduledTaskService.listTasks());
  };

  const refreshAssistantReminderSnapshot = () => {
    setAssistantReminderSnapshot(assistantReminderQueueService.listReminders());
  };

  const syncAssistantScheduledTasks = useCallback((referenceNow = new Date()) => {
    const result = assistantScheduledTaskService.syncScheduledTaskReminders(referenceNow);
    setAssistantScheduledTaskSnapshot(result.tasks);
    setAssistantReminderSnapshot(assistantReminderQueueService.listReminders());
    setAssistantMemorySnapshot(assistantMemoryService.getMemory());
    return result;
  }, []);

  const hydrateAssistantReminderSnapshotFromNative = useCallback(async () => {
    await assistantReminderQueueService.hydrateFromNative();
    syncAssistantScheduledTasks(new Date());
    return assistantReminderQueueService.listReminders();
  }, [syncAssistantScheduledTasks]);

  const refreshAssistantBackgroundCallHistory = () => {
    setAssistantBackgroundCallHistory(assistantOrchestratorService.listBackgroundCallHistory());
  };

  const shouldShowBackgroundSystemNotification = useCallback(() => (
    typeof document !== 'undefined' && document.hidden
  ), []);

  const refreshAssistantNativeDiagnostics = useCallback(async () => {
    try {
      const result = await AssistantAgent.listDiagnostics();
      const normalizedEntries = normalizeAssistantNativeDiagnostics(result.entries);
      const backgroundTargetSessionId = resolveLatestOrdinaryAssistantBackgroundSession(sessions)?.id;
      setAssistantNativeDiagnostics(normalizedEntries);

      const hydrationResult = assistantOrchestratorService.hydrateNativeCompletedReplies(normalizedEntries, {
        targetSessionId: backgroundTargetSessionId,
        showSystemNotification: shouldShowBackgroundSystemNotification()
      });
      if (hydrationResult.didHydrateHistory) {
        refreshAssistantBackgroundCallHistory();
      }
      if (hydrationResult.surfacedMessages.length > 0) {
        reloadPersistedChatSessions();
        if (!isOpenRef.current) {
          onUnreadAssistantMessage?.(hydrationResult.surfacedMessages.length);
          const personaName = assistantOrchestratorService.getBackgroundPersonaDisplayName(backgroundTargetSessionId);
          addToast('info', `${personaName}：${hydrationResult.surfacedMessages[hydrationResult.surfacedMessages.length - 1]}`);
        }
      }
      if (hydrationResult.didUpdateMemory) {
        refreshAssistantMemorySnapshot();
      }
      if (hydrationResult.didUpdateReminders) {
        syncAssistantScheduledTasks(new Date());
      }
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to load native assistant diagnostics', error);
    }
  }, [addToast, onUnreadAssistantMessage, sessions, shouldShowBackgroundSystemNotification, syncAssistantScheduledTasks]);

  const resetAssistantEditableMemoryUi = () => {
    setAssistantEditableMemoryDrafts(DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS);
    setAssistantEditableMemoryComposerKey(null);
    setAssistantEditableMemoryDeleteTarget(null);
  };

  const resetAssistantReminderUi = () => {
    setAssistantReminderDrafts(DEFAULT_ASSISTANT_REMINDER_DRAFTS);
    setIsAssistantReminderComposerOpen(false);
    setAssistantReminderDeleteTarget(null);
  };

  const resetAssistantScheduledTaskUi = () => {
    setAssistantScheduledTaskDrafts(DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS);
    setIsAssistantScheduledTaskComposerOpen(false);
    setAssistantScheduledTaskDeleteTarget(null);
  };

  const notifyAssistantTaskStateChanged = useCallback(() => {
    void AssistantAgent.notifyTaskStateChanged().catch((error) => {
      console.error('[AIBackfillChatModal] Failed to notify assistant agent about task-state changes', error);
    });
  }, []);

  const getBackgroundTargetSession = useCallback((): AIChatSession | undefined => (
    resolveLatestOrdinaryAssistantBackgroundSession(sessions)
  ), [sessions]);

  const buildAssistantReminderSummary = useCallback((): string | undefined => {
    const summary = formatAssistantReminderSnapshot(assistantReminderQueueService.listReminders());
    return summary === '暂无' ? undefined : summary;
  }, []);

  const buildForegroundAssistantReminderSummary = useCallback((): string | undefined => (
    assistantAgentConfig.enabled ? buildAssistantReminderSummary() : undefined
  ), [assistantAgentConfig.enabled, buildAssistantReminderSummary]);

  const buildForegroundAssistantMemory = useCallback((): AssistantMemory => (
    assistantAgentConfig.longTermMemoryEnabled
      ? assistantMemoryService.getMemory()
      : {
        version: 1,
        updatedAt: new Date().toISOString(),
        profileMemory: [],
        preferenceMemory: [],
        activeReminders: [],
        recentDecisions: []
      }
  ), [assistantAgentConfig.longTermMemoryEnabled]);

  const buildDreamContext = useCallback((query?: string): string | undefined => (
    dreamService.buildContext({ query })
  ), []);

  const buildDreamRangeDictionaryContext = useCallback((rangeStartDate: string, rangeEndDate: string) => (
    assistantContextBuilder.buildDictionaryContext({
      categories,
      scopes,
      todoCategories,
      todos: todos
        .filter((todo) => (
          !todo.isCompleted
          || (typeof todo.completedAt === 'string'
            && getLocalDateStr(new Date(todo.completedAt)) >= rangeStartDate
            && getLocalDateStr(new Date(todo.completedAt)) <= rangeEndDate)
          || (typeof todo.scheduledDate === 'string' && todo.scheduledDate >= rangeStartDate && todo.scheduledDate <= rangeEndDate)
          || (typeof todo.deadlineDate === 'string' && todo.deadlineDate >= rangeStartDate && todo.deadlineDate <= rangeEndDate)
        ))
        .slice(0, 120),
      logs: logs
        .filter((log) => {
          const logDate = formatDateKey(new Date(log.startTime));
          return logDate >= rangeStartDate && logDate <= rangeEndDate;
        })
        .sort((left, right) => left.startTime - right.startTime)
        .slice(0, 200)
    })
  ), [categories, logs, scopes, todoCategories, todos]);

  const buildAssistantDictionaryContext = useCallback((logsInput: Log[] = logs) => assistantContextBuilder.buildDictionaryContext({
    categories,
    scopes,
    todoCategories,
    todos: todos.filter((todo) => !todo.isCompleted).slice(0, 60),
    logs: logsInput
      .filter((log) => formatDateKey(new Date(log.startTime)) === defaultDateKey)
      .sort((left, right) => left.startTime - right.startTime)
      .slice(0, 60)
  }), [categories, defaultDateKey, logs, scopes, todoCategories, todos]);

  useEffect(() => {
    if (dreamMonthSelectionState && !sessions.some((session) => session.id === dreamMonthSelectionState.sessionId)) {
      setDreamMonthSelectionState(null);
    }
  }, [dreamMonthSelectionState, sessions]);

  const buildSharedPersonaPrompt = useCallback((persona: AIChatPersona): string => (
    buildPersonaPrompt(persona, customPromptBlocks)
  ), [customPromptBlocks]);

  const buildBackgroundPersonaPrompt = useCallback((session?: AIChatSession): string | undefined => {
    if (!session) {
      return undefined;
    }

    const resolvedPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
    const prompt = buildSharedPersonaPrompt(resolvedPersona);
    return prompt.trim() ? prompt : undefined;
  }, [buildSharedPersonaPrompt, personaMap, personas]);

  const buildAssistantTimelineSummary = useCallback(() => assistantContextBuilder.buildTimelineSummaryDigest({
    stateContextDate: defaultDateKey,
    dailyReviews
  }), [dailyReviews, defaultDateKey]);

  const buildAssistantStateContext = useCallback((
    date: Date,
    reminderSummary?: string,
    logsInput: Log[] = logs
  ) => ({
    ...assistantContextBuilder.buildStateContext({
      currentDateTime: formatLocalDateTimeContext(date),
      stateContextDate: defaultDateKey,
      logs: logsInput,
      categories,
      todos,
      activeSessions,
      timelineReviewSummary: buildAssistantTimelineSummary(),
      ...(reminderSummary ? { reminderSummary } : {})
    })
  }), [activeSessions, buildAssistantTimelineSummary, categories, defaultDateKey, logs, todos]);

  const buildWeeklyReviewTemplateWeekDataText = useCallback((session: AIChatSession): string | null => {
    const templateMeta = resolveWeeklyReviewTemplateSessionMeta(session);
    if (!templateMeta) {
      return null;
    }

    const weeklyReview = weeklyReviewTemplateService.findWeeklyReview(
      weeklyReviews,
      templateMeta.weekStartDate,
      templateMeta.weekEndDate
    );

    return weeklyReviewTemplateService.buildWeekDataText({
      weekStartDate: templateMeta.weekStartDate,
      weekEndDate: templateMeta.weekEndDate,
      selectedRangeLabel: templateMeta.selectedRangeLabel,
      logs,
      categories,
      todos,
      todoCategories,
      scopes,
      dailyReviews,
      weeklyReview
    });
  }, [categories, dailyReviews, logs, scopes, todoCategories, todos, weeklyReviews]);
  const buildMonthlyReviewTemplateMonthDataText = useCallback((session: AIChatSession): string | null => {
    const templateMeta = resolveMonthlyReviewTemplateSessionMeta(session);
    if (!templateMeta) {
      return null;
    }

    const monthlyReview = monthlyReviewTemplateService.findMonthlyReview(
      monthlyReviews,
      templateMeta.monthStartDate,
      templateMeta.monthEndDate
    );

    return monthlyReviewTemplateService.buildMonthDataText({
      monthStartDate: templateMeta.monthStartDate,
      monthEndDate: templateMeta.monthEndDate,
      selectedRangeLabel: templateMeta.selectedRangeLabel,
      logs,
      categories,
      todos,
      todoCategories,
      scopes,
      dailyReviews,
      weeklyReviews,
      monthlyReview
    });
  }, [categories, dailyReviews, logs, monthlyReviews, scopes, todoCategories, todos, weeklyReviews]);

  const buildBackgroundTurnRequest = useCallback(({
    trigger,
    now,
    targetSession,
    conversationHistory,
    showSystemNotification,
    logsOverride
  }: AssistantBackgroundTurnRequestOptions) => {
    const reminderSummary = buildAssistantReminderSummary();
    const userPersonaPrompt = buildBackgroundPersonaPrompt(targetSession);
    const effectiveLogs = logsOverride ?? logs;
    const stateContext = buildAssistantStateContext(now, reminderSummary, effectiveLogs);

    return {
      trigger,
      ...(targetSession ? { targetSessionId: targetSession.id } : {}),
      showSystemNotification,
      currentDateTime: stateContext.currentDateTime,
      defaultDate: stateContext.stateContextDate,
      todayTimelineSummary: stateContext.timelineSummaryForDate || '',
      ...(stateContext.timelineSummaryForPreviousDate ? { yesterdayTimelineSummary: stateContext.timelineSummaryForPreviousDate } : {}),
      ...(stateContext.timelineReviewSummary ? { timelineReviewSummary: stateContext.timelineReviewSummary } : {}),
      ...(stateContext.activeSessionSummary ? { activeSessionSummary: stateContext.activeSessionSummary } : {}),
      ...(stateContext.scheduledTodosForDateSummary ? { todayScheduledTodoSummary: stateContext.scheduledTodosForDateSummary } : {}),
      ...(stateContext.pinnedTodoSummary ? { pinnedTodoSummary: stateContext.pinnedTodoSummary } : {}),
      ...(stateContext.overdueTodoSummary ? { overdueTodoSummary: stateContext.overdueTodoSummary } : {}),
      ...(reminderSummary ? { reminderSummary } : {}),
      ...(userPersonaPrompt ? { userPersonaPrompt } : {}),
      dictionaryContext: buildAssistantDictionaryContext(effectiveLogs),
      conversationHistory,
      includeDebugInPersistedMessage: debugMode
    };
  }, [
    buildAssistantDictionaryContext,
    buildAssistantReminderSummary,
    buildAssistantStateContext,
    buildBackgroundPersonaPrompt,
    debugMode,
    logs
  ]);

  const completeReminderDueTrigger = useCallback((trigger: AssistantSystemTrigger) => {
    if (trigger.type !== 'reminder_due') {
      return;
    }

    const reminderId = typeof trigger.metadata?.reminderId === 'string'
      ? trigger.metadata.reminderId.trim()
      : '';
    if (!reminderId) {
      return;
    }

    assistantScheduledTaskService.consumeTriggeredReminder(reminderId, new Date().toISOString());
    syncAssistantScheduledTasks(new Date());
  }, [syncAssistantScheduledTasks]);

  const handleAssistantSystemTrigger = useCallback(async (trigger: AssistantSystemTrigger): Promise<void> => {
    const triggerId = trigger.id?.trim();
    if (!triggerId) {
      return;
    }

    if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady) {
      return;
    }

    if (handledAssistantTriggerIdsRef.current.has(triggerId)) {
      try {
        await AssistantAgent.acknowledgeSystemTrigger({ id: triggerId });
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to acknowledge duplicate assistant trigger', error);
      }
      return;
    }

    handledAssistantTriggerIdsRef.current.add(triggerId);
    try {
      await AssistantAgent.acknowledgeSystemTrigger({ id: triggerId });
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to acknowledge assistant trigger', error);
    }

    void refreshAssistantNativeDiagnostics();

    const targetSession = getBackgroundTargetSession();
    if (!targetSession) {
      console.info('[AIBackfillChatModal] Skipping assistant system trigger because no ordinary conversation has recent user activity', trigger);
      return;
    }

    const conversationHistory = conversationHistoryCache.get(targetSession.id) || [];

    try {
      const result = await assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
        trigger,
        now: new Date(),
        targetSession,
        conversationHistory,
        showSystemNotification: shouldShowBackgroundSystemNotification()
      }));

      completeReminderDueTrigger(trigger);
      refreshAssistantMemorySnapshot();
      reloadPersistedChatSessions();
      if (result.surfacedMessage && !isOpenRef.current) {
        onUnreadAssistantMessage?.(1);
        addToast('info', `${getBackgroundPersonaDisplayName(targetSession)}：${result.surfacedMessage}`);
      }
    } catch (error) {
      console.error('[AIBackfillChatModal] Assistant system turn failed', error);
    }
  }, [
    addToast,
    assistantAgentConfig.enabled,
    buildBackgroundTurnRequest,
    completeReminderDueTrigger,
    conversationHistoryCache,
    getBackgroundTargetSession,
    isAssistantBackgroundContextReady,
    onUnreadAssistantMessage,
    refreshAssistantNativeDiagnostics,
    shouldShowBackgroundSystemNotification
  ]);

  const handleAssistantLogSubmittedEvent = useCallback(async (
    event: CustomEvent<AssistantLogSubmittedEventDetail>
  ): Promise<void> => {
    const submittedLog = event.detail?.log;
    if (!submittedLog) {
      return;
    }

    if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady) {
      return;
    }

    if (!matchesAssistantLogSubmissionTrigger(assistantAgentConfig, submittedLog)) {
      return;
    }

    const targetSession = getBackgroundTargetSession();
    if (!targetSession) {
      console.info('[AIBackfillChatModal] Skipping submitted-log assistant trigger because no ordinary conversation has recent user activity', submittedLog.id);
      return;
    }

    const now = new Date();
    const nextLogs = upsertLogForAssistantContext(logs, submittedLog);
    const submittedLogUserMessage = buildAssistantLogSubmissionUserMessage(
      submittedLog,
      categories,
      scopes,
      todos
    );
    assistantOrchestratorService.persistBackgroundUserMessage(submittedLogUserMessage, targetSession.id);
    reloadPersistedChatSessions();
    const trigger = buildAssistantLogSubmissionTrigger({
      log: submittedLog,
      categories,
      scopes,
      todos,
      now
    });
    const conversationHistory = buildConversationHistoryFromMessages(
      targetSession,
      [
        ...targetSession.messages,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: submittedLogUserMessage,
          createdAt: Date.now()
        }
      ]
    );

    try {
      const result = await assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
        trigger,
        now,
        targetSession,
        conversationHistory,
        showSystemNotification: shouldShowBackgroundSystemNotification(),
        logsOverride: nextLogs
      }));

      refreshAssistantMemorySnapshot();
      reloadPersistedChatSessions();
      if (result.surfacedMessage && !isOpenRef.current) {
        onUnreadAssistantMessage?.(1);
        addToast('info', `${getBackgroundPersonaDisplayName(targetSession)}：${result.surfacedMessage}`);
      }
    } catch (error) {
      console.error('[AIBackfillChatModal] Submitted-log assistant trigger failed', error);
    }
  }, [
    addToast,
    assistantAgentConfig,
    buildBackgroundTurnRequest,
    categories,
    conversationHistoryCache,
    getBackgroundTargetSession,
    isAssistantBackgroundContextReady,
    logs,
    onUnreadAssistantMessage,
    scopes,
    shouldShowBackgroundSystemNotification,
    todos
  ]);

  const drainPendingAssistantSystemTriggers = useCallback(async () => {
    try {
      const result = await AssistantAgent.listPendingSystemTriggers();
      const rawTriggers = Array.isArray(result.triggers) ? result.triggers : [];
      if (rawTriggers.length === 0) {
        return;
      }

      const normalizedTriggers = rawTriggers
        .filter((trigger): trigger is AssistantSystemTrigger => (
          Boolean(trigger)
          && typeof trigger.id === 'string'
          && typeof trigger.type === 'string'
          && typeof trigger.source === 'string'
          && typeof trigger.createdAt === 'string'
          && typeof trigger.text === 'string'
        ))
        .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

      const latestCheckinTrigger = [...normalizedTriggers]
        .reverse()
        .find((trigger) => trigger.type === 'checkin');

      for (const trigger of normalizedTriggers) {
        if (trigger.type === 'checkin' && latestCheckinTrigger && trigger.id !== latestCheckinTrigger.id) {
          handledAssistantTriggerIdsRef.current.add(trigger.id);
          try {
            await AssistantAgent.acknowledgeSystemTrigger({ id: trigger.id });
          } catch (error) {
            console.error('[AIBackfillChatModal] Failed to acknowledge stale check-in trigger', error);
          }
          continue;
        }

        await handleAssistantSystemTrigger(trigger);
      }
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to drain pending assistant triggers', error);
    }
  }, [handleAssistantSystemTrigger]);

  const syncNativeBackgroundExecutionSnapshot = useCallback(async () => {
    if (!isAssistantBackgroundContextReady) {
      return;
    }

    try {
      const targetSession = getBackgroundTargetSession();
      if (!targetSession) {
        await AssistantAgent.syncNativeBackgroundSnapshot({
          systemPrompt: '',
          conversation: assistantContextBuilder.buildConversationContext([])
        });
        return;
      }

      const conversationHistory = conversationHistoryCache.get(targetSession.id) || [];
      const reminderSummary = buildAssistantReminderSummary();
      const userPersonaPrompt = buildBackgroundPersonaPrompt(targetSession);
      const now = new Date();
      const stateContext = buildAssistantStateContext(now, reminderSummary);
      const [basePrompt, backgroundModePrompt] = await Promise.all([
        assistantPromptService.getAssistantBasePrompt(),
        assistantPromptService.getBackgroundModePrompt()
      ]);
      const memory = assistantAgentConfig.longTermMemoryEnabled
        ? assistantMemoryService.getMemory()
        : {
          version: 1 as const,
          updatedAt: new Date().toISOString(),
          profileMemory: [],
          preferenceMemory: [],
          activeReminders: [],
          recentDecisions: []
        };

      const systemPrompt = await assistantTurnService.buildSystemPrompt({
        mode: 'background',
        trigger: {
          type: 'checkin',
          source: 'system',
          text: 'Native background check-in trigger',
          createdAt: now.toISOString()
        },
        promptLayers: {
          basePrompt,
          modePrompt: backgroundModePrompt,
          ...(userPersonaPrompt ? { userPersonaPrompt } : {})
        },
        memoryEnabled: assistantAgentConfig.longTermMemoryEnabled,
        memory,
        conversation: assistantContextBuilder.buildConversationContext(
          conversationHistory.map((turn) => ({
            role: turn.role,
            content: turn.content,
            ...(typeof turn.createdAt === 'string' && turn.createdAt.trim()
              ? { createdAt: turn.createdAt.trim() }
              : {})
          }))
        ),
        stateContext: {
          currentDateTime: stateContext.currentDateTime,
          stateContextDate: stateContext.stateContextDate,
          ...(stateContext.currentLocalDate ? { currentLocalDate: stateContext.currentLocalDate } : {}),
          ...(stateContext.currentWeekday ? { currentWeekday: stateContext.currentWeekday } : {}),
          ...(stateContext.tomorrowDate ? { tomorrowDate: stateContext.tomorrowDate } : {}),
          ...(stateContext.dayAfterTomorrowDate ? { dayAfterTomorrowDate: stateContext.dayAfterTomorrowDate } : {}),
          ...(stateContext.currentWeekRange ? { currentWeekRange: stateContext.currentWeekRange } : {}),
          ...(stateContext.nextWeekdayDates ? { nextWeekdayDates: stateContext.nextWeekdayDates } : {}),
          ...(stateContext.timelineSummaryForDate ? { timelineSummaryForDate: stateContext.timelineSummaryForDate } : {}),
          ...(stateContext.timelineSummaryForPreviousDate ? { timelineSummaryForPreviousDate: stateContext.timelineSummaryForPreviousDate } : {}),
          ...(stateContext.timelineReviewSummary ? { timelineReviewSummary: stateContext.timelineReviewSummary } : {}),
          ...(stateContext.activeSessionSummary ? { activeSessionSummary: stateContext.activeSessionSummary } : {}),
          ...(stateContext.scheduledTodosForDateSummary ? { scheduledTodosForDateSummary: stateContext.scheduledTodosForDateSummary } : {}),
          ...(stateContext.pinnedTodoSummary ? { pinnedTodoSummary: stateContext.pinnedTodoSummary } : {}),
          ...(stateContext.overdueTodoSummary ? { overdueTodoSummary: stateContext.overdueTodoSummary } : {}),
          ...(reminderSummary ? { reminderSummary } : {})
        },
        dictionaryContext: buildAssistantDictionaryContext()
      });

      await AssistantAgent.syncNativeBackgroundSnapshot({
        systemPrompt,
        conversation: assistantContextBuilder.buildConversationContext(
          conversationHistory.map((turn) => ({
            role: turn.role,
            content: turn.content
          }))
        )
      });
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to sync native background snapshot', error);
    }
  }, [
    assistantAgentConfig.longTermMemoryEnabled,
    buildAssistantDictionaryContext,
    buildAssistantReminderSummary,
    buildAssistantStateContext,
    buildBackgroundPersonaPrompt,
    conversationHistoryCache,
    getBackgroundTargetSession,
    isAssistantBackgroundContextReady
  ]);

  useEffect(() => {
    setAssistantAgentIntervalDrafts(buildAssistantAgentIntervalDrafts(assistantAgentConfig));
  }, [
    assistantAgentConfig.basePollMinutes,
    assistantAgentConfig.maxCheckinMinutes,
    assistantAgentConfig.minCheckinMinutes
  ]);

  useEffect(() => {
    setAssistantAgentQuietHoursDrafts(buildAssistantAgentQuietHoursDrafts(assistantAgentConfig));
  }, [
    assistantAgentConfig.quietHoursEnabled,
    assistantAgentConfig.quietHoursEnd,
    assistantAgentConfig.quietHoursStart
  ]);

  const handleUpdateAssistantAgentConfig = (patch: Partial<AssistantAgentConfig>) => {
    const nextConfig = assistantAgentConfigService.saveConfig(patch);
    setAssistantAgentConfig(nextConfig);
    if (patch.longTermMemoryEnabled === false) {
      refreshAssistantMemorySnapshot();
    }
  };

  const handleAssistantAgentIntervalDraftChange = (
    field: AssistantAgentIntervalField,
    nextValue: string
  ) => {
    setAssistantAgentIntervalDrafts((current) => ({
      ...current,
      [field]: nextValue
    }));
  };

  const handleAssistantAgentQuietHoursDraftChange = (
    field: AssistantAgentQuietHoursField,
    nextValue: string
  ) => {
    const digitsOnly = nextValue.replace(/\D+/g, '').slice(0, 4);
    setAssistantAgentQuietHoursDrafts((current) => ({
      ...current,
      [field]: digitsOnly
    }));
  };

  const commitAssistantAgentIntervalDraft = (field: AssistantAgentIntervalField) => {
    const nextErrors = validateAssistantAgentIntervalDrafts(assistantAgentIntervalDrafts);

    if (field === 'basePollMinutes') {
      if (nextErrors.basePollMinutes) {
        return;
      }

      handleUpdateAssistantAgentConfig({
        basePollMinutes: Number(assistantAgentIntervalDrafts.basePollMinutes.trim())
      });
      return;
    }

    if (nextErrors.minCheckinMinutes || nextErrors.maxCheckinMinutes) {
      return;
    }

    handleUpdateAssistantAgentConfig({
      minCheckinMinutes: Number(assistantAgentIntervalDrafts.minCheckinMinutes.trim()),
      maxCheckinMinutes: Number(assistantAgentIntervalDrafts.maxCheckinMinutes.trim())
    });
  };

  const commitAssistantAgentQuietHoursDraft = () => {
    const nextErrors = validateAssistantAgentQuietHoursDrafts(assistantAgentQuietHoursDrafts, true);
    if (nextErrors.quietHoursStart || nextErrors.quietHoursEnd) {
      return;
    }

    handleUpdateAssistantAgentConfig({
      quietHoursStart: assistantAgentQuietHoursDrafts.quietHoursStart.trim(),
      quietHoursEnd: assistantAgentQuietHoursDrafts.quietHoursEnd.trim()
    });
  };

  const handleToggleAssistantQuietHours = () => {
    if (assistantAgentConfig.quietHoursEnabled) {
      handleUpdateAssistantAgentConfig({ quietHoursEnabled: false });
      return;
    }

    const nextDrafts: AssistantAgentQuietHoursDrafts = {
      quietHoursStart: normalizeAssistantQuietHoursValue(assistantAgentQuietHoursDrafts.quietHoursStart) || '2300',
      quietHoursEnd: normalizeAssistantQuietHoursValue(assistantAgentQuietHoursDrafts.quietHoursEnd) || '0800'
    };
    setAssistantAgentQuietHoursDrafts(nextDrafts);

    const nextErrors = validateAssistantAgentQuietHoursDrafts(nextDrafts, true);
    if (nextErrors.quietHoursStart || nextErrors.quietHoursEnd) {
      return;
    }

    handleUpdateAssistantAgentConfig({
      quietHoursEnabled: true,
      quietHoursStart: nextDrafts.quietHoursStart,
      quietHoursEnd: nextDrafts.quietHoursEnd
    });
  };

  const buildReminderDueTrigger = (reminder: AssistantReminder): AssistantSystemTrigger => {
    const now = new Date();
    const nowLocal = formatAssistantLocalDateTime(now);
    const scheduledDueAt = formatAssistantDateTimeForDisplay(reminder.dueAt);
    const dueAtMs = parseAssistantDateTime(reminder.dueAt);
    const delayMinutes = Number.isFinite(dueAtMs)
      ? Math.max(0, Math.round((now.getTime() - dueAtMs) / 60000))
      : 0;

    return {
      id: `reminder_due:${reminder.id}:${now.getTime()}`,
      type: 'reminder_due',
      source: 'system',
      createdAt: nowLocal,
      text: reminder.text,
      metadata: {
        reminderId: reminder.id,
        reminderType: reminder.type,
        scheduledDueAt,
        actualDispatchAt: nowLocal,
        delayMinutes,
        dispatchAttemptCount: reminder.dispatchAttemptCount || 0
      }
    };
  };

  const dispatchDueReminder = useCallback((reminder: AssistantReminder) => {
    if (!isAssistantBackgroundContextReady) {
      return;
    }

    if (processingDueReminderIdsRef.current.has(reminder.id)) {
      return;
    }

    processingDueReminderIdsRef.current.add(reminder.id);
    const targetSession = getBackgroundTargetSession();
    if (!targetSession) {
      processingDueReminderIdsRef.current.delete(reminder.id);
      console.info('[AIBackfillChatModal] Skipping due reminder dispatch because no ordinary conversation has recent user activity', reminder.id);
      return;
    }

    const now = new Date();
    const attemptedAt = now.toISOString();
    assistantReminderQueueService.recordDispatchAttempt(reminder.id, attemptedAt);
    const conversationHistory = conversationHistoryCache.get(targetSession.id) || [];

    void assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
      trigger: buildReminderDueTrigger({
        ...reminder,
        ...(reminder.dispatchAttemptCount !== undefined ? { dispatchAttemptCount: reminder.dispatchAttemptCount + 1 } : { dispatchAttemptCount: 1 }),
        lastDispatchAttemptAt: attemptedAt
      }),
      now,
      targetSession,
      conversationHistory,
      showSystemNotification: shouldShowBackgroundSystemNotification()
    })).then((result) => {
      assistantScheduledTaskService.consumeTriggeredReminder(reminder.id, new Date().toISOString());
      syncAssistantScheduledTasks(new Date());
      reloadPersistedChatSessions();
      if (result.surfacedMessage && !isOpenRef.current) {
        onUnreadAssistantMessage?.(1);
        addToast('info', `${getBackgroundPersonaDisplayName(targetSession)}：${result.surfacedMessage}`);
      }
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Due reminder dispatch failed', error);
      refreshAssistantMemorySnapshot();
    }).finally(() => {
      processingDueReminderIdsRef.current.delete(reminder.id);
    });
  }, [
    addToast,
    buildBackgroundTurnRequest,
    conversationHistoryCache,
    getBackgroundTargetSession,
    isAssistantBackgroundContextReady,
    onUnreadAssistantMessage,
    reloadPersistedChatSessions,
    refreshAssistantMemorySnapshot,
    shouldShowBackgroundSystemNotification,
    syncAssistantScheduledTasks
  ]);

  const flushDueReminders = useCallback(() => {
    if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady || shouldUseNativeReminderTriggerDispatch) {
      return;
    }

    const dueReminders = assistantReminderQueueService.listDueReminders();
    dueReminders.forEach((reminder) => {
      dispatchDueReminder(reminder);
    });
  }, [
    assistantAgentConfig.enabled,
    dispatchDueReminder,
    isAssistantBackgroundContextReady,
    shouldUseNativeReminderTriggerDispatch
  ]);

  useEffect(() => {
    syncAssistantScheduledTasks(new Date());
  }, [syncAssistantScheduledTasks]);

  useEffect(() => {
    if (!isPersonaPanelOpen) {
      return;
    }

    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    refreshAssistantScheduledTaskSnapshot();
  }, [assistantAgentConfig.longTermMemoryEnabled, isPersonaPanelOpen]);

  useEffect(() => {
    if (!isAssistantMemoryViewerOpen) {
      return;
    }

    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    refreshAssistantScheduledTaskSnapshot();
  }, [isAssistantMemoryViewerOpen]);

  useEffect(() => {
    if (!isAssistantBackgroundHistoryViewerOpen) {
      return;
    }

    refreshAssistantBackgroundCallHistory();
    void refreshAssistantNativeDiagnostics();
  }, [isAssistantBackgroundHistoryViewerOpen, refreshAssistantNativeDiagnostics]);

  useEffect(() => {
    const handleAssistantChatUpdated = () => {
      reloadPersistedChatSessions();
      refreshAssistantMemorySnapshot();
      void hydrateAssistantReminderSnapshotFromNative();
      refreshAssistantBackgroundCallHistory();
      void refreshAssistantNativeDiagnostics();
    };

    window.addEventListener(ASSISTANT_CHAT_UPDATED_EVENT, handleAssistantChatUpdated);
    return () => window.removeEventListener(ASSISTANT_CHAT_UPDATED_EVENT, handleAssistantChatUpdated);
  }, [hydrateAssistantReminderSnapshotFromNative, personas, refreshAssistantNativeDiagnostics]);

  useEffect(() => {
    const handleSubmittedLog = (rawEvent: Event) => {
      void handleAssistantLogSubmittedEvent(rawEvent as CustomEvent<AssistantLogSubmittedEventDetail>);
    };

    window.addEventListener(ASSISTANT_LOG_SUBMITTED_EVENT, handleSubmittedLog as EventListener);
    return () => {
      window.removeEventListener(ASSISTANT_LOG_SUBMITTED_EVENT, handleSubmittedLog as EventListener);
    };
  }, [handleAssistantLogSubmittedEvent]);

  useEffect(() => {
    let cancelled = false;
    let pluginListener: Awaited<ReturnType<typeof AssistantAgent.addListener>> | null = null;
    let diagnosticsListener: Awaited<ReturnType<typeof AssistantAgent.addListener>> | null = null;
    let appStateListener: Awaited<ReturnType<typeof CapacitorApp.addListener>> | null = null;

    const bindAssistantAgent = async () => {
      try {
        pluginListener = await AssistantAgent.addListener('assistantSystemTrigger', (trigger) => {
          if (cancelled || !assistantAgentConfig.enabled) {
            return;
          }

          void handleAssistantSystemTrigger(trigger as AssistantSystemTrigger);
        });
        diagnosticsListener = await AssistantAgent.addListener('assistantDiagnosticsUpdated', () => {
          if (cancelled) {
            return;
          }

          void refreshAssistantNativeDiagnostics();
        });
        appStateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (cancelled || !isActive || !assistantAgentConfig.enabled) {
            return;
          }

          void hydrateAssistantReminderSnapshotFromNative();
          void drainPendingAssistantSystemTriggers();
        });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        void hydrateAssistantReminderSnapshotFromNative();
        void drainPendingAssistantSystemTriggers();
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to bind assistant agent listener', error);
      }
    };

    const handleVisibilityChange = () => {
      if (cancelled || document.hidden || !assistantAgentConfig.enabled) {
        return;
      }

      void hydrateAssistantReminderSnapshotFromNative();
      void drainPendingAssistantSystemTriggers();
    };

    void bindAssistantAgent();

    return () => {
      cancelled = true;
      pluginListener?.remove();
      diagnosticsListener?.remove();
      void appStateListener?.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    assistantAgentConfig.enabled,
    drainPendingAssistantSystemTriggers,
    handleAssistantSystemTrigger,
    hydrateAssistantReminderSnapshotFromNative,
    refreshAssistantNativeDiagnostics,
  ]);

  useEffect(() => {
    let cancelled = false;

    const syncAssistantAgent = async () => {
      try {
        if (assistantAgentConfig.enabled) {
          await AssistantAgent.startAgent(assistantAgentConfig);
        } else {
          await AssistantAgent.stopAgent();
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[AIBackfillChatModal] Failed to sync assistant agent config', error);
        }
      }
    };

    void syncAssistantAgent();

    return () => {
      cancelled = true;
    };
  }, [assistantAgentConfig]);

  useEffect(() => {
    void AssistantAgent.syncNativeAIConfig(aiService.getConfig()).catch((error) => {
      console.error('[AIBackfillChatModal] Failed to sync native AI config on mount/update', error);
    });
    void syncNativeBackgroundExecutionSnapshot();
  }, [
    assistantAgentConfig.enabled,
    assistantAgentConfig.longTermMemoryEnabled,
    conversationHistoryCache,
    syncNativeBackgroundExecutionSnapshot
  ]);

  useEffect(() => {
    if (!assistantAgentConfig.enabled) {
      return;
    }

    void syncNativeBackgroundExecutionSnapshot();
  }, [
    assistantAgentConfig.enabled,
    assistantMemorySnapshot.updatedAt,
    assistantReminderSnapshot,
    syncNativeBackgroundExecutionSnapshot
  ]);

  useEffect(() => {
    if (
      !assistantAgentConfig.enabled
      || !isAssistantBackgroundContextReady
      || hasCompletedStartupReminderCatchupRef.current
    ) {
      return;
    }

    hasCompletedStartupReminderCatchupRef.current = true;

    void (async () => {
      try {
        await hydrateAssistantReminderSnapshotFromNative();
        flushDueReminders();
      } catch (error) {
        hasCompletedStartupReminderCatchupRef.current = false;
        console.error('[AIBackfillChatModal] Failed cold-start reminder catch-up', error);
      }
    })();
  }, [
    assistantAgentConfig.enabled,
    flushDueReminders,
    hydrateAssistantReminderSnapshotFromNative,
    isAssistantBackgroundContextReady
  ]);

  useEffect(() => {
    flushDueReminders();

    if (!assistantAgentConfig.enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      flushDueReminders();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [
    assistantAgentConfig.enabled,
    flushDueReminders
  ]);

  useEffect(() => {
    if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady) {
      return;
    }

    void hydrateAssistantReminderSnapshotFromNative();
    void drainPendingAssistantSystemTriggers();
  }, [
    assistantAgentConfig.enabled,
    drainPendingAssistantSystemTriggers,
    hydrateAssistantReminderSnapshotFromNative,
    isAssistantBackgroundContextReady
  ]);

  const mutateSession = (sessionId: string, updater: (session: AIChatSession) => AIChatSession) => {
    setSessions((prev) => mutateChatSessions(prev, sessionId, updater));
  };

  const replaceMessage = (sessionId: string, messageId: string, nextMessage: AIChatMessage) => {
    setSessions((prev) => replaceSessionMessage(prev, sessionId, messageId, nextMessage));
  };

  const updateAppliedActionStatus = (
    sessionId: string,
    messageId: string,
    actionId: string,
    nextStatus: AppliedActionStatus
  ) => {
    setSessions((prev) => updateSessionAppliedActionStatus(prev, sessionId, messageId, actionId, nextStatus));
  };

  const appendSystemMessage = (
    sessionId: string,
    content: string,
    options?: {
      debugSections?: AIChatDebugSection[];
      tone?: ChatTone;
    }
  ) => {
    setSessions((prev) => appendSystemMessageToChatSession(prev, sessionId, content, options));
  };

  const appendUserMessage = (sessionId: string, content: string) => {
    setSessions((prev) => appendUserMessageToChatSession(prev, sessionId, content));
  };

  const updateWeeklyReviewTemplateStage = (
    sessionId: string,
    stage: WeeklyReviewTemplateSessionMeta['stage'],
    pendingWriteIntent = false
  ) => {
    setSessions((prev) => updateWeeklyReviewTemplateStageInSessions(prev, sessionId, stage, pendingWriteIntent));
  };

  const prepareForTemplateInteraction = useCallback(() => {
    setInputText('');
    setIsHistoryPanelOpen(false);
    setIsPersonaPanelOpen(false);
  }, []);

  const handleWeeklyReviewTemplateGuidedSelection = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => runWeeklyReviewTemplateGuidedSelection({
    activeRequestRef,
    appendSystemMessage,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    onReadySession: handleWeeklyReviewTemplateOpeningTurn,
    prepareForTemplateInteraction,
    replacePendingWithResult,
    resolveAssistantDisplayParts,
    resolveAssistantReplyContent,
    session,
    setIsLoading,
    userInput
  });

  const handleMonthlyReviewTemplateGuidedSelection = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => runMonthlyReviewTemplateGuidedSelection({
    activeRequestRef,
    appendSystemMessage,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    getErrorDebugSections,
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    onReadySession: handleMonthlyReviewTemplateOpeningTurn,
    prepareForTemplateInteraction,
    replacePendingWithResult,
    resolveAssistantDisplayParts,
    resolveAssistantReplyContent,
    session,
    setIsLoading,
    userInput
  });

  const appendDebugSectionToMessage = (
    sessionId: string,
    messageId: string,
    section: AIChatDebugSection
  ) => {
    mutateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        const nextSections = [...(message.debugSections || []), section];
        return {
          ...message,
          debugSections: nextSections
        };
      })
    }));
  };

  const handleCloseNewSessionDialog = () => {
    setIsNewSessionDialogOpen(false);
  };

  const handleOpenNewSessionDialog = () => {
    if (!activeSession) {
      return;
    }

    setEditingSessionId(null);
    setEditingSessionTitle('');
    setDeleteConfirmSessionId(null);
    setIsNewSessionDialogOpen(true);
  };

  const handleCreateGenericSession = () => {
    if (!activeSession) {
      return;
    }

    const nextSession = createDefaultSession(activeSession.personaId);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
    handleCloseNewSessionDialog();
    setIsHistoryPanelOpen(false);
  };

  const handleCreateSessionWithPersona = (personaId: string) => {
    const nextSession = createDefaultSession(personaId);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
    handleCloseNewSessionDialog();
    setEditingSessionId(null);
    setEditingSessionTitle('');
    setDeleteConfirmSessionId(null);
    setDeleteConfirmPersonaId(null);
    setIsHistoryPanelOpen(false);
  };

  const handleOpenWeeklyReviewTemplateSelection = () => {
    if (!activeSession) {
      return;
    }

    const templateSession = createWeeklyReviewTemplateSession(activeSession.personaId);

    setSessions((prev) => [templateSession, ...prev]);
    setActiveSessionId(templateSession.id);
    handleCloseNewSessionDialog();
    setIsHistoryPanelOpen(false);
    setInputText('');
  };

  const handleOpenMonthlyReviewTemplateSelection = () => {
    if (!activeSession) {
      return;
    }

    const templateSession = createMonthlyReviewTemplateSession(activeSession.personaId);

    setSessions((prev) => [templateSession, ...prev]);
    setActiveSessionId(templateSession.id);
    handleCloseNewSessionDialog();
    setIsHistoryPanelOpen(false);
    setInputText('');
  };

  const handleFillWriteWeeklyNarrativeCommand = () => {
    setInputText('写入 AI 叙事');
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleFillWriteMonthlyNarrativeCommand = () => {
    setInputText('写入 AI 叙事');
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleFillDailyNarrativeCommand = () => {
    setInputText('叙事');
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleFillDailyNewspaperCommand = () => {
    setInputText('小报');
    window.requestAnimationFrame(() => {
      composerTextareaRef.current?.focus();
    });
  };

  const handleStartRenameSession = (session: AIChatSession) => {
    setDeleteConfirmSessionId(null);
    setEditingSessionId(session.id);
    setEditingSessionTitle(session.title);
  };

  const handleCancelRenameSession = () => {
    setEditingSessionId(null);
    setEditingSessionTitle('');
  };

  const handleSelectSessionFromHistory = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsHistoryPanelOpen(false);
  };

  const handleToggleDeleteSession = (sessionId: string) => {
    setEditingSessionId(null);
    setEditingSessionTitle('');
    setDeleteConfirmSessionId((current) => (current === sessionId ? null : sessionId));
  };

  const handleCommitRenameSession = (sessionId: string) => {
    const nextTitle = editingSessionTitle.trim() || '新对话';
    mutateSession(sessionId, (session) => ({
      ...session,
      title: nextTitle
    }));
    setEditingSessionId(null);
    setEditingSessionTitle('');
    addToast('success', '已重命名对话');
  };

  const handleDeleteSession = (sessionId: string) => {
    const targetSession = sessions.find((session) => session.id === sessionId);
    if (!targetSession) {
      return;
    }

    if (isLoading && activeRequestRef.current?.sessionId === sessionId) {
      addToast('warning', '当前对话正在请求中，请先停止再删除。');
      return;
    }

    const remainingSessions = sortedSessions.filter((session) => session.id !== sessionId);

    if (remainingSessions.length === 0) {
      const fallbackSession = createDefaultSession(targetSession.personaId);
      setSessions([fallbackSession]);
      setActiveSessionId(fallbackSession.id);
    } else {
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(remainingSessions[0].id);
      }
    }

    if (editingSessionId === sessionId) {
      handleCancelRenameSession();
    }
    setDeleteConfirmSessionId(null);
    addToast('success', '已删除对话');
  };

  const ensureEditablePersona = (): AIChatPersona => {
    if (!activeSession) {
      return activePersona;
    }

    if (!activePersona.isBuiltIn) {
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
        ? {
          ...session,
          personaId: fallbackPersonaId,
          updatedAt: Date.now()
        }
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
    setCustomPromptBlocks((prev) => (
      [
        ...prev,
        {
          id: blockId,
          title: '',
          content: '',
          enabled: true
        }
      ]
    ));
    return blockId;
  };

  const handleUpdateCustomPromptBlock = (
    blockId: string,
    patch: { title?: string; content?: string; enabled?: boolean }
  ) => {
    setCustomPromptBlocks((prev) => prev.map((block) => (
        block.id === blockId
          ? {
            ...block,
            ...patch
          }
          : block
      )));
  };

  const handleDeleteCustomPromptBlock = (blockId: string) => {
    setCustomPromptBlocks((prev) => prev.filter((block) => block.id !== blockId));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const editablePersona = ensureEditablePersona();
    const previousAvatarImage = editablePersona.avatarImage;

    setIsEmojiEditorOpen(false);
    setIsUploadingAvatar(true);
    try {
      const filename = await imageService.saveImage(file);
      if (previousAvatarImage) {
        await imageService.deleteImage(previousAvatarImage).catch((error) => {
          console.error('[AIBackfillChatModal] Failed to delete previous avatar image', error);
        });
      }

      updateCurrentPersona({
        avatarImage: filename,
        avatarIcon: editablePersona.avatarIcon || '✨'
      });
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

    updateCurrentPersona({
      avatarIcon: trimmedEmoji,
      avatarImage: undefined
    });
    setIsEmojiEditorOpen(false);
  };

  const updateUserProfile = (patch: Partial<AIChatUserProfile>) => {
    setUserProfile((prev) => ({
      ...prev,
      ...patch
    }));
  };

  const handleUserAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      updateUserProfile({
        avatarImage: filename
      });
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

    setUserProfile({
      avatarIcon: ''
    });
    setUserEmojiDraft('');
    setIsUserEmojiEditorOpen(false);
  };

  const resetDreamTopicUi = () => {
    setDreamTopicDrafts(DEFAULT_DREAM_TOPIC_DRAFTS);
    setIsDreamTopicComposerOpen(false);
    setEditingDreamTopicId(null);
    setDreamTopicDeleteTargetId(null);
  };

  const resetDreamEntryUi = () => {
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
    setEditingDreamEntryId(null);
    setDreamEntryDeleteTargetId(null);
  };

  const updateDreamTopicDraft = (key: keyof DreamTopicDrafts, value: string) => {
    setDreamTopicDrafts((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleOpenDreamViewer = () => {
    refreshDreamSnapshot();
    resetDreamTopicUi();
    resetDreamEntryUi();
    setIsDreamResetConfirmOpen(false);
    setIsDreamViewerOpen(true);
  };

  const handleCloseDreamViewer = () => {
    resetDreamTopicUi();
    resetDreamEntryUi();
    setIsDreamResetConfirmOpen(false);
    setIsDreamViewerOpen(false);
  };

  const handleOpenDreamTopicComposer = (topic?: DreamTopic) => {
    setDreamTopicDrafts({
      title: topic?.title || '',
      note: topic?.note || ''
    });
    setEditingDreamTopicId(topic?.id || null);
    setIsDreamResetConfirmOpen(false);
    setDreamTopicDeleteTargetId(null);
    setIsDreamTopicComposerOpen(true);
  };

  const handleCancelDreamTopicComposer = () => {
    resetDreamTopicUi();
  };

  const handleOpenDreamEntryEditor = (entry: DreamEntry) => {
    setDreamEntryDrafts({
      content: entry.content
    });
    setEditingDreamEntryId(entry.id);
    setDreamEntryDeleteTargetId(null);
  };

  const handleCancelDreamEntryEditor = () => {
    resetDreamEntryUi();
  };

  const handleUpdateDreamEntryDraft = (value: string) => {
    setDreamEntryDrafts({ content: value });
  };

  const handleSaveDreamEntry = (entryId: string) => {
    const content = dreamEntryDrafts.content.trim();
    if (!content) {
      addToast('warning', '先写一点条目内容再保存吧。');
      return;
    }

    dreamService.updateEntry(entryId, { content });
    refreshDreamSnapshot();
    resetDreamEntryUi();
    addToast('success', '已更新 Dream 条目');
  };

  const handleSaveDreamTopic = () => {
    const title = dreamTopicDrafts.title.trim();
    const note = dreamTopicDrafts.note.trim();
    if (!title) {
      addToast('warning', '先写一个 Dream aspect 标题再保存吧。');
      return;
    }

    if (
      dreamSnapshot.topics.some((topic) => (
        topic.id !== editingDreamTopicId
        && topic.title.trim().toLowerCase() === title.toLowerCase()
      ))
    ) {
      addToast('info', '这个 Dream aspect 已经存在了。');
      return;
    }

    if (editingDreamTopicId) {
      dreamService.updateTopic(editingDreamTopicId, {
        title,
        note
      });
      addToast('success', '已更新 Dream aspect');
    } else {
      dreamService.createTopic({
        title,
        note
      });
      addToast('success', '已新增 Dream aspect');
    }

    refreshDreamSnapshot();
    resetDreamTopicUi();
  };

  const handleToggleDreamTopicDelete = (topicId: string) => {
    setIsDreamResetConfirmOpen(false);
    setDreamTopicDeleteTargetId((current) => (current === topicId ? null : topicId));
  };

  const handleToggleDreamEntryDelete = (entryId: string) => {
    setIsDreamResetConfirmOpen(false);
    setDreamEntryDeleteTargetId((current) => (current === entryId ? null : entryId));
    setEditingDreamEntryId((current) => (current === entryId ? null : current));
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
  };

  const handleConfirmDreamTopicDelete = (topicId: string) => {
    dreamService.deleteTopic(topicId);
    refreshDreamSnapshot();
    setDreamTopicDeleteTargetId((current) => (current === topicId ? null : current));
    addToast('success', '已删除 Dream aspect');
  };

  const handleConfirmDreamEntryDelete = (entryId: string) => {
    dreamService.deleteEntry(entryId);
    refreshDreamSnapshot();
    setDreamEntryDeleteTargetId((current) => (current === entryId ? null : current));
    setEditingDreamEntryId((current) => (current === entryId ? null : current));
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
    addToast('success', '已删除 Dream 条目');
  };

  const handleToggleDreamTopicEnabled = (topic: DreamTopic) => {
    dreamService.updateTopic(topic.id, {
      enabled: !topic.enabled
    });
    refreshDreamSnapshot();
  };

  const handleConfirmDreamReset = () => {
    dreamService.resetState();
    refreshDreamSnapshot();
    resetDreamTopicUi();
    resetDreamEntryUi();
    setIsDreamResetConfirmOpen(false);
    setIsDreamTopicNoteExpanded(false);
    addToast('success', '已重置 Dream');
  };

  const handleToggleDreamResetConfirm = () => {
    setIsDreamResetConfirmOpen((current) => !current);
    setDreamTopicDeleteTargetId(null);
    setDreamEntryDeleteTargetId(null);
    setEditingDreamEntryId(null);
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
  };

  const handleCancelDreamReset = () => {
    setIsDreamResetConfirmOpen(false);
  };

  const handleCancelDreamTopicDelete = () => {
    setDreamTopicDeleteTargetId(null);
  };

  const handleCancelDreamEntryDelete = () => {
    setDreamEntryDeleteTargetId(null);
  };

  const handleSelectDreamTopic = (topicId: string) => {
    setSelectedDreamTopicId(topicId);
  };

  const handleToggleDreamTopicNoteExpanded = () => {
    setIsDreamTopicNoteExpanded((current) => !current);
  };

  const handleRunDreamFromViewer = () => {
    if (!isLoading && activeSession) {
      handleCloseDreamViewer();
      handleStartDreamMonthSelection(activeSession.id);
    }
  };

  const handleStartDreamMonthSelection = (sessionId: string) => {
    const now = Date.now();
    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      messages: [
        ...currentSession.messages,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: 'dream',
          createdAt: now
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: DREAM_MONTH_SELECTION_PROMPT,
          createdAt: now + 1,
          tone: 'system'
        }
      ]
    }));
    setDreamMonthSelectionState({ sessionId });
    setInputText('');
    setIsHistoryPanelOpen(false);
    setIsPersonaPanelOpen(false);
  };

  const handleSubmitDreamMonthSelection = async (
    session: AIChatSession,
    userInput: string
  ) => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput) {
      return;
    }

    const sessionId = session.id;
    const userMessageId = crypto.randomUUID();
    const now = Date.now();
    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      messages: [
        ...currentSession.messages,
        {
          id: userMessageId,
          role: 'user',
          content: trimmedInput,
          createdAt: now
        }
      ]
    }));
    setInputText('');

    const selectedMonth = parseDreamMonthSelection(trimmedInput, getLocalDateStr);
    if (!selectedMonth) {
      mutateSession(sessionId, (currentSession) => ({
        ...currentSession,
        messages: [
          ...currentSession.messages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: DREAM_MONTH_SELECTION_INVALID_PROMPT,
            createdAt: now + 1,
            tone: 'system'
          }
        ]
      }));
      return;
    }

    setDreamMonthSelectionState((current) => (
      current?.sessionId === sessionId ? null : current
    ));
    await handleDreamCommand(session, selectedMonth, userMessageId, {
      retrySourceUserMessageId: userMessageId,
      userMessageAlreadyExists: true
    });
  };

  const handleOpenAssistantMemoryViewer = () => {
    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    resetAssistantEditableMemoryUi();
    resetAssistantReminderUi();
    setIsAssistantMemoryViewerOpen(true);
  };

  const handleCloseAssistantMemoryViewer = () => {
    resetAssistantEditableMemoryUi();
    resetAssistantReminderUi();
    setIsAssistantMemoryViewerOpen(false);
  };

  const handleOpenAssistantBackgroundHistoryViewer = () => {
    refreshAssistantBackgroundCallHistory();
    void refreshAssistantNativeDiagnostics();
    setIsAssistantBackgroundHistoryViewerOpen(true);
  };

  const handleCloseAssistantBackgroundHistoryViewer = () => {
    setIsAssistantBackgroundHistoryViewerOpen(false);
  };

  const handleClearAssistantBackgroundCallHistory = async () => {
    assistantOrchestratorService.clearBackgroundCallHistory();
    try {
      await AssistantAgent.clearDiagnostics();
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to clear native assistant diagnostics', error);
    }
    refreshAssistantBackgroundCallHistory();
    void refreshAssistantNativeDiagnostics();
    addToast('success', '已清空后台诊断记录');
  };

  const handleClearAssistantMemory = () => {
    assistantMemoryService.clearMemory();
    assistantReminderQueueService.clearQueue();
    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    resetAssistantEditableMemoryUi();
    resetAssistantReminderUi();
    notifyAssistantTaskStateChanged();
    addToast('success', '已清空长期记忆');
  };

  const updateAssistantEditableMemoryDraft = (key: AssistantEditableMemoryListKey, value: string) => {
    setAssistantEditableMemoryDrafts((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleOpenAssistantEditableMemoryComposer = (key: AssistantEditableMemoryListKey) => {
    setAssistantEditableMemoryComposerKey(key);
    setAssistantEditableMemoryDeleteTarget(null);
  };

  const handleCancelAssistantEditableMemoryComposer = (key: AssistantEditableMemoryListKey) => {
    setAssistantEditableMemoryComposerKey((current) => (current === key ? null : current));
    setAssistantEditableMemoryDrafts((current) => ({
      ...current,
      [key]: ''
    }));
  };

  const handleSaveAssistantEditableMemoryEntry = (key: AssistantEditableMemoryListKey) => {
    const draft = assistantEditableMemoryDrafts[key].trim();
    const sectionMeta = ASSISTANT_EDITABLE_MEMORY_SECTION_META[key];

    if (!draft) {
      addToast('warning', '先写一点内容再保存吧。');
      return;
    }

    if (assistantMemorySnapshot[key].includes(draft)) {
      addToast('info', '这条记忆已经存在了。');
      return;
    }

    assistantMemoryService.appendEditableListEntry(key, draft);
    refreshAssistantMemorySnapshot();
    setAssistantEditableMemoryDrafts((current) => ({
      ...current,
      [key]: ''
    }));
    setAssistantEditableMemoryComposerKey((current) => (current === key ? null : current));
    notifyAssistantTaskStateChanged();
    addToast('success', sectionMeta.addSuccessMessage);
  };

  const handleToggleAssistantEditableMemoryDelete = (key: AssistantEditableMemoryListKey, value: string) => {
    setAssistantEditableMemoryDeleteTarget((current) => (
      current && current.key === key && current.value === value
        ? null
        : { key, value }
    ));
  };

  const handleConfirmAssistantEditableMemoryDelete = (key: AssistantEditableMemoryListKey, value: string) => {
    assistantMemoryService.removeEditableListEntry(key, value);
    refreshAssistantMemorySnapshot();
    setAssistantEditableMemoryDeleteTarget((current) => (
      current && current.key === key && current.value === value
        ? null
        : current
    ));
    notifyAssistantTaskStateChanged();
    addToast('success', ASSISTANT_EDITABLE_MEMORY_SECTION_META[key].removeSuccessMessage);
  };

  const updateAssistantReminderDraft = (key: keyof AssistantReminderDrafts, value: string) => {
    setAssistantReminderDrafts((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleOpenAssistantReminderComposer = () => {
    setIsAssistantReminderComposerOpen(true);
    setAssistantReminderDeleteTarget(null);
  };

  const handleCancelAssistantReminderComposer = () => {
    resetAssistantReminderUi();
  };

  const handleSaveAssistantReminder = () => {
    const text = assistantReminderDrafts.text.trim();
    if (!text) {
      addToast('warning', '先写一点提醒内容再保存吧。');
      return;
    }

    const parsed = buildManualAssistantReminderDueAt(
      assistantReminderDrafts.date,
      assistantReminderDrafts.hour
    );
    if (!parsed.dueAt) {
      addToast('warning', parsed.error || '提醒时间无效，请检查后重试。');
      return;
    }

    if (assistantReminderSnapshot.some((reminder) => reminder.text === text && reminder.dueAt === parsed.dueAt)) {
      addToast('info', '这条 reminder 已经存在了。');
      return;
    }

    assistantReminderQueueService.enqueueReminder({
      id: crypto.randomUUID(),
      type: 'self_followup',
      dueAt: parsed.dueAt,
      status: 'pending',
      text,
      source: 'user',
      createdAt: new Date().toISOString()
    });
    refreshAssistantReminderSnapshot();
    refreshAssistantMemorySnapshot();
    resetAssistantReminderUi();
    notifyAssistantTaskStateChanged();
    addToast('success', '已新增 reminder');
  };

  const handleToggleAssistantReminderDelete = (id: string) => {
    setAssistantReminderDeleteTarget((current) => (
      current?.id === id ? null : { id }
    ));
  };

  const handleConfirmAssistantReminderDelete = (id: string) => {
    const removedReminder = assistantReminderQueueService.removeReminder(id);
    syncAssistantScheduledTasks(new Date());
    setAssistantReminderDeleteTarget((current) => (current?.id === id ? null : current));
    notifyAssistantTaskStateChanged();

    if (!removedReminder) {
      addToast('info', '这条 reminder 已经不存在了。');
      return;
    }

    addToast('success', '已删除这条 reminder');
  };

  const updateAssistantScheduledTaskDraft = <K extends keyof AssistantScheduledTaskDrafts>(
    key: K,
    value: AssistantScheduledTaskDrafts[K]
  ) => {
    setAssistantScheduledTaskDrafts((current) => ({
      ...current,
      [key]: value
    }));
  };

  const toggleAssistantScheduledTaskWeekday = (weekday: number) => {
    setAssistantScheduledTaskDrafts((current) => {
      const hasWeekday = current.weekdays.includes(weekday);
      return {
        ...current,
        weekdays: hasWeekday
          ? current.weekdays.filter((item) => item !== weekday)
          : [...current.weekdays, weekday].sort((left, right) => left - right)
      };
    });
  };

  const handleOpenAssistantScheduledTaskComposer = () => {
    setIsAssistantScheduledTaskComposerOpen(true);
    setAssistantScheduledTaskDeleteTarget(null);
  };

  const handleCancelAssistantScheduledTaskComposer = () => {
    resetAssistantScheduledTaskUi();
  };

  const handleSaveAssistantScheduledTask = () => {
    const text = assistantScheduledTaskDrafts.text.trim();
    if (!text) {
      addToast('warning', '先写一点任务内容再保存吧。');
      return;
    }

    const timeResult = buildAssistantScheduledTaskTime(assistantScheduledTaskDrafts.time);
    if (!timeResult.time) {
      addToast('warning', timeResult.error || '触发时间无效，请检查后重试。');
      return;
    }

    const recurrenceResult = buildAssistantScheduledTaskRecurrenceRule(
      assistantScheduledTaskDrafts,
      defaultDateKey
    );
    if (!recurrenceResult.recurrenceRule) {
      addToast('warning', recurrenceResult.error || '循环规则无效，请检查后重试。');
      return;
    }

    try {
      assistantScheduledTaskService.createTask({
        id: crypto.randomUUID(),
        text,
        time: timeResult.time,
        recurrenceRule: recurrenceResult.recurrenceRule
      });
      syncAssistantScheduledTasks(new Date());
      resetAssistantScheduledTaskUi();
      notifyAssistantTaskStateChanged();
      addToast('success', '已新增定时任务');
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to save assistant scheduled task', error);
      addToast('error', '保存定时任务失败，请稍后重试。');
    }
  };

  const handleToggleAssistantScheduledTaskEnabled = (task: AssistantScheduledTask) => {
    try {
      assistantScheduledTaskService.updateTask(task.id, {
        enabled: !task.enabled
      });
      syncAssistantScheduledTasks(new Date());
      notifyAssistantTaskStateChanged();
      addToast('success', task.enabled ? '已停用定时任务' : '已启用定时任务');
    } catch (error) {
      console.error('[AIBackfillChatModal] Failed to toggle assistant scheduled task', error);
      addToast('error', '切换定时任务状态失败，请稍后重试。');
    }
  };

  const handleToggleAssistantScheduledTaskDelete = (id: string) => {
    setAssistantScheduledTaskDeleteTarget((current) => (
      current?.id === id ? null : { id }
    ));
  };

  const handleConfirmAssistantScheduledTaskDelete = (id: string) => {
    const removedTask = assistantScheduledTaskService.removeTask(id);
    syncAssistantScheduledTasks(new Date());
    setAssistantScheduledTaskDeleteTarget((current) => (current?.id === id ? null : current));
    notifyAssistantTaskStateChanged();

    if (!removedTask) {
      addToast('info', '这条定时任务已经不存在了。');
      return;
    }

    addToast('success', '已删除定时任务');
  };

  const handleAIInternalBack = useCallback((): boolean => {
    if (!isOpen) {
      return false;
    }

    if (debugViewer) {
      setDebugViewer(null);
      return true;
    }

    if (isAssistantBackgroundHistoryViewerOpen) {
      handleCloseAssistantBackgroundHistoryViewer();
      return true;
    }

    if (isAssistantMemoryViewerOpen) {
      if (assistantReminderDeleteTarget) {
        setAssistantReminderDeleteTarget(null);
        return true;
      }

      if (assistantScheduledTaskDeleteTarget) {
        setAssistantScheduledTaskDeleteTarget(null);
        return true;
      }

      if (isAssistantScheduledTaskComposerOpen) {
        resetAssistantScheduledTaskUi();
        return true;
      }

      if (isAssistantReminderComposerOpen) {
        resetAssistantReminderUi();
        return true;
      }

      if (assistantEditableMemoryDeleteTarget) {
        setAssistantEditableMemoryDeleteTarget(null);
        return true;
      }

      if (assistantEditableMemoryComposerKey) {
        handleCancelAssistantEditableMemoryComposer(assistantEditableMemoryComposerKey);
        return true;
      }

      handleCloseAssistantMemoryViewer();
      return true;
    }

    if (isDreamViewerOpen) {
      if (isDreamResetConfirmOpen) {
        setIsDreamResetConfirmOpen(false);
        return true;
      }

      if (dreamEntryDeleteTargetId) {
        setDreamEntryDeleteTargetId(null);
        return true;
      }

      if (editingDreamEntryId) {
        resetDreamEntryUi();
        return true;
      }

      if (dreamTopicDeleteTargetId) {
        setDreamTopicDeleteTargetId(null);
        return true;
      }

      if (isDreamTopicComposerOpen) {
        resetDreamTopicUi();
        return true;
      }

      handleCloseDreamViewer();
      return true;
    }

    if (isUserEmojiEditorOpen) {
      setIsUserEmojiEditorOpen(false);
      return true;
    }

    if (isNewSessionDialogOpen) {
      handleCloseNewSessionDialog();
      return true;
    }

    if (isEmojiEditorOpen) {
      setIsEmojiEditorOpen(false);
      return true;
    }

    if (isPersonaPanelOpen) {
      if (deleteConfirmPersonaId) {
        setDeleteConfirmPersonaId(null);
        return true;
      }

      setIsPersonaPanelOpen(false);
      return true;
    }

    if (isHistoryPanelOpen) {
      if (deleteConfirmSessionId) {
        setDeleteConfirmSessionId(null);
        return true;
      }

      if (editingSessionId) {
        handleCancelRenameSession();
        return true;
      }

      setIsHistoryPanelOpen(false);
      return true;
    }

    onClose();
    return true;
  }, [
    assistantEditableMemoryComposerKey,
    assistantEditableMemoryDeleteTarget,
    assistantReminderDeleteTarget,
    assistantScheduledTaskDeleteTarget,
    debugViewer,
    deleteConfirmPersonaId,
    deleteConfirmSessionId,
    editingSessionId,
    handleCancelAssistantEditableMemoryComposer,
    handleCancelRenameSession,
    handleCloseAssistantBackgroundHistoryViewer,
    handleCloseDreamViewer,
    handleCloseAssistantMemoryViewer,
    dreamEntryDeleteTargetId,
    editingDreamEntryId,
    isDreamResetConfirmOpen,
    isAssistantBackgroundHistoryViewerOpen,
    isDreamViewerOpen,
    isAssistantMemoryViewerOpen,
    isAssistantReminderComposerOpen,
    isAssistantScheduledTaskComposerOpen,
    isDreamTopicComposerOpen,
    isEmojiEditorOpen,
    isHistoryPanelOpen,
    isNewSessionDialogOpen,
    isOpen,
    isPersonaPanelOpen,
    isUserEmojiEditorOpen,
    dreamTopicDeleteTargetId,
    resetAssistantScheduledTaskUi,
    resetDreamEntryUi,
    resetDreamTopicUi,
    handleCloseNewSessionDialog,
    onClose
  ]);

  useEffect(() => {
    if (!registerBackHandler) {
      return;
    }

    registerBackHandler(isOpen ? handleAIInternalBack : null);

    return () => {
      registerBackHandler(null);
    };
  }, [handleAIInternalBack, isOpen, registerBackHandler]);

  const runManualAssistantCheckinDebug = (options?: ForegroundSendOptions) => {
    if (!activeSession || isLoading) {
      return;
    }

    const sessionId = activeSession.id;
    const now = Date.now();
    const retryMessageId = options?.replaceMessageId;
    const canRetryInPlace = Boolean(
      retryMessageId && activeSession.messages.some((message) => message.id === retryMessageId)
    );
    const userMessageId = options?.retrySourceUserMessageId || crypto.randomUUID();
    const pendingMessageId = canRetryInPlace && retryMessageId
      ? retryMessageId
      : crypto.randomUUID();
    const historyBeforeCurrent = canRetryInPlace
      ? buildRetryConversationHistory(sessionId, options?.retrySourceUserMessageId)
      : (conversationHistoryCache.get(sessionId) || []);
    const promptHistory = narrowHistoryForTimeSensitiveTurn(historyBeforeCurrent, trimmedText);

    if (canRetryInPlace) {
      mutateSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((message) => (
          message.id === pendingMessageId
            ? {
              id: pendingMessageId,
              role: 'assistant',
              content: '我先模拟一轮后台 check-in…',
              createdAt: now,
              tone: 'pending'
            }
            : message
        ))
      }));
    } else {
      mutateSession(sessionId, (session) => ({
        ...session,
        messages: [
          ...session.messages,
          {
            id: userMessageId,
            role: 'user',
            content: '/agent checkin',
            createdAt: now
          },
          {
            id: pendingMessageId,
            role: 'assistant',
            content: '我先模拟一轮后台 check-in…',
            createdAt: now + 1,
            tone: 'pending'
          }
        ]
      }));
    }

    if (!canRetryInPlace) {
      setInputText('');
    }
    setIsLoading(true);

    void assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
      trigger: {
        id: crypto.randomUUID(),
        type: 'manual_background_nudge',
        source: 'system',
        createdAt: formatAssistantLocalDateTime(new Date(now)),
        text: 'Manual debug trigger for assistant background check-in'
      },
      now: new Date(now),
      targetSession: activeSession,
      conversationHistory: historyBeforeCurrent,
      showSystemNotification: false
    })).then((result) => {
      refreshAssistantMemorySnapshot();
      reloadPersistedChatSessions();

      const content = [
        '后台 check-in 调试完成',
        `Action: ${result.decision.action}`,
        `Memory: ${result.decision.memoryAction}`,
        ...(result.decision.decisionSummary ? [`Decision: ${result.decision.decisionSummary}`] : []),
        ...(result.decision.silentReason ? [`Silent Reason: ${result.decision.silentReason}`] : []),
        ...(result.decision.silentSideEffects?.length ? [`Side Effects: ${result.decision.silentSideEffects.join('；')}`] : []),
        ...(result.appliedReminders?.length ? [`Reminders: ${result.appliedReminders.length}`] : []),
        ...(result.surfacedMessage ? [`Message: ${result.surfacedMessage}`] : [])
      ].join('\n');

      replacePendingWithResult(sessionId, pendingMessageId, content, {
        tone: result.decision.action === 'silent' ? 'system' : 'normal',
        debugSections: debugMode
          ? [{
            label: '后台 Check-in 调试',
            exchange: result.debug
          }]
          : undefined
      });
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Manual assistant check-in debug failed', error);
      replacePendingWithResult(
        sessionId,
        pendingMessageId,
        getRetryableAIErrorMessage(error),
        {
          tone: 'error',
          retryInput: '/agent checkin',
          retrySourceUserMessageId: userMessageId,
          debugSections: getErrorDebugSections(error, '后台 Check-in 调试', debugMode)
        }
      );
    }).finally(() => {
      if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
        activeRequestRef.current = null;
      }
      setIsLoading(false);
    });
  };

  const runManualAssistantReminderDebug = (options?: ForegroundSendOptions) => {
    if (!activeSession || isLoading) {
      return;
    }

    const sessionId = activeSession.id;
    const now = Date.now();
    const scheduledDueAt = formatAssistantLocalDateTime(new Date(now - (30 * 60 * 1000)));
    const actualDispatchAt = formatAssistantLocalDateTime(new Date(now));
    const retryMessageId = options?.replaceMessageId;
    const canRetryInPlace = Boolean(
      retryMessageId && activeSession.messages.some((message) => message.id === retryMessageId)
    );
    const pendingMessageId = canRetryInPlace && retryMessageId
      ? retryMessageId
      : crypto.randomUUID();
    const userMessageId = options?.retrySourceUserMessageId || crypto.randomUUID();
    const historyBeforeCurrent = canRetryInPlace
      ? buildRetryConversationHistory(sessionId, options?.retrySourceUserMessageId)
      : (conversationHistoryCache.get(sessionId) || []);

    if (canRetryInPlace) {
      mutateSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((message) => (
          message.id === pendingMessageId
            ? {
              id: pendingMessageId,
              role: 'assistant',
              content: '我先模拟一轮延迟 reminder 补发…',
              createdAt: now,
              tone: 'pending'
            }
            : message
        ))
      }));
    } else {
      mutateSession(sessionId, (session) => ({
        ...session,
        messages: [
          ...session.messages,
          {
            id: userMessageId,
            role: 'user',
            content: '/agent reminder due',
            createdAt: now
          },
          {
            id: pendingMessageId,
            role: 'assistant',
            content: '我先模拟一轮延迟 reminder 补发…',
            createdAt: now + 1,
            tone: 'pending'
          }
        ]
      }));
    }

    if (!canRetryInPlace) {
      setInputText('');
    }
    setIsLoading(true);

    void assistantOrchestratorService.runSystemTurn(buildBackgroundTurnRequest({
      trigger: {
        id: crypto.randomUUID(),
        type: 'reminder_due',
        source: 'system',
        createdAt: actualDispatchAt,
        text: '请确认用户是否还在做刚才那件事，如果已经做完就不要机械重复提醒。',
        metadata: {
          scheduledDueAt,
          actualDispatchAt,
          delayMinutes: 30,
          reminderId: crypto.randomUUID(),
          reminderType: 'self_followup'
        }
      },
      now: new Date(now),
      targetSession: activeSession,
      conversationHistory: historyBeforeCurrent,
      showSystemNotification: false
    })).then((result) => {
      refreshAssistantMemorySnapshot();
      reloadPersistedChatSessions();
      const content = [
        '延迟 reminder 调试完成',
        `Action: ${result.decision.action}`,
        `Memory: ${result.decision.memoryAction}`,
        ...(result.decision.decisionSummary ? [`Decision: ${result.decision.decisionSummary}`] : []),
        ...(result.decision.silentReason ? [`Silent Reason: ${result.decision.silentReason}`] : []),
        ...(result.decision.silentSideEffects?.length ? [`Side Effects: ${result.decision.silentSideEffects.join('；')}`] : []),
        ...(result.appliedReminders?.length ? [`Reminders: ${result.appliedReminders.length}`] : []),
        ...(result.surfacedMessage ? [`Message: ${result.surfacedMessage}`] : [])
      ].join('\n');
      replacePendingWithResult(sessionId, pendingMessageId, content, {
        tone: result.decision.action === 'silent' ? 'system' : 'normal',
        debugSections: debugMode
          ? [{
            label: '延迟 Reminder 调试',
            exchange: result.debug
          }]
          : undefined
      });
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Manual assistant reminder debug failed', error);
      replacePendingWithResult(
        sessionId,
        pendingMessageId,
        getRetryableAIErrorMessage(error),
        {
          tone: 'error',
          retryInput: '/agent reminder due',
          retrySourceUserMessageId: userMessageId,
          debugSections: getErrorDebugSections(error, '延迟 Reminder 调试', debugMode)
        }
      );
    }).finally(() => {
      if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
        activeRequestRef.current = null;
      }
      setIsLoading(false);
    });
  };

  const handleDebugCommand = (trimmedText: string, options?: ForegroundSendOptions): boolean => {
    const normalized = trimmedText.toLowerCase();
    if (normalized === '/agent checkin' && activeSession) {
      runManualAssistantCheckinDebug(options);
      return true;
    }

    if (normalized === '/agent reminder due' && activeSession) {
      runManualAssistantReminderDebug(options);
      return true;
    }

    if (!['/debug', '/debug on', '/debug off'].includes(normalized) || !activeSession) {
      return false;
    }

    const nextDebugMode = normalized === '/debug'
      ? !debugMode
      : normalized === '/debug on';

    const now = Date.now();
    mutateSession(activeSession.id, (session) => ({
      ...session,
      messages: [
        ...session.messages,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: trimmedText,
          createdAt: now
        },
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: nextDebugMode
            ? '已开启调试模式，之后会保留每次 AI 请求和响应，方便查看两阶段调用细节。'
            : '已关闭调试模式，之后的新消息将不再显示调试入口。',
          createdAt: now + 1,
          tone: 'system'
        }
      ]
    }));

    setDebugMode(nextDebugMode);
    setInputText('');
    return true;
  };

  const getScopeNames = (scopeIds: string[]): string[] => (
    scopeIds
      .map((scopeId) => scopes.find((scope) => scope.id === scopeId)?.name)
      .filter((name): name is string => Boolean(name))
  );

  const getActivityCategory = (activityId?: string) => (
    activityId
      ? categories.find((category) => category.activities.some((activity) => activity.id === activityId))
      : undefined
  );

  const getActivityById = (activityId?: string) => (
    activityId
      ? categories.flatMap((category) => category.activities).find((activity) => activity.id === activityId)
      : undefined
  );

  const buildAssistantActionContext = () => ({
    defaultDateKey,
    logs,
    todos,
    categories,
    scopes,
    todoCategories,
    autoApplyAutoLinkRules,
    autoLinkRules
  });

  const applyPlannedLogToolCalls = (toolCalls: AIBackfillToolCall[]): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyLogToolCalls(buildAssistantActionContext(), toolCalls);
    if (result.actions.some((action) => action.kind === 'create_log' && action.status === 'applied')) {
      setLogs(result.nextLogs);
      setTodos(result.nextTodos);
    }
    return result.actions;
  };
  const applyPlannedTodoToolCalls = (toolCalls: AITodoToolCall[]): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyTodoToolCalls(buildAssistantActionContext(), toolCalls);
    if (result.actions.some((action) => action.kind === 'create_todo' && action.status === 'applied')) {
      setTodos(result.nextTodos);
    }
    return result.actions;
  };
  const applyPlannedTodoUpdateToolCalls = (toolCalls: AITodoUpdateToolCall[]): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyTodoUpdateToolCalls(buildAssistantActionContext(), toolCalls);
    if (result.actions.some((action) => action.kind === 'update_todo' && action.status === 'applied')) {
      setTodos(result.nextTodos);
    }
    return result.actions;
  };
  const applyPlannedCreateSubtaskToolCalls = (
    toolCalls: AICreateSubtaskToolCall[],
    sourceText: string
  ): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyCreateSubtaskToolCalls(buildAssistantActionContext(), toolCalls, sourceText);
    if (result.actions.some((action) => action.kind === 'create_subtask' && action.status === 'applied')) {
      setTodos(result.nextTodos);
    }
    return result.actions;
  };
  const applyPlannedEditLogToolCalls = (toolCalls: AIEditLogToolCall[]): AppliedChatAction[] => {
    const result = assistantActionExecutor.applyEditLogToolCalls(buildAssistantActionContext(), toolCalls);
    if (result.actions.some((action) => action.kind === 'edit_log' && action.status === 'applied')) {
      setLogs(result.nextLogs);
      setTodos(result.nextTodos);
    }
    return result.actions;
  };
  const handleUndoLogAction = (messageId: string, action: AppliedCreateLogAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.logId) {
      return;
    }

    const liveLog = logs.find((log) => log.id === action.snapshot.logId);
    if (!liveLog) {
      updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
      return;
    }

    const deleteResult = applyLogDelete(logs, todos, liveLog.id);
    setLogs(deleteResult.logs);
    setTodos(deleteResult.todos);

    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这条 AI 补记');
  };

  const handleUndoTodoAction = (messageId: string, action: AppliedCreateTodoAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.todoId) {
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== action.snapshot.todoId));
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这条 AI 待办');
  };

  const handleUndoUpdateTodoAction = (messageId: string, action: AppliedUpdateTodoAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.previousTodo) {
      return;
    }

    setTodos((prev) => applyTodoSave(prev, action.snapshot.previousTodo!));
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这次 AI 待办修改');
  };

  const handleUndoCreateSubtaskAction = (messageId: string, action: AppliedCreateSubtaskAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.todoId) {
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== action.snapshot.todoId));
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这条 AI 子任务');
  };

  const handleUndoEditLogAction = (messageId: string, action: AppliedEditLogAction) => {
    if (action.status !== 'applied' || !activeSession || !action.snapshot.previousLog) {
      return;
    }

    const restoreResult = applyLogSave(logs, todos, action.snapshot.previousLog);
    setLogs(restoreResult.logs);
    setTodos(restoreResult.todos);
    updateAppliedActionStatus(activeSession.id, messageId, action.actionId, 'undone');
    addToast('success', '已撤销这次 AI 记录修改');
  };

  const applyUnifiedToolCalls = (toolCalls: AssistantToolCall[], sourceText: string): AppliedChatAction[] => {
    const logCalls = toolCalls.filter((toolCall): toolCall is AIBackfillToolCall => toolCall.toolName === 'create_log');
    const todoCalls = toolCalls.filter((toolCall): toolCall is AITodoToolCall => toolCall.toolName === 'create_todo');
    const todoUpdateCalls = toolCalls.filter((toolCall): toolCall is AITodoUpdateToolCall => toolCall.toolName === 'update_todo');
    const subtaskCalls = toolCalls.filter((toolCall): toolCall is AICreateSubtaskToolCall => toolCall.toolName === 'create_subtask');
    const editLogCalls = toolCalls.filter((toolCall): toolCall is AIEditLogToolCall => toolCall.toolName === 'edit_log');

    return [
      ...applyPlannedLogToolCalls(logCalls),
      ...applyPlannedTodoToolCalls(todoCalls),
      ...applyPlannedTodoUpdateToolCalls(todoUpdateCalls),
      ...applyPlannedCreateSubtaskToolCalls(subtaskCalls, sourceText),
      ...applyPlannedEditLogToolCalls(editLogCalls)
    ];
  };

  const applyUnifiedReminders = (output: AssistantUnifiedTurnOutput): string[] => {
    const reminders = output.reminders || [];
    if (reminders.length === 0) {
      return [];
    }

    const reminderUpdates: string[] = [];
    reminders.forEach((reminder) => {
      const normalizedDueAt = normalizeAssistantDateTime(reminder.dueAt);
      if (!normalizedDueAt) {
        console.warn('[AIBackfillChatModal] Ignored reminder with invalid dueAt', reminder.dueAt);
        return;
      }

      assistantReminderQueueService.enqueueReminder({
        id: crypto.randomUUID(),
        type: reminder.type || 'self_followup',
        dueAt: normalizedDueAt,
        status: 'pending',
        text: reminder.text,
        ...(reminder.todoId ? { todoId: reminder.todoId } : {}),
        source: 'user',
        createdAt: new Date().toISOString()
      });
      reminderUpdates.push(`${formatAssistantDateTimeForDisplay(normalizedDueAt)} · ${reminder.text}`);
    });

    refreshAssistantReminderSnapshot();
    refreshAssistantMemorySnapshot();
    return reminderUpdates;
  };

  const handleOpenLogEditor = (logId?: string) => {
    if (!logId) {
      return;
    }

    const liveLog = logs.find((log) => log.id === logId);
    if (!liveLog) {
      addToast('info', '这条记录已经不存在了。');
      return;
    }

    setEditingLog(liveLog);
    setInitialLogTimes(null);
    setIsAddModalOpen(true);
  };

  const handleOpenTodoDetail = (todoId?: string) => {
    if (!todoId) {
      return;
    }

    const liveTodo = todos.find((todo) => todo.id === todoId);
    if (!liveTodo) {
      addToast('info', '这条待办已经不存在了。');
      return;
    }

    setEditingTodo(liveTodo);
    setTodoCategoryToAdd(liveTodo.categoryId);
    setNewTodoDraft(null);
    setIsTodoModalOpen(true);
  };

  const handleOpenWeeklyReviewNarrative = (weekStartDate: string, weekEndDate: string) => {
    const weekStart = new Date(`${weekStartDate}T12:00:00`);
    const weekEnd = new Date(`${weekEndDate}T12:00:00`);
    if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
      addToast('info', '这个周回顾的日期范围无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentWeeklyReviewInitialTab('narrative');
    setCurrentWeeklyReviewStart(weekStart);
    setCurrentWeeklyReviewEnd(weekEnd);
    setIsWeeklyReviewOpen(true);
    onClose();
  };

  const handleOpenDailyReviewNarrative = (date: string) => {
    const reviewDate = new Date(`${date}T12:00:00`);
    if (Number.isNaN(reviewDate.getTime())) {
      addToast('info', '这个日报日期无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentReviewDate(reviewDate);
    setCurrentDailyReviewInitialTab('narrative');
    setIsDailyReviewOpen(true);
    onClose();
  };

  const handleOpenDailyNewspaper = (date: string) => {
    const reviewDate = new Date(`${date}T12:00:00`);
    if (Number.isNaN(reviewDate.getTime())) {
      addToast('info', '这个小报日期无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentDailyNewspaperDate(reviewDate);
    setIsDailyNewspaperOpen(true);
    onClose();
  };

  const handleOpenMonthlyReviewNarrative = (monthStartDate: string, monthEndDate: string) => {
    const monthStart = new Date(`${monthStartDate}T12:00:00`);
    const monthEnd = new Date(`${monthEndDate}T12:00:00`);
    if (Number.isNaN(monthStart.getTime()) || Number.isNaN(monthEnd.getTime())) {
      addToast('info', '这个月回顾的日期范围无效。');
      return;
    }

    setCurrentView(AppView.REVIEW);
    setCurrentMonthlyReviewInitialTab('narrative');
    setCurrentMonthlyReviewStart(monthStart);
    setCurrentMonthlyReviewEnd(monthEnd);
    setIsMonthlyReviewOpen(true);
    onClose();
  };

  const replacePendingWithResult = (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: {
      tone?: ChatTone;
      reasoning?: AssistantReasoningSummary;
      displayParts?: string[];
      debugSections?: AIChatDebugSection[];
      appliedActions?: AppliedChatAction[];
      memoryUpdates?: AIChatMemoryUpdateSection[];
      dreamUpdates?: AIChatDreamUpdateCard[];
      reminderUpdates?: string[];
      dailyNewspaperWriteback?: AIChatDailyNewspaperWritebackResult;
      dailyReviewWriteback?: AIChatDailyReviewWritebackResult;
      weeklyReviewWriteback?: AIChatWeeklyReviewWritebackResult;
      monthlyReviewWriteback?: AIChatMonthlyReviewWritebackResult;
      retryInput?: string;
      retrySourceUserMessageId?: string;
      dreamRetryYearMonth?: string;
    }
  ) => {
    replaceMessage(sessionId, pendingMessageId, {
      id: pendingMessageId,
      role: 'assistant',
      content,
      ...(options?.reasoning ? { reasoning: options.reasoning } : {}),
      ...(options?.displayParts?.length ? { displayParts: options.displayParts } : {}),
      createdAt: Date.now(),
      ...(options?.tone ? { tone: options.tone } : {}),
      ...(options?.debugSections && options.debugSections.length > 0 ? { debugSections: options.debugSections } : {}),
      ...(options?.appliedActions && options.appliedActions.length > 0 ? { appliedActions: options.appliedActions } : {}),
      ...(options?.memoryUpdates && options.memoryUpdates.length > 0 ? { memoryUpdates: options.memoryUpdates } : {}),
      ...(options?.dreamUpdates && options.dreamUpdates.length > 0 ? { dreamUpdates: options.dreamUpdates } : {}),
      ...(options?.reminderUpdates && options.reminderUpdates.length > 0 ? { reminderUpdates: options.reminderUpdates } : {}),
      ...(options?.dailyNewspaperWriteback ? { dailyNewspaperWriteback: options.dailyNewspaperWriteback } : {}),
      ...(options?.dailyReviewWriteback ? { dailyReviewWriteback: options.dailyReviewWriteback } : {}),
      ...(options?.weeklyReviewWriteback ? { weeklyReviewWriteback: options.weeklyReviewWriteback } : {}),
      ...(options?.monthlyReviewWriteback ? { monthlyReviewWriteback: options.monthlyReviewWriteback } : {}),
      ...(options?.retryInput ? { retryInput: options.retryInput } : {}),
      ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
      ...(options?.dreamRetryYearMonth ? { dreamRetryYearMonth: options.dreamRetryYearMonth } : {})
    });

    if (options?.dreamUpdates && options.dreamUpdates.length > 0) {
      setExpandedDreamUpdateMessageIds((current) => {
        const next = new Set(current);
        next.add(pendingMessageId);
        return next;
      });
    }

    if (!isOpenRef.current) {
      onUnreadAssistantMessage?.(1);
    }
  };

  const applyAssistantMemoryPatch = (
    patch?: AssistantUnifiedTurnOutput['memoryPatch'],
  ): AIChatMemoryUpdateSection[] => {
    if (!patch) {
      return [];
    }

    const before = assistantMemoryService.getMemory();
    const after = assistantMemoryService.applyPatch(patch);
    refreshAssistantMemorySnapshot();
    return buildMemoryUpdateSections(before, after);
  };

  const resolveAssistantDisplayParts = (
    content: string
  ): string[] | undefined => (
    buildAssistantDisplayParts(content)
  );

  const resolveAssistantReplyContent = (
    output?: Pick<AssistantUnifiedTurnOutput, 'assistantReply' | 'outcome'>,
    fallbackReply?: string
  ): string => {
    const assistantReply = output?.assistantReply?.trim() || '';
    if (assistantReply) {
      return assistantReply;
    }

    return fallbackReply?.trim() || (
      output?.outcome === 'clarify'
        ? '这次还差一点关键信息，你再补一句我就能继续。'
        : '我在。'
    );
  };

  const resolveForegroundAssistantReply = (
    rawContent: string,
    sourceText: string,
    appliedActions: AppliedChatAction[]
  ): string => {
    const editLogActions = appliedActions.filter((action) => action.kind === 'edit_log');
    const successfulEditLogCount = editLogActions.filter((action) => action.status === 'applied').length;
    const failedEditLogActions = editLogActions.filter((action) => action.status === 'failed');

    if (failedEditLogActions.length > 0 && successfulEditLogCount === 0) {
      return failedEditLogActions[0]?.errorMessage?.trim() || '这次我还没实际改动这条记录。';
    }

    if (successfulEditLogCount > 0) {
      return rawContent;
    }

    if (
      LOG_EDIT_REQUEST_PATTERN.test(sourceText)
      && LOG_EDIT_SUCCESS_REPLY_PATTERN.test(rawContent)
    ) {
      return '这次我还没实际改动这条记录。要么是没有匹配到目标记录，要么是修改条件还不够明确。你可以再说得更具体一点，我再帮你改。';
    }

    return rawContent;
  };

  const runWeeklyReviewNarrativeWriteback = async (
    session: AIChatSession,
    params: {
      weeklyReview: WeeklyReview;
      weekDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runWeeklyReviewNarrativeWritebackFlow({
    activeRequestRef,
    addToast,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    resolveTemplateMeta: resolveWeeklyReviewTemplateSessionMeta,
    session,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    setWeeklyReviews,
    updateWeeklyReviewTemplateStage
  });

  const runDailyReviewNarrativeWriteback = async (
    session: AIChatSession,
    params: {
      dailyReview: DailyReview;
      dayDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runDailyReviewNarrativeWritebackFlow({
    activeRequestRef,
    addToast,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    debugMode,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    session,
    setDailyReviewWritebackConfirmation,
    setDailyReviews,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen
  });

  const runDailyNewspaperWriteback = async (
    session: AIChatSession,
    params: {
      dailyReview: DailyReview;
      dayDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runDailyNewspaperWritebackFlow({
    activeRequestRef,
    assistantMemoryEnabled: assistantAgentConfig.longTermMemoryEnabled,
    addToast,
    applyUnifiedToolCalls,
    buildConversationHistory,
    buildDreamContext,
    buildForegroundAssistantMemory,
    buildForegroundAssistantReminderSummary,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    buildStateContext: buildAssistantStateContext,
    debugMode,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    session,
    setDailyNewspaperWritebackConfirmation: () => setDailyNewspaperWritebackConfirmation(null),
    setDailyReviews,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen
  });

  const runMonthlyReviewNarrativeWriteback = async (
    session: AIChatSession,
    params: {
      monthlyReview: MonthlyReview;
      monthDataText: string;
      mergeMode: 'create' | 'overwrite';
      createdReview: boolean;
    }
  ) => runMonthlyReviewNarrativeWritebackFlow({
    activeRequestRef,
    addToast,
    buildConversationHistory,
    buildPersonaPrompt: buildSharedPersonaPrompt,
    getConversationSummary: (sessionId) => assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(sessionId) || [],
      24
    ),
    getRetryableAIErrorMessage,
    isAbortError,
    mutateSession,
    params,
    replacePendingWithResult,
    resolveSessionPersona,
    resolveTemplateMeta: resolveMonthlyReviewTemplateSessionMeta,
    session,
    setInputText,
    setIsHistoryPanelOpen,
    setIsLoading,
    setIsPersonaPanelOpen,
    setMonthlyReviews,
    updateWeeklyReviewTemplateStage
  });

  const handleWeeklyReviewNarrativeWritebackCommand = async (session: AIChatSession) => (
    runWeeklyReviewNarrativeWritebackCommandFlow({
      addToast,
      buildWeekDataText: buildWeeklyReviewTemplateWeekDataText,
      resolveTemplateMeta: resolveWeeklyReviewTemplateSessionMeta,
      reviewTemplates,
      runWriteback: runWeeklyReviewNarrativeWriteback,
      session,
      weeklyReviews
    })
  );

  const handleDailyReviewNarrativeCommand = async (session: AIChatSession) => (
    runDailyReviewNarrativeCommandFlow({
      appendSystemMessage,
      categories,
      checkTemplates,
      dailyReviews,
      getLocalDateStr,
      logs,
      prepareForInteraction: prepareForTemplateInteraction,
      reviewTemplates,
      runWriteback: runDailyReviewNarrativeWriteback,
      scopes,
      session,
      setConfirmation: setDailyReviewWritebackConfirmation,
      todoCategories,
      todos
    })
  );

  const handleDailyNewspaperCommand = async (session: AIChatSession) => (
    runDailyNewspaperCommandFlow({
      appendSystemMessage,
      categories,
      checkTemplates,
      dailyReviews,
      getLocalDateStr,
      logs,
      prepareForInteraction: prepareForTemplateInteraction,
      reviewTemplates,
      runWriteback: runDailyNewspaperWriteback,
      scopes,
      session,
      setConfirmation: setDailyNewspaperWritebackConfirmation,
      todoCategories,
      todos
    })
  );

  const handleDailyReviewNarrativeOverwriteConfirmation = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => (
    runDailyReviewNarrativeOverwriteConfirmationFlow({
      appendSystemMessage,
      appendUserMessage,
      categories,
      checkTemplates,
      confirmation: dailyReviewWritebackConfirmation,
      dailyReviews,
      getLocalDateStr,
      logs,
      prepareForInteraction: prepareForTemplateInteraction,
      reviewTemplates,
      runWriteback: runDailyReviewNarrativeWriteback,
      scopes,
      session,
      setConfirmation: setDailyReviewWritebackConfirmation,
      todoCategories,
      todos,
      userInput
    })
  );

  const handleDailyNewspaperOverwriteConfirmation = async (
    session: AIChatSession,
    userInput: string
  ): Promise<boolean> => (
    runDailyNewspaperOverwriteConfirmationFlow({
      appendSystemMessage,
      appendUserMessage,
      categories,
      checkTemplates,
      confirmation: dailyNewspaperWritebackConfirmation,
      dailyReviews,
      getLocalDateStr,
      logs,
      prepareForInteraction: prepareForTemplateInteraction,
      reviewTemplates,
      runWriteback: runDailyNewspaperWriteback,
      scopes,
      session,
      setConfirmation: setDailyNewspaperWritebackConfirmation,
      todoCategories,
      todos,
      userInput
    })
  );

  const handleMonthlyReviewNarrativeWritebackCommand = async (session: AIChatSession) => (
    runMonthlyReviewNarrativeWritebackCommandFlow({
      addToast,
      buildMonthDataText: buildMonthlyReviewTemplateMonthDataText,
      monthlyReviews,
      resolveTemplateMeta: resolveMonthlyReviewTemplateSessionMeta,
      reviewTemplates,
      runWriteback: runMonthlyReviewNarrativeWriteback,
      session
    })
  );

  const handleDreamCommand = async (
    session: AIChatSession,
    selectedMonth: DreamMonthRangeSelection,
    userMessageId?: string,
    options?: {
      replaceMessageId?: string;
      retrySourceUserMessageId?: string;
      userMessageAlreadyExists?: boolean;
    }
  ) => {
    const historyBeforeCurrent = options?.replaceMessageId
      ? buildRetryConversationHistory(session.id, options?.retrySourceUserMessageId)
      : (conversationHistoryCache.get(session.id) || []);

    await runDreamCommandFlow({
      activeRequestRef,
      buildConversationSummary: (history) => assistantContextBuilder.summarizeConversationTurns(history, 24),
      buildDictionaryDigestText: (monthSelection) => assistantContextBuilder.buildDictionaryDigest(
        buildDreamRangeDictionaryContext(monthSelection.startDate, monthSelection.endDate)
      ),
      buildStateContextText: (monthSelection, currentTurnDate) => {
        const reminderSummary = buildForegroundAssistantReminderSummary();
        return JSON.stringify({
          ...assistantContextBuilder.buildStateContext({
            ...buildAssistantCurrentTimeSnapshot(currentTurnDate),
            defaultDate: monthSelection.endDate,
            logs: logs.filter((log) => {
              const logDate = formatDateKey(new Date(log.startTime));
              return logDate >= monthSelection.startDate && logDate <= monthSelection.endDate;
            }),
            categories,
            todos,
            activeSessions,
            timelineReviewSummary: buildAssistantTimelineSummary(),
            ...(reminderSummary ? { reminderSummary } : {})
          }),
          dreamRangeLabel: monthSelection.label,
          dreamRangeStart: monthSelection.startDate,
          dreamRangeEnd: monthSelection.endDate
        }, null, 2);
      },
      debugMode,
      formatCurrentDateTime: formatAssistantLocalDateTime,
      getErrorDebugSections,
      getRetryableAIErrorMessage,
      historyBeforeCurrent,
      isAbortError,
      mutateSession,
      options,
      refreshDreamSnapshot,
      replacePendingWithResult,
      selectedMonth,
      session,
      setInputText,
      setIsHistoryPanelOpen,
      setIsLoading,
      setIsPersonaPanelOpen,
      setSelectedDreamTopicId,
      userMessageId
    });
  };

  const handleWeeklyReviewTemplateOpeningTurn = async (session: AIChatSession) => {
    const weekDataText = buildWeeklyReviewTemplateWeekDataText(session);
    if (!weekDataText) {
      throw new Error('周复盘上下文还没有准备好。');
    }

    await runWeeklyReviewTemplateOpeningTurnFlow({
      activePersona,
      activeRequestRef,
      appendSystemMessage,
      buildConversationHistory,
      buildPersonaPrompt: buildSharedPersonaPrompt,
      debugMode,
      getErrorDebugSections,
      getRetryableAIErrorMessage,
      isAbortError,
      mutateSession,
      prepareForTemplateInteraction,
      replacePendingWithResult,
      resolveAssistantDisplayParts,
      resolveAssistantReplyContent,
      session,
      setIsLoading,
      weekDataText
    });
  };

  const handleMonthlyReviewTemplateOpeningTurn = async (session: AIChatSession) => {
    const monthDataText = buildMonthlyReviewTemplateMonthDataText(session);
    if (!monthDataText) {
      throw new Error('月复盘上下文还没有准备好。');
    }

    await runMonthlyReviewTemplateOpeningTurnFlow({
      activePersona,
      activeRequestRef,
      appendSystemMessage,
      buildConversationHistory,
      buildPersonaPrompt: buildSharedPersonaPrompt,
      debugMode,
      getErrorDebugSections,
      getRetryableAIErrorMessage,
      isAbortError,
      monthDataText,
      mutateSession,
      prepareForTemplateInteraction,
      replacePendingWithResult,
      resolveAssistantDisplayParts,
      resolveAssistantReplyContent,
      session,
      setIsLoading
    });
  };

  const handleSend = async (overrideText?: string, options?: ForegroundSendOptions) => {
    const trimmedText = (overrideText ?? inputText).trim();
    if (!trimmedText || isLoading || !activeSession) {
      return;
    }

    const isWeeklyReviewTemplateSession = activeSession.templateMeta?.templateType === 'weekly_review';
    const isMonthlyReviewTemplateSession = activeSession.templateMeta?.templateType === 'monthly_review';

    if (handleDebugCommand(trimmedText, options)) {
      return;
    }

    if (dreamMonthSelectionState?.sessionId === activeSession.id && !options?.replaceMessageId) {
      await handleSubmitDreamMonthSelection(activeSession, trimmedText);
      return;
    }

    if (trimmedText === 'dream' && !options?.replaceMessageId) {
      handleStartDreamMonthSelection(activeSession.id);
      return;
    }

    if (
      isWeeklyReviewTemplateSession
      && activeSession.templateMeta?.stage !== 'ready'
      && !options?.replaceMessageId
    ) {
      await handleWeeklyReviewTemplateGuidedSelection(activeSession, trimmedText);
      return;
    }

    if (
      isMonthlyReviewTemplateSession
      && activeSession.templateMeta?.stage !== 'ready'
      && !options?.replaceMessageId
    ) {
      await handleMonthlyReviewTemplateGuidedSelection(activeSession, trimmedText);
      return;
    }

    if (isWeeklyReviewTemplateSession && weeklyReviewTemplateService.isWriteNarrativeCommand(trimmedText)) {
      await handleWeeklyReviewNarrativeWritebackCommand(activeSession);
      return;
    }

    if (isMonthlyReviewTemplateSession && monthlyReviewTemplateService.isWriteNarrativeCommand(trimmedText)) {
      await handleMonthlyReviewNarrativeWritebackCommand(activeSession);
      return;
    }

    if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession) {
      const consumedDailyReviewConfirmation = await handleDailyReviewNarrativeOverwriteConfirmation(activeSession, trimmedText);
      if (consumedDailyReviewConfirmation) {
        return;
      }
    }

    if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession) {
      const consumedDailyNewspaperConfirmation = await handleDailyNewspaperOverwriteConfirmation(activeSession, trimmedText);
      if (consumedDailyNewspaperConfirmation) {
        return;
      }
    }

    if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession && (trimmedText === '日报' || trimmedText === '叙事') && !options?.replaceMessageId) {
      appendUserMessage(activeSession.id, trimmedText);
      await handleDailyReviewNarrativeCommand(activeSession);
      return;
    }

    if (!isWeeklyReviewTemplateSession && !isMonthlyReviewTemplateSession && trimmedText === '小报' && !options?.replaceMessageId) {
      appendUserMessage(activeSession.id, trimmedText);
      await handleDailyNewspaperCommand(activeSession);
      return;
    }

    const {
      canRetryInPlace,
      historyBeforeCurrent,
      now,
      pendingMessageId,
      sessionId,
      userMessageId
    } = prepareForegroundTurn({
      activeSession,
      buildRetryConversationHistory,
      conversationHistoryCache,
      createSessionTitleFromUserMessage,
      isMonthlyReviewTemplateSession,
      isWeeklyReviewTemplateSession,
      mutateSession,
      notifyUserTurn: (text, at) => AssistantAgent.notifyUserTurn({ text, at }),
      onNotifyUserTurnError: (error) => {
        console.error('[AIBackfillChatModal] Failed to notify assistant agent about user turn', error);
      },
      ...(options?.replaceMessageId ? { replaceMessageId: options.replaceMessageId } : {}),
      ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
      setInputText,
      trimmedText
    });
    const promptHistory = narrowHistoryForTimeSensitiveTurn(historyBeforeCurrent, trimmedText);
    setIsLoading(true);
    setIsHistoryPanelOpen(false);
    setIsPersonaPanelOpen(false);

    const controller = new AbortController();
    activeRequestRef.current = {
      controller,
      sessionId,
      pendingMessageId
    };

    try {
      if (isWeeklyReviewTemplateSession) {
        const weekDataText = buildWeeklyReviewTemplateWeekDataText(activeSession);
        if (!weekDataText) {
          throw new Error('周复盘上下文还没有准备好。');
        }

        await runWeeklyReviewTemplateChatTurn({
          activePersona,
          activeRequestRef,
          buildPersonaPrompt: buildSharedPersonaPrompt,
          controller,
          debugMode,
          getErrorDebugSections,
          getRetryableAIErrorMessage,
          historyBeforeCurrent,
          isAbortError,
          pendingMessageId,
          replacePendingWithResult,
          resolveAssistantDisplayParts,
          resolveAssistantReplyContent,
          session: activeSession,
          userMessage: trimmedText,
          weekDataText
        });
        return;
      }

      if (isMonthlyReviewTemplateSession) {
        const monthDataText = buildMonthlyReviewTemplateMonthDataText(activeSession);
        if (!monthDataText) {
          throw new Error('月复盘上下文还没有准备好。');
        }

        await runMonthlyReviewTemplateChatTurn({
          activePersona,
          activeRequestRef,
          buildPersonaPrompt: buildSharedPersonaPrompt,
          controller,
          debugMode,
          getErrorDebugSections,
          getRetryableAIErrorMessage,
          historyBeforeCurrent,
          isAbortError,
          monthDataText,
          pendingMessageId,
          replacePendingWithResult,
          resolveAssistantDisplayParts,
          resolveAssistantReplyContent,
          session: activeSession,
          userMessage: trimmedText
        });
        return;
      }

      await runOrdinaryForegroundTurn({
        activePersona,
        activeRequestRef,
        applyAssistantMemoryPatch,
        applyUnifiedReminders,
        applyUnifiedToolCalls,
        assistantMemoryEnabled: assistantAgentConfig.longTermMemoryEnabled,
        buildDictionaryContext: buildAssistantDictionaryContext,
        buildDreamContext,
        buildForegroundAssistantMemory,
        buildForegroundAssistantReminderSummary,
        buildPromptLayers: async () => {
          const [basePrompt, foregroundModePrompt] = await Promise.all([
            assistantPromptService.getAssistantBasePrompt(),
            assistantPromptService.getForegroundModePrompt()
          ]);
          return { basePrompt, foregroundModePrompt };
        },
        buildStateContext: buildAssistantStateContext,
        controller,
        createTriggerCreatedAt: (date) => formatAssistantLocalDateTime(date),
        debugMode,
        getErrorDebugSections,
        getRetryableAIErrorMessage,
        handleRunUnifiedTurn: async (args, runnerOptions) => assistantTurnService.runUnifiedTurn({
          mode: 'foreground',
          trigger: {
            type: 'user_message',
            source: 'user',
            text: args.userMessage,
            createdAt: formatAssistantLocalDateTime(new Date(args.now))
          },
          promptLayers: {
            basePrompt: args.systemPrompt,
            modePrompt: args.modePrompt,
            userPersonaPrompt: buildSharedPersonaPrompt(activePersona)
          },
          memoryEnabled: args.memoryEnabled,
          memory: args.memory,
          conversation: args.conversation,
          stateContext: args.stateContext,
          ...(args.dictionaryContext ? { dictionaryContext: args.dictionaryContext } : {}),
          ...(args.dreamContext ? { dreamContext: args.dreamContext } : {})
        }, runnerOptions),
        historyBeforeCurrent,
        isAbortError,
        narrowConversationContext: assistantContextBuilder.buildConversationContext,
        notifyAssistantTaskStateChanged,
        now,
        pendingMessageId,
        replacePendingWithResult,
        resolveAssistantDisplayParts,
        resolveAssistantReplyContent,
        resolveForegroundAssistantReply,
        sessionId,
        setIsLoading,
        trimmedText,
        userMessageId
      });
      return;
    } catch (error) {
      const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

      if (isAbortError(error)) {
        if (isCurrentPendingRequest) {
          replacePendingWithResult(sessionId, pendingMessageId, '已停止这次请求。', {
            tone: 'system'
          });
        }
        return;
      }

      if (!isCurrentPendingRequest || controller.signal.aborted) {
        return;
      }

      const message = getRetryableAIErrorMessage(error);
      replacePendingWithResult(sessionId, pendingMessageId, message, {
        tone: 'error',
        retryInput: trimmedText,
        retrySourceUserMessageId: userMessageId,
        debugSections: getErrorDebugSections(error, '统一单轮调用', debugMode)
      });
    } finally {
      if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
        activeRequestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleStopRequest = () => {
    const activeRequest = activeRequestRef.current;
    if (!activeRequest) {
      return;
    }

    activeRequest.controller.abort();
    activeRequestRef.current = null;
    setIsLoading(false);
    replacePendingWithResult(activeRequest.sessionId, activeRequest.pendingMessageId, '已停止这次请求。', {
      tone: 'system'
    });
  };

  const resolveRetrySourceUserMessageId = (message: AIChatMessage): string | undefined => {
    if (message.retrySourceUserMessageId) {
      return message.retrySourceUserMessageId;
    }

    if (!activeSession) {
      return undefined;
    }

    const messageIndex = activeSession.messages.findIndex((candidate) => candidate.id === message.id);
    if (messageIndex <= 0) {
      return undefined;
    }

    for (let cursor = messageIndex - 1; cursor >= 0; cursor -= 1) {
      if (activeSession.messages[cursor].role === 'user') {
        return activeSession.messages[cursor].id;
      }
    }

    return undefined;
  };

  const handleRetryMessage = (message: AIChatMessage) => {
    if (!message.retryInput || isLoading) {
      return;
    }

    if (message.retryInput === 'dream' && message.dreamRetryYearMonth && activeSession) {
      const selectedMonth = parseDreamMonthSelection(message.dreamRetryYearMonth, getLocalDateStr);
      if (!selectedMonth) {
        addToast('info', '这次 Dream 重试缺少可用的年月。');
        return;
      }

      void handleDreamCommand(
        activeSession,
        selectedMonth,
        undefined,
        {
          replaceMessageId: message.id,
          retrySourceUserMessageId: resolveRetrySourceUserMessageId(message)
        }
      );
      return;
    }

    void handleSend(message.retryInput, {
      replaceMessageId: message.id,
      retrySourceUserMessageId: resolveRetrySourceUserMessageId(message)
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (!isOpen) {
    return null;
  }

  const renderAppliedAction = (messageId: string, action: AppliedChatAction) => (
    renderAppliedChatAction({
      action,
      categories,
      formatActionDate,
      formatTimeRange,
      getActivityById,
      getActivityCategory,
      getScopeNames,
      logs,
      messageId,
      onOpenLogEditor: handleOpenLogEditor,
      onOpenTodoDetail: handleOpenTodoDetail,
      onUndoCreateSubtaskAction: handleUndoCreateSubtaskAction,
      onUndoEditLogAction: handleUndoEditLogAction,
      onUndoLogAction: handleUndoLogAction,
      onUndoTodoAction: handleUndoTodoAction,
      onUndoUpdateTodoAction: handleUndoUpdateTodoAction,
      theme: AI_CHAT_THEME,
      todoCategories,
      todos
    })
  );

  const emptyPromptExampleGroups: Array<{
    title: string;
    prompt: string;
    requirement?: string;
  }> = [
    {
      title: '添加补记',
      prompt: '今天下午两点到三点半写周报，挂到工作 / 写作。'
    },
    {
      title: '添加待办',
      prompt: '帮我建一个明天下午提交的待办：论文初稿。'
    },
    {
      title: '规划今天',
      prompt: '我今天计划推进论文初稿、整理实验数据、晚上去跑步，帮我拆成待办，也顺手安排几个提醒。',
      requirement: '开启后台轮询和长期记忆'
    },
    {
      title: '定时提醒',
      prompt: '今晚 8 点提醒我做拉伸，10 点再提醒我准备睡觉。',
      requirement: '开启后台轮询和长期记忆'
    },
    {
      title: '长期记忆',
      prompt: '记住我喜欢先做难的事，提醒时语气可以直接一点。',
      requirement: '开启长期记忆'
    },
    {
      title: '随口聊聊',
      prompt: '我今天感觉有点乱，也有点累，陪我理一理现在最该做什么。'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{
        backgroundColor: AI_CHAT_THEME.shellBg,
        color: AI_CHAT_THEME.textPrimary
      }}
    >
      <div
        className="relative flex h-full w-full flex-col overflow-hidden"
        style={{
          backgroundColor: AI_CHAT_THEME.shellLayerBg,
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${keyboardBottomInset}px)`,
          transition: 'padding-bottom 180ms ease-out'
        }}
      >
        <div
          className="flex h-[3.25rem] items-center justify-between gap-3 border-b px-4 backdrop-blur-md"
          style={{
            borderColor: AI_CHAT_THEME.panelBorder,
            backgroundColor: AI_CHAT_THEME.panelBg
          }}
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
            <button
              onClick={() => !isLoading && setIsPersonaPanelOpen(true)}
              disabled={isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[0.8rem] border text-base transition-all disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: AI_CHAT_THEME.panelBorder,
                backgroundColor: AI_CHAT_THEME.avatarBg,
                boxShadow: AI_CHAT_THEME.avatarShadow
              }}
              title="打开 AI 设置"
            >
              <PersonaAvatar persona={activePersona} iconClassName="text-base" />
            </button>

            <div className="min-w-0 self-center">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-serif text-[1.05rem] font-bold leading-none" style={{ color: AI_CHAT_THEME.textPrimary }}>
                  {activePersona.name || 'AI 助手'}
                </h2>
                {debugMode && (
                  <span
                    className="text-[10px] tracking-[0.08em]"
                    style={{
                      color: AI_CHAT_THEME.textMuted
                    }}
                  >
                    调试中
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => !isLoading && setIsHistoryPanelOpen(true)}
              disabled={isLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-[0.75rem] border px-2.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: AI_CHAT_THEME.chipBorder,
                backgroundColor: AI_CHAT_THEME.panelBg,
                color: AI_CHAT_THEME.textSecondary
              }}
              title="历史对话"
            >
              <History size={18} />
              <span className="hidden sm:inline">历史</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] border transition-colors"
              style={{
                borderColor: AI_CHAT_THEME.chipBorder,
                backgroundColor: AI_CHAT_THEME.panelBg,
                color: AI_CHAT_THEME.textMuted
              }}
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <AIBackfillChatConversationPane
          accentMix={accentMix}
          activePersona={activePersona}
          activeSession={activeSession}
          emptyPromptExampleGroups={emptyPromptExampleGroups}
          expandedDreamUpdateMessageIds={expandedDreamUpdateMessageIds}
          expandedMemoryUpdateMessageIds={expandedMemoryUpdateMessageIds}
          expandedReasoningMessageIds={expandedReasoningMessageIds}
          expandedReminderUpdateMessageIds={expandedReminderUpdateMessageIds}
          formatAssistantDateTimeForDisplay={formatAssistantDateTimeForDisplay}
          formatConversationTime={formatConversationTime}
          getMessageDebugViewer={resolveMessageDebugViewer}
          isLoading={isLoading}
          markdownComponents={CHAT_MARKDOWN_COMPONENTS}
          messagesEndRef={messagesEndRef}
          onMessageRef={handleMessageElementRef}
          onOpenDailyNewspaper={handleOpenDailyNewspaper}
          onOpenDailyReviewNarrative={handleOpenDailyReviewNarrative}
          onOpenDebugViewer={setDebugViewer}
          onOpenMonthlyReviewNarrative={handleOpenMonthlyReviewNarrative}
          onOpenWeeklyReviewNarrative={handleOpenWeeklyReviewNarrative}
          onRetryMessage={handleRetryMessage}
          renderAppliedAction={renderAppliedAction}
          revealedAssistantPartCounts={revealedAssistantPartCounts}
          setDreamUpdateExpansion={toggleDreamUpdateExpansion}
          setMemoryUpdateExpansion={toggleMemoryUpdateExpansion}
          setReasoningExpansion={toggleReasoningExpansion}
          setReminderUpdateExpansion={toggleReminderUpdateExpansion}
          theme={AI_CHAT_THEME}
          userProfile={userProfile}
        />

        <div
          className="border-t px-4 pb-3 pt-3 backdrop-blur-xl sm:px-5"
          style={{
            borderColor: AI_CHAT_THEME.panelBorder,
            backgroundColor: AI_CHAT_THEME.panelBg
          }}
        >
          <div
            className="mx-auto max-w-[920px] rounded-[0.85rem] border px-3 pb-2 pt-2.5"
            style={{
              borderColor: AI_CHAT_THEME.panelBorder,
              backgroundColor: AI_CHAT_THEME.panelBg,
              boxShadow: AI_CHAT_THEME.cardShadow
            }}
          >
            {(activeWeeklyReviewShortcutOptions.length > 0 || activeMonthlyReviewShortcutOptions.length > 0) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {[...activeWeeklyReviewShortcutOptions, ...activeMonthlyReviewShortcutOptions].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      if (!isLoading) {
                        void handleSend(option.value);
                      }
                    }}
                    disabled={isLoading}
                    className="inline-flex h-8 items-center rounded-[0.75rem] border px-3 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      borderColor: AI_CHAT_THEME.chipBorder,
                      backgroundColor: AI_CHAT_THEME.chipBg,
                      color: AI_CHAT_THEME.textPrimary
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={composerTextareaRef}
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                window.requestAnimationFrame(() => {
                  scrollToLatestMessage('auto');
                });
              }}
              placeholder={`和 ${activePersona.assistantSelfName || 'AI'} 说点什么...`}
              className="min-h-[42px] max-h-[68px] w-full resize-none bg-transparent px-0.5 py-0.5 text-[15px] leading-6 outline-none"
              style={{ color: AI_CHAT_THEME.textPrimary }}
              autoFocus
            />

            <div className="mt-1.5 flex items-center justify-between gap-3">
              <button
                onClick={() => activeSession && mutateSession(activeSession.id, (session) => ({
                  ...session,
                  contextCacheEnabled: !session.contextCacheEnabled
                }))}
                className="inline-flex h-8 shrink-0 items-center rounded-[0.75rem] border px-2.5 text-[12px] transition-colors"
                style={
                  activeSession?.contextCacheEnabled
                    ? {
                        borderColor: AI_CHAT_THEME.activeBorder,
                        backgroundColor: AI_CHAT_THEME.activeBg,
                        color: AI_CHAT_THEME.textPrimary
                      }
                    : {
                        borderColor: AI_CHAT_THEME.chipBorder,
                        backgroundColor: AI_CHAT_THEME.inputBg,
                        color: AI_CHAT_THEME.textMuted
                      }
                }
                title="快速上下文开关"
              >
                {activeSession?.contextCacheEnabled ? `上下文 开 · ${activePersona.contextMessageLimit}轮` : '上下文 关'}
              </button>
              {activeSession?.templateMeta?.templateType === 'weekly_review' && (
                <button
                  onClick={handleFillWriteWeeklyNarrativeCommand}
                  disabled={isLoading}
                  className="inline-flex h-8 shrink-0 items-center rounded-[0.75rem] border px-2.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textSecondary
                  }}
                  title="填充写入 AI 叙事"
                >
                  写入 AI 叙事
                </button>
              )}
              {activeSession?.templateMeta?.templateType === 'monthly_review' && (
                <button
                  onClick={handleFillWriteMonthlyNarrativeCommand}
                  disabled={isLoading}
                  className="inline-flex h-8 shrink-0 items-center rounded-[0.75rem] border px-2.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textSecondary
                  }}
                  title="填充写入 AI 叙事"
                >
                  写入 AI 叙事
                </button>
              )}
              {!activeSession?.templateMeta && (
                <>
                  <button
                    onClick={handleFillDailyNarrativeCommand}
                    disabled={isLoading}
                    className="inline-flex h-8 shrink-0 items-center rounded-[0.75rem] border px-2.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: AI_CHAT_THEME.panelBorder,
                      backgroundColor: AI_CHAT_THEME.panelBgStrong,
                      color: AI_CHAT_THEME.textSecondary
                    }}
                    title="快速填充叙事"
                  >
                    叙事
                  </button>
                  <button
                    onClick={handleFillDailyNewspaperCommand}
                    disabled={isLoading}
                    className="inline-flex h-8 shrink-0 items-center rounded-[0.75rem] border px-2.5 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: AI_CHAT_THEME.panelBorder,
                      backgroundColor: AI_CHAT_THEME.panelBgStrong,
                      color: AI_CHAT_THEME.textSecondary
                    }}
                    title="快速填充小报"
                  >
                    小报
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  if (isLoading) {
                    handleStopRequest();
                    return;
                  }
                  void handleSend();
                }}
                disabled={!isLoading && !inputText.trim()}
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={
                  isLoading
                    ? {
                        border: `1px solid ${AI_CHAT_THEME.chipBorder}`,
                        backgroundColor: AI_CHAT_THEME.inputBg,
                        color: AI_CHAT_THEME.textSecondary
                      }
                    : {
                        border: `1px solid ${AI_CHAT_THEME.primaryButtonBorder}`,
                        backgroundColor: AI_CHAT_THEME.primaryButtonBg,
                        color: AI_CHAT_THEME.primaryButtonText
                      }
                }
                title={isLoading ? '停止' : '发送'}
              >
                {isLoading ? <Square size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        <AIBackfillChatHistoryOverlay
          activeSessionId={activeSessionId}
          deleteConfirmSessionId={deleteConfirmSessionId}
          editingSessionId={editingSessionId}
          editingSessionTitle={editingSessionTitle}
          formatConversationTime={formatConversationTime}
          getSessionPersona={resolveSessionPersona}
          isOpen={isHistoryPanelOpen}
          onCancelDeleteSession={() => setDeleteConfirmSessionId(null)}
          onCancelRenameSession={handleCancelRenameSession}
          onClose={() => setIsHistoryPanelOpen(false)}
          onCommitRenameSession={handleCommitRenameSession}
          onDeleteSession={handleDeleteSession}
          onEditSessionTitleChange={setEditingSessionTitle}
          onOpenNewSessionDialog={handleOpenNewSessionDialog}
          onSelectSession={handleSelectSessionFromHistory}
          onStartRenameSession={handleStartRenameSession}
          onToggleDeleteSession={handleToggleDeleteSession}
          sortedSessions={sortedSessions}
          theme={AI_CHAT_THEME}
        />

        <AIBackfillChatNewSessionDialog
          isOpen={isNewSessionDialogOpen}
          onClose={handleCloseNewSessionDialog}
          onCreateGenericSession={handleCreateGenericSession}
          onOpenMonthlyReviewTemplateSelection={handleOpenMonthlyReviewTemplateSelection}
          onOpenWeeklyReviewTemplateSelection={handleOpenWeeklyReviewTemplateSelection}
          theme={AI_CHAT_THEME}
        />

        <AIBackfillChatSettingsOverlay
          activeTab={activeSettingsMainTab}
          isOpen={isPersonaPanelOpen}
          onClose={() => setIsPersonaPanelOpen(false)}
          onTabChange={setActiveSettingsMainTab}
          personaContent={(
            <AIBackfillChatPersonaSettingsSection
              accentMix={accentMix}
              activePersona={activePersona}
              activeSessionPersonaId={activeSession?.personaId || ''}
              avatarInputRef={avatarInputRef}
              customPromptBlocks={customPromptBlocks}
              deleteConfirmPersonaId={deleteConfirmPersonaId}
              emojiChoices={PERSONA_EMOJI_CHOICES}
              emojiDraft={emojiDraft}
              isEmojiEditorOpen={isEmojiEditorOpen}
              isUploadingAvatar={isUploadingAvatar}
              isUploadingUserAvatar={isUploadingUserAvatar}
              isUserEmojiEditorOpen={isUserEmojiEditorOpen}
              onApplyEmojiAvatar={handleApplyEmojiAvatar}
              onApplyPersonaPreset={handleApplyPersonaPreset}
              onApplyUserEmojiAvatar={handleApplyUserEmojiAvatar}
              onAvatarUpload={handleAvatarUpload}
              onCancelDeletePersona={() => setDeleteConfirmPersonaId(null)}
              onCancelEmojiAvatarEdit={handleCancelEmojiAvatarEdit}
              onCancelUserEmojiAvatarEdit={handleCancelUserEmojiAvatarEdit}
              onCreatePersona={handleCreatePersona}
              onDeleteCurrentPersona={handleDeleteCurrentPersona}
              onEmojiDraftChange={setEmojiDraft}
              onResetUserAvatar={handleResetUserAvatar}
              onSelectEmoji={setEmojiDraft}
              onSelectUserEmoji={setUserEmojiDraft}
              onToggleDeletePersona={() => setDeleteConfirmPersonaId((current) => current === activePersona.id ? null : activePersona.id)}
              onAddCustomPromptBlock={handleAddCustomPromptBlock}
              onDeleteCustomPromptBlock={handleDeleteCustomPromptBlock}
              onUpdateCurrentPersona={updateCurrentPersona}
              onUpdateCustomPromptBlock={handleUpdateCustomPromptBlock}
              onUseEmojiAvatar={handleUseEmojiAvatar}
              onUseUserEmojiAvatar={handleUseUserEmojiAvatar}
              onUserAvatarUpload={handleUserAvatarUpload}
              onUserEmojiDraftChange={setUserEmojiDraft}
              personas={personas}
              theme={AI_CHAT_THEME}
              userAvatarInputRef={userAvatarInputRef}
              userEmojiDraft={userEmojiDraft}
              userProfile={userProfile}
            />
          )}
          callContent={(
            <AIBackfillChatCallSettingsSection
              contextMessageLimit={activePersona.contextMessageLimit}
              onContextMessageLimitChange={(value) => updateCurrentPersona({ contextMessageLimit: value })}
              theme={AI_CHAT_THEME}
              assistantSettingsContent={(
              <AIBackfillChatAssistantSettingsSection
                assistantAgentConfig={assistantAgentConfig}
                categories={categories}
                assistantAgentIntervalDrafts={assistantAgentIntervalDrafts}
                assistantAgentIntervalErrors={assistantAgentIntervalErrors}
                assistantAgentQuietHoursDrafts={assistantAgentQuietHoursDrafts}
                assistantAgentQuietHoursErrors={assistantAgentQuietHoursErrors}
                assistantScheduledTaskDrafts={assistantScheduledTaskDrafts}
                isAssistantScheduledTaskComposerOpen={isAssistantScheduledTaskComposerOpen}
                assistantScheduledTaskSnapshot={assistantScheduledTaskSnapshot}
                assistantScheduledTaskDeleteTarget={assistantScheduledTaskDeleteTarget}
                assistantReminderSnapshot={assistantReminderSnapshot}
                theme={AI_CHAT_THEME}
                onUpdateAgentConfig={handleUpdateAssistantAgentConfig}
                onIntervalDraftChange={handleAssistantAgentIntervalDraftChange}
                onCommitIntervalDraft={commitAssistantAgentIntervalDraft}
                onToggleQuietHours={handleToggleAssistantQuietHours}
                onQuietHoursDraftChange={handleAssistantAgentQuietHoursDraftChange}
                onCommitQuietHoursDraft={commitAssistantAgentQuietHoursDraft}
                onOpenScheduledTaskComposer={handleOpenAssistantScheduledTaskComposer}
                onUpdateScheduledTaskDraft={updateAssistantScheduledTaskDraft}
                onToggleScheduledTaskWeekday={toggleAssistantScheduledTaskWeekday}
                onCancelScheduledTaskComposer={handleCancelAssistantScheduledTaskComposer}
                onSaveScheduledTask={handleSaveAssistantScheduledTask}
                onToggleScheduledTaskEnabled={handleToggleAssistantScheduledTaskEnabled}
                onToggleScheduledTaskDelete={handleToggleAssistantScheduledTaskDelete}
                onCancelScheduledTaskDelete={() => setAssistantScheduledTaskDeleteTarget(null)}
                onConfirmScheduledTaskDelete={handleConfirmAssistantScheduledTaskDelete}
                onOpenDreamViewer={handleOpenDreamViewer}
                onOpenAssistantMemoryViewer={handleOpenAssistantMemoryViewer}
                onOpenAssistantBackgroundHistoryViewer={handleOpenAssistantBackgroundHistoryViewer}
              />
              )}
            />
          )}
          theme={AI_CHAT_THEME}
        />

        {isDreamViewerOpen && (
          <AIBackfillChatDreamOverlay
            activeDreamEntries={activeDreamEntries}
            activeDreamTopic={activeDreamTopic}
            dreamSnapshot={dreamSnapshot}
            dreamEntryDeleteTargetId={dreamEntryDeleteTargetId}
            dreamEntryDrafts={dreamEntryDrafts}
            dreamTopicDeleteTargetId={dreamTopicDeleteTargetId}
            dreamTopicDrafts={dreamTopicDrafts}
            editingDreamEntryId={editingDreamEntryId}
            editingDreamTopicId={editingDreamTopicId}
            isDreamResetConfirmOpen={isDreamResetConfirmOpen}
            isDreamTopicComposerOpen={isDreamTopicComposerOpen}
            isDreamTopicNoteExpanded={isDreamTopicNoteExpanded}
            theme={AI_CHAT_THEME}
            onCancelDreamEntryDelete={handleCancelDreamEntryDelete}
            onCancelDreamEntryEditor={handleCancelDreamEntryEditor}
            onCancelDreamReset={handleCancelDreamReset}
            onCancelDreamTopicComposer={handleCancelDreamTopicComposer}
            onCancelDreamTopicDelete={handleCancelDreamTopicDelete}
            onClose={handleCloseDreamViewer}
            onConfirmDreamEntryDelete={handleConfirmDreamEntryDelete}
            onConfirmDreamReset={handleConfirmDreamReset}
            onConfirmDreamTopicDelete={handleConfirmDreamTopicDelete}
            onOpenDreamEntryEditor={handleOpenDreamEntryEditor}
            onOpenDreamTopicComposer={handleOpenDreamTopicComposer}
            onRunDream={handleRunDreamFromViewer}
            onSaveDreamEntry={handleSaveDreamEntry}
            onSaveDreamTopic={handleSaveDreamTopic}
            onSelectDreamTopic={handleSelectDreamTopic}
            onToggleDreamEntryDelete={handleToggleDreamEntryDelete}
            onToggleDreamResetConfirm={handleToggleDreamResetConfirm}
            onToggleDreamTopicDelete={handleToggleDreamTopicDelete}
            onToggleDreamTopicEnabled={handleToggleDreamTopicEnabled}
            onToggleTopicNoteExpanded={handleToggleDreamTopicNoteExpanded}
            onUpdateDreamEntryDraft={handleUpdateDreamEntryDraft}
            onUpdateDreamTopicDraft={updateDreamTopicDraft}
          />
        )}

        {isAssistantMemoryViewerOpen && (
          <AIBackfillChatMemoryOverlay
            assistantMemorySnapshot={assistantMemorySnapshot}
            assistantReminderSnapshot={assistantReminderSnapshot}
            assistantEditableMemoryComposerKey={assistantEditableMemoryComposerKey}
            assistantEditableMemoryDrafts={assistantEditableMemoryDrafts}
            assistantEditableMemoryDeleteTarget={assistantEditableMemoryDeleteTarget}
            assistantReminderDrafts={assistantReminderDrafts}
            isAssistantReminderComposerOpen={isAssistantReminderComposerOpen}
            assistantReminderDeleteTarget={assistantReminderDeleteTarget}
            theme={AI_CHAT_THEME}
            onClearMemory={handleClearAssistantMemory}
            onClose={handleCloseAssistantMemoryViewer}
            onOpenEditableMemoryComposer={handleOpenAssistantEditableMemoryComposer}
            onUpdateEditableMemoryDraft={updateAssistantEditableMemoryDraft}
            onCancelEditableMemoryComposer={handleCancelAssistantEditableMemoryComposer}
            onSaveEditableMemoryEntry={handleSaveAssistantEditableMemoryEntry}
            onToggleEditableMemoryDelete={handleToggleAssistantEditableMemoryDelete}
            onCancelEditableMemoryDelete={() => setAssistantEditableMemoryDeleteTarget(null)}
            onConfirmEditableMemoryDelete={handleConfirmAssistantEditableMemoryDelete}
            onOpenReminderComposer={handleOpenAssistantReminderComposer}
            onUpdateReminderDraft={updateAssistantReminderDraft}
            onCancelReminderComposer={handleCancelAssistantReminderComposer}
            onSaveReminder={handleSaveAssistantReminder}
            onToggleReminderDelete={handleToggleAssistantReminderDelete}
            onCancelReminderDelete={() => setAssistantReminderDeleteTarget(null)}
            onConfirmReminderDelete={handleConfirmAssistantReminderDelete}
          />
        )}

        {isAssistantBackgroundHistoryViewerOpen && (
          <AssistantBackgroundHistoryOverlay
            entries={assistantBackgroundTimeline}
            theme={AI_CHAT_THEME}
            onClear={handleClearAssistantBackgroundCallHistory}
            onClose={handleCloseAssistantBackgroundHistoryViewer}
            onOpenDebug={(entry) => setDebugViewer({
              title: `后台请求调试 · ${getAssistantBackgroundTriggerLabel(entry.triggerType)}`,
              sections: [{
                label: '后台 AI 调用',
                exchange: entry.debugExchange as AIDebugExchange
              }]
            })}
            getTriggerLabel={getAssistantBackgroundTriggerLabel}
            getRequestStatusLabel={getAssistantBackgroundRequestStatusLabel}
          />
        )}

        {debugViewer && (
          <AIChatDebugViewerOverlay
            viewer={debugViewer}
            expandedBlockKeys={expandedDebugBlockKeys}
            onClose={() => setDebugViewer(null)}
            onToggleBlock={(blockKey) => {
              setExpandedDebugBlockKeys((current) => {
                const next = new Set(current);
                if (next.has(blockKey)) {
                  next.delete(blockKey);
                } else {
                  next.add(blockKey);
                }
                return next;
              });
            }}
            buildBlocks={buildDebugBlocks}
          />
        )}
      </div>
    </div>
  );
};
