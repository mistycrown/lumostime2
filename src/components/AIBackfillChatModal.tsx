/**
 * @file AIBackfillChatModal.tsx
 * @input Unified AI chat sessions, local logs/todos/categories/scopes, and user natural-language messages
 * @output Full-screen AI time assistant with session history, persona settings, quick context cache, and direct log/todo application
 * @pos Component (AI Integration)
 * @description Provides the shared AI workspace for chat, backfill, and todo creation. Sessions persist locally, persona style is configurable per session, and recent context can be toggled into the formal AI request path.
 * @updated 2026-05-12: Added inline manual edit/delete controls for individual Dream entries so users can refine or remove AI-written observations directly from the Dream page.
 * @updated 2026-05-12: Restyled the Dream viewer into a flatter editorial layout with a split topic index, inline actions, and divider-led entry presentation instead of nested cards.
 * @updated 2026-05-12: Added the first Dream viewer, explicit `dream` command workflow, topic tabs, and Dream update cards, while keeping Dream read-only for ordinary chat and background assistant turns.
 * @updated 2026-05-12: Background assistant messages now always expose a debug entry in debug mode, synthesizing a readable summary-style debug view when a native-only background run has no full request/response exchange payload.
 * @updated 2026-05-12: Exposed user-editable four-digit random-check-in protection windows in the background assistant settings, wiring them into the existing quiet-hours config without affecting reminder_due dispatch.
 * @updated 2026-05-12: Cold app startup now hydrates native reminders first and immediately flushes any overdue reminder_due items once, so reminders that expired while the app was fully closed get replayed on launch.
 * @updated 2026-05-12: Background polling and reminder dispatch now target only the ordinary conversation whose latest user-authored message is the newest, while template sessions are fully excluded from background persona/context selection and native snapshot sync.
 * @updated 2026-05-11: Fixed weekly-review writeback result cards so long titles truncate cleanly and the `打开` action closes the AI modal while navigating straight into Weekly Review `叙事`.
 * @updated 2026-05-11: Added weekly-review template conversations with non-AI week selection, template-specific weekly review prompts/context, and exact `写入 AI 叙事` narrative writeback handling with local overwrite confirmation.
 * @updated 2026-05-10: Wired the chat stop action through the unified-turn AbortSignal path and blocked late native replies from writing back after the user cancels an in-flight AI request.
 * @updated 2026-05-10: Disabled the extra visual-viewport keyboard inset on native Android so the shared AI chat no longer double-lifts above the soft keyboard inside the Capacitor WebView.
 * @updated 2026-05-10: Blocked background assistant execution while core logs/todos are still fallback-seeded and now directly clears locally queued reminder_due items after successful system-turn completion.
 * @updated 2026-05-09: Added mobile visual-viewport keyboard tracking so the chat list and composer rise together above the soft keyboard and the latest messages stay visible while typing.
 * @updated 2026-05-09: Retrying a failed foreground assistant turn now reuses the original error bubble in place, so successful retry content replaces the failure instead of appending a duplicate assistant block.
 * @updated 2026-05-09: Added recurring `定时任务` management under AI call settings, backed by shared todo recurrence rules and continuously seeded native reminders.
 * @updated 2026-05-06: Made debug-viewer block keys unique per section render so repeated labels like `对话上下文` no longer trigger React duplicate-key warnings.
 * @updated 2026-05-06: Moved the six built-in persona system prompts into `src/constants/aiPersonaSystemPrompts.ts`, so the modal keeps persona metadata while prompt copy lives in one shared constant file.
 * @updated 2026-05-06: Replaced the six built-in persona system prompts with the user-authored versions, while standardizing in-prompt user references to `用户` only.
 * @updated 2026-05-06: Preserved AI request debug payloads on foreground error messages whenever debug mode is on, so failed requests still render the per-message `查看调试` entry instead of dropping the trace.
 * @updated 2026-05-06: Added explicit `yesterdayTimelineSummary` to assistant state context, removed duplicate provider-side conversation-history injection, and lifted the persona context-turn cap above 30.
 * @updated 2026-05-06: Restored `todayTimelineSummary` to the full same-day log list, moved the today/yesterday digest into `timelineReviewSummary`, added structured same-day log candidates for `edit_log`, and blocked foreground log-edit turns from claiming success when no `edit_log` action actually applied.
 * @updated 2026-05-06: Hid the custom system-prompt editor for built-in personas while keeping their name, addressing, and avatar fields editable, so only custom personas can modify prompt text.
 * @updated 2026-05-06: Kept user chat bubbles anchored on the right while forcing multi-line message text to stay left-aligned, so manual line breaks no longer produce right-aligned paragraphs.
 * @updated 2026-05-05: Refreshed the new-conversation empty-state examples so they cover backfill, todo creation, daily planning, reminders, long-term memory, and casual chat, while only gated capabilities show required feature toggles.
 * @updated 2026-05-05: Added a dedicated reopen-time scroll-to-latest pass so entering the AI chat lands on the newest turn by default, while exact session/message navigation still keeps its higher priority.
 * @updated 2026-05-05: Kept applied-result, memory-update, reminder-update, and retry blocks inside the main message column so narrow mobile layouts no longer let those side panels squeeze assistant bubbles into single-character vertical text.
 * @updated 2026-05-04: Enlarged the in-chat avatars and tightened their icon centering so emoji, uploaded portraits, and fallback glyphs sit cleanly inside the message avatar frame.
 * @updated 2026-05-04: Made persona switching open a brand-new empty conversation bound to the selected persona, so each chat window stays locked to one persona instead of changing identity in place.
 * @updated 2026-05-04: Switched chat rows to a WeChat-like grouped layout where avatars sit beside the bubble, speaker labels are removed, and consecutive turns from the same side reuse the same avatar slot.
 * @updated 2026-05-04: Restored a direct per-message debug entry for background assistant replies by linking chat bubbles back to persisted background call traces.
 * @updated 2026-05-03: Moved the background-notification visibility helper ahead of diagnostics hydration so production bundles no longer hit a temporal-dead-zone crash during AI modal startup.
 * @updated 2026-05-01: Unified remaining hard-edged AI panels under the same subtle corner radius so history rows, composer surfaces, and auxiliary edit boxes no longer mix square and rounded treatments.
 * @updated 2026-05-01: Reorganized AI settings into top-level tabs plus smaller in-section tabs so persona, avatar, background-agent, and context options read as layered panels instead of one long form.
 * @updated 2026-05-01: Simplified persona-list selection in AI settings so the active row no longer uses a tinted background and relies on the checkmark alone.
 * @updated 2026-05-01: Widened the AI settings side gutters after the divider-based redesign so the editorial layout keeps more breathing room on both sides.
 * @updated 2026-05-01: Flattened the AI workspace into a more editorial layout by tightening composer height, simplifying history-session delete confirmations, reducing heavy card nesting, and trimming excessive radii/shadows across the AI panels.
 * @updated 2026-05-01: Filtered persisted null-like assistant placeholders during session hydration so malformed native-backfilled entries no longer render standalone "null" chat bubbles.
 * @updated 2026-05-01: Native background replies are now rehydrated from Android diagnostics back into persisted chat sessions, so successful direct-native check-ins render in the main conversation instead of only in the debug history.
 * @updated 2026-04-30: Added a unified AI hardware-back chain so nested AI pages close one layer at a time before the root chat window dismisses.
 * @updated 2026-04-30: Strengthened multi-bubble assistant reply reveals with a longer stagger, clearer lift/scale entry, and a short highlight fade so each paragraph lands more distinctly in sequence.
 * @updated 2026-04-27: Condensed the background history drawer into a request-chain view that only shows wake time, request start, request result, and returned content for meaningful background runs.
 * @updated 2026-04-27: Simplified long-term-memory add controls down to compact plus-only icon buttons so the section headers stay lighter and less repetitive.
 * @updated 2026-04-27: Aligned the AI workspace, AI settings panel, long-term-memory viewer, background-history viewer, and debug viewer headers to the shared external-page title bar pattern by trimming their height, removing subtitle copy, and using the same compact title sizing.
 * @updated 2026-04-27: Moved `记忆更新` and `提醒结果` expand/collapse controls into the same subtle metadata row as the timestamp/context line, and only render the detail cards after the user expands them.
 * @updated 2026-04-27: Assistant multi-bubble replies now reveal one part at a time with a short stagger and a soft slide/fade so the conversation feels more like sequential live sending.
 * @updated 2026-04-27: Made per-message `记忆更新` and `提醒结果` cards default to collapsed, and restyled their summary rows to read like subtle metadata instead of prominent control bars.
 * @updated 2026-04-27: Made per-message `记忆更新` cards default to collapsed and reveal their section details only when the user explicitly expands them.
 * @updated 2026-04-27: Switched assistant message headers from the generic `AI 回答` label to the active persona name so each bubble group clearly reflects the selected AI identity.
 * @updated 2026-04-27: Moved both user and assistant avatars back outside the bubble into a vertical message header so chat copy keeps the wider reading column without reintroducing a side avatar rail.
 * @updated 2026-04-27: Unified foreground/background context assembly, fixed stale background closures, and synced Android agent throttling state from real assistant interactions.
 * @updated 2026-04-27: Added grouped multi-bubble assistant reply rendering plus richer silent-decision summaries in background history and latest-decision surfaces.
 * @updated 2026-04-27: Foreground unified turns now skip reminder-summary and long-term-memory prompt sections when the corresponding background or memory features are disabled, and memory patches no longer persist while long-term memory is off.
 * @updated 2026-04-27: Turned the long-term-memory `活跃 reminders` block into the same add/delete card UI used by editable memory notes, with manual `YYYYMMDD + HHMM` reminder entry that writes directly into the shared reminder queue.
 * @updated 2026-04-27: Replaced chat bubble `面向` date labels with per-message numeric timestamps in `4月27日 09:05` format, and aligned session history timestamps to the same display.
 * @updated 2026-04-26: Turned profile/preference long-term memory into readable note lists with manual add/delete controls, while leaving the other assistant-memory sections in debug-style read-only form.
 * @updated 2026-04-26: Replaced the built-in persona roster with six new signature voices, including empty-name-safe self/user addressing so personas can intentionally omit fixed forms of address.
 * @updated 2026-04-26: Reframed the built-in assistant personas around continuity-aware companionship so the default voice feels more present, more natural, and less like a detached helper in both foreground and background turns.
 * @updated 2026-04-25: Added AI-driven todo updates, subtask creation, and log editing with local patch application plus undo support, and expanded intent routing so edit flows receive dedicated context and tool plans.
 * @updated 2026-04-25: Rendered subtask result cards with `@分类 / 父任务`, and stripped AI-added subtask dates unless the user explicitly asked for scheduling.
 * @updated 2026-04-25: Corrected applied-todo metadata to render task category as `@`, linked activity hierarchy as `#`, and scope domains as `%`, while respecting the auto-link scope toggle when merging activity rules.
 * @updated 2026-04-25: Fixed the applied-todo detail action so newly created todo results stay clickable even if the live todo lookup lags behind the message render.
 * @updated 2026-04-25: Matched applied-result metadata to the context-page prefix syntax by removing icons and using `# / % / @` markers for tags, domains, and todos.
 * @updated 2026-04-25: Softened the AI dialog shadow system so the shell, cards, and avatar surfaces feel lighter and less floating.
 * @updated 2026-04-25: Added a true grayscale fallback for the `default` color scheme so the AI workspace no longer picks up tinted beige/green surfaces when no themed accent is active.
 * @updated 2026-04-26: Switched planned log/todo/subtask/edit application to the shared `assistantActionExecutor` service so the modal no longer owns the primary local tool execution layer.
 * @updated 2026-04-26: Switched foreground chat onto the unified single-turn path, made memory updates explicit in the main turn result, surfaced memory-update feedback to the user, and kept the older planner chain disabled for safety during cleanup.
 * @updated 2026-04-26: Added background-assistant settings inside the AI panel, including polling frequency, check-in timing, long-term-memory toggles, background call history, and native assistant-trigger wiring for Android.
 * @updated 2026-04-25: Refined the title/header alignment and simplified applied-result cards by reducing capsules, moving log time pills to the top-right, and switching action buttons to icon-only controls.
 * @updated 2026-04-25: Simplified the AI settings panel by flattening the avatar/persona layouts, trimming low-value helper copy, and tightening everything around the existing theme tokens.
 * @updated 2026-04-23: Unified the AI workspace colors around dynamic `--accent-color` theme tokens and reordered the settings panel into persona list, current persona, user avatar, and context sections.
 * @updated 2026-04-23: Shifted the editorial redesign toward a cooler grayscale palette, removed the inset rounded shell for full-bleed layout, tightened header/composer sizing, simplified applied-result cards into left-rule summaries, and added configurable user avatars with default, emoji, and upload support.
 * @updated 2026-04-23: Rebuilt the full AI workspace into a warmer editorial shell inspired by Claude, unifying the chat stage, history rail, persona studio, and debug ledger with a production-grade reading-first layout.
 * @updated 2026-04-22: Added deletion for custom personas with inline confirmation and automatic session fallback to the default built-in preset.
 * @updated 2026-04-22: Simplified the empty-chat state into example prompts and refreshed the built-in persona roster with stronger themed voices plus personalized user addressing.
 * @updated 2026-04-22: Cached recent conversation turns per session before formal AI calls, and changed persona selection to a lightweight checkmark state instead of a full black card.
 * @updated 2026-04-22: Removed the extra emoji-input preview tile and tightened emoji avatar centering inside circular chat/header slots.
 * @updated 2026-04-22: Reworked AI settings into a cleaner single-panel layout and replaced the avatar `Use Emoji` prompt with an inline editor plus quick emoji picks.
 * @updated 2026-04-22: Refined the AI settings avatar controls into compact `使用 Emoji / 上传图片` actions and removed extra helper copy below the persona name.
 * @updated 2026-04-22: The shared AI chat window can now stay mounted globally and continue in-flight execution after the modal UI is closed.
 * @updated 2026-04-22: Removed apply-success toasts, limited log-planning todo context to unfinished todos, and simplified the intent-router request to a lightweight message-only classification step.
 * @updated 2026-04-22: Rebuilt the unified AI chat modal around persistent sessions, persona presets, and quick context caching.
 * @updated 2026-04-22: Restored direct AI log/todo application with edit-detail and undo actions inside the new session-based workspace.
 * @updated 2026-04-22: Added session rename/delete controls in history and changed quick-context caching from raw message count to recent conversation rounds.
 * @updated 2026-04-22: Moved the quick-context toggle into the chat composer footer and simplified the title/input helper copy.
 * @updated 2026-04-26: Added open-time session/message navigation handling so Android assistant notifications can reopen the modal at the exact background reply.
 * @updated 2026-04-27: Unified assistant-facing time context around local-offset ISO strings, removed UTC `Z` prompt anchors, and kept reminder execution timestamps canonical only in backend storage.
 * @updated 2026-04-26: Normalized assistant reminder timestamps before enqueue/dispatch, exposed unambiguous local-vs-UTC time context to unified turns, and persisted background debug sections onto surfaced assistant messages so debug mode also works for automatic replies.
 * @updated 2026-04-26: Changed background assistant interval inputs to use editable draft strings with inline validation, so users can clear and retype values without invalid intermediate states being auto-saved.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  Check,
  History,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Upload,
  User,
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
import { BUILTIN_PERSONA_SYSTEM_PROMPTS } from '../constants/aiPersonaSystemPrompts';
import { AppView } from '../types';
import type { Log, TodoItem, TodoRecurrenceRule, WeeklyReview } from '../types';
import type {
  AssistantAgentConfig,
  AssistantEditableMemoryListKey,
  AssistantMemory,
  AssistantNativeDiagnosticEntry,
  AssistantReminder,
  AssistantScheduledTask,
  AssistantSystemTrigger,
  DreamEntry,
  DreamState,
  DreamTopic,
  DreamUpdateCard
} from '../types/assistant';
import { formatDateKey } from '../utils/aiBackfillUtils';
import { parseNarrative } from '../utils/narrativeUtils';
import { getLocalDateStr, getWeekRange } from '../utils/dateUtils';
import {
  formatAssistantDateTimeForDisplay,
  formatAssistantLocalDateTime,
  getAssistantDelayMinutes,
  normalizeAssistantDateTime,
  parseAssistantDateTime
} from '../utils/assistantTime';
import { buildAssistantDisplayParts, normalizeAssistantDisplayParts } from '../utils/assistantMessageParts';
import { normalizeAssistantQuietHoursValue } from '../utils/assistantQuietHours';
import { resolveLatestOrdinaryAssistantBackgroundSession } from '../utils/assistantBackgroundSessionUtils';
import { getTodoProgressTrackingMode } from '../utils/todoProgressUtils';
import { imageService } from '../services/imageService';
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
import type { AssistantToolCall, AssistantUnifiedTurnOutput } from '../types/assistant';
import { CustomSelect } from './CustomSelect';
import { InputModal } from './InputModal';

type ChatTone = 'normal' | 'system' | 'error' | 'pending';

interface AIChatDebugSection {
  label: string;
  exchange: AIDebugExchange;
}

interface AIChatPersona {
  id: string;
  name: string;
  avatarIcon: string;
  avatarImage?: string;
  assistantSelfName: string;
  userCallName: string;
  systemPrompt: string;
  contextMessageLimit: number;
  isBuiltIn: boolean;
}

interface AIChatUserProfile {
  avatarIcon: string;
  avatarImage?: string;
}

interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  displayParts?: string[];
  createdAt: number;
  tone?: ChatTone;
  backgroundDebugHistoryId?: string;
  debugSections?: AIChatDebugSection[];
  appliedActions?: AppliedChatAction[];
  memoryUpdates?: AIChatMemoryUpdateSection[];
  dreamUpdates?: AIChatDreamUpdateCard[];
  reminderUpdates?: string[];
  weeklyReviewWriteback?: AIChatWeeklyReviewWritebackResult;
  retryInput?: string;
  retrySourceUserMessageId?: string;
  dreamRetryRangeOptionId?: DreamRangeOptionId;
}

interface AIChatWeeklyReviewWritebackResult {
  weeklyReviewId: string;
  weekStartDate: string;
  weekEndDate: string;
  title: string;
  preview: string;
  createdReview: boolean;
  mergeMode: 'create' | 'overwrite';
}

interface AIChatMemoryUpdateSection {
  label: string;
  items: string[];
}

interface AIChatDreamUpdateCard extends DreamUpdateCard {}

interface AssistantEditableMemoryDeleteTarget {
  key: AssistantEditableMemoryListKey;
  value: string;
}

const MOBILE_KEYBOARD_INSET_THRESHOLD = 120;

interface AssistantReminderDrafts {
  text: string;
  date: string;
  hour: string;
}

interface AssistantReminderDeleteTarget {
  id: string;
}

interface AssistantScheduledTaskDrafts {
  text: string;
  time: string;
  frequency: TodoRecurrenceRule['frequency'];
  interval: string;
  weekdays: number[];
  monthDay: string;
}

interface AssistantScheduledTaskDeleteTarget {
  id: string;
}

interface DreamTopicDrafts {
  title: string;
  note: string;
}

interface DreamEntryDrafts {
  content: string;
}

type DreamRangeOptionId = 'yesterday' | 'this_week' | 'this_month' | 'this_year';

interface DreamRangeSelectionState {
  sessionId: string;
}

interface AssistantBackgroundTurnRequestOptions {
  trigger: AssistantSystemTrigger;
  now: Date;
  targetSession?: AIChatSession;
  conversationHistory?: AIConversationTurn[];
  showSystemNotification: boolean;
}

interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  personaId: string;
  contextCacheEnabled: boolean;
  messages: AIChatMessage[];
  templateMeta?: WeeklyReviewTemplateSessionMeta;
}

interface PendingWeeklyReviewTemplateSetup {
  selection: WeeklyReviewTemplateSelectionResult;
}

interface AIBackfillChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate?: Date;
  targetSessionId?: string;
  targetMessageId?: string;
  registerBackHandler?: (handler: (() => boolean) | null) => void;
  onUnreadAssistantMessage?: (count?: number) => void;
  onMarkRead?: () => void;
}

type AISettingsMainTab = 'persona' | 'call';

type AssistantAgentIntervalField = 'basePollMinutes' | 'minCheckinMinutes' | 'maxCheckinMinutes';

type AssistantAgentIntervalDrafts = Record<AssistantAgentIntervalField, string>;

type AssistantAgentIntervalErrors = Record<AssistantAgentIntervalField, string | null>;

type AssistantAgentQuietHoursField = 'quietHoursStart' | 'quietHoursEnd';

type AssistantAgentQuietHoursDrafts = Record<AssistantAgentQuietHoursField, string>;

type AssistantAgentQuietHoursErrors = Record<AssistantAgentQuietHoursField, string | null>;

const ASSISTANT_AGENT_INTERVAL_FIELD_META: Record<
  AssistantAgentIntervalField,
  { label: string; minimum: number; maximum: number }
> = {
  basePollMinutes: {
    label: '检查频率',
    minimum: 1,
    maximum: 60
  },
  minCheckinMinutes: {
    label: '最低间隔',
    minimum: 1,
    maximum: 24 * 60
  },
  maxCheckinMinutes: {
    label: '最高间隔',
    minimum: 1,
    maximum: 24 * 60
  }
};

const DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS: Record<AssistantEditableMemoryListKey, string> = {
  profileMemory: '',
  preferenceMemory: ''
};

const DEFAULT_ASSISTANT_REMINDER_DRAFTS: AssistantReminderDrafts = {
  text: '',
  date: '',
  hour: ''
};

const DEFAULT_DREAM_TOPIC_DRAFTS: DreamTopicDrafts = {
  title: '',
  note: ''
};

const DEFAULT_DREAM_ENTRY_DRAFTS: DreamEntryDrafts = {
  content: ''
};

const DREAM_RANGE_OPTION_LABELS: Record<DreamRangeOptionId, string> = {
  yesterday: '昨天',
  this_week: '本周',
  this_month: '本月',
  this_year: '本年'
};

const ASSISTANT_SCHEDULED_TASK_WEEKDAY_OPTIONS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' }
] as const;

const DEFAULT_ASSISTANT_SCHEDULED_TASK_DRAFTS: AssistantScheduledTaskDrafts = {
  text: '',
  time: '0800',
  frequency: 'daily',
  interval: '1',
  weekdays: [1],
  monthDay: '1'
};

const LOG_EDIT_REQUEST_PATTERN = /(改成|改为|改回|改下|改一下|修改|我没|不是)/;
const LOG_EDIT_SUCCESS_REPLY_PATTERN = /(改过来了|改好了|改成了|已经改好|已经改成|已改好|已改成|收到，?改过来了|帮你改好了)/;

const ASSISTANT_EDITABLE_MEMORY_SECTION_META: Record<
  AssistantEditableMemoryListKey,
  {
    label: string;
    emptyLabel: string;
    helperText: string;
    placeholder: string;
    addSuccessMessage: string;
    removeSuccessMessage: string;
  }
> = {
  profileMemory: {
    label: '用户画像记忆',
    emptyLabel: '暂无用户画像记忆。',
    helperText: '记录相对稳定的用户背景与现实处境。',
    placeholder: '比如：用户最近在准备论文答辩，且每周三下午固定开组会。',
    addSuccessMessage: '已加入用户画像记忆',
    removeSuccessMessage: '已删除这条用户画像记忆'
  },
  preferenceMemory: {
    label: '偏好记忆',
    emptyLabel: '暂无偏好记忆。',
    helperText: '记录提醒风格、推进节奏、表达方式等长期偏好。',
    placeholder: '比如：用户更喜欢短句提醒，不喜欢一次给太多步骤。',
    addSuccessMessage: '已加入偏好记忆',
    removeSuccessMessage: '已删除这条偏好记忆'
  }
};

const buildAssistantAgentIntervalDrafts = (config: AssistantAgentConfig): AssistantAgentIntervalDrafts => ({
  basePollMinutes: String(config.basePollMinutes),
  minCheckinMinutes: String(config.minCheckinMinutes),
  maxCheckinMinutes: String(config.maxCheckinMinutes)
});

const buildAssistantAgentQuietHoursDrafts = (config: AssistantAgentConfig): AssistantAgentQuietHoursDrafts => ({
  quietHoursStart: normalizeAssistantQuietHoursValue(config.quietHoursStart) || '',
  quietHoursEnd: normalizeAssistantQuietHoursValue(config.quietHoursEnd) || ''
});

const validateAssistantAgentIntervalDrafts = (
  drafts: AssistantAgentIntervalDrafts
): AssistantAgentIntervalErrors => {
  const errors: AssistantAgentIntervalErrors = {
    basePollMinutes: null,
    minCheckinMinutes: null,
    maxCheckinMinutes: null
  };
  const parsedValues: Partial<Record<AssistantAgentIntervalField, number>> = {};

  (Object.keys(ASSISTANT_AGENT_INTERVAL_FIELD_META) as AssistantAgentIntervalField[]).forEach((field) => {
    const { label, minimum, maximum } = ASSISTANT_AGENT_INTERVAL_FIELD_META[field];
    const rawValue = drafts[field].trim();

    if (!rawValue) {
      errors[field] = `${label}不能为空`;
      return;
    }

    if (!/^\d+$/.test(rawValue)) {
      errors[field] = `${label}只能输入正整数`;
      return;
    }

    const parsedValue = Number(rawValue);
    if (parsedValue < minimum || parsedValue > maximum) {
      errors[field] = `${label}需在 ${minimum} 到 ${maximum} 分钟之间`;
      return;
    }

    parsedValues[field] = parsedValue;
  });

  if (
    errors.minCheckinMinutes === null
    && errors.maxCheckinMinutes === null
    && parsedValues.minCheckinMinutes !== undefined
    && parsedValues.maxCheckinMinutes !== undefined
    && parsedValues.minCheckinMinutes > parsedValues.maxCheckinMinutes
  ) {
    errors.minCheckinMinutes = '最低间隔不能大于最高间隔';
    errors.maxCheckinMinutes = '最高间隔不能小于最低间隔';
  }

  return errors;
};

const validateAssistantAgentQuietHoursDrafts = (
  drafts: AssistantAgentQuietHoursDrafts,
  requireBoth = false
): AssistantAgentQuietHoursErrors => {
  const errors: AssistantAgentQuietHoursErrors = {
    quietHoursStart: null,
    quietHoursEnd: null
  };

  ([
    ['quietHoursStart', '开始保护时间'],
    ['quietHoursEnd', '结束保护时间']
  ] as const).forEach(([field, label]) => {
    const rawValue = drafts[field].trim();

    if (!rawValue) {
      if (requireBoth) {
        errors[field] = `${label}不能为空`;
      }
      return;
    }

    if (!normalizeAssistantQuietHoursValue(rawValue)) {
      errors[field] = `${label}需为四位数字时间`;
    }
  });

  if (
    errors.quietHoursStart === null
    && errors.quietHoursEnd === null
    && requireBoth
    && drafts.quietHoursStart.trim()
    && drafts.quietHoursEnd.trim()
    && drafts.quietHoursStart.trim() === drafts.quietHoursEnd.trim()
  ) {
    errors.quietHoursStart = '开始和结束保护时间不能相同';
    errors.quietHoursEnd = '开始和结束保护时间不能相同';
  }

  return errors;
};

const buildManualAssistantReminderDueAt = (
  dateDraft: string,
  hourDraft: string
): { dueAt?: string; error?: string } => {
  const normalizedDate = dateDraft.trim();
  const normalizedHour = hourDraft.trim();

  if (!/^\d{8}$/.test(normalizedDate)) {
    return { error: '日期需要填写 8 位数字，例如 20260427。' };
  }

  if (!/^\d{4}$/.test(normalizedHour)) {
    return { error: '时间需要填写 4 位数字，例如 0930。' };
  }

  const year = Number(normalizedDate.slice(0, 4));
  const month = Number(normalizedDate.slice(4, 6));
  const day = Number(normalizedDate.slice(6, 8));
  const hour = Number(normalizedHour.slice(0, 2));
  const minute = Number(normalizedHour.slice(2, 4));

  if (year < 2000 || year > 2999) {
    return { error: '日期中的年份需在 2000 到 2999 之间。' };
  }

  if (month < 1 || month > 12) {
    return { error: '日期中的月份需在 01 到 12 之间。' };
  }

  if (day < 1 || day > 31) {
    return { error: '日期中的日需在 01 到 31 之间。' };
  }

  if (hour < 0 || hour > 23) {
    return { error: '时间需在 00 到 23 之间。' };
  }

  if (minute < 0 || minute > 59) {
    return { error: '分钟需在 00 到 59 之间。' };
  }

  const candidate = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    candidate.getFullYear() !== year
    || candidate.getMonth() !== month - 1
    || candidate.getDate() !== day
    || candidate.getHours() !== hour
    || candidate.getMinutes() !== minute
  ) {
    return { error: '这个日期时间无效，请检查后再保存。' };
  }

  const dueAt = normalizeAssistantDateTime(candidate.toISOString());
  if (!dueAt) {
    return { error: '提醒时间解析失败，请重试。' };
  }

  return { dueAt };
};

const buildAssistantScheduledTaskRecurrenceRule = (
  drafts: AssistantScheduledTaskDrafts,
  startDate: string
): { recurrenceRule?: TodoRecurrenceRule; error?: string } => {
  const normalizedInterval = Number(drafts.interval.trim() || '1');
  if (!Number.isInteger(normalizedInterval) || normalizedInterval < 1 || normalizedInterval > 365) {
    return { error: '循环间隔需要填写 1 到 365 之间的整数。' };
  }

  if (drafts.frequency === 'weekly' && drafts.weekdays.length === 0) {
    return { error: '每周循环至少要选择一天。' };
  }

  if (drafts.frequency === 'monthly') {
    const monthDay = Number(drafts.monthDay.trim() || '0');
    if (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31) {
      return { error: '每月日期需要填写 1 到 31。' };
    }

    return {
      recurrenceRule: {
        frequency: 'monthly',
        startDate,
        ...(normalizedInterval > 1 ? { interval: normalizedInterval } : {}),
        monthDays: [monthDay]
      }
    };
  }

  if (drafts.frequency === 'weekly') {
    return {
      recurrenceRule: {
        frequency: 'weekly',
        startDate,
        ...(normalizedInterval > 1 ? { interval: normalizedInterval } : {}),
        weekdays: [...drafts.weekdays].sort((left, right) => left - right)
      }
    };
  }

  return {
    recurrenceRule: {
      frequency: 'daily',
      startDate,
      ...(normalizedInterval > 1 ? { interval: normalizedInterval } : {})
    }
  };
};

const buildAssistantScheduledTaskTime = (value: string): { time?: string; error?: string } => {
  const normalized = value.trim();
  if (!/^\d{4}$/.test(normalized)) {
    return { error: '触发时间需要填写 4 位数字，例如 0800。' };
  }

  const hours = Number(normalized.slice(0, 2));
  const minutes = Number(normalized.slice(2, 4));
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    return { error: '小时需要在 00 到 23 之间。' };
  }
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    return { error: '分钟需要在 00 到 59 之间。' };
  }

  return {
    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  };
};

const formatAssistantScheduledTaskRecurrence = (task: AssistantScheduledTask): string => {
  const interval = Math.max(1, task.recurrenceRule.interval || 1);

  if (task.recurrenceRule.frequency === 'weekly') {
    const weekdayLabels = (task.recurrenceRule.weekdays?.length
      ? task.recurrenceRule.weekdays
      : [new Date(task.recurrenceRule.startDate).getDay()]
    )
      .map((weekday) => ASSISTANT_SCHEDULED_TASK_WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label || '')
      .filter(Boolean)
      .join('、');
    return interval > 1
      ? `每${interval}周 ${weekdayLabels || '指定日期'} ${task.time}`
      : `每周${weekdayLabels || '指定日期'} ${task.time}`;
  }

  if (task.recurrenceRule.frequency === 'monthly') {
    const monthDay = task.recurrenceRule.monthDays?.[0]
      || Number(task.recurrenceRule.startDate.split('-')[2] || '1');
    return interval > 1
      ? `每${interval}个月 ${monthDay}号 ${task.time}`
      : `每月${monthDay}号 ${task.time}`;
  }

  return interval > 1
    ? `每${interval}天 ${task.time}`
    : `每天 ${task.time}`;
};

const PersonaAvatar: React.FC<{
  persona: AIChatPersona;
  className?: string;
  iconClassName?: string;
}> = ({
  persona,
  className = '',
  iconClassName = ''
}) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!persona.avatarImage) {
      setSrc('');
      return () => {
        cancelled = true;
      };
    }

    imageService.getImageUrl(persona.avatarImage).then((url) => {
      if (!cancelled) {
        setSrc(url);
      }
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Failed to load persona avatar', error);
      if (!cancelled) {
        setSrc('');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [persona.avatarImage]);

  if (src) {
    return <img src={src} alt={persona.name} className={`h-full w-full object-cover ${className}`.trim()} />;
  }

  return (
    <span
      className={`inline-flex h-full w-full items-center justify-center text-center leading-none ${iconClassName}`.trim()}
      style={{ lineHeight: 1 }}
    >
      {persona.avatarIcon || '✨'}
    </span>
  );
};

const UserAvatar: React.FC<{
  profile: AIChatUserProfile;
  className?: string;
  iconClassName?: string;
}> = ({
  profile,
  className = '',
  iconClassName = ''
}) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    if (!profile.avatarImage) {
      setSrc('');
      return () => {
        cancelled = true;
      };
    }

    imageService.getImageUrl(profile.avatarImage).then((url) => {
      if (!cancelled) {
        setSrc(url);
      }
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Failed to load user avatar', error);
      if (!cancelled) {
        setSrc('');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [profile.avatarImage]);

  if (src) {
    return <img src={src} alt="user avatar" className={`h-full w-full object-cover ${className}`.trim()} />;
  }

  if (profile.avatarIcon.trim()) {
    return (
      <span
        className={`inline-flex h-full w-full items-center justify-center text-center leading-none ${iconClassName}`.trim()}
        style={{ lineHeight: 1 }}
      >
        {profile.avatarIcon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-full w-full items-center justify-center text-center leading-none ${iconClassName}`.trim()}
      style={{ lineHeight: 1 }}
    >
      <User size={15} />
    </span>
  );
};

const RevealingMessageBubble: React.FC<{
  children: React.ReactNode;
  className: string;
  style: React.CSSProperties;
  revealMode?: 'default' | 'assistantStaggered';
  partIndex?: number;
  partCount?: number;
}> = ({
  children,
  className,
  style,
  revealMode = 'default',
  partIndex = 0,
  partCount = 1
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const isAssistantStaggered = revealMode === 'assistantStaggered';
  const totalParts = Math.max(partCount, 1);
  const depthRatio = totalParts > 1 ? partIndex / (totalParts - 1) : 0;
  const hiddenOffsetPx = isAssistantStaggered
    ? clampNumber(
      ASSISTANT_MULTI_BUBBLE_REVEAL_BASE_OFFSET_PX + (depthRatio * 8),
      ASSISTANT_MULTI_BUBBLE_REVEAL_BASE_OFFSET_PX,
      ASSISTANT_MULTI_BUBBLE_REVEAL_MAX_OFFSET_PX
    )
    : 4;
  const baseBoxShadow = typeof style.boxShadow === 'string' ? style.boxShadow : '';
  const landingShadow = isAssistantStaggered
    ? '0 18px 34px -28px rgba(15,23,42,0.28)'
    : '0 10px 22px -24px rgba(15,23,42,0.16)';
  const hiddenShadow = isAssistantStaggered
    ? '0 26px 42px -34px rgba(15,23,42,0.18)'
    : '0 12px 24px -24px rgba(15,23,42,0.10)';
  const composedStyle: React.CSSProperties = {
    ...style,
    transform: isVisible
      ? 'translate3d(0, 0, 0) scale(1)'
      : `translate3d(0, ${hiddenOffsetPx}px, 0) scale(${isAssistantStaggered ? ASSISTANT_MULTI_BUBBLE_REVEAL_INITIAL_SCALE : 0.99})`,
    opacity: isVisible ? 1 : 0,
    filter: isVisible
      ? 'blur(0px) brightness(1)'
      : `blur(${isAssistantStaggered ? 1 : 0.6}px) brightness(${isAssistantStaggered ? 1.045 : 1.02})`,
    boxShadow: baseBoxShadow ? `${baseBoxShadow}, ${isVisible ? landingShadow : hiddenShadow}` : (isVisible ? landingShadow : hiddenShadow),
    transitionDuration: `${ASSISTANT_MULTI_BUBBLE_REVEAL_DURATION_MS}ms`
  };

  return (
    <div
      className={`${className} relative overflow-hidden transform-gpu transition-[opacity,transform,filter,box-shadow] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,opacity,filter]`}
      style={composedStyle}
    >
      {isAssistantStaggered && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/12 to-transparent transition-opacity duration-500"
          style={{ opacity: isVisible ? 0 : 0.75 }}
        />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

interface ActiveRequestRef {
  controller: AbortController;
  sessionId: string;
  pendingMessageId: string;
}

interface ForegroundSendOptions {
  replaceMessageId?: string;
  retrySourceUserMessageId?: string;
}

interface DebugViewerState {
  title: string;
  sections: AIChatDebugSection[];
}

interface InitialChatState {
  personas: AIChatPersona[];
  sessions: AIChatSession[];
  activeSessionId: string;
  debugMode: boolean;
  userProfile: AIChatUserProfile;
}

interface AssistantBackgroundTimelineEntry {
  id: string;
  triggerId?: string;
  triggerType?: string;
  persistedMessageId?: string;
  wakeAt?: string;
  requestStartedAt?: string;
  requestCompletedAt?: string;
  requestStatus: 'not_started' | 'pending' | 'completed' | 'failed';
  outcomeSummary: string;
  message?: string;
  errorMessage?: string;
  debugExchange?: AIDebugExchange;
}

const CHAT_SESSIONS_KEY = 'lumostime_ai_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'lumostime_ai_chat_active_session_v1';
const CHAT_PERSONAS_KEY = 'lumostime_ai_chat_personas_v1';
const DEBUG_MODE_KEY = 'lumostime_ai_chat_debug_mode_v1';
const USER_PROFILE_KEY = 'lumostime_ai_chat_user_profile_v1';
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

const DEFAULT_AI_PERSONAS: AIChatPersona[] = [
  {
    id: 'builtin-default',
    name: '私人助理',
    avatarIcon: '🗂️',
    assistantSelfName: '',
    userCallName: '',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-default'],
    contextMessageLimit: 30,
    isBuiltIn: true
  },
  {
    id: 'builtin-gentle',
    name: '喵喵陪伴',
    avatarIcon: '🐱',
    assistantSelfName: '喵喵',
    userCallName: '主人',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-gentle'],
    contextMessageLimit: 30,
    isBuiltIn: true
  },
  {
    id: 'builtin-planner',
    name: '内阁首辅',
    avatarIcon: '🪶',
    assistantSelfName: '臣',
    userCallName: '陛下',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-planner'],
    contextMessageLimit: 30,
    isBuiltIn: true
  },
  {
    id: 'builtin-chatty',
    name: '知心姐姐',
    avatarIcon: '💗',
    assistantSelfName: '',
    userCallName: '',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-chatty'],
    contextMessageLimit: 30,
    isBuiltIn: true
  },
  {
    id: 'builtin-mentor',
    name: '赛博导师',
    avatarIcon: '🧠',
    assistantSelfName: '',
    userCallName: '',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-mentor'],
    contextMessageLimit: 30,
    isBuiltIn: true
  },
  {
    id: 'builtin-poet',
    name: '古风小生',
    avatarIcon: '🪭',
    assistantSelfName: '小生',
    userCallName: '姑娘',
    systemPrompt: BUILTIN_PERSONA_SYSTEM_PROMPTS['builtin-poet'],
    contextMessageLimit: 30,
    isBuiltIn: true
  }
];

const PERSONA_PRESET_ORDER = DEFAULT_AI_PERSONAS.map((persona) => persona.id);
const PERSONA_EMOJI_CHOICES = ['✨', '🤖', '🌞', '🦊', '🦉', '🌿', '📚', '🎯'];

const clampNumber = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

const clampContextLimit = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 30;
  }
  return Math.max(0, Math.round(numeric));
};

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to parse JSON from localStorage', error);
    return fallback;
  }
};

const isValidTone = (value: unknown): value is ChatTone => (
  value === 'normal' || value === 'system' || value === 'error' || value === 'pending'
);

const normalizeDebugSections = (value: unknown): AIChatDebugSection[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AIChatDebugSection => (
    Boolean(item)
    && typeof item === 'object'
    && typeof (item as AIChatDebugSection).label === 'string'
    && Boolean((item as AIChatDebugSection).exchange)
  ));
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

const normalizeDreamRetryRangeOptionId = (value: unknown): DreamRangeOptionId | undefined => (
  value === 'yesterday' || value === 'this_week' || value === 'this_month' || value === 'this_year'
    ? value
    : undefined
);

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

const normalizeTemplateMeta = (value: unknown): WeeklyReviewTemplateSessionMeta | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<WeeklyReviewTemplateSessionMeta>;
  if (
    candidate.templateType !== 'weekly_review'
    || typeof candidate.weekStartDate !== 'string'
    || typeof candidate.weekEndDate !== 'string'
  ) {
    return undefined;
  }

  const selectedRangeLabel = (
    candidate.selectedRangeLabel === '本周'
    || candidate.selectedRangeLabel === '上周'
    || candidate.selectedRangeLabel === 'custom_date'
  )
    ? candidate.selectedRangeLabel
    : 'custom_date';
  const methodId = (
    candidate.methodId === 'pdca'
    || candidate.methodId === 'systems'
    || candidate.methodId === 'cbt'
    || candidate.methodId === 'narrative'
  )
    ? candidate.methodId
    : 'systems';
  const methodLabel = typeof candidate.methodLabel === 'string' && candidate.methodLabel.trim()
    ? candidate.methodLabel.trim()
    : weeklyReviewTemplateService.listMethodOptions().find((item) => item.id === methodId)?.title || '系统复盘';

  return {
    templateType: 'weekly_review',
    stage: 'ready',
    weekStartDate: candidate.weekStartDate.trim(),
    weekEndDate: candidate.weekEndDate.trim(),
    selectedRangeLabel,
    methodId,
    methodLabel,
    ...(candidate.pendingWriteIntent ? { pendingWriteIntent: true } : {})
  };
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

const normalizeMessages = (value: unknown): AIChatMessage[] => {
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
      ...(normalizeWeeklyReviewWritebackResult(candidate.weeklyReviewWriteback)
        ? { weeklyReviewWriteback: normalizeWeeklyReviewWritebackResult(candidate.weeklyReviewWriteback) }
        : {}),
      ...(normalizeRetryInput(candidate.retryInput) ? { retryInput: normalizeRetryInput(candidate.retryInput) } : {}),
      ...(normalizeRetrySourceUserMessageId(candidate.retrySourceUserMessageId)
        ? { retrySourceUserMessageId: normalizeRetrySourceUserMessageId(candidate.retrySourceUserMessageId) }
        : {}),
      ...(normalizeDreamRetryRangeOptionId(candidate.dreamRetryRangeOptionId)
        ? { dreamRetryRangeOptionId: normalizeDreamRetryRangeOptionId(candidate.dreamRetryRangeOptionId) }
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

const createDefaultSession = (
  personaId: string,
  options?: {
    title?: string;
    messages?: AIChatMessage[];
    templateMeta?: WeeklyReviewTemplateSessionMeta;
  }
): AIChatSession => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: options?.title || '新对话',
    createdAt: now,
    updatedAt: now,
    personaId,
    contextCacheEnabled: true,
    messages: options?.messages || [],
    ...(options?.templateMeta ? { templateMeta: options.templateMeta } : {})
  };
};

const normalizeSessions = (value: unknown, personas: AIChatPersona[]): AIChatSession[] => {
  const validPersonaIds = new Set(personas.map((persona) => persona.id));
  const fallbackPersonaId = personas[0]?.id || DEFAULT_AI_PERSONAS[0].id;

  if (!Array.isArray(value)) {
    return [createDefaultSession(fallbackPersonaId)];
  }

  const sessions = value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AIChatSession>;
    if (typeof candidate.id !== 'string') {
      return [];
    }

    const createdAt = typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now();
    const updatedAt = typeof candidate.updatedAt === 'number' ? candidate.updatedAt : createdAt;
    const normalized: AIChatSession = {
      id: candidate.id,
      title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title.trim() : '新对话',
      createdAt,
      updatedAt,
      personaId: typeof candidate.personaId === 'string' && validPersonaIds.has(candidate.personaId)
        ? candidate.personaId
        : fallbackPersonaId,
      contextCacheEnabled: candidate.contextCacheEnabled !== false,
      messages: normalizeMessages(candidate.messages),
      ...(normalizeTemplateMeta(candidate.templateMeta)
        ? { templateMeta: normalizeTemplateMeta(candidate.templateMeta) }
        : {})
    };

    return [normalized];
  });

  return sessions.length > 0 ? sessions : [createDefaultSession(fallbackPersonaId)];
};

const loadInitialChatState = (): InitialChatState => {
  const personas = normalizePersonas(safeJsonParse<unknown>(localStorage.getItem(CHAT_PERSONAS_KEY), []));
  const sessions = normalizeSessions(safeJsonParse<unknown>(localStorage.getItem(CHAT_SESSIONS_KEY), []), personas);
  const userProfile = normalizeUserProfile(safeJsonParse<unknown>(localStorage.getItem(USER_PROFILE_KEY), null));
  const storedActiveSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
  const activeSessionId = sessions.some((session) => session.id === storedActiveSessionId)
    ? storedActiveSessionId as string
    : [...sessions].sort((left, right) => right.updatedAt - left.updatedAt)[0].id;

  return {
    personas,
    sessions,
    activeSessionId,
    debugMode: localStorage.getItem(DEBUG_MODE_KEY) === 'true',
    userProfile
  };
};

const formatDateLabel = (date: Date): string => (
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date)
);

const formatTimeRange = (startTime: number, endTime: number): string => {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${formatter.format(startTime)} - ${formatter.format(endTime)}`;
};

const formatDateTimeRange = (startTime: number, endTime: number): string => (
  `${new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(startTime)} · ${formatTimeRange(startTime, endTime)}`
);

const formatActionDate = (timestamp: number): string => (
  new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(timestamp)
);

const formatConversationTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${month}月${day}日 ${hour}:${minute}`;
};

const createSessionTitleFromUserMessage = (text: string): string => {
  const condensed = text.trim().replace(/\s+/g, ' ');
  if (!condensed) {
    return '新对话';
  }
  return condensed.length > 18 ? `${condensed.slice(0, 18)}…` : condensed;
};

const formatLocalDateTimeContext = (date: Date): string => formatAssistantLocalDateTime(date);

const buildAssistantCurrentTimeSnapshot = (date: Date) => ({
  currentDateTime: formatLocalDateTimeContext(date)
});

const stringifyDebugSection = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to stringify debug payload', error);
    return String(value);
  }
};

interface DebugTextBlock {
  label: string;
  content: string;
}

const splitLabeledSections = (content: string): DebugTextBlock[] => {
  const normalized = content.trim();
  if (!normalized.includes('=== ')) {
    return [];
  }

  const markerRegex = /^===\s+(.+?)\s+===$/gm;
  const matches = Array.from(normalized.matchAll(markerRegex));
  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const label = match[1]?.trim() || '';
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index || normalized.length) : normalized.length;
    const sectionContent = normalized.slice(start, end).trim();
    return {
      label,
      content: sectionContent
    };
  }).filter((section) => section.label && section.content);
};

const mapPromptSectionLabel = (label: string): string => {
  switch (label) {
    case 'Assistant Base Prompt':
      return '基础 System Prompt';
    case 'Foreground Mode Prompt':
      return '前台调用 Prompt';
    case 'Background Mode Prompt':
      return '后台调用 Prompt';
    case 'User Persona Prompt':
      return '人格 Prompt';
    case 'Foreground Tool Prompt':
    case 'Background Tool Prompt':
    case 'Tool and Mode Rules':
      return '工具与模式规则 Prompt';
    case 'Memory Update Rules':
      return '记忆更新规则 Prompt';
    case 'Unified Turn Output Schema':
      return '统一输出 Schema';
    case 'Memory Snapshot':
      return '长期记忆快照';
    case 'State Context':
      return '应用状态上下文';
    case 'Recent Logs Digest':
      return '近期日志摘要上下文';
    case 'Dictionary Context':
      return '应用候选字典上下文';
    case 'Trigger':
      return '触发信息';
    case 'Conversation Context':
      return '对话上下文';
    default:
      return label;
  }
};

const toPrettyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to stringify debug payload', error);
    return String(value);
  }
};

const normalizeDebugText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return toPrettyJson(value).trim();
};

const buildMemoryUpdateSections = (
  before: AssistantMemory,
  after: AssistantMemory
): AIChatMemoryUpdateSection[] => {
  const sections: AIChatMemoryUpdateSection[] = [];

  const addedProfile = after.profileMemory.filter((item) => !before.profileMemory.includes(item));
  if (addedProfile.length > 0) {
    sections.push({ label: '用户画像记忆', items: addedProfile });
  }

  const addedPreferences = after.preferenceMemory.filter((item) => !before.preferenceMemory.includes(item));
  if (addedPreferences.length > 0) {
    sections.push({ label: '偏好记忆', items: addedPreferences });
  }

  if (after.lastKnownState && after.lastKnownState !== before.lastKnownState) {
    sections.push({ label: '当前状态', items: [after.lastKnownState] });
  }

  if (after.workingMemorySummary && after.workingMemorySummary !== before.workingMemorySummary) {
    sections.push({ label: '工作记忆摘要', items: [after.workingMemorySummary] });
  }

  const addedDecisions = after.recentDecisions.filter((item) => !before.recentDecisions.includes(item));
  if (addedDecisions.length > 0) {
    sections.push({ label: '决策摘要', items: addedDecisions });
  }

  return sections;
};

const buildDebugBlocks = (exchange: AIDebugExchange): DebugTextBlock[] => {
  const blocks: DebugTextBlock[] = [];
  const requestBody = exchange.request.body as Record<string, unknown> | null | undefined;
  const responseBody = exchange.response.body as Record<string, unknown> | null | undefined;

  blocks.push({
    label: '请求元信息',
    content: [
      `provider: ${exchange.provider}`,
      `requestedAt: ${exchange.requestedAt}`,
      `completedAt: ${exchange.completedAt}`,
      `url: ${exchange.request.url}`,
      `method: ${exchange.request.method}`
    ].join('\n')
  });

  if (exchange.cache) {
    const cacheLines = [
      `providerFamily: ${exchange.cache.providerFamily}`,
      `strategy: ${exchange.cache.strategy}`,
      ...(exchange.cache.key ? [`key: ${exchange.cache.key}`] : []),
      ...(exchange.cache.metrics?.cachedTokens !== undefined ? [`cachedTokens: ${exchange.cache.metrics.cachedTokens}`] : []),
      ...(exchange.cache.metrics?.promptCacheHitTokens !== undefined ? [`promptCacheHitTokens: ${exchange.cache.metrics.promptCacheHitTokens}`] : []),
      ...(exchange.cache.metrics?.promptCacheMissTokens !== undefined ? [`promptCacheMissTokens: ${exchange.cache.metrics.promptCacheMissTokens}`] : []),
      ...(exchange.cache.metrics?.cacheCreationInputTokens !== undefined ? [`cacheCreationInputTokens: ${exchange.cache.metrics.cacheCreationInputTokens}`] : []),
      ...(exchange.cache.metrics?.cacheReadInputTokens !== undefined ? [`cacheReadInputTokens: ${exchange.cache.metrics.cacheReadInputTokens}`] : []),
      ...(exchange.cache.metrics?.cacheWriteTokens !== undefined ? [`cacheWriteTokens: ${exchange.cache.metrics.cacheWriteTokens}`] : [])
    ];

    blocks.push({
      label: '缓存信息',
      content: cacheLines.join('\n')
    });
  }

  const modelValue = typeof requestBody?.model === 'string'
    ? requestBody.model
    : typeof requestBody?.['model'] === 'string'
      ? String(requestBody.model)
      : '';
  if (modelValue) {
    blocks.push({
      label: '模型',
      content: modelValue
    });
  }

  const openAIMessages = Array.isArray(requestBody?.messages)
    ? requestBody.messages as Array<{ role?: string; content?: unknown }>
    : [];
  if (openAIMessages.length > 0) {
    const systemMessage = openAIMessages.find((message) => message.role === 'system');
    const historyMessages = openAIMessages.slice(systemMessage ? 1 : 0, -1);
    const latestUserMessage = openAIMessages[openAIMessages.length - 1];

    if (systemMessage?.content) {
      const systemPromptContent = normalizeDebugText(systemMessage.content);
      const promptSections = splitLabeledSections(systemPromptContent);
      if (promptSections.length > 0) {
        blocks.push(...promptSections.map((section) => ({
          label: mapPromptSectionLabel(section.label),
          content: section.content
        })));
      } else {
        blocks.push({
          label: '系统提示词',
          content: systemPromptContent
        });
      }
    }

    if (historyMessages.length > 0) {
      blocks.push({
        label: '对话上下文',
        content: historyMessages.map((message) => (
          `${message.role === 'assistant' ? 'assistant' : 'user'}:\n${normalizeDebugText(message.content || '')}`
        )).join('\n\n')
      });
    }

    if (latestUserMessage?.content) {
      const userPromptContent = normalizeDebugText(latestUserMessage.content);
      const userPromptSections = splitLabeledSections(userPromptContent);
      if (userPromptSections.length > 0) {
        blocks.push(...userPromptSections.map((section) => ({
          label: mapPromptSectionLabel(section.label),
          content: section.content
        })));
      } else {
        blocks.push({
          label: '最终用户输入',
          content: userPromptContent
        });
      }
    }
  }

  const geminiSystemInstruction = requestBody?.system_instruction as { parts?: Array<{ text?: string }> } | undefined;
  if (!openAIMessages.length && geminiSystemInstruction?.parts?.length) {
    const systemPromptContent = geminiSystemInstruction.parts.map((part) => part.text || '').filter(Boolean).join('\n\n').trim();
    const promptSections = splitLabeledSections(systemPromptContent);
    if (promptSections.length > 0) {
      blocks.push(...promptSections.map((section) => ({
        label: mapPromptSectionLabel(section.label),
        content: section.content
      })));
    } else {
      blocks.push({
        label: '系统提示词',
        content: systemPromptContent
      });
    }
  }

  const geminiContents = Array.isArray(requestBody?.contents)
    ? requestBody.contents as Array<{ role?: string; parts?: Array<{ text?: string }> }>
    : [];
  if (!openAIMessages.length && geminiContents.length > 0) {
    const conversationItems = geminiContents.slice(0, -1);
    const finalUser = geminiContents[geminiContents.length - 1];

    if (conversationItems.length > 0) {
      blocks.push({
        label: '对话上下文',
        content: conversationItems.map((item) => (
          `${item.role || 'user'}:\n${(item.parts || []).map((part) => part.text || '').filter(Boolean).join('\n')}`
        )).join('\n\n')
      });
    }

    if (finalUser?.parts?.length) {
      const userPromptContent = finalUser.parts.map((part) => part.text || '').filter(Boolean).join('\n').trim();
      const userPromptSections = splitLabeledSections(userPromptContent);
      if (userPromptSections.length > 0) {
        blocks.push(...userPromptSections.map((section) => ({
          label: mapPromptSectionLabel(section.label),
          content: section.content
        })));
      } else {
        blocks.push({
          label: '最终用户输入',
          content: userPromptContent
        });
      }
    }
  }

  const openAIResponseContent = typeof (responseBody as any)?.choices?.[0]?.message?.content === 'string'
    ? (responseBody as any).choices[0].message.content.trim()
    : '';
  const geminiResponseContent = typeof (responseBody as any)?.candidates?.[0]?.content?.parts?.[0]?.text === 'string'
    ? (responseBody as any).candidates[0].content.parts[0].text.trim()
    : '';
  const responseContent = openAIResponseContent || geminiResponseContent;
  if (responseContent) {
    blocks.push({
      label: '模型原始输出',
      content: responseContent
    });
  }

  return blocks.filter((block) => block.content.trim().length > 0);
};

const buildBackgroundSummaryDebugExchange = (
  entry: AssistantBackgroundCallHistoryEntry
): AIDebugExchange => {
  const summaryLines = [
    `triggerType: ${entry.triggerType || '-'}`,
    ...(entry.triggerId ? [`triggerId: ${entry.triggerId}`] : []),
    `status: ${entry.status}`,
    `action: ${entry.action}`,
    `memoryAction: ${entry.memoryAction}`,
    `reminderCount: ${entry.reminderCount}`,
    ...(entry.silentReason ? [`silentReason: ${entry.silentReason}`] : []),
    ...(entry.sideEffects?.length ? [`sideEffects: ${entry.sideEffects.join('；')}`] : []),
    ...(entry.decisionSummary ? [`decisionSummary: ${entry.decisionSummary}`] : []),
    ...(entry.errorMessage ? [`errorMessage: ${entry.errorMessage}`] : [])
  ];

  const responseSummary = [
    entry.message?.trim() || '',
    entry.decisionSummary?.trim() || '',
    entry.errorMessage?.trim() || ''
  ].filter(Boolean).join('\n\n');

  return {
    provider: 'openai',
    requestedAt: entry.requestedAt,
    completedAt: entry.completedAt || entry.requestedAt,
    request: {
      url: 'native://assistant-background-summary',
      method: 'POST',
      headers: {},
      body: {
        model: 'native-background-summary',
        messages: [
          {
            role: 'system',
            content: [
              '=== 后台摘要 ===',
              summaryLines.join('\n')
            ].join('\n')
          },
          {
            role: 'user',
            content: [
              '=== 后台触发 ===',
              `triggerText: ${entry.triggerText || '-'}`,
              ...(entry.targetSessionId ? [`targetSessionId: ${entry.targetSessionId}`] : [])
            ].join('\n')
          }
        ]
      }
    },
    response: {
      status: entry.status === 'failed' ? 500 : 200,
      ok: entry.status !== 'failed',
      body: {
        choices: [{
          message: {
            content: responseSummary || '后台原生请求没有返回更详细的调试正文。'
          }
        }]
      }
    }
  };
};

const normalizeAssistantNativeDiagnostics = (value: unknown): AssistantNativeDiagnosticEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const candidate = item as Partial<AssistantNativeDiagnosticEntry>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
    const level = candidate.level === 'success'
      || candidate.level === 'warning'
      || candidate.level === 'error'
      ? candidate.level
      : 'info';
    const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt.trim() : '';
    const message = typeof candidate.message === 'string' ? candidate.message.trim() : '';
    const context = candidate.context && typeof candidate.context === 'object'
      ? Object.fromEntries(
        Object.entries(candidate.context as Record<string, unknown>)
          .map(([key, entryValue]) => [key.trim(), typeof entryValue === 'string' ? entryValue.trim() : String(entryValue ?? '')])
          .filter(([key, entryValue]) => key && entryValue)
      )
      : undefined;

    if (!id || !type || !createdAt || !message) {
      return [];
    }

    return [{
      id,
      type: type as AssistantNativeDiagnosticEntry['type'],
      level,
      createdAt,
      message,
      ...(typeof candidate.triggerId === 'string' && candidate.triggerId.trim() ? { triggerId: candidate.triggerId.trim() } : {}),
      ...(typeof candidate.triggerType === 'string' && candidate.triggerType.trim() ? { triggerType: candidate.triggerType.trim() as AssistantNativeDiagnosticEntry['triggerType'] } : {}),
      ...(typeof candidate.reason === 'string' && candidate.reason.trim() ? { reason: candidate.reason.trim() } : {}),
      ...(context && Object.keys(context).length > 0 ? { context } : {})
    }];
  });
};

const getAssistantBackgroundTriggerLabel = (triggerType?: string): string => {
  switch (triggerType) {
    case 'checkin':
      return '后台 check-in';
    case 'manual_background_nudge':
      return '手动后台触发';
    case 'reminder_due':
      return 'Reminder 到点';
    case 'long_idle':
      return '长时间空闲';
    case 'focus_started':
      return '专注开始';
    case 'focus_ended':
      return '专注结束';
    case 'todo_changed':
      return '任务变更';
    default:
      return triggerType || '后台触发';
  }
};

const getAssistantBackgroundRequestStatusLabel = (status: AssistantBackgroundTimelineEntry['requestStatus']): string => {
  switch (status) {
    case 'not_started':
      return '未开始请求';
    case 'pending':
      return '请求中';
    case 'completed':
      return '请求成功';
    case 'failed':
      return '请求失败';
    default:
      return status;
  }
};

const formatAssistantReminderSnapshot = (reminders: AssistantReminder[]): string => {
  if (!reminders.length) {
    return '暂无';
  }

  return reminders.map((reminder, index) => {
    const delayMinutes = getAssistantDelayMinutes(reminder.dueAt, reminder.lastDispatchedAt);

    return [
      `${index + 1}. ${reminder.text}`,
      `   type: ${reminder.type}`,
      `   status: ${reminder.status}`,
      `   scheduledDueAt: ${formatAssistantDateTimeForDisplay(reminder.dueAt)}`,
      `   lastDispatchAttemptAt: ${formatAssistantDateTimeForDisplay(reminder.lastDispatchAttemptAt) || '-'}`,
      `   actualDispatchAt: ${formatAssistantDateTimeForDisplay(reminder.lastDispatchedAt) || '-'}`,
      `   delayMinutes: ${delayMinutes ?? '-'}`,
      `   dispatchAttemptCount: ${reminder.dispatchAttemptCount || 0}`
    ].join('\n');
  }).join('\n\n');
};

const buildPersonaPrompt = (persona: AIChatPersona): string => {
  const lines: string[] = [];

  if (persona.name.trim()) {
    lines.push(`你当前的人设名字是“${persona.name.trim()}”。`);
  }
  if (persona.assistantSelfName.trim()) {
    lines.push(`如果需要自称，优先使用“${persona.assistantSelfName.trim()}”。`);
  }
  if (persona.userCallName.trim()) {
    lines.push(`称呼用户时优先使用“${persona.userCallName.trim()}”。`);
  }
  if (persona.systemPrompt.trim()) {
    lines.push(persona.systemPrompt.trim());
  }

  return lines.join('\n');
};

const dedupeStringArray = (values: Array<string | undefined | null>): string[] => (
  Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim())))
);

const isAbortError = (error: unknown): boolean => (
  error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error
      ? error.name === 'AbortError' || /aborted|abort/i.test(error.message)
      : false
);

const getRetryableAIErrorMessage = (error: unknown): string => {
  const debugTransportError = (
    typeof error === 'object'
    && error !== null
    && 'debug' in error
    && typeof (error as { debug?: AIDebugExchange }).debug?.response?.body === 'object'
    && (error as { debug?: AIDebugExchange }).debug?.response?.body
    && 'transportError' in ((error as { debug?: AIDebugExchange }).debug?.response?.body as Record<string, unknown>)
  )
    ? String(((error as { debug?: AIDebugExchange }).debug?.response?.body as Record<string, unknown>).transportError || '')
    : '';

  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const message = (debugTransportError || rawMessage || '').trim();

  if (!message) {
    return 'AI 请求失败了。你可以点“重试”再试一次。';
  }

  if (/failed to fetch|networkerror|load failed|err_connection_closed|err_connection_reset|err_connection_close/i.test(message)) {
    return '网络连接失败，可能是连接被关闭、网络波动，或 AI 服务暂时不可用。你可以点“重试”再试一次。';
  }

  if (/timeout|timed out|network request failed/i.test(message)) {
    return '请求超时了，可能是网络较慢或 AI 服务响应过久。你可以点“重试”再试一次。';
  }

  return `AI 请求失败：${message}`;
};

const getErrorDebugSections = (
  error: unknown,
  label: string,
  enabled: boolean
): AIChatDebugSection[] | undefined => {
  if (!enabled || typeof error !== 'object' || error === null || !('debug' in error)) {
    return undefined;
  }

  const exchange = (error as { debug?: AIDebugExchange }).debug;
  return exchange
    ? [{
      label,
      exchange
    }]
    : undefined;
};

export const AIBackfillChatModal: React.FC<AIBackfillChatModalProps> = ({
  isOpen,
  onClose,
  targetDate,
  targetSessionId,
  targetMessageId,
  registerBackHandler,
  onUnreadAssistantMessage,
  onMarkRead
}) => {
  const [initialState] = useState<InitialChatState>(() => loadInitialChatState());
  const [personas, setPersonas] = useState<AIChatPersona[]>(initialState.personas);
  const [sessions, setSessions] = useState<AIChatSession[]>(initialState.sessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialState.activeSessionId);
  const [debugMode, setDebugMode] = useState<boolean>(initialState.debugMode);
  const [userProfile, setUserProfile] = useState<AIChatUserProfile>(initialState.userProfile);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isPersonaPanelOpen, setIsPersonaPanelOpen] = useState(false);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [isWeeklyReviewWeekSelectionModalOpen, setIsWeeklyReviewWeekSelectionModalOpen] = useState(false);
  const [isWeeklyReviewDateInputModalOpen, setIsWeeklyReviewDateInputModalOpen] = useState(false);
  const [pendingWeeklyReviewTemplateSetup, setPendingWeeklyReviewTemplateSetup] = useState<PendingWeeklyReviewTemplateSetup | null>(null);
  const [activeSettingsMainTab, setActiveSettingsMainTab] = useState<AISettingsMainTab>('persona');
  const [debugViewer, setDebugViewer] = useState<DebugViewerState | null>(null);
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
  const [dreamRangeSelectionState, setDreamRangeSelectionState] = useState<DreamRangeSelectionState | null>(null);
  const [selectedDreamTopicId, setSelectedDreamTopicId] = useState('');
  const [dreamTopicDrafts, setDreamTopicDrafts] = useState<DreamTopicDrafts>(DEFAULT_DREAM_TOPIC_DRAFTS);
  const [isDreamTopicComposerOpen, setIsDreamTopicComposerOpen] = useState(false);
  const [editingDreamTopicId, setEditingDreamTopicId] = useState<string | null>(null);
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
  const handledNavigationKeyRef = useRef('');
  const handledAssistantTriggerIdsRef = useRef<Set<string>>(new Set());
  const hasCompletedStartupReminderCatchupRef = useRef(false);
  const visualViewportBaselineRef = useRef<{ height: number; width: number }>({ height: 0, width: 0 });

  const { logs, setLogs, todos, setTodos, todoCategories, isReady: isDataReady, usesFallbackSeedData } = useData();
  const {
    dailyReviews,
    weeklyReviews,
    setWeeklyReviews,
    reviewTemplates,
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
    setCurrentWeeklyReviewStart,
    setCurrentWeeklyReviewEnd,
    setCurrentWeeklyReviewInitialTab,
    setIsWeeklyReviewOpen
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
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0] || null,
    [activeSessionId, sessions]
  );
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
    if (editingDreamEntryId && !dreamSnapshot.entries.some((entry) => entry.id === editingDreamEntryId)) {
      resetDreamEntryUi();
    }
  }, [dreamSnapshot.entries, editingDreamEntryId]);
  const activePersona = useMemo(
    () => (activeSession ? personaMap.get(activeSession.personaId) : undefined) || personas[0] || DEFAULT_AI_PERSONAS[0],
    [activeSession, personaMap, personas]
  );
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
        nativeRequestByTriggerId.set(triggerId, {
          ...current,
          startedAt: current.startedAt || entry.context?.requestedAt,
          completedAt: entry.context?.completedAt || entry.createdAt,
          status: 'completed',
          outcomeSummary: entry.context?.decisionSummary || '原生后台请求已完成',
          message: entry.context?.assistantReply || undefined
        });
        return;
      }

      nativeRequestByTriggerId.set(triggerId, {
        ...current,
        startedAt: current.startedAt || entry.context?.requestedAt,
        completedAt: entry.createdAt,
        status: 'failed',
        outcomeSummary: '原生后台请求失败了',
        errorMessage: entry.context?.error || entry.message
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
        ...(entry.debugExchange ? { debugExchange: entry.debugExchange } : {})
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
        ...(nativeRequest?.errorMessage ? { errorMessage: nativeRequest.errorMessage } : {})
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

  const sortedSessions = useMemo(
    () => [...sessions].sort((left, right) => right.updatedAt - left.updatedAt),
    [sessions]
  );

  const buildConversationHistoryFromMessages = (
    session: AIChatSession,
    messages: AIChatMessage[]
  ): AIConversationTurn[] => {
    const sessionPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
    if (!session.contextCacheEnabled || sessionPersona.contextMessageLimit <= 0) {
      return [];
    }

    const turns = messages
      .filter((message) => message.tone !== 'system' && message.tone !== 'pending')
      .map((message) => ({
        role: message.role,
        content: message.content.trim()
      }))
      .filter((turn): turn is AIConversationTurn => Boolean(turn.content));

    if (turns.length <= 1) {
      return [];
    }

    const rounds: AIConversationTurn[][] = [];
    let currentRound: AIConversationTurn[] = [];

    turns.forEach((turn) => {
      if (turn.role === 'user') {
        if (currentRound.length > 1) {
          rounds.push(currentRound);
        }
        currentRound = [turn];
        return;
      }

      if (currentRound.length === 0) {
        return;
      }

      currentRound = [...currentRound, turn];
      rounds.push(currentRound);
      currentRound = [];
    });

    if (rounds.length === 0) {
      return [];
    }

    return rounds.slice(-sessionPersona.contextMessageLimit).flat();
  };

  const buildConversationHistory = (session: AIChatSession): AIConversationTurn[] => (
    buildConversationHistoryFromMessages(session, session.messages)
  );

  const buildRetryConversationHistory = (
    sessionId: string,
    retrySourceUserMessageId?: string
  ): AIConversationTurn[] => {
    if (!retrySourceUserMessageId) {
      return conversationHistoryCache.get(sessionId) || [];
    }

    const session = sessions.find((candidate) => candidate.id === sessionId);
    if (!session) {
      return conversationHistoryCache.get(sessionId) || [];
    }

    const retryUserMessageIndex = session.messages.findIndex((message) => (
      message.id === retrySourceUserMessageId && message.role === 'user'
    ));
    if (retryUserMessageIndex < 0) {
      return conversationHistoryCache.get(sessionId) || [];
    }

    return buildConversationHistoryFromMessages(
      session,
      session.messages.slice(0, retryUserMessageIndex)
    );
  };

  const conversationHistoryCache = useMemo(
    () => new Map(
      sessions.map((session) => [session.id, buildConversationHistory(session)])
    ),
    [personas, personaMap, sessions]
  );

  const reloadPersistedChatSessions = () => {
    setSessions(normalizeSessions(
      safeJsonParse<unknown>(localStorage.getItem(CHAT_SESSIONS_KEY), []),
      personas
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
          addToast('info', `AI 助理：${hydrationResult.surfacedMessages[hydrationResult.surfacedMessages.length - 1]}`);
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

  const resolveDreamRange = useCallback((optionId: DreamRangeOptionId, referenceDate: Date = new Date()) => {
    const anchor = new Date(referenceDate);
    anchor.setHours(12, 0, 0, 0);

    if (optionId === 'yesterday') {
      const start = new Date(anchor);
      start.setDate(start.getDate() - 1);
      return {
        optionId,
        label: DREAM_RANGE_OPTION_LABELS[optionId],
        startDate: getLocalDateStr(start),
        endDate: getLocalDateStr(start)
      };
    }

    if (optionId === 'this_week') {
      const { start, end } = getWeekRange(anchor);
      return {
        optionId,
        label: DREAM_RANGE_OPTION_LABELS[optionId],
        startDate: getLocalDateStr(start),
        endDate: getLocalDateStr(end)
      };
    }

    if (optionId === 'this_month') {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12, 0, 0, 0);
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12, 0, 0, 0);
      return {
        optionId,
        label: DREAM_RANGE_OPTION_LABELS[optionId],
        startDate: getLocalDateStr(start),
        endDate: getLocalDateStr(end)
      };
    }

    const start = new Date(anchor.getFullYear(), 0, 1, 12, 0, 0, 0);
    const end = new Date(anchor.getFullYear(), 11, 31, 12, 0, 0, 0);
    return {
      optionId,
      label: DREAM_RANGE_OPTION_LABELS[optionId],
      startDate: getLocalDateStr(start),
      endDate: getLocalDateStr(end)
    };
  }, []);

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

  const buildAssistantDictionaryContext = useCallback(() => assistantContextBuilder.buildDictionaryContext({
    categories,
    scopes,
    todoCategories,
    todos: todos.filter((todo) => !todo.isCompleted).slice(0, 60),
    logs: logs
      .filter((log) => formatDateKey(new Date(log.startTime)) === defaultDateKey)
      .sort((left, right) => left.startTime - right.startTime)
      .slice(0, 60)
  }), [categories, defaultDateKey, logs, scopes, todoCategories, todos]);

  const buildBackgroundPersonaPrompt = useCallback((session?: AIChatSession): string | undefined => {
    if (!session) {
      return undefined;
    }

    const resolvedPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
    const prompt = buildPersonaPrompt(resolvedPersona);
    return prompt.trim() ? prompt : undefined;
  }, [personaMap, personas]);

  const buildAssistantTimelineSummary = useCallback(() => assistantContextBuilder.buildTimelineSummaryDigest({
    defaultDate: defaultDateKey,
    dailyReviews
  }), [dailyReviews, defaultDateKey]);

  const buildAssistantStateContext = useCallback((
    date: Date,
    reminderSummary?: string
  ) => ({
    ...assistantContextBuilder.buildStateContext({
      ...buildAssistantCurrentTimeSnapshot(date),
      defaultDate: defaultDateKey,
      logs,
      categories,
      todos,
      activeSessions,
      timelineReviewSummary: buildAssistantTimelineSummary(),
      ...(reminderSummary ? { reminderSummary } : {})
    })
  }), [activeSessions, buildAssistantTimelineSummary, categories, defaultDateKey, logs, todos]);

  const buildWeeklyReviewTemplateWeekDataText = useCallback((session: AIChatSession): string | null => {
    if (session.templateMeta?.templateType !== 'weekly_review') {
      return null;
    }

    const weeklyReview = weeklyReviewTemplateService.findWeeklyReview(
      weeklyReviews,
      session.templateMeta.weekStartDate,
      session.templateMeta.weekEndDate
    );

    return weeklyReviewTemplateService.buildWeekDataText({
      weekStartDate: session.templateMeta.weekStartDate,
      weekEndDate: session.templateMeta.weekEndDate,
      selectedRangeLabel: session.templateMeta.selectedRangeLabel,
      logs,
      categories,
      todos,
      todoCategories,
      scopes,
      dailyReviews,
      weeklyReview
    });
  }, [categories, dailyReviews, logs, scopes, todoCategories, todos, weeklyReviews]);

  const buildBackgroundTurnRequest = useCallback(({
    trigger,
    now,
    targetSession,
    conversationHistory,
    showSystemNotification
  }: AssistantBackgroundTurnRequestOptions) => {
    const reminderSummary = buildAssistantReminderSummary();
    const userPersonaPrompt = buildBackgroundPersonaPrompt(targetSession);
    const stateContext = buildAssistantStateContext(now, reminderSummary);

    return {
      trigger,
      ...(targetSession ? { targetSessionId: targetSession.id } : {}),
      showSystemNotification,
      currentDateTime: stateContext.currentDateTime,
      defaultDate: stateContext.defaultDate,
      todayTimelineSummary: stateContext.todayTimelineSummary || '',
      ...(stateContext.yesterdayTimelineSummary ? { yesterdayTimelineSummary: stateContext.yesterdayTimelineSummary } : {}),
      ...(stateContext.timelineReviewSummary ? { timelineReviewSummary: stateContext.timelineReviewSummary } : {}),
      ...(stateContext.activeSessionSummary ? { activeSessionSummary: stateContext.activeSessionSummary } : {}),
      ...(stateContext.todayScheduledTodoSummary ? { todayScheduledTodoSummary: stateContext.todayScheduledTodoSummary } : {}),
      ...(stateContext.pinnedTodoSummary ? { pinnedTodoSummary: stateContext.pinnedTodoSummary } : {}),
      ...(stateContext.overdueTodoSummary ? { overdueTodoSummary: stateContext.overdueTodoSummary } : {}),
      ...(reminderSummary ? { reminderSummary } : {}),
      ...(userPersonaPrompt ? { userPersonaPrompt } : {}),
      dictionaryContext: buildAssistantDictionaryContext(),
      conversationHistory,
      includeDebugInPersistedMessage: debugMode
    };
  }, [
    buildAssistantDictionaryContext,
    buildAssistantReminderSummary,
    buildAssistantStateContext,
    buildBackgroundPersonaPrompt,
    debugMode
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
        addToast('info', `AI 助理：${result.surfacedMessage}`);
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
            content: turn.content
          }))
        ),
        stateContext: {
          currentDateTime: stateContext.currentDateTime,
          defaultDate: stateContext.defaultDate,
          ...(stateContext.todayTimelineSummary ? { todayTimelineSummary: stateContext.todayTimelineSummary } : {}),
          ...(stateContext.yesterdayTimelineSummary ? { yesterdayTimelineSummary: stateContext.yesterdayTimelineSummary } : {}),
          ...(stateContext.timelineReviewSummary ? { timelineReviewSummary: stateContext.timelineReviewSummary } : {}),
          ...(stateContext.activeSessionSummary ? { activeSessionSummary: stateContext.activeSessionSummary } : {}),
          ...(stateContext.todayScheduledTodoSummary ? { todayScheduledTodoSummary: stateContext.todayScheduledTodoSummary } : {}),
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
        addToast('info', `AI 助理：${result.surfacedMessage}`);
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
    if (!assistantAgentConfig.enabled || !isAssistantBackgroundContextReady) {
      return;
    }

    const dueReminders = assistantReminderQueueService.listDueReminders();
    dueReminders.forEach((reminder) => {
      dispatchDueReminder(reminder);
    });
  }, [assistantAgentConfig.enabled, dispatchDueReminder, isAssistantBackgroundContextReady]);

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
    setSessions((prev) => prev.map((session) => (
      session.id === sessionId
        ? {
          ...updater(session),
          updatedAt: Date.now()
        }
        : session
    )));
  };

  const replaceMessage = (sessionId: string, messageId: string, nextMessage: AIChatMessage) => {
    mutateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) => (
        message.id === messageId ? nextMessage : message
      ))
    }));
  };

  const updateAppliedActionStatus = (
    sessionId: string,
    messageId: string,
    actionId: string,
    nextStatus: AppliedActionStatus
  ) => {
    mutateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) => {
        if (message.id !== messageId || !message.appliedActions) {
          return message;
        }

        return {
          ...message,
          appliedActions: message.appliedActions.map((action) => (
            action.actionId === actionId
              ? { ...action, status: nextStatus }
              : action
          ))
        };
      })
    }));
  };

  const appendSystemMessage = (
    sessionId: string,
    content: string,
    options?: {
      debugSections?: AIChatDebugSection[];
      tone?: ChatTone;
    }
  ) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    mutateSession(sessionId, (session) => ({
      ...session,
      messages: [
        ...session.messages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: trimmed,
          createdAt: Date.now(),
          tone: options?.tone || 'system',
          ...(options?.debugSections?.length ? { debugSections: options.debugSections } : {})
        }
      ]
    }));
  };

  const updateWeeklyReviewTemplateStage = (
    sessionId: string,
    stage: WeeklyReviewTemplateSessionMeta['stage'],
    pendingWriteIntent = false
  ) => {
    mutateSession(sessionId, (session) => ({
      ...session,
      ...(session.templateMeta
        ? {
          templateMeta: {
            ...session.templateMeta,
            stage,
            pendingWriteIntent
          }
        }
        : {})
    }));
  };

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
    setIsNewSessionDialogOpen(false);
    setIsWeeklyReviewWeekSelectionModalOpen(true);
  };

  const handleCloseWeeklyReviewTemplateSelection = () => {
    setIsWeeklyReviewWeekSelectionModalOpen(false);
  };

  const handleOpenWeeklyReviewDateInputModal = () => {
    setIsWeeklyReviewWeekSelectionModalOpen(false);
    setIsWeeklyReviewDateInputModalOpen(true);
  };

  const handleCloseWeeklyReviewDateInputModal = () => {
    setIsWeeklyReviewDateInputModalOpen(false);
  };

  const handleConfirmWeeklyReviewTemplateSelection = (value: string) => {
    const selection = weeklyReviewTemplateService.parseWeekSelectionInput(value, new Date());
    if (!selection) {
      return;
    }

    handleCloseWeeklyReviewTemplateSelection();
    handleCloseWeeklyReviewDateInputModal();
    setPendingWeeklyReviewTemplateSetup({ selection });
  };

  const handleCloseWeeklyReviewMethodSelection = () => {
    setPendingWeeklyReviewTemplateSetup(null);
  };

  const handleConfirmWeeklyReviewMethodSelection = (methodId: WeeklyReviewMethodId) => {
    if (!activeSession || !pendingWeeklyReviewTemplateSetup) {
      return;
    }

    const selection = pendingWeeklyReviewTemplateSetup.selection;
    const templateSession = createDefaultSession(activeSession.personaId, {
      title: weeklyReviewTemplateService.getSessionTitle(selection),
      templateMeta: weeklyReviewTemplateService.createSessionMeta(selection, methodId),
      messages: [{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: weeklyReviewTemplateService.getIntroMessage(selection, methodId),
        createdAt: Date.now(),
        tone: 'system'
      }]
    });

    setSessions((prev) => [templateSession, ...prev]);
    setActiveSessionId(templateSession.id);
    handleCloseNewSessionDialog();
    handleCloseWeeklyReviewMethodSelection();
    setIsHistoryPanelOpen(false);
    setInputText('');
  };

  const handleFillWriteWeeklyNarrativeCommand = () => {
    setInputText('写入 AI 叙事');
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
    setIsDreamViewerOpen(true);
  };

  const handleCloseDreamViewer = () => {
    resetDreamTopicUi();
    resetDreamEntryUi();
    setIsDreamViewerOpen(false);
  };

  const handleOpenDreamTopicComposer = (topic?: DreamTopic) => {
    setDreamTopicDrafts({
      title: topic?.title || '',
      note: topic?.note || ''
    });
    setEditingDreamTopicId(topic?.id || null);
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
      addToast('warning', '先写一个 Dream 领域标题再保存吧。');
      return;
    }

    if (
      dreamSnapshot.topics.some((topic) => (
        topic.id !== editingDreamTopicId
        && topic.title.trim().toLowerCase() === title.toLowerCase()
      ))
    ) {
      addToast('info', '这个 Dream 领域已经存在了。');
      return;
    }

    if (editingDreamTopicId) {
      dreamService.updateTopic(editingDreamTopicId, {
        title,
        note
      });
      addToast('success', '已更新 Dream 领域');
    } else {
      dreamService.createTopic({
        title,
        note
      });
      addToast('success', '已新增 Dream 领域');
    }

    refreshDreamSnapshot();
    resetDreamTopicUi();
  };

  const handleToggleDreamTopicDelete = (topicId: string) => {
    setDreamTopicDeleteTargetId((current) => (current === topicId ? null : topicId));
  };

  const handleToggleDreamEntryDelete = (entryId: string) => {
    setDreamEntryDeleteTargetId((current) => (current === entryId ? null : entryId));
    setEditingDreamEntryId((current) => (current === entryId ? null : current));
    setDreamEntryDrafts(DEFAULT_DREAM_ENTRY_DRAFTS);
  };

  const handleConfirmDreamTopicDelete = (topicId: string) => {
    dreamService.deleteTopic(topicId);
    refreshDreamSnapshot();
    setDreamTopicDeleteTargetId((current) => (current === topicId ? null : current));
    addToast('success', '已删除 Dream 领域');
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

  const handleOpenDreamRangeSelection = (sessionId: string) => {
    setDreamRangeSelectionState({ sessionId });
  };

  const handleCloseDreamRangeSelection = () => {
    setDreamRangeSelectionState(null);
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

    if (dreamRangeSelectionState) {
      handleCloseDreamRangeSelection();
      return true;
    }

    if (isDreamViewerOpen) {
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

    if (isWeeklyReviewWeekSelectionModalOpen) {
      handleCloseWeeklyReviewTemplateSelection();
      return true;
    }

    if (isWeeklyReviewDateInputModalOpen) {
      handleCloseWeeklyReviewDateInputModal();
      return true;
    }

    if (pendingWeeklyReviewTemplateSetup) {
      handleCloseWeeklyReviewMethodSelection();
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
    handleCloseDreamRangeSelection,
    handleCloseDreamViewer,
    handleCloseAssistantMemoryViewer,
    dreamRangeSelectionState,
    dreamEntryDeleteTargetId,
    editingDreamEntryId,
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
    isWeeklyReviewDateInputModalOpen,
    isWeeklyReviewWeekSelectionModalOpen,
    pendingWeeklyReviewTemplateSetup,
    dreamTopicDeleteTargetId,
    resetAssistantScheduledTaskUi,
    resetDreamEntryUi,
    resetDreamTopicUi,
    handleCloseNewSessionDialog,
    handleCloseWeeklyReviewDateInputModal,
    handleCloseWeeklyReviewMethodSelection,
    handleCloseWeeklyReviewTemplateSelection,
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

  const replacePendingWithResult = (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: {
      tone?: ChatTone;
      displayParts?: string[];
      debugSections?: AIChatDebugSection[];
      appliedActions?: AppliedChatAction[];
      memoryUpdates?: AIChatMemoryUpdateSection[];
      dreamUpdates?: AIChatDreamUpdateCard[];
      reminderUpdates?: string[];
      weeklyReviewWriteback?: AIChatWeeklyReviewWritebackResult;
      retryInput?: string;
      retrySourceUserMessageId?: string;
      dreamRetryRangeOptionId?: DreamRangeOptionId;
    }
  ) => {
    replaceMessage(sessionId, pendingMessageId, {
      id: pendingMessageId,
      role: 'assistant',
      content,
      ...(options?.displayParts?.length ? { displayParts: options.displayParts } : {}),
      createdAt: Date.now(),
      ...(options?.tone ? { tone: options.tone } : {}),
      ...(options?.debugSections && options.debugSections.length > 0 ? { debugSections: options.debugSections } : {}),
      ...(options?.appliedActions && options.appliedActions.length > 0 ? { appliedActions: options.appliedActions } : {}),
      ...(options?.memoryUpdates && options.memoryUpdates.length > 0 ? { memoryUpdates: options.memoryUpdates } : {}),
      ...(options?.dreamUpdates && options.dreamUpdates.length > 0 ? { dreamUpdates: options.dreamUpdates } : {}),
      ...(options?.reminderUpdates && options.reminderUpdates.length > 0 ? { reminderUpdates: options.reminderUpdates } : {}),
      ...(options?.weeklyReviewWriteback ? { weeklyReviewWriteback: options.weeklyReviewWriteback } : {}),
      ...(options?.retryInput ? { retryInput: options.retryInput } : {}),
      ...(options?.retrySourceUserMessageId ? { retrySourceUserMessageId: options.retrySourceUserMessageId } : {}),
      ...(options?.dreamRetryRangeOptionId ? { dreamRetryRangeOptionId: options.dreamRetryRangeOptionId } : {})
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
    content: string,
    output?: Pick<AssistantUnifiedTurnOutput, 'assistantReplyParts'>
  ): string[] | undefined => (
    buildAssistantDisplayParts(content, output?.assistantReplyParts)
  );

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
  ) => {
    const sessionId = session.id;
    const pendingMessageId = crypto.randomUUID();
    const now = Date.now();
    const sessionPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
    const conversationSummary = assistantContextBuilder.summarizeConversationTurns(
      conversationHistoryCache.get(session.id) || [],
      24
    );

    mutateSession(sessionId, (currentSession) => ({
      ...currentSession,
      messages: [
        ...currentSession.messages,
        {
          id: pendingMessageId,
          role: 'assistant',
          content: '我来整理成这周的 AI 叙事。',
          createdAt: now,
          tone: 'pending'
        }
      ]
    }));

    setInputText('');
    setIsLoading(true);
    setIsHistoryPanelOpen(false);
    setIsPersonaPanelOpen(false);

    const controller = new AbortController();
    activeRequestRef.current = {
      controller,
      sessionId,
      pendingMessageId
    };

    if (params.createdReview) {
      setWeeklyReviews((previousReviews) => {
        if (previousReviews.some((review) => review.id === params.weeklyReview.id)) {
          return previousReviews;
        }

        return [...previousReviews, params.weeklyReview];
      });
    }

    try {
      const { systemPrompt, userPrompt } = await weeklyReviewTemplateService.buildNarrativeWritebackPrompts({
        personaPrompt: buildPersonaPrompt(sessionPersona),
        weekDataText: params.weekDataText,
        conversationSummary,
        mergeMode: params.mergeMode,
        methodId: session.templateMeta?.methodId || 'systems'
      });

      const rawToolCallResponse = await aiService.generateNarrative(userPrompt, systemPrompt);

      if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
        return;
      }

      const toolCall = weeklyReviewTemplateService.parseNarrativeToolCallResponse(
        rawToolCallResponse,
        params.weeklyReview.weekStartDate,
        params.weeklyReview.weekEndDate,
        params.mergeMode
      );
      const narrative = weeklyReviewTemplateService.buildNarrativeFromToolCall(toolCall);

      setWeeklyReviews((previousReviews) => (
        weeklyReviewTemplateService.updateWeeklyReviewNarrative(
          previousReviews,
          params.weeklyReview.id,
          narrative
        )
      ));

      const parsedNarrative = parseNarrative(narrative, `周复盘 ${params.weeklyReview.weekStartDate}`);
      const writebackResultCard: AIChatWeeklyReviewWritebackResult = {
        weeklyReviewId: params.weeklyReview.id,
        weekStartDate: params.weeklyReview.weekStartDate,
        weekEndDate: params.weeklyReview.weekEndDate,
        title: parsedNarrative.title,
        preview: parsedNarrative.content,
        createdReview: params.createdReview,
        mergeMode: params.mergeMode
      };

      const successMessage = params.createdReview
        ? '已新建本周 Weekly Review，并写入 AI 叙事。'
        : '已覆盖写入这周的 AI 叙事。';

      replacePendingWithResult(sessionId, pendingMessageId, successMessage, {
        tone: 'system',
        weeklyReviewWriteback: writebackResultCard
      });
      updateWeeklyReviewTemplateStage(sessionId, 'ready');
      addToast('success', 'AI 叙事已写入周回顾');
    } catch (error) {
      const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

      if (isAbortError(error)) {
        if (isCurrentPendingRequest) {
          replacePendingWithResult(sessionId, pendingMessageId, '已停止这次写入。', {
            tone: 'system'
          });
        }
        return;
      }

      if (!isCurrentPendingRequest || controller.signal.aborted) {
        return;
      }

      replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
        tone: 'error'
      });
      updateWeeklyReviewTemplateStage(sessionId, 'ready');
    } finally {
      if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
        activeRequestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleWeeklyReviewNarrativeWritebackCommand = async (session: AIChatSession) => {
    if (session.templateMeta?.templateType !== 'weekly_review') {
      return;
    }

    const weekDataText = buildWeeklyReviewTemplateWeekDataText(session);
    if (!weekDataText) {
      addToast('error', '这段对话还没有可用的周复盘数据。');
      return;
    }

    const ensuredReview = weeklyReviewTemplateService.ensureWeeklyReview(
      weeklyReviews,
      reviewTemplates,
      session.templateMeta.weekStartDate,
      session.templateMeta.weekEndDate
    );

    await runWeeklyReviewNarrativeWriteback(session, {
      weeklyReview: ensuredReview.weeklyReview,
      weekDataText,
      mergeMode: ensuredReview.weeklyReview.narrative?.trim() ? 'overwrite' : 'create',
      createdReview: ensuredReview.created
    });
  };

  const handleDreamCommand = async (
    session: AIChatSession,
    rangeOptionId: DreamRangeOptionId,
    userMessageId?: string,
    options?: {
      replaceMessageId?: string;
      retrySourceUserMessageId?: string;
    }
  ) => {
    const sessionId = session.id;
    const retryMessageId = options?.replaceMessageId;
    const canRetryInPlace = Boolean(
      retryMessageId && session.messages.some((message) => message.id === retryMessageId)
    );
    const pendingMessageId = canRetryInPlace && retryMessageId
      ? retryMessageId
      : crypto.randomUUID();
    const now = Date.now();
    const historyBeforeCurrent = canRetryInPlace
      ? buildRetryConversationHistory(sessionId, options?.retrySourceUserMessageId)
      : (conversationHistoryCache.get(sessionId) || []);
    const nextUserMessageId = options?.retrySourceUserMessageId || userMessageId || crypto.randomUUID();
    const dreamRange = resolveDreamRange(rangeOptionId, new Date(now));
    const dreamUserMessage = `dream · ${dreamRange.label}`;

    if (canRetryInPlace) {
      mutateSession(sessionId, (currentSession) => ({
        ...currentSession,
        messages: currentSession.messages.map((message) => (
          message.id === pendingMessageId
            ? {
              id: pendingMessageId,
              role: 'assistant',
              content: `我先按${dreamRange.label}整理一下 Dream。`,
              createdAt: now,
              tone: 'pending'
            }
            : message
        ))
      }));
    } else {
      mutateSession(sessionId, (currentSession) => ({
        ...currentSession,
        messages: [
          ...currentSession.messages,
          {
            id: nextUserMessageId,
            role: 'user',
            content: dreamUserMessage,
            createdAt: now
          },
          {
            id: pendingMessageId,
            role: 'assistant',
            content: `我先按${dreamRange.label}整理一下 Dream。`,
            createdAt: now + 1,
            tone: 'pending'
          }
        ]
      }));
    }

    setInputText('');
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
      const currentTurnDate = new Date(now);
      const reminderSummary = buildForegroundAssistantReminderSummary();
      const stateContext = {
        ...assistantContextBuilder.buildStateContext({
          ...buildAssistantCurrentTimeSnapshot(currentTurnDate),
          defaultDate: dreamRange.endDate,
          logs: logs.filter((log) => {
            const logDate = formatDateKey(new Date(log.startTime));
            return logDate >= dreamRange.startDate && logDate <= dreamRange.endDate;
          }),
          categories,
          todos,
          activeSessions,
          timelineReviewSummary: buildAssistantTimelineSummary(),
          ...(reminderSummary ? { reminderSummary } : {})
        }),
        dreamRangeLabel: dreamRange.label,
        dreamRangeStart: dreamRange.startDate,
        dreamRangeEnd: dreamRange.endDate
      };
      const dictionaryContext = buildDreamRangeDictionaryContext(dreamRange.startDate, dreamRange.endDate);
      const dictionaryDigestText = assistantContextBuilder.buildDictionaryDigest(dictionaryContext);
      const conversationSummary = assistantContextBuilder.summarizeConversationTurns(historyBeforeCurrent, 24);
      const dreamResult = await dreamService.runDreamWorkflow({
        rangeLabel: dreamRange.label,
        rangeStartDate: dreamRange.startDate,
        rangeEndDate: dreamRange.endDate,
        currentDateTime: formatAssistantLocalDateTime(currentTurnDate),
        currentDate: dreamRange.endDate,
        conversationSummary,
        stateContextText: JSON.stringify(stateContext, null, 2),
        dictionaryDigestText
      });

      if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
        return;
      }

      if (
        (dreamResult.patch.createdEntries && dreamResult.patch.createdEntries.length > 0)
        || (dreamResult.patch.updatedEntries && dreamResult.patch.updatedEntries.length > 0)
        || (dreamResult.patch.deletedEntryIds && dreamResult.patch.deletedEntryIds.length > 0)
      ) {
        dreamService.applyPatch(dreamResult.patch);
        refreshDreamSnapshot();
        const firstUpdatedTopicId = dreamResult.cards[0]?.topicId;
        if (firstUpdatedTopicId) {
          setSelectedDreamTopicId(firstUpdatedTopicId);
        }
      }

      replacePendingWithResult(sessionId, pendingMessageId, dreamResult.assistantReply, {
        ...(debugMode && dreamResult.debug
          ? {
            debugSections: [{
              label: 'Dream 整理',
              exchange: dreamResult.debug
            }]
          }
          : {}),
        dreamUpdates: dreamResult.cards
      });
    } catch (error) {
      const isCurrentPendingRequest = activeRequestRef.current?.pendingMessageId === pendingMessageId;

      if (isAbortError(error)) {
        if (isCurrentPendingRequest) {
          replacePendingWithResult(sessionId, pendingMessageId, '已停止这次 Dream 整理。', {
            tone: 'system'
          });
        }
        return;
      }

      if (!isCurrentPendingRequest || controller.signal.aborted) {
        return;
      }

      replacePendingWithResult(sessionId, pendingMessageId, getRetryableAIErrorMessage(error), {
        tone: 'error',
        retryInput: 'dream',
        retrySourceUserMessageId: nextUserMessageId,
        dreamRetryRangeOptionId: rangeOptionId,
        debugSections: getErrorDebugSections(error, 'Dream 整理', debugMode)
      });
    } finally {
      if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
        activeRequestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleSend = async (overrideText?: string, options?: ForegroundSendOptions) => {
    const trimmedText = (overrideText ?? inputText).trim();
    if (!trimmedText || isLoading || !activeSession) {
      return;
    }

    if (handleDebugCommand(trimmedText, options)) {
      return;
    }

    if (trimmedText === 'dream' && !options?.replaceMessageId) {
      setInputText('');
      handleOpenDreamRangeSelection(activeSession.id);
      return;
    }

    const isWeeklyReviewTemplateSession = activeSession.templateMeta?.templateType === 'weekly_review';
    if (isWeeklyReviewTemplateSession && weeklyReviewTemplateService.isWriteNarrativeCommand(trimmedText)) {
      await handleWeeklyReviewNarrativeWritebackCommand(activeSession);
      return;
    }

    const sessionId = activeSession.id;
    const retryMessageId = options?.replaceMessageId;
    const canRetryInPlace = Boolean(
      retryMessageId && activeSession.messages.some((message) => message.id === retryMessageId)
    );
    const userMessageId = options?.retrySourceUserMessageId || crypto.randomUUID();
    const pendingMessageId = canRetryInPlace && retryMessageId
      ? retryMessageId
      : crypto.randomUUID();
    const now = Date.now();
    const historyBeforeCurrent = canRetryInPlace
      ? buildRetryConversationHistory(sessionId, options?.retrySourceUserMessageId)
      : (conversationHistoryCache.get(sessionId) || []);
    const shouldRenameTitle = !isWeeklyReviewTemplateSession
      && !canRetryInPlace
      && !activeSession.messages.some((message) => message.role === 'user');

    if (canRetryInPlace) {
      mutateSession(sessionId, (session) => ({
        ...session,
        messages: session.messages.map((message) => (
          message.id === pendingMessageId
            ? {
              id: pendingMessageId,
              role: 'assistant',
              content: '我先想一下。',
              createdAt: now,
              tone: 'pending'
            }
            : message
        ))
      }));
    } else {
      mutateSession(sessionId, (session) => ({
        ...session,
        title: shouldRenameTitle ? createSessionTitleFromUserMessage(trimmedText) : session.title,
        messages: [
          ...session.messages,
          {
            id: userMessageId,
            role: 'user',
            content: trimmedText,
            createdAt: now
          },
          {
            id: pendingMessageId,
            role: 'assistant',
            content: '我先想一下。',
            createdAt: now + 1,
            tone: 'pending'
          }
        ]
      }));
    }

    if (!canRetryInPlace) {
      void AssistantAgent.notifyUserTurn({
        text: trimmedText,
        at: new Date(now).toISOString()
      }).catch((error) => {
        console.error('[AIBackfillChatModal] Failed to notify assistant agent about user turn', error);
      });
    }

    if (!canRetryInPlace) {
      setInputText('');
    }
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

        const templatePrompt = await weeklyReviewTemplateService.buildChatPrompts({
          personaPrompt: buildPersonaPrompt(activePersona),
          weekDataText,
          userMessage: trimmedText,
          methodId: activeSession.templateMeta?.methodId || 'systems'
        });
        const templateTurnResult = await aiService.requestAssistantUnifiedTurnWithDebug({
          mode: 'foreground',
          systemPrompt: templatePrompt.systemPrompt,
          userPrompt: templatePrompt.userPrompt,
          conversationHistory: historyBeforeCurrent,
          cacheHint: {
            keySeed: `weekly_review_chat:${activeSession.templateMeta?.weekStartDate}:${activeSession.templateMeta?.weekEndDate}:${activeSession.templateMeta?.methodId || 'systems'}`,
            scope: 'weekly_review_template'
          }
        }, {
          signal: controller.signal
        });

        if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
          return;
        }

        const output = templateTurnResult.output;
        const templateContent = (output.assistantReply || '').trim()
          || (output.outcome === 'clarify'
            ? '这块我还差一点关键信息，你再补一句我就能继续。'
            : '我在。');
        const displayParts = resolveAssistantDisplayParts(templateContent, output);

        replacePendingWithResult(sessionId, pendingMessageId, templateContent, {
          ...(displayParts?.length ? { displayParts } : {}),
          ...(debugMode
            ? {
              debugSections: [{
                label: '周复盘模板对话',
                exchange: templateTurnResult.debug
              }]
            }
            : {})
        });
        return;
      }

      const currentTurnDate = new Date();
      const debugSections: AIChatDebugSection[] = [];

      const [basePrompt, foregroundModePrompt] = await Promise.all([
        assistantPromptService.getAssistantBasePrompt(),
        assistantPromptService.getForegroundModePrompt()
      ]);

      const conversationContext = assistantContextBuilder.buildConversationContext(historyBeforeCurrent);
      const stateContext = buildAssistantStateContext(
        currentTurnDate,
        buildForegroundAssistantReminderSummary()
      );
      const dictionaryContext = buildAssistantDictionaryContext();
      const dreamContext = buildDreamContext(trimmedText);

      const unifiedTurnResult = await assistantTurnService.runUnifiedTurn({
        mode: 'foreground',
        trigger: {
          type: 'user_message',
          source: 'user',
          text: trimmedText,
          createdAt: formatAssistantLocalDateTime(new Date(now))
        },
        promptLayers: {
          basePrompt,
          modePrompt: foregroundModePrompt,
          userPersonaPrompt: buildPersonaPrompt(activePersona)
        },
        memoryEnabled: assistantAgentConfig.longTermMemoryEnabled,
        memory: buildForegroundAssistantMemory(),
        conversation: conversationContext,
        stateContext,
        dictionaryContext,
        ...(dreamContext ? { dreamContext } : {})
      }, {
        signal: controller.signal
      });

      if (controller.signal.aborted || activeRequestRef.current?.pendingMessageId !== pendingMessageId) {
        return;
      }

      if (debugMode) {
        debugSections.push({
          label: '统一单轮调用',
          exchange: unifiedTurnResult.debug
        });
      }

      const output = unifiedTurnResult.output;
      const toolCalls = output.toolCalls || [];
      const unifiedAppliedActions = toolCalls.length > 0
        ? applyUnifiedToolCalls(toolCalls, trimmedText)
        : [];
      const unifiedSuccessCount = unifiedAppliedActions.filter((action) => action.status === 'applied').length;
      const successCount = unifiedSuccessCount;

      const reminderUpdates = applyUnifiedReminders(output);

      const memoryUpdates = assistantAgentConfig.longTermMemoryEnabled && output.memoryAction === 'update_memory'
        ? applyAssistantMemoryPatch(output.memoryPatch)
        : [];

      const rawUnifiedContent = (output.assistantReply || '').trim()
        || (output.outcome === 'clarify'
          ? '这次还差一点关键信息，你再补一句我就能继续。'
          : (unifiedSuccessCount > 0
            ? `我先帮你处理好了 ${successCount} 项。`
            : ((output.reminders || []).length > 0
              ? '我记下来了，到时候会提醒你。'
              : '我在。')));
      const unifiedContent = resolveForegroundAssistantReply(rawUnifiedContent, trimmedText, unifiedAppliedActions);
      const displayParts = resolveAssistantDisplayParts(
        unifiedContent,
        unifiedContent === rawUnifiedContent ? output : undefined
      );

      replacePendingWithResult(sessionId, pendingMessageId, unifiedContent, {
        ...(displayParts?.length ? { displayParts } : {}),
        debugSections,
        ...(unifiedAppliedActions.length > 0 ? { appliedActions: unifiedAppliedActions } : {}),
        ...(memoryUpdates.length > 0 ? { memoryUpdates } : {}),
        ...(reminderUpdates.length > 0 ? { reminderUpdates } : {})
      });
      if (unifiedAppliedActions.length > 0 || reminderUpdates.length > 0) {
        notifyAssistantTaskStateChanged();
      }
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

    if (message.retryInput === 'dream' && message.dreamRetryRangeOptionId && activeSession) {
      void handleDreamCommand(
        activeSession,
        message.dreamRetryRangeOptionId,
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

  const renderLogAction = (messageId: string, action: AppliedCreateLogAction) => {
    const liveLog = action.snapshot.logId
      ? logs.find((log) => log.id === action.snapshot.logId)
      : undefined;
    const liveCategory = liveLog
      ? categories.find((category) => category.id === liveLog.categoryId)
      : categories.find((category) => category.id === action.snapshot.categoryId);
    const liveActivity = liveLog
      ? liveCategory?.activities.find((activity) => activity.id === liveLog.activityId)
      : liveCategory?.activities.find((activity) => activity.id === action.snapshot.activityId);
    const liveLinkedTodo = liveLog?.linkedTodoId
      ? todos.find((todo) => todo.id === liveLog.linkedTodoId)
      : undefined;
    const categoryActivityLabel = dedupeStringArray([
      liveCategory?.name || action.snapshot.categoryName,
      liveActivity?.name || action.snapshot.activityName
    ]).join(' / ');
    const primaryText = action.snapshot.description.trim() || liveActivity?.name || action.snapshot.activityName;

    return (
      <div
        key={action.actionId}
        className={`border-l-2 pl-3 pr-1 py-1 ${action.status === 'undone' ? 'opacity-70' : ''}`}
        style={{
          borderColor: action.status === 'failed'
            ? AI_CHAT_THEME.dangerBorder
            : action.status === 'undone'
              ? AI_CHAT_THEME.undoneBorder
              : AI_CHAT_THEME.activeBorder
        }}
      >
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <span className="pt-0.5 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
              {formatActionDate(action.snapshot.startTime)}
            </span>
            <span
              className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px]"
              style={{
                color: AI_CHAT_THEME.textSecondary,
                borderColor: AI_CHAT_THEME.chipBorder,
                backgroundColor: AI_CHAT_THEME.chipBg
              }}
            >
              {formatTimeRange(action.snapshot.startTime, action.snapshot.endTime)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="mt-1 font-serif text-[1rem] leading-6" style={{ color: AI_CHAT_THEME.textPrimary }}>
              {primaryText}
            </p>
          </div>

          <span
            className="hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={
              action.status === 'failed'
                ? {
                    borderColor: AI_CHAT_THEME.dangerBorder,
                    backgroundColor: AI_CHAT_THEME.dangerBg,
                    color: AI_CHAT_THEME.dangerText
                  }
                : action.status === 'undone'
                  ? {
                      borderColor: AI_CHAT_THEME.undoneBorder,
                      backgroundColor: AI_CHAT_THEME.undoneBg,
                      color: AI_CHAT_THEME.undoneText
                    }
                  : {
                      borderColor: AI_CHAT_THEME.successBorder,
                      backgroundColor: AI_CHAT_THEME.successBg,
                      color: AI_CHAT_THEME.successText
                    }
            }
          >
            {action.status === 'failed' ? '失败' : action.status === 'undone' ? '已撤销' : '已应用'}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
          <span className="inline-flex items-center gap-1">
            <span className="font-bold">#</span>
            <span>{categoryActivityLabel}</span>
          </span>

          {action.snapshot.scopeNames.map((scopeName) => (
            <span key={`${action.actionId}-${scopeName}`} className="inline-flex items-center gap-1">
              <span className="font-bold">%</span>
              <span>{scopeName}</span>
            </span>
          ))}

          {(liveLinkedTodo?.title || action.snapshot.linkedTodoTitle) && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">@</span>
              <span>{liveLinkedTodo?.title || action.snapshot.linkedTodoTitle}</span>
            </span>
          )}
        </div>

        {action.kind === 'create_subtask' && action.snapshot.parentTodoTitle && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">↳</span>
              <span>{action.snapshot.parentTodoTitle}</span>
            </span>
          </div>
        )}

        {action.errorMessage && (
          <p className="mt-2 text-xs" style={{ color: AI_CHAT_THEME.dangerText }}>{action.errorMessage}</p>
        )}

        <div className="mt-2.5 flex justify-end gap-2">
          <button
            onClick={() => handleOpenLogEditor(action.snapshot.logId)}
            disabled={!liveLog || action.status !== 'applied'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: AI_CHAT_THEME.chipBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textSecondary
            }}
            title="编辑"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => handleUndoLogAction(messageId, action)}
            disabled={action.status !== 'applied'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: AI_CHAT_THEME.chipBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textSecondary
            }}
            title="撤销"
          >
            <Undo2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  const renderTodoAction = (messageId: string, action: AppliedCreateTodoAction | AppliedCreateSubtaskAction) => {
    const liveTodo = action.snapshot.todoId
      ? todos.find((todo) => todo.id === action.snapshot.todoId)
      : undefined;
    const liveParentTodo = action.kind === 'create_subtask' && liveTodo?.parentTodoId
      ? todos.find((todo) => todo.id === liveTodo.parentTodoId)
      : undefined;
    const resolvedTodoCategoryName = todoCategories.find((category) => category.id === (liveTodo?.categoryId || action.snapshot.categoryId))?.name
      || action.snapshot.categoryName;
    const resolvedTodoAtLabel = action.kind === 'create_subtask'
      ? [resolvedTodoCategoryName, liveParentTodo?.title || action.snapshot.parentTodoTitle].filter(Boolean).join(' / ')
      : resolvedTodoCategoryName;
    const resolvedLinkedCategory = (
      categories.find((category) => category.id === (liveTodo?.linkedCategoryId || action.snapshot.linkedCategoryId))
      || getActivityCategory(liveTodo?.linkedActivityId || action.snapshot.linkedActivityId)
    );
    const resolvedLinkedActivity = getActivityById(liveTodo?.linkedActivityId || action.snapshot.linkedActivityId);
    const linkedTagLabel = dedupeStringArray([
      resolvedLinkedCategory?.name || action.snapshot.linkedCategoryName,
      resolvedLinkedActivity?.name || action.snapshot.linkedActivityName
    ]).join(' / ');
    const resolvedScopeIds = dedupeStringArray([
      ...(liveTodo?.defaultScopeIds || action.snapshot.defaultScopeIds)
    ]);
    const resolvedScopeNames = resolvedScopeIds.length > 0
      ? (() => {
        const names = getScopeNames(resolvedScopeIds);
        return names.length > 0 ? names : action.snapshot.defaultScopeNames;
      })()
      : action.snapshot.defaultScopeNames;

    return (
      <div
        key={action.actionId}
        className={`border-l-2 pl-3 pr-1 py-1 ${action.status === 'undone' ? 'opacity-70' : ''}`}
        style={{
          borderColor: action.status === 'failed'
            ? AI_CHAT_THEME.dangerBorder
            : action.status === 'undone'
              ? AI_CHAT_THEME.undoneBorder
              : AI_CHAT_THEME.activeBorder
        }}
      >
        <div className="min-w-0">
          <div className="min-w-0">
            <p className="font-serif text-[1rem] leading-6" style={{ color: AI_CHAT_THEME.textPrimary }}>
              {liveTodo?.title || action.snapshot.title}
            </p>
            {action.snapshot.note && (
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: AI_CHAT_THEME.textSecondary }}>
                {action.snapshot.note}
              </p>
            )}
          </div>

          <span
            className="hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={
              action.status === 'failed'
                ? {
                    borderColor: AI_CHAT_THEME.dangerBorder,
                    backgroundColor: AI_CHAT_THEME.dangerBg,
                    color: AI_CHAT_THEME.dangerText
                  }
                : action.status === 'undone'
                  ? {
                      borderColor: AI_CHAT_THEME.undoneBorder,
                      backgroundColor: AI_CHAT_THEME.undoneBg,
                      color: AI_CHAT_THEME.undoneText
                    }
                  : {
                      borderColor: AI_CHAT_THEME.successBorder,
                      backgroundColor: AI_CHAT_THEME.successBg,
                      color: AI_CHAT_THEME.successText
                    }
            }
          >
            {action.status === 'failed' ? '失败' : action.status === 'undone' ? '已撤销' : '已创建'}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
          {resolvedTodoAtLabel && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">@</span>
              <span>{resolvedTodoAtLabel}</span>
            </span>
          )}

          {linkedTagLabel && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">#</span>
              <span>{linkedTagLabel}</span>
            </span>
          )}

          {resolvedScopeNames.map((scopeName) => (
            <span key={`${action.actionId}-${scopeName}`} className="inline-flex items-center gap-1">
              <span className="font-bold">%</span>
              <span>{scopeName}</span>
            </span>
          ))}

          {action.snapshot.scheduledDate && (
            <span className="inline-flex items-center">
              安排 {action.snapshot.scheduledDate}
            </span>
          )}

          {action.snapshot.deadlineDate && (
            <span className="inline-flex items-center">
              截止 {action.snapshot.deadlineDate}
            </span>
          )}

          {action.snapshot.recurrenceRule && (
            <span className="inline-flex items-center">
              循环 {action.snapshot.recurrenceRule.frequency}
            </span>
          )}
        </div>

        {action.errorMessage && (
          <p className="mt-2 text-xs" style={{ color: AI_CHAT_THEME.dangerText }}>{action.errorMessage}</p>
        )}

        <div className="mt-2.5 flex justify-end gap-2">
          <button
            onClick={() => handleOpenTodoDetail(action.snapshot.todoId)}
            disabled={!action.snapshot.todoId || action.status !== 'applied'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: AI_CHAT_THEME.chipBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textSecondary
            }}
            title="详情"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => (
              action.kind === 'create_subtask'
                ? handleUndoCreateSubtaskAction(messageId, action)
                : handleUndoTodoAction(messageId, action)
            )}
            disabled={action.status !== 'applied'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: AI_CHAT_THEME.chipBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textSecondary
            }}
            title="撤销"
          >
            <Undo2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  const renderUpdateTodoAction = (messageId: string, action: AppliedUpdateTodoAction) => {
    const liveTodo = action.snapshot.todoId
      ? todos.find((todo) => todo.id === action.snapshot.todoId)
      : undefined;
    const displayTodo = liveTodo || action.snapshot.nextTodo || action.snapshot.previousTodo;
    const linkedCategory = displayTodo?.linkedCategoryId
      ? categories.find((category) => category.id === displayTodo.linkedCategoryId)
      : undefined;
    const linkedActivity = displayTodo?.linkedActivityId
      ? linkedCategory?.activities.find((activity) => activity.id === displayTodo.linkedActivityId) || getActivityById(displayTodo.linkedActivityId)
      : undefined;
    const linkedTagLabel = dedupeStringArray([
      linkedCategory?.name,
      linkedActivity?.name
    ]).join(' / ');
    const scopeNames = getScopeNames(displayTodo?.defaultScopeIds || []);
    const todoCategoryName = displayTodo?.categoryId
      ? todoCategories.find((category) => category.id === displayTodo.categoryId)?.name
      : '';

    return (
      <div
        key={action.actionId}
        className={`border-l-2 pl-3 pr-1 py-1 ${action.status === 'undone' ? 'opacity-70' : ''}`}
        style={{
          borderColor: action.status === 'failed'
            ? AI_CHAT_THEME.dangerBorder
            : action.status === 'undone'
              ? AI_CHAT_THEME.undoneBorder
              : AI_CHAT_THEME.activeBorder
        }}
      >
        <div className="min-w-0">
          <p className="font-serif text-[1rem] leading-6" style={{ color: AI_CHAT_THEME.textPrimary }}>
            {displayTodo?.title || action.snapshot.previousTodo?.title || '未找到待办'}
          </p>
          {displayTodo?.note && (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: AI_CHAT_THEME.textSecondary }}>
              {displayTodo.note}
            </p>
          )}
        </div>

        {displayTodo && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
            {todoCategoryName && (
              <span className="inline-flex items-center gap-1">
                <span className="font-bold">@</span>
                <span>{todoCategoryName}</span>
              </span>
            )}
            {linkedTagLabel && (
              <span className="inline-flex items-center gap-1">
                <span className="font-bold">#</span>
                <span>{linkedTagLabel}</span>
              </span>
            )}
            {scopeNames.map((scopeName) => (
              <span key={`${action.actionId}-scope-${scopeName}`} className="inline-flex items-center gap-1">
                <span className="font-bold">%</span>
                <span>{scopeName}</span>
              </span>
            ))}
            {displayTodo.pin && <span className="inline-flex items-center">Pin</span>}
            {displayTodo.scheduledDate && <span className="inline-flex items-center">安排 {displayTodo.scheduledDate}</span>}
            {displayTodo.deadlineDate && <span className="inline-flex items-center">截止 {displayTodo.deadlineDate}</span>}
            {displayTodo.isCompleted && <span className="inline-flex items-center">已完成</span>}
          </div>
        )}

        {action.errorMessage && (
          <p className="mt-2 text-xs" style={{ color: AI_CHAT_THEME.dangerText }}>{action.errorMessage}</p>
        )}

        <div className="mt-2.5 flex justify-end gap-2">
          <button
            onClick={() => handleOpenTodoDetail(action.snapshot.todoId)}
            disabled={!action.snapshot.todoId || action.status !== 'applied'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: AI_CHAT_THEME.chipBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textSecondary
            }}
            title="详情"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => handleUndoUpdateTodoAction(messageId, action)}
            disabled={action.status !== 'applied'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: AI_CHAT_THEME.chipBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textSecondary
            }}
            title="撤销"
          >
            <Undo2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  const renderEditLogAction = (messageId: string, action: AppliedEditLogAction) => {
    const liveLog = action.snapshot.logId
      ? logs.find((log) => log.id === action.snapshot.logId)
      : undefined;
    const displayLog = liveLog || action.snapshot.nextLog || action.snapshot.previousLog;
    const category = displayLog
      ? categories.find((item) => item.id === displayLog.categoryId)
      : undefined;
    const activity = displayLog
      ? category?.activities.find((item) => item.id === displayLog.activityId)
        || categories.flatMap((item) => item.activities).find((item) => item.id === displayLog.activityId)
      : undefined;
    const linkedTodo = displayLog?.linkedTodoId
      ? todos.find((todo) => todo.id === displayLog.linkedTodoId)
      : undefined;
    const scopeNames = getScopeNames(displayLog?.scopeIds || []);

    return (
      <div
        key={action.actionId}
        className={`border-l-2 pl-3 pr-1 py-1 ${action.status === 'undone' ? 'opacity-70' : ''}`}
        style={{
          borderColor: action.status === 'failed'
            ? AI_CHAT_THEME.dangerBorder
            : action.status === 'undone'
              ? AI_CHAT_THEME.undoneBorder
              : AI_CHAT_THEME.activeBorder
        }}
      >
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <span className="pt-0.5 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
              {displayLog ? formatActionDate(displayLog.startTime) : ''}
            </span>
            <span
              className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px]"
              style={{
                color: AI_CHAT_THEME.textSecondary,
                borderColor: AI_CHAT_THEME.chipBorder,
                backgroundColor: AI_CHAT_THEME.chipBg
              }}
            >
              {displayLog ? formatTimeRange(displayLog.startTime, displayLog.endTime) : ''}
            </span>
          </div>
          <p className="mt-1 font-serif text-[1rem] leading-6" style={{ color: AI_CHAT_THEME.textPrimary }}>
            {displayLog?.note?.trim() || activity?.name || '已修改记录'}
          </p>
        </div>

        {displayLog && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">#</span>
              <span>{dedupeStringArray([category?.name, activity?.name]).join(' / ')}</span>
            </span>
            {scopeNames.map((scopeName) => (
              <span key={`${action.actionId}-log-scope-${scopeName}`} className="inline-flex items-center gap-1">
                <span className="font-bold">%</span>
                <span>{scopeName}</span>
              </span>
            ))}
            {linkedTodo?.title && (
              <span className="inline-flex items-center gap-1">
                <span className="font-bold">@</span>
                <span>{linkedTodo.title}</span>
              </span>
            )}
          </div>
        )}

        {action.errorMessage && (
          <p className="mt-2 text-xs" style={{ color: AI_CHAT_THEME.dangerText }}>{action.errorMessage}</p>
        )}

        <div className="mt-2.5 flex justify-end gap-2">
          <button
            onClick={() => handleOpenLogEditor(action.snapshot.logId)}
            disabled={!action.snapshot.logId || action.status !== 'applied'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: AI_CHAT_THEME.chipBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textSecondary
            }}
            title="编辑"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => handleUndoEditLogAction(messageId, action)}
            disabled={action.status !== 'applied'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: AI_CHAT_THEME.chipBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textSecondary
            }}
            title="撤销"
          >
            <Undo2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  const renderAppliedAction = (messageId: string, action: AppliedChatAction) => (
    action.kind === 'create_log'
      ? renderLogAction(messageId, action)
      : action.kind === 'edit_log'
        ? renderEditLogAction(messageId, action)
        : action.kind === 'update_todo'
          ? renderUpdateTodoAction(messageId, action)
          : renderTodoAction(messageId, action)
  );

  const renderWeeklyReviewWritebackResult = (result: AIChatWeeklyReviewWritebackResult) => (
    <div
      className="border-l-2 pl-3 pr-1 py-1"
      style={{ borderColor: AI_CHAT_THEME.activeBorder }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => handleOpenWeeklyReviewNarrative(result.weekStartDate, result.weekEndDate)}
            className="block w-full truncate text-left font-serif text-[1rem] leading-6 transition-colors hover:opacity-80"
            style={{ color: AI_CHAT_THEME.textPrimary }}
            title="打开对应周回顾的 AI 叙事"
          >
            {result.title || 'AI 叙事'}
          </button>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: AI_CHAT_THEME.textSecondary }}>
            {result.preview || '点击查看完整叙事'}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
        <span>{`${result.weekStartDate} ~ ${result.weekEndDate}`}</span>
        <span>{result.createdReview ? '已新建周回顾' : '已写入周回顾'}</span>
        <span>{result.mergeMode === 'overwrite' ? '覆盖写入' : '首次写入'}</span>
      </div>

      <div className="mt-2.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => handleOpenWeeklyReviewNarrative(result.weekStartDate, result.weekEndDate)}
          className="inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs transition-colors"
          style={{
            borderColor: AI_CHAT_THEME.chipBorder,
            backgroundColor: AI_CHAT_THEME.inputBg,
            color: AI_CHAT_THEME.textSecondary
          }}
          title="打开周回顾叙事"
        >
          打开
        </button>
      </div>
    </div>
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
      requirement: '开启后台轮询'
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

  const renderMessageBubble = (message: AIChatMessage, index: number, messages: AIChatMessage[]) => {
    const isUser = message.role === 'user';
    const tone = message.tone || 'normal';
    const displayParts = message.displayParts && message.displayParts.length > 0
      ? message.displayParts
      : [message.content];
    const isAnimatedAssistantMessage = !isUser && tone === 'normal' && displayParts.length > 1;
    const visibleDisplayPartCount = isAnimatedAssistantMessage
      ? Math.max(1, Math.min(revealedAssistantPartCounts[message.id] || 1, displayParts.length))
      : displayParts.length;
    const visibleDisplayParts = displayParts.slice(0, visibleDisplayPartCount);
    const allDisplayPartsRevealed = visibleDisplayPartCount >= displayParts.length;
    const isMemoryUpdatesExpanded = expandedMemoryUpdateMessageIds.has(message.id);
    const isDreamUpdatesExpanded = expandedDreamUpdateMessageIds.has(message.id);
    const isReminderUpdatesExpanded = expandedReminderUpdateMessageIds.has(message.id);
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !previousMessage || previousMessage.role !== message.role;

    let bubbleStyle = {
      borderColor: AI_CHAT_THEME.panelBorder,
      backgroundColor: AI_CHAT_THEME.panelBg,
      color: AI_CHAT_THEME.textPrimary,
      boxShadow: `0 0 0 1px ${accentMix(8, 'rgba(0,0,0,0.02)')}`
    };
    if (isUser) {
      bubbleStyle = {
        borderColor: AI_CHAT_THEME.activeBorder,
        backgroundColor: AI_CHAT_THEME.activeBg,
        color: AI_CHAT_THEME.textPrimary,
        boxShadow: `0 0 0 1px ${accentMix(10, 'rgba(0,0,0,0.03)')}`
      };
    } else if (tone === 'system') {
      bubbleStyle = {
        borderColor: AI_CHAT_THEME.panelBorder,
        backgroundColor: AI_CHAT_THEME.inputBg,
        color: AI_CHAT_THEME.textSecondary,
        boxShadow: `0 0 0 1px ${accentMix(7, 'rgba(0,0,0,0.02)')}`
      };
    } else if (tone === 'error') {
      bubbleStyle = {
        borderColor: AI_CHAT_THEME.dangerBorder,
        backgroundColor: AI_CHAT_THEME.dangerBg,
        color: AI_CHAT_THEME.dangerText,
        boxShadow: '0 0 0 1px rgba(157,84,77,0.08)'
      };
    } else if (tone === 'pending') {
      bubbleStyle = {
        borderColor: AI_CHAT_THEME.pendingBorder,
        backgroundColor: AI_CHAT_THEME.pendingBg,
        color: AI_CHAT_THEME.textMuted,
        boxShadow: `0 0 0 1px ${accentMix(6, 'rgba(0,0,0,0.02)')}`
      };
    }

    const avatarStyle = isUser
      ? {
          borderColor: AI_CHAT_THEME.activeBorder,
          backgroundColor: AI_CHAT_THEME.activeBg,
          color: AI_CHAT_THEME.textSecondary
        }
      : tone === 'error'
        ? {
            borderColor: AI_CHAT_THEME.dangerBorder,
            backgroundColor: AI_CHAT_THEME.dangerBg,
            color: AI_CHAT_THEME.dangerText
          }
        : tone === 'system'
          ? {
              borderColor: AI_CHAT_THEME.panelBorder,
              backgroundColor: AI_CHAT_THEME.inputBg,
              color: AI_CHAT_THEME.textMuted
            }
          : {
              borderColor: AI_CHAT_THEME.panelBorder,
              backgroundColor: AI_CHAT_THEME.avatarBg,
              color: AI_CHAT_THEME.textSecondary
            };
    const messageDebugViewer = resolveMessageDebugViewer(message);

    return (
      <div
        key={message.id}
        ref={(node) => {
          if (node) {
            messageElementRefs.current.set(message.id, node);
            return;
          }

          messageElementRefs.current.delete(message.id);
        }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex w-full max-w-[96%] items-start gap-2.5 sm:max-w-[92%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
          <div className="w-8 shrink-0 pt-0.5">
            {showAvatar ? (
              <div
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-[0.75rem] border"
                style={avatarStyle}
              >
                {isUser ? (
                  <UserAvatar profile={userProfile} iconClassName="text-sm" />
                ) : (
                  <div className="h-full w-full overflow-hidden rounded-[0.75rem]">
                    <PersonaAvatar persona={activePersona} className="rounded-[0.75rem]" iconClassName="text-sm" />
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            {visibleDisplayParts.map((part, index) => (
              <RevealingMessageBubble
                key={`${message.id}-part-${index}`}
                className={`rounded-[0.95rem] border px-4 py-3 ${isUser ? 'ml-auto' : ''}`}
                style={bubbleStyle}
                revealMode={isAnimatedAssistantMessage ? 'assistantStaggered' : 'default'}
                partIndex={index}
                partCount={displayParts.length}
              >
                <div className="flex items-start gap-2 text-left">
                  {tone === 'pending' && index === 0 && (
                    <Loader2 size={15} className="mt-1 shrink-0 animate-spin" style={{ color: AI_CHAT_THEME.textFaint }} />
                  )}
                  <p className="whitespace-pre-wrap break-words text-left text-[14px] leading-6 sm:text-[15px]">
                    {part}
                  </p>
                </div>
              </RevealingMessageBubble>
            ))}
            {allDisplayPartsRevealed && (
              <div className={`px-1 text-[10px] ${isUser ? 'text-right' : 'text-left'}`} style={{ color: AI_CHAT_THEME.textMuted }}>
                <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span>{formatConversationTime(message.createdAt)}</span>
                  <span className="hidden text-[#b4a79a] sm:inline">·</span>
                  <span>{activeSession?.contextCacheEnabled ? `上下文开启 · ${activePersona.contextMessageLimit}轮` : '单轮'}</span>
                  {message.memoryUpdates && message.memoryUpdates.length > 0 && (
                    <>
                      <span className="hidden text-[#b4a79a] sm:inline">·</span>
                      <button
                        type="button"
                        onClick={() => toggleMemoryUpdateExpansion(message.id)}
                        className="transition-colors hover:opacity-100"
                        style={{ color: AI_CHAT_THEME.textMuted }}
                      >
                        记忆更新 {message.memoryUpdates.length}项 · {isMemoryUpdatesExpanded ? '收起' : '展开'}
                      </button>
                    </>
                  )}
                  {message.dreamUpdates && message.dreamUpdates.length > 0 && (
                    <>
                      <span className="hidden text-[#b4a79a] sm:inline">·</span>
                      <button
                        type="button"
                        onClick={() => toggleDreamUpdateExpansion(message.id)}
                        className="transition-colors hover:opacity-100"
                        style={{ color: AI_CHAT_THEME.textMuted }}
                      >
                        Dream 更新 {message.dreamUpdates.length}项 · {isDreamUpdatesExpanded ? '收起' : '展开'}
                      </button>
                    </>
                  )}
                  {message.reminderUpdates && message.reminderUpdates.length > 0 && (
                    <>
                      <span className="hidden text-[#b4a79a] sm:inline">·</span>
                      <button
                        type="button"
                        onClick={() => toggleReminderUpdateExpansion(message.id)}
                        className="transition-colors hover:opacity-100"
                        style={{ color: AI_CHAT_THEME.textMuted }}
                      >
                        提醒结果 {message.reminderUpdates.length}项 · {isReminderUpdatesExpanded ? '收起' : '展开'}
                      </button>
                    </>
                  )}
                  {messageDebugViewer && (
                    <>
                      <span className="hidden text-[#b4a79a] sm:inline">·</span>
                      <button
                        type="button"
                        onClick={() => setDebugViewer(messageDebugViewer)}
                        className="transition-colors hover:opacity-100"
                        style={{ color: AI_CHAT_THEME.textMuted }}
                      >
                        查看调试
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {allDisplayPartsRevealed && ((message.appliedActions && message.appliedActions.length > 0) || message.weeklyReviewWriteback) && (
              <div
                className="space-y-2 border-l pl-3 pr-1 py-1"
                style={{
                  borderColor: AI_CHAT_THEME.activeBorder
                }}
              >
                <p className="font-serif text-[10px] tracking-[0.08em]" style={{ color: AI_CHAT_THEME.textFaint }}>
                  应用结果
                </p>
                <div className="space-y-2">
                  {message.appliedActions?.map((action) => renderAppliedAction(message.id, action))}
                  {message.weeklyReviewWriteback && renderWeeklyReviewWritebackResult(message.weeklyReviewWriteback)}
                </div>
              </div>
            )}

            {allDisplayPartsRevealed && message.memoryUpdates && message.memoryUpdates.length > 0 && isMemoryUpdatesExpanded && (
              <div
                className="space-y-2 border-l pl-3 pr-1 py-1"
                style={{
                  borderColor: AI_CHAT_THEME.activeBorder
                }}
              >
                <div className="space-y-2">
                  {message.memoryUpdates.map((section) => (
                    <div
                      key={`${message.id}-memory-${section.label}`}
                      className="border-l-2 pl-3 pr-1 py-1"
                      style={{ borderColor: AI_CHAT_THEME.activeBorder }}
                    >
                      <p className="text-[11px] font-semibold" style={{ color: AI_CHAT_THEME.textSecondary }}>
                        {section.label}
                      </p>
                      <div className="mt-1.5 space-y-1 text-[13px] leading-6" style={{ color: AI_CHAT_THEME.textPrimary }}>
                        {section.items.map((item) => (
                          <p key={`${message.id}-memory-item-${section.label}-${item}`}>{item}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allDisplayPartsRevealed && message.dreamUpdates && message.dreamUpdates.length > 0 && isDreamUpdatesExpanded && (
              <div
                className="space-y-2 border-l pl-3 pr-1 py-1"
                style={{
                  borderColor: AI_CHAT_THEME.activeBorder
                }}
              >
                <div className="space-y-2">
                  {message.dreamUpdates.map((card, cardIndex) => (
                    <div
                      key={`${message.id}-dream-${card.topicId}-${cardIndex}`}
                      className="border-l-2 pl-3 pr-1 py-1"
                      style={{ borderColor: AI_CHAT_THEME.activeBorder }}
                    >
                      <p className="text-[11px] font-semibold" style={{ color: AI_CHAT_THEME.textSecondary }}>
                        {card.topicTitle} · {card.action === 'created' ? '新增' : card.action === 'deleted' ? '删除' : '改写'}
                      </p>
                      <div className="mt-1.5 space-y-1 text-[13px] leading-6" style={{ color: AI_CHAT_THEME.textPrimary }}>
                        <p>{card.content}</p>
                        {(card.observedRangeStart && card.observedRangeEnd) && (
                          <p className="text-[12px]" style={{ color: AI_CHAT_THEME.textSecondary }}>
                            观察窗口：{card.observedRangeStart} 至 {card.observedRangeEnd}
                          </p>
                        )}
                        <p className="text-[12px]" style={{ color: AI_CHAT_THEME.textSecondary }}>
                          更新时间：{formatAssistantDateTimeForDisplay(card.updatedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allDisplayPartsRevealed && message.reminderUpdates && message.reminderUpdates.length > 0 && isReminderUpdatesExpanded && (
              <div
                className="space-y-2 border-l pl-3 pr-1 py-1"
                style={{
                  borderColor: AI_CHAT_THEME.activeBorder
                }}
              >
                <div className="space-y-2">
                  {message.reminderUpdates.map((item) => (
                    <div
                      key={`${message.id}-reminder-${item}`}
                      className="border-l-2 pl-3 pr-1 py-1"
                      style={{ borderColor: AI_CHAT_THEME.activeBorder }}
                    >
                      <p className="text-[13px] leading-6" style={{ color: AI_CHAT_THEME.textPrimary }}>
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isUser && tone === 'error' && message.retryInput && (
              <div className="pl-1">
                <button
                  onClick={() => handleRetryMessage(message)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textSecondary
                  }}
                >
                  <RotateCcw size={12} />
                  重试
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div
              className="mx-auto mt-10 max-w-2xl rounded-[0.9rem] border border-dashed px-6 py-7 text-sm leading-7"
              style={{
                borderColor: AI_CHAT_THEME.panelBorderStrong,
                background: `linear-gradient(180deg, ${AI_CHAT_THEME.panelBg} 0%, ${AI_CHAT_THEME.panelBgSoft} 100%)`,
                color: AI_CHAT_THEME.textSecondary,
                boxShadow: AI_CHAT_THEME.cardShadow
              }}
            >
              <p className="font-medium text-stone-700">试试这样说</p>
              <div className="mt-4 space-y-4">
                {emptyPromptExampleGroups.map((group) => (
                  <div key={group.title}>
                    <p className="font-medium text-stone-700">{group.title}</p>
                    <p>{group.prompt}</p>
                    {group.requirement ? (
                      <p className="text-xs text-stone-400">功能要求：{group.requirement}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {false ? (
            <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-dashed border-stone-200 bg-white/85 px-6 py-7 text-sm leading-7 text-stone-500 shadow-sm">
              <p className="font-medium text-stone-700">
                这里已经是统一对话流了。你可以直接聊天，也可以让 AI 帮你补记时间或创建待办。
              </p>
              <p>
                比如：“下午两点到三点半写周报，挂到工作/写作。” 或者 “帮我建一个明天交论文初稿的待办。”
              </p>
              <p>
                点击右上角可以切到历史对话并新建会话，点击左上头像可以换人设、名字、称呼和提示词。
              </p>
              <p>
                {activeSession?.contextCacheEnabled
                  ? `当前已开启快速上下文，会把最近 ${activePersona.contextMessageLimit} 次对话一起发给 AI 理解。`
                  : '当前是单轮模式，AI 只会看你这次输入。'}
              </p>
              <p>输入 `/debug` 可以打开或关闭调试模式。</p>
            </div>
          ) : (
            <div className="mx-auto max-w-[920px] space-y-4">
              {activeSession.messages.map(renderMessageBubble)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

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

        {isHistoryPanelOpen && (
          <div className="absolute inset-0 z-10 backdrop-blur-[10px]" style={{ backgroundColor: AI_CHAT_THEME.overlayDark }}>
            <div
              className="absolute inset-3 flex flex-col overflow-hidden rounded-[0.95rem] border sm:inset-4"
              style={{
                borderColor: AI_CHAT_THEME.panelBorder,
                backgroundColor: AI_CHAT_THEME.panelBg,
                boxShadow: AI_CHAT_THEME.cardShadowStrong
              }}
            >
              <div
                className="flex items-start justify-between border-b px-5 py-4 backdrop-blur"
                style={{
                  borderColor: AI_CHAT_THEME.panelBorder,
                  backgroundColor: AI_CHAT_THEME.panelBg
                }}
              >
                <div>
                  <h3 className="text-base font-bold text-stone-800">历史对话</h3>
                </div>
                <button
                  onClick={() => setIsHistoryPanelOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem] border transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="border-b px-5 py-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                <button
                  onClick={handleOpenNewSessionDialog}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[0.8rem] border px-4 py-2.5 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.primaryButtonBorder,
                    backgroundColor: AI_CHAT_THEME.primaryButtonBg,
                    color: AI_CHAT_THEME.primaryButtonText,
                    boxShadow: `0 0 0 1px ${AI_CHAT_THEME.primaryButtonBorder}`
                  }}
                >
                  <MessageSquarePlus size={16} />
                  新建对话
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-2">
                  {sortedSessions.map((session) => {
                    const sessionPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
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
                                borderColor: AI_CHAT_THEME.activeBorder,
                                backgroundColor: AI_CHAT_THEME.activeBg,
                                boxShadow: AI_CHAT_THEME.cardShadow
                              }
                            : {
                                borderColor: AI_CHAT_THEME.panelBorder,
                                backgroundColor: AI_CHAT_THEME.panelBg
                              }
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div
                            onClick={() => {
                              if (isEditing) {
                                return;
                              }
                              setActiveSessionId(session.id);
                              setIsHistoryPanelOpen(false);
                            }}
                            className={`flex min-w-0 flex-1 items-start gap-3 text-left ${isEditing ? '' : 'cursor-pointer'}`}
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] border text-base"
                              style={{
                                borderColor: AI_CHAT_THEME.panelBorder,
                                backgroundColor: AI_CHAT_THEME.avatarBg,
                                boxShadow: AI_CHAT_THEME.avatarShadow
                              }}
                            >
                              <PersonaAvatar persona={sessionPersona} iconClassName="text-base" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                {isEditing ? (
                                  <input
                                    value={editingSessionTitle}
                                    onChange={(event) => setEditingSessionTitle(event.target.value)}
                                    onClick={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => {
                                      event.stopPropagation();
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleCommitRenameSession(session.id);
                                      }
                                      if (event.key === 'Escape') {
                                        event.preventDefault();
                                        handleCancelRenameSession();
                                      }
                                    }}
                                    className="w-full rounded-[0.7rem] border px-3 py-1.5 text-sm font-semibold outline-none"
                                    style={{
                                      borderColor: AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.inputBg,
                                      color: AI_CHAT_THEME.textPrimary
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <p className="truncate font-serif text-[1.05rem] text-[#26211d]">{session.title}</p>
                                )}
                                <span className="shrink-0 text-[11px] text-[#978d82]">
                                  {formatConversationTime(session.updatedAt)}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-[#69615a]">
                                {lastMessage?.content || '还没有消息'}
                              </p>
                              <div className="mt-2 flex items-center gap-2 text-[11px] text-[#91877d]">
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
                                  onClick={() => handleCommitRenameSession(session.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ced8ca] bg-[#edf3ea] text-[#556a52] transition-colors hover:bg-[#e5eee1]"
                                  title="保存名称"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={handleCancelRenameSession}
                                  className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#e3d8ca] bg-[#fff8f0] text-[#736a61] transition-colors hover:bg-[#f2e9de]"
                                  title="取消重命名"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartRenameSession(session)}
                                  className="rounded-[0.7rem] p-2 text-[#897f75] transition-colors hover:bg-[#f1e8dd] hover:text-[#2f2a26]"
                                  title="重命名对话"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSessionId(null);
                                    setEditingSessionTitle('');
                                    setDeleteConfirmSessionId((current) => current === session.id ? null : session.id);
                                  }}
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
                                onClick={() => setDeleteConfirmSessionId(null)}
                                className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ddd6ce] bg-transparent text-[#71685f] transition-colors hover:bg-[#fffaf3]"
                                title="取消删除"
                              >
                                <X size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
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
        )}

        {isNewSessionDialogOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-5 backdrop-blur-sm">
            <div
              className="w-full max-w-sm overflow-hidden rounded-[1.4rem] border"
              style={{
                borderColor: AI_CHAT_THEME.panelBorder,
                backgroundColor: AI_CHAT_THEME.panelBg,
                boxShadow: AI_CHAT_THEME.cardShadowStrong
              }}
            >
              <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                <div>
                  <h3 className="text-base font-bold text-stone-800">新建对话</h3>
                </div>
                <button
                  onClick={handleCloseNewSessionDialog}
                  className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 px-5 py-5">
                <button
                  onClick={handleCreateGenericSession}
                  className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textPrimary
                  }}
                >
                  <div className="text-sm font-semibold">普通对话</div>
                </button>
                <button
                  onClick={handleOpenWeeklyReviewTemplateSelection}
                  className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textPrimary
                  }}
                >
                  <div className="text-sm font-semibold">模板对话：周复盘</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {isWeeklyReviewWeekSelectionModalOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-5 backdrop-blur-sm">
            <div
              className="w-full max-w-sm overflow-hidden rounded-[1.4rem] border"
              style={{
                borderColor: AI_CHAT_THEME.panelBorder,
                backgroundColor: AI_CHAT_THEME.panelBg,
                boxShadow: AI_CHAT_THEME.cardShadowStrong
              }}
            >
              <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                <div>
                  <h3 className="text-base font-bold text-stone-800">选择周范围</h3>
                </div>
                <button
                  onClick={handleCloseWeeklyReviewTemplateSelection}
                  className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 px-5 py-5">
                <button
                  onClick={() => handleConfirmWeeklyReviewTemplateSelection('上周')}
                  className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textPrimary
                  }}
                >
                  <div className="text-sm font-semibold">上周</div>
                </button>
                <button
                  onClick={() => handleConfirmWeeklyReviewTemplateSelection('本周')}
                  className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textPrimary
                  }}
                >
                  <div className="text-sm font-semibold">本周</div>
                </button>
                <button
                  onClick={handleOpenWeeklyReviewDateInputModal}
                  className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.panelBorder,
                    backgroundColor: AI_CHAT_THEME.panelBgStrong,
                    color: AI_CHAT_THEME.textPrimary
                  }}
                >
                  <div className="text-sm font-semibold">输入数字</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingWeeklyReviewTemplateSetup && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-5 backdrop-blur-sm">
            <div
              className="w-full max-w-sm overflow-hidden rounded-[1.4rem] border"
              style={{
                borderColor: AI_CHAT_THEME.panelBorder,
                backgroundColor: AI_CHAT_THEME.panelBg,
                boxShadow: AI_CHAT_THEME.cardShadowStrong
              }}
            >
              <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                <div>
                  <h3 className="text-base font-bold text-stone-800">选择分析方法</h3>
                </div>
                <button
                  onClick={handleCloseWeeklyReviewMethodSelection}
                  className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 px-5 py-5">
                {weeklyReviewMethodOptions.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handleConfirmWeeklyReviewMethodSelection(method.id)}
                    className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: AI_CHAT_THEME.panelBorder,
                      backgroundColor: AI_CHAT_THEME.panelBgStrong,
                      color: AI_CHAT_THEME.textPrimary
                    }}
                  >
                    <div className="text-sm font-semibold">{method.title}</div>
                    <div className="mt-1 text-xs leading-5" style={{ color: AI_CHAT_THEME.textMuted }}>
                      {method.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isPersonaPanelOpen && (
          <div className="absolute inset-0 z-10 backdrop-blur-[10px]" style={{ backgroundColor: AI_CHAT_THEME.overlayLight }}>
            <div
              className="flex h-full flex-col"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <div
                className="flex h-14 items-center justify-between border-b px-4 backdrop-blur-md"
                style={{
                  borderColor: AI_CHAT_THEME.panelBorder,
                  backgroundColor: AI_CHAT_THEME.panelBg
                }}
              >
                <h3 className="font-serif text-lg font-bold leading-none text-stone-800">AI 设置</h3>
                <button
                  onClick={() => setIsPersonaPanelOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5 sm:px-12">
                <div className="mx-auto max-w-4xl">
                  <div className="mb-5 flex gap-6 overflow-x-auto border-b border-stone-200 no-scrollbar">
                    {([
                      { id: 'persona', label: '人设设置' },
                      { id: 'call', label: '调用设置' }
                    ] as Array<{ id: AISettingsMainTab; label: string }>).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSettingsMainTab(tab.id)}
                        className={`pb-3 text-sm font-serif tracking-wide whitespace-nowrap transition-colors ${
                          activeSettingsMainTab === tab.id
                            ? 'border-b-2 border-stone-900 font-bold text-stone-900'
                            : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeSettingsMainTab === 'persona' ? (
                    <div className="space-y-8">
                      <section className="space-y-4">
                        <div className="flex min-h-[3.25rem] items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-stone-800">选择人设</p>
                          </div>
                          <button
                            onClick={handleCreatePersona}
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
                              value={activeSession?.personaId || ''}
                              onChange={handleApplyPersonaPreset}
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
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.chipBg,
                              color: AI_CHAT_THEME.textMuted
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
                          onChange={handleAvatarUpload}
                        />

                        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <div
                                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.95rem] border text-2xl"
                                style={{
                                  borderColor: AI_CHAT_THEME.panelBorder,
                                  backgroundColor: AI_CHAT_THEME.avatarBg,
                                  boxShadow: AI_CHAT_THEME.avatarShadow
                                }}
                              >
                                <PersonaAvatar persona={activePersona} iconClassName="text-2xl" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold" style={{ color: AI_CHAT_THEME.textPrimary }}>
                                  {activePersona.name || '未命名人设'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={handleUseEmojiAvatar}
                                className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                                style={{
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.avatarBg,
                                  color: AI_CHAT_THEME.textSecondary
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
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.avatarBg,
                                  color: AI_CHAT_THEME.textSecondary
                                }}
                              >
                                {isUploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {isUploadingAvatar ? '上传中' : '上传图片'}
                              </button>
                              {!activePersona.isBuiltIn && (
                                <button
                                  onClick={() => setDeleteConfirmPersonaId((current) => current === activePersona.id ? null : activePersona.id)}
                                  className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
                                  style={{
                                    borderColor: AI_CHAT_THEME.dangerBorder,
                                    backgroundColor: AI_CHAT_THEME.dangerBg,
                                    color: AI_CHAT_THEME.dangerText
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
                                  borderColor: AI_CHAT_THEME.panelBorder,
                                  backgroundColor: AI_CHAT_THEME.panelBg
                                }}
                              >
                                <div className="flex flex-wrap gap-2">
                                  {PERSONA_EMOJI_CHOICES.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => setEmojiDraft(emoji)}
                                      className={`flex h-10 w-10 items-center justify-center rounded-[0.7rem] border text-lg transition-colors ${
                                        emojiDraft.trim() === emoji ? 'shadow-[0_0_0_1px_rgba(0,0,0,0.03)]' : 'hover:bg-white'
                                      }`}
                                      style={emojiDraft.trim() === emoji
                                        ? {
                                          borderColor: AI_CHAT_THEME.activeBorder,
                                          backgroundColor: AI_CHAT_THEME.activeBg,
                                          color: AI_CHAT_THEME.textPrimary
                                        }
                                        : {
                                          borderColor: AI_CHAT_THEME.panelBorder,
                                          backgroundColor: AI_CHAT_THEME.panelBgStrong,
                                          color: AI_CHAT_THEME.textSecondary
                                        }}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>

                                <div
                                  className="mt-3 rounded-[0.75rem] border px-3 py-3"
                                  style={{
                                    borderColor: AI_CHAT_THEME.chipBorder,
                                    backgroundColor: AI_CHAT_THEME.inputBg
                                  }}
                                >
                                  <input
                                    value={emojiDraft}
                                    onChange={(event) => setEmojiDraft(event.target.value)}
                                    className="w-full bg-transparent text-sm outline-none"
                                    style={{ color: AI_CHAT_THEME.textPrimary }}
                                    placeholder="输入一个 Emoji，例如 ✨"
                                  />
                                </div>

                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    onClick={handleCancelEmojiAvatarEdit}
                                    className="rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white"
                                    style={{
                                      borderColor: AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.inputBg,
                                      color: AI_CHAT_THEME.textSecondary
                                    }}
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={() => void handleApplyEmojiAvatar()}
                                    className="rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium text-white transition-colors"
                                    style={{
                                      borderColor: AI_CHAT_THEME.primaryButtonBorder,
                                      backgroundColor: AI_CHAT_THEME.primaryButtonBg
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
                                  borderColor: AI_CHAT_THEME.dangerBorder,
                                  backgroundColor: AI_CHAT_THEME.dangerBg,
                                  color: AI_CHAT_THEME.dangerText
                                }}
                              >
                                <p>确认删除这个人设？</p>
                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    onClick={() => setDeleteConfirmPersonaId(null)}
                                    className="rounded-[0.75rem] border px-3 py-1.5 font-medium transition-colors hover:bg-white"
                                    style={{
                                      borderColor: AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.avatarBg,
                                      color: AI_CHAT_THEME.textSecondary
                                    }}
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteCurrentPersona()}
                                    className="rounded-[0.75rem] border px-3 py-1.5 font-medium text-white transition-colors"
                                    style={{
                                      borderColor: AI_CHAT_THEME.dangerBorder,
                                      backgroundColor: AI_CHAT_THEME.dangerText
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
                                  onChange={(event) => updateCurrentPersona({ name: event.target.value })}
                                  className="w-full rounded-[1rem] border px-3 py-2 text-sm outline-none"
                                  style={{
                                    borderColor: AI_CHAT_THEME.chipBorder,
                                    backgroundColor: AI_CHAT_THEME.inputBg,
                                    color: AI_CHAT_THEME.textPrimary
                                  }}
                                  placeholder="可留空"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-stone-500">AI 自称</span>
                                <input
                                  value={activePersona.assistantSelfName}
                                  onChange={(event) => updateCurrentPersona({ assistantSelfName: event.target.value })}
                                  className="w-full rounded-[1rem] border px-3 py-2 text-sm outline-none"
                                  style={{
                                    borderColor: AI_CHAT_THEME.chipBorder,
                                    backgroundColor: AI_CHAT_THEME.inputBg,
                                    color: AI_CHAT_THEME.textPrimary
                                  }}
                                  placeholder="可留空"
                                />
                              </label>
                            </div>

                            <label className="block">
                              <span className="mb-1 block text-xs font-medium text-stone-500">对用户称呼</span>
                              <input
                                value={activePersona.userCallName}
                                onChange={(event) => updateCurrentPersona({ userCallName: event.target.value })}
                                className="w-full rounded-[1rem] border px-3 py-2 text-sm outline-none"
                                style={{
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.inputBg,
                                  color: AI_CHAT_THEME.textPrimary
                                }}
                                placeholder="可留空"
                              />
                            </label>

                            {!activePersona.isBuiltIn && (
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-stone-500">自定义提示词</span>
                                <textarea
                                  value={activePersona.systemPrompt}
                                  onChange={(event) => updateCurrentPersona({ systemPrompt: event.target.value })}
                                  className="min-h-[220px] w-full rounded-[0.85rem] border px-4 py-3 text-sm leading-7 outline-none"
                                  style={{
                                    borderColor: AI_CHAT_THEME.chipBorder,
                                    backgroundColor: AI_CHAT_THEME.inputBg,
                                    color: AI_CHAT_THEME.textPrimary
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
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.chipBg,
                              color: AI_CHAT_THEME.textMuted
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
                          onChange={handleUserAvatarUpload}
                        />

                        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                          <div className="flex items-center gap-4">
                            <div
                              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.95rem] border text-2xl"
                              style={{
                                borderColor: AI_CHAT_THEME.panelBorder,
                                backgroundColor: AI_CHAT_THEME.avatarBg,
                                boxShadow: AI_CHAT_THEME.avatarShadow
                              }}
                            >
                              <UserAvatar profile={userProfile} iconClassName="text-xl" />
                            </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>当前用户头像</p>
                          </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={handleUseUserEmojiAvatar}
                                className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                                style={{
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.avatarBg,
                                  color: AI_CHAT_THEME.textSecondary
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
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.avatarBg,
                                  color: AI_CHAT_THEME.textSecondary
                                }}
                              >
                                {isUploadingUserAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {isUploadingUserAvatar ? '上传中' : '上传图片'}
                              </button>
                              <button
                                onClick={() => void handleResetUserAvatar()}
                                className="inline-flex items-center gap-1.5 rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                                style={{
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.avatarBg,
                                  color: AI_CHAT_THEME.textSecondary
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
                                  borderColor: AI_CHAT_THEME.panelBorder,
                                  backgroundColor: AI_CHAT_THEME.panelBg
                                }}
                              >
                                <div className="flex flex-wrap gap-2">
                                  {PERSONA_EMOJI_CHOICES.map((emoji) => (
                                    <button
                                      key={`user-${emoji}`}
                                      onClick={() => setUserEmojiDraft(emoji)}
                                      className="flex h-10 w-10 items-center justify-center rounded-[0.7rem] border text-lg transition-colors hover:bg-white"
                                      style={{
                                        borderColor: userEmojiDraft.trim() === emoji ? AI_CHAT_THEME.activeBorder : AI_CHAT_THEME.panelBorder,
                                        backgroundColor: userEmojiDraft.trim() === emoji ? AI_CHAT_THEME.activeBg : AI_CHAT_THEME.panelBgStrong,
                                        color: userEmojiDraft.trim() === emoji ? AI_CHAT_THEME.textPrimary : AI_CHAT_THEME.textSecondary,
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
                                    borderColor: AI_CHAT_THEME.chipBorder,
                                    backgroundColor: AI_CHAT_THEME.inputBg
                                  }}
                                >
                                  <input
                                    value={userEmojiDraft}
                                    onChange={(event) => setUserEmojiDraft(event.target.value)}
                                    className="w-full bg-transparent text-sm outline-none"
                                    style={{ color: AI_CHAT_THEME.textPrimary }}
                                    placeholder="输入一个 Emoji，例如 🙂"
                                  />
                                </div>
                                <div className="mt-3 flex justify-end gap-2">
                                  <button
                                    onClick={handleCancelUserEmojiAvatarEdit}
                                    className="rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white"
                                    style={{
                                      borderColor: AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.chipBg,
                                      color: AI_CHAT_THEME.textSecondary
                                    }}
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={() => void handleApplyUserEmojiAvatar()}
                                    className="rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium text-white transition-colors"
                                    style={{
                                      borderColor: AI_CHAT_THEME.primaryButtonBorder,
                                      backgroundColor: AI_CHAT_THEME.primaryButtonBg
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
                  ) : (
                    <div className="space-y-8">
                      <section className="space-y-4">
                        <div className="flex min-h-[3.25rem] items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-stone-800">上下文设置</p>
                          </div>
                          <span
                            className="rounded-[0.75rem] border px-3 py-1 text-xs font-medium"
                            style={{
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.chipBg,
                              color: AI_CHAT_THEME.textMuted
                            }}
                          >
                            当前会话
                          </span>
                        </div>

                        <label className="block max-w-[240px]">
                          <span className="mb-1 block text-xs font-medium text-stone-500">手动输入最近上下文轮数</span>
                          <input
                            type="number"
                            min={0}
                            value={activePersona.contextMessageLimit}
                            onChange={(event) => updateCurrentPersona({ contextMessageLimit: Number(event.target.value) })}
                            className="w-full rounded-[1rem] border px-3 py-2 text-sm outline-none"
                            style={{
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.inputBg,
                              color: AI_CHAT_THEME.textPrimary
                            }}
                          />
                        </label>
                      </section>

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
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.chipBg,
                              color: AI_CHAT_THEME.textMuted
                            }}
                          >
                            Android
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>开启后台轮询</p>
                            </div>
                            <button
                              onClick={() => handleUpdateAssistantAgentConfig({ enabled: !assistantAgentConfig.enabled })}
                              className="inline-flex min-w-[72px] items-center justify-center rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors"
                              style={assistantAgentConfig.enabled
                                ? {
                                  borderColor: AI_CHAT_THEME.activeBorder,
                                  backgroundColor: AI_CHAT_THEME.activeBg,
                                  color: AI_CHAT_THEME.textPrimary
                                }
                                : {
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.inputBg,
                                  color: AI_CHAT_THEME.textMuted
                                }}
                            >
                              {assistantAgentConfig.enabled ? '已开启' : '未开启'}
                            </button>
                          </div>

                          <div>
                            <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>check-in 间隔</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-stone-500">检查频率（分钟）</span>
                                <div className="relative">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={assistantAgentIntervalDrafts.basePollMinutes}
                                    onChange={(event) => handleAssistantAgentIntervalDraftChange('basePollMinutes', event.target.value)}
                                    onBlur={() => commitAssistantAgentIntervalDraft('basePollMinutes')}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        commitAssistantAgentIntervalDraft('basePollMinutes');
                                      }
                                    }}
                                    aria-invalid={!!assistantAgentIntervalErrors.basePollMinutes}
                                    className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                                    style={{
                                      borderColor: assistantAgentIntervalErrors.basePollMinutes ? '#ef4444' : AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.inputBg,
                                      color: AI_CHAT_THEME.textPrimary
                                    }}
                                  />
                                  {assistantAgentIntervalErrors.basePollMinutes ? (
                                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-500">
                                      <XCircle size={15} aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </div>
                                {assistantAgentIntervalErrors.basePollMinutes ? (
                                  <span className="mt-1 block text-xs font-medium text-red-500" role="alert">
                                    {assistantAgentIntervalErrors.basePollMinutes}
                                  </span>
                                ) : null}
                              </label>

                              <label className="block">
                                <span className="mb-1 block text-xs font-medium text-stone-500">最低间隔（分钟）</span>
                                <div className="relative">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={assistantAgentIntervalDrafts.minCheckinMinutes}
                                    onChange={(event) => handleAssistantAgentIntervalDraftChange('minCheckinMinutes', event.target.value)}
                                    onBlur={() => commitAssistantAgentIntervalDraft('minCheckinMinutes')}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        commitAssistantAgentIntervalDraft('minCheckinMinutes');
                                      }
                                    }}
                                    aria-invalid={!!assistantAgentIntervalErrors.minCheckinMinutes}
                                    className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                                    style={{
                                      borderColor: assistantAgentIntervalErrors.minCheckinMinutes ? '#ef4444' : AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.inputBg,
                                      color: AI_CHAT_THEME.textPrimary
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
                                    onChange={(event) => handleAssistantAgentIntervalDraftChange('maxCheckinMinutes', event.target.value)}
                                    onBlur={() => commitAssistantAgentIntervalDraft('maxCheckinMinutes')}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        commitAssistantAgentIntervalDraft('maxCheckinMinutes');
                                      }
                                    }}
                                    aria-invalid={!!assistantAgentIntervalErrors.maxCheckinMinutes}
                                    className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                                    style={{
                                      borderColor: assistantAgentIntervalErrors.maxCheckinMinutes ? '#ef4444' : AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.inputBg,
                                      color: AI_CHAT_THEME.textPrimary
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

                          <div className="border-t pt-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>夜间保护时间（只拦随机 check-in）</p>
                              </div>
                              <button
                                onClick={handleToggleAssistantQuietHours}
                                className="inline-flex min-w-[72px] items-center justify-center rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors"
                                style={assistantAgentConfig.quietHoursEnabled
                                  ? {
                                    borderColor: AI_CHAT_THEME.activeBorder,
                                    backgroundColor: AI_CHAT_THEME.activeBg,
                                    color: AI_CHAT_THEME.textPrimary
                                  }
                                  : {
                                    borderColor: AI_CHAT_THEME.chipBorder,
                                    backgroundColor: AI_CHAT_THEME.inputBg,
                                    color: AI_CHAT_THEME.textMuted
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
                                    onChange={(event) => handleAssistantAgentQuietHoursDraftChange('quietHoursStart', event.target.value)}
                                    onBlur={commitAssistantAgentQuietHoursDraft}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        commitAssistantAgentQuietHoursDraft();
                                      }
                                    }}
                                    aria-invalid={!!assistantAgentQuietHoursErrors.quietHoursStart}
                                    className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                                    style={{
                                      borderColor: assistantAgentQuietHoursErrors.quietHoursStart ? '#ef4444' : AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.inputBg,
                                      color: AI_CHAT_THEME.textPrimary
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
                                    onChange={(event) => handleAssistantAgentQuietHoursDraftChange('quietHoursEnd', event.target.value)}
                                    onBlur={commitAssistantAgentQuietHoursDraft}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        commitAssistantAgentQuietHoursDraft();
                                      }
                                    }}
                                    aria-invalid={!!assistantAgentQuietHoursErrors.quietHoursEnd}
                                    className="w-full rounded-[1rem] border px-3 py-2 pr-9 text-sm outline-none"
                                    style={{
                                      borderColor: assistantAgentQuietHoursErrors.quietHoursEnd ? '#ef4444' : AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.inputBg,
                                      color: AI_CHAT_THEME.textPrimary
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

                          <div className="flex items-start justify-between gap-4 border-t pt-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>开启长期记忆</p>
                            </div>
                            <button
                              onClick={() => handleUpdateAssistantAgentConfig({ longTermMemoryEnabled: !assistantAgentConfig.longTermMemoryEnabled })}
                              className="inline-flex min-w-[72px] items-center justify-center rounded-[0.75rem] border px-3 py-1.5 text-xs font-medium transition-colors"
                              style={assistantAgentConfig.longTermMemoryEnabled
                                ? {
                                  borderColor: AI_CHAT_THEME.activeBorder,
                                  backgroundColor: AI_CHAT_THEME.activeBg,
                                  color: AI_CHAT_THEME.textPrimary
                                }
                                : {
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.inputBg,
                                  color: AI_CHAT_THEME.textMuted
                                }}
                            >
                              {assistantAgentConfig.longTermMemoryEnabled ? '已开启' : '未开启'}
                            </button>
                          </div>

                          <div className="border-t pt-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>定时任务</p>
                              </div>
                              <button
                                onClick={handleOpenAssistantScheduledTaskComposer}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-[0.75rem] border text-xs font-medium transition-colors hover:bg-white"
                                style={{
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.panelBg,
                                  color: AI_CHAT_THEME.textSecondary
                                }}
                                title="新增定时任务"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            {isAssistantScheduledTaskComposerOpen && (
                              <div className="mt-4 border-t pt-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                                <textarea
                                  value={assistantScheduledTaskDrafts.text}
                                  onChange={(event) => updateAssistantScheduledTaskDraft('text', event.target.value)}
                                  placeholder="比如：每周一提醒我交周报。"
                                  rows={3}
                                  className="w-full resize-none rounded-[0.75rem] border px-3 py-3 text-sm leading-6 outline-none"
                                  style={{
                                    borderColor: AI_CHAT_THEME.chipBorder,
                                    backgroundColor: AI_CHAT_THEME.inputBg,
                                    color: AI_CHAT_THEME.textPrimary
                                  }}
                                />

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <label className="space-y-1.5">
                                    <span className="text-xs font-medium text-stone-500">触发时间（HHMM）</span>
                                    <input
                                      type="text"
                                      value={assistantScheduledTaskDrafts.time}
                                      onChange={(event) => updateAssistantScheduledTaskDraft('time', event.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                                      placeholder="0800"
                                      inputMode="numeric"
                                      className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
                                      style={{
                                        borderColor: AI_CHAT_THEME.chipBorder,
                                        backgroundColor: AI_CHAT_THEME.inputBg,
                                        color: AI_CHAT_THEME.textPrimary
                                      }}
                                    />
                                  </label>
                                  <label className="space-y-1.5">
                                    <span className="text-xs font-medium text-stone-500">循环间隔</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={365}
                                      value={assistantScheduledTaskDrafts.interval}
                                      onChange={(event) => updateAssistantScheduledTaskDraft('interval', event.target.value.replace(/[^\d]/g, '').slice(0, 3) || '1')}
                                      className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
                                      style={{
                                        borderColor: AI_CHAT_THEME.chipBorder,
                                        backgroundColor: AI_CHAT_THEME.inputBg,
                                        color: AI_CHAT_THEME.textPrimary
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
                                          onClick={() => updateAssistantScheduledTaskDraft('frequency', option.value)}
                                          className="rounded-[0.75rem] border px-2 py-2 text-xs font-medium transition-colors"
                                          style={isSelected
                                            ? {
                                              borderColor: AI_CHAT_THEME.activeBorder,
                                              backgroundColor: AI_CHAT_THEME.activeBg,
                                              color: AI_CHAT_THEME.textPrimary
                                            }
                                            : {
                                              borderColor: AI_CHAT_THEME.chipBorder,
                                              backgroundColor: AI_CHAT_THEME.inputBg,
                                              color: AI_CHAT_THEME.textMuted
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
                                            onClick={() => toggleAssistantScheduledTaskWeekday(weekday.value)}
                                            className="rounded-[0.75rem] border px-0 py-2 text-xs font-bold transition-colors"
                                            style={isSelected
                                              ? {
                                                borderColor: AI_CHAT_THEME.activeBorder,
                                                backgroundColor: AI_CHAT_THEME.activeBg,
                                                color: AI_CHAT_THEME.textPrimary
                                              }
                                              : {
                                                borderColor: AI_CHAT_THEME.chipBorder,
                                                backgroundColor: AI_CHAT_THEME.inputBg,
                                                color: AI_CHAT_THEME.textMuted
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
                                  <label className="mt-3 block space-y-1.5">
                                    <span className="text-xs font-medium text-stone-500">每月日期</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={31}
                                      value={assistantScheduledTaskDrafts.monthDay}
                                      onChange={(event) => updateAssistantScheduledTaskDraft('monthDay', event.target.value.replace(/[^\d]/g, '').slice(0, 2) || '1')}
                                      className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
                                      style={{
                                        borderColor: AI_CHAT_THEME.chipBorder,
                                        backgroundColor: AI_CHAT_THEME.inputBg,
                                        color: AI_CHAT_THEME.textPrimary
                                      }}
                                    />
                                  </label>
                                )}

                                <div className="mt-3 flex items-center justify-end gap-2">
                                  <button
                                    onClick={handleCancelAssistantScheduledTaskComposer}
                                    className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                                    style={{
                                      borderColor: AI_CHAT_THEME.chipBorder,
                                      backgroundColor: AI_CHAT_THEME.inputBg,
                                      color: AI_CHAT_THEME.textMuted
                                    }}
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={handleSaveAssistantScheduledTask}
                                    className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:brightness-[0.98]"
                                    style={{
                                      borderColor: AI_CHAT_THEME.activeBorder,
                                      backgroundColor: AI_CHAT_THEME.activeBg,
                                      color: AI_CHAT_THEME.textPrimary
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
                                    borderColor: AI_CHAT_THEME.panelBorder,
                                    backgroundColor: AI_CHAT_THEME.panelBg
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
                                        borderColor: AI_CHAT_THEME.panelBorder,
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
                                            onClick={() => handleToggleAssistantScheduledTaskEnabled(task)}
                                            className="inline-flex min-w-[60px] items-center justify-center rounded-[0.7rem] border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                                            style={task.enabled
                                              ? {
                                                borderColor: AI_CHAT_THEME.activeBorder,
                                                backgroundColor: AI_CHAT_THEME.activeBg,
                                                color: AI_CHAT_THEME.textPrimary
                                              }
                                              : {
                                                borderColor: AI_CHAT_THEME.chipBorder,
                                                backgroundColor: AI_CHAT_THEME.inputBg,
                                                color: AI_CHAT_THEME.textMuted
                                              }}
                                          >
                                            {task.enabled ? '已开启' : '未开启'}
                                          </button>
                                          <button
                                            onClick={() => handleToggleAssistantScheduledTaskDelete(task.id)}
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
                                              onClick={() => setAssistantScheduledTaskDeleteTarget(null)}
                                              className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ddd6ce] bg-transparent text-[#71685f] transition-colors hover:bg-[#fffaf3]"
                                              title="取消删除"
                                            >
                                              <X size={14} />
                                            </button>
                                            <button
                                              onClick={() => handleConfirmAssistantScheduledTaskDelete(task.id)}
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

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              onClick={handleOpenDreamViewer}
                              className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                              style={{
                                borderColor: AI_CHAT_THEME.chipBorder,
                                backgroundColor: AI_CHAT_THEME.panelBg,
                                color: AI_CHAT_THEME.textSecondary
                              }}
                            >
                              打开 Dream
                            </button>
                            <button
                              onClick={handleOpenAssistantMemoryViewer}
                              className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                              style={{
                                borderColor: AI_CHAT_THEME.chipBorder,
                                backgroundColor: AI_CHAT_THEME.panelBg,
                                color: AI_CHAT_THEME.textSecondary
                              }}
                            >
                              查看长期记忆
                            </button>
                            <button
                              onClick={handleOpenAssistantBackgroundHistoryViewer}
                              className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
                              style={{
                                borderColor: AI_CHAT_THEME.chipBorder,
                                backgroundColor: AI_CHAT_THEME.panelBg,
                                color: AI_CHAT_THEME.textSecondary
                              }}
                            >
                              查看后台调用记录
                            </button>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isDreamViewerOpen && (
          <div className="absolute inset-0 z-20 bg-[rgba(15,23,42,0.12)] backdrop-blur-[10px]">
            <div
              className="flex h-full flex-col bg-[linear-gradient(180deg,#f7f5f1_0%,#f3f1ec_100%)]"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <div className="flex h-14 items-center justify-between border-b border-[rgba(32,28,25,0.12)] bg-[rgba(247,245,241,0.92)] px-4 backdrop-blur-md">
                <div>
                  <h3 className="font-serif text-[1.02rem] font-bold leading-none text-[#201c19]">Dream</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDreamTopicComposer()}
                    className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/70"
                    style={{
                      borderColor: 'rgba(32,28,25,0.14)',
                      backgroundColor: 'rgba(255,255,255,0.38)',
                      color: AI_CHAT_THEME.textSecondary
                    }}
                  >
                    新增领域
                  </button>
                  <button
                    onClick={() => {
                      if (!isLoading && activeSession) {
                        handleOpenDreamRangeSelection(activeSession.id);
                      }
                    }}
                    className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/80"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-color) 22%, rgba(32,28,25,0.14))',
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, rgba(255,255,255,0.55))',
                      color: AI_CHAT_THEME.textPrimary
                    }}
                  >
                    运行 dream
                  </button>
                  <button
                    onClick={handleCloseDreamViewer}
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

              <div className="min-h-0 flex flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6">
                <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6">
                  {isDreamTopicComposerOpen && (
                    <div
                      className="border-y px-0 py-5"
                      style={{ borderColor: 'rgba(32,28,25,0.12)' }}
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:gap-6">
                        <div>
                          <p className="font-serif text-[1.02rem] leading-7 text-[#231f1b]">
                            {editingDreamTopicId ? '编辑 Dream 领域' : '新增 Dream 领域'}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-stone-500">
                            保持标题简洁，用备注补充长期关注重点。
                          </p>
                        </div>
                        <div className="grid gap-3">
                          <label className="space-y-1.5">
                            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">领域标题</span>
                            <input
                              value={dreamTopicDrafts.title}
                              onChange={(event) => updateDreamTopicDraft('title', event.target.value)}
                              placeholder="比如：作息"
                              className="w-full rounded-[0.6rem] border px-3 py-2 text-[13px] outline-none"
                              style={{
                                borderColor: 'rgba(32,28,25,0.14)',
                                backgroundColor: 'rgba(255,255,255,0.56)',
                                color: AI_CHAT_THEME.textPrimary
                              }}
                            />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">备注</span>
                            <textarea
                              value={dreamTopicDrafts.note}
                              onChange={(event) => updateDreamTopicDraft('note', event.target.value)}
                              placeholder="比如：重点关注晚睡、起床过晚、白天恢复情况。"
                              rows={3}
                              className="w-full resize-none rounded-[0.6rem] border px-3 py-3 text-[13px] leading-6 outline-none"
                              style={{
                                borderColor: 'rgba(32,28,25,0.14)',
                                backgroundColor: 'rgba(255,255,255,0.56)',
                                color: AI_CHAT_THEME.textPrimary
                              }}
                            />
                          </label>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleCancelDreamTopicComposer}
                              className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/70"
                              style={{
                                borderColor: 'rgba(32,28,25,0.14)',
                                backgroundColor: 'rgba(255,255,255,0.3)',
                                color: AI_CHAT_THEME.textMuted
                              }}
                            >
                              取消
                            </button>
                            <button
                              onClick={handleSaveDreamTopic}
                              className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/80"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--accent-color) 22%, rgba(32,28,25,0.14))',
                                backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, rgba(255,255,255,0.55))',
                                color: AI_CHAT_THEME.textPrimary
                              }}
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {dreamSnapshot.topics.length === 0 ? (
                    <div
                      className="border-y py-10 text-[13px] leading-7 text-stone-500"
                      style={{ borderColor: 'rgba(32,28,25,0.12)' }}
                    >
                      还没有 Dream 领域。先新增几个你希望我长期关注的主题，再运行 `dream`。
                    </div>
                  ) : (
                    <div className="min-h-0 flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
                      <aside
                        className="min-h-0 lg:border-r lg:pr-8"
                        style={{ borderColor: 'rgba(32,28,25,0.12)' }}
                      >
                        <div className="border-b pb-3" style={{ borderColor: 'rgba(32,28,25,0.12)' }}>
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-500">领域目录</p>
                        </div>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
                          {dreamSnapshot.topics.map((topic) => {
                            const isActive = activeDreamTopic?.id === topic.id;
                            return (
                              <button
                                key={topic.id}
                                type="button"
                                onClick={() => setSelectedDreamTopicId(topic.id)}
                                className="group min-w-fit border-b px-0 py-3 text-left transition-colors lg:flex lg:w-full lg:min-w-0 lg:items-start lg:justify-between"
                                style={{
                                  borderColor: isActive
                                    ? 'color-mix(in srgb, var(--accent-color) 30%, rgba(32,28,25,0.18))'
                                    : 'rgba(32,28,25,0.1)',
                                  color: isActive
                                    ? '#201c19'
                                    : (topic.enabled ? AI_CHAT_THEME.textSecondary : AI_CHAT_THEME.textMuted)
                                }}
                              >
                                <span className="truncate font-serif text-[0.95rem] leading-6">{topic.title}</span>
                                <span
                                  className="ml-3 mt-1 hidden text-[10px] uppercase tracking-[0.16em] lg:block"
                                  style={{
                                    color: topic.enabled
                                      ? (isActive ? '#7b6756' : '#9b948b')
                                      : '#b0a79e'
                                  }}
                                >
                                  {topic.enabled ? 'on' : 'off'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </aside>

                      {activeDreamTopic && (
                        <section className="min-w-0">
                          <div className="border-b pb-5" style={{ borderColor: 'rgba(32,28,25,0.12)' }}>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="font-serif text-[1.5rem] leading-[1.2] text-[#231f1b]">{activeDreamTopic.title}</p>
                                <p className="mt-2 max-w-3xl text-[0.92rem] leading-[1.95] text-stone-500">
                                  {activeDreamTopic.note || '暂无备注'}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-center gap-2 text-xs">
                                <button
                                  onClick={() => handleToggleDreamTopicEnabled(activeDreamTopic)}
                                  className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70"
                                  style={{
                                    borderColor: activeDreamTopic.enabled
                                      ? 'color-mix(in srgb, var(--accent-color) 24%, rgba(32,28,25,0.14))'
                                      : 'rgba(32,28,25,0.14)',
                                    backgroundColor: activeDreamTopic.enabled
                                      ? 'color-mix(in srgb, var(--accent-color) 5%, rgba(255,255,255,0.5))'
                                      : 'rgba(255,255,255,0.26)',
                                    color: activeDreamTopic.enabled ? AI_CHAT_THEME.textPrimary : AI_CHAT_THEME.textMuted
                                  }}
                                  title={activeDreamTopic.enabled ? '停用领域' : '启用领域'}
                                  aria-label={activeDreamTopic.enabled ? '停用领域' : '启用领域'}
                                >
                                  {activeDreamTopic.enabled ? <Check size={14} /> : <XCircle size={14} />}
                                </button>
                                <button
                                  onClick={() => handleOpenDreamTopicComposer(activeDreamTopic)}
                                  className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70"
                                  style={{
                                    borderColor: 'rgba(32,28,25,0.14)',
                                    backgroundColor: 'rgba(255,255,255,0.26)',
                                    color: AI_CHAT_THEME.textSecondary
                                  }}
                                  title="编辑领域"
                                  aria-label="编辑领域"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleToggleDreamTopicDelete(activeDreamTopic.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70"
                                  style={{
                                    borderColor: 'rgba(157,84,77,0.22)',
                                    backgroundColor: 'rgba(196,111,79,0.07)',
                                    color: '#9d544d'
                                  }}
                                  title="删除领域"
                                  aria-label="删除领域"
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
                              <span>确认删除这个 Dream 领域以及下面的所有观察条目？</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setDreamTopicDeleteTargetId(null)}
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
                                  onClick={() => handleConfirmDreamTopicDelete(activeDreamTopic.id)}
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
                                这个领域下面还没有 Dream 观察。运行一次 `dream` 之后，我会把整理出来的内容放在这里。
                              </div>
                            ) : (
                              activeDreamEntries.map((entry) => (
                                <article key={entry.id} className="py-5 first:pt-6">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      {editingDreamEntryId === entry.id ? (
                                        <div className="space-y-3">
                                          <textarea
                                            value={dreamEntryDrafts.content}
                                            onChange={(event) => handleUpdateDreamEntryDraft(event.target.value)}
                                            rows={4}
                                            className="w-full resize-none rounded-[0.6rem] border px-3 py-3 text-[13px] leading-7 outline-none"
                                            style={{
                                              borderColor: 'rgba(32,28,25,0.14)',
                                              backgroundColor: 'rgba(255,255,255,0.56)',
                                              color: AI_CHAT_THEME.textPrimary
                                            }}
                                          />
                                          <div className="flex flex-wrap items-center justify-end gap-2">
                                            <button
                                              onClick={handleCancelDreamEntryEditor}
                                              className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/70"
                                              style={{
                                                borderColor: 'rgba(32,28,25,0.14)',
                                                backgroundColor: 'rgba(255,255,255,0.3)',
                                                color: AI_CHAT_THEME.textMuted
                                              }}
                                            >
                                              取消
                                            </button>
                                            <button
                                              onClick={() => handleSaveDreamEntry(entry.id)}
                                              className="rounded-[0.65rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white/80"
                                              style={{
                                                borderColor: 'color-mix(in srgb, var(--accent-color) 22%, rgba(32,28,25,0.14))',
                                                backgroundColor: 'color-mix(in srgb, var(--accent-color) 5%, rgba(255,255,255,0.55))',
                                                color: AI_CHAT_THEME.textPrimary
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
                                    <div className="flex shrink-0 flex-col items-center gap-2 text-xs">
                                      <button
                                        onClick={() => handleOpenDreamEntryEditor(entry)}
                                        disabled={editingDreamEntryId === entry.id}
                                        className="flex h-9 w-9 items-center justify-center rounded-[0.65rem] border transition-colors hover:bg-white/70 disabled:cursor-default disabled:opacity-45"
                                        style={{
                                          borderColor: 'rgba(32,28,25,0.14)',
                                          backgroundColor: 'rgba(255,255,255,0.26)',
                                          color: AI_CHAT_THEME.textSecondary
                                        }}
                                        title="编辑条目"
                                        aria-label="编辑条目"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleToggleDreamEntryDelete(entry.id)}
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
                                          onClick={() => setDreamEntryDeleteTargetId(null)}
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
                                          onClick={() => handleConfirmDreamEntryDelete(entry.id)}
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
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {dreamRangeSelectionState && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 p-5 backdrop-blur-sm">
            <div
              className="w-full max-w-sm overflow-hidden rounded-[1.4rem] border"
              style={{
                borderColor: AI_CHAT_THEME.panelBorder,
                backgroundColor: AI_CHAT_THEME.panelBg,
                boxShadow: AI_CHAT_THEME.cardShadowStrong
              }}
            >
              <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
                <div>
                  <h3 className="text-base font-bold text-stone-800">Dream 要整理哪段记录？</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-500">先选时间范围，我再按这段窗口整理 Dream。</p>
                </div>
                <button
                  onClick={handleCloseDreamRangeSelection}
                  className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 px-5 py-5">
                {([
                  'yesterday',
                  'this_week',
                  'this_month',
                  'this_year'
                ] as DreamRangeOptionId[]).map((optionId) => (
                  <button
                    key={optionId}
                    onClick={() => {
                      const targetSession = sessions.find((session) => session.id === dreamRangeSelectionState.sessionId);
                      handleCloseDreamRangeSelection();
                      if (targetSession) {
                        void handleDreamCommand(targetSession, optionId);
                      }
                    }}
                    className="w-full rounded-[0.95rem] border px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: AI_CHAT_THEME.panelBorder,
                      backgroundColor: AI_CHAT_THEME.panelBgStrong,
                      color: AI_CHAT_THEME.textPrimary
                    }}
                  >
                    <div className="text-sm font-semibold">{DREAM_RANGE_OPTION_LABELS[optionId]}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isAssistantMemoryViewerOpen && (
          <div className="absolute inset-0 z-20 bg-[rgba(15,23,42,0.14)] backdrop-blur-[10px]">
            <div
              className="flex h-full flex-col bg-[#f3f4f6]"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <div className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-4 backdrop-blur-md">
                <div>
                  <h3 className="font-serif text-lg font-bold leading-none text-[#201c19]">长期记忆</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAssistantMemory}
                    className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      borderColor: AI_CHAT_THEME.dangerBorder,
                      backgroundColor: AI_CHAT_THEME.dangerBg,
                      color: AI_CHAT_THEME.dangerText
                    }}
                  >
                    清空长期记忆
                  </button>
                  <button
                    onClick={handleCloseAssistantMemoryViewer}
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
                            onClick={() => handleOpenAssistantEditableMemoryComposer(key)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-[0.75rem] border text-xs font-medium transition-colors hover:bg-white"
                            style={{
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.panelBg,
                              color: AI_CHAT_THEME.textSecondary
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
                              borderColor: AI_CHAT_THEME.panelBorder,
                              backgroundColor: AI_CHAT_THEME.panelBg
                            }}
                          >
                            <textarea
                              value={assistantEditableMemoryDrafts[key]}
                              onChange={(event) => updateAssistantEditableMemoryDraft(key, event.target.value)}
                              placeholder={sectionMeta.placeholder}
                              rows={3}
                              className="w-full resize-none rounded-[0.75rem] border px-3 py-3 text-sm leading-6 outline-none"
                              style={{
                                borderColor: AI_CHAT_THEME.chipBorder,
                                backgroundColor: AI_CHAT_THEME.inputBg,
                                color: AI_CHAT_THEME.textPrimary
                              }}
                            />
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCancelAssistantEditableMemoryComposer(key)}
                                className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                                style={{
                                  borderColor: AI_CHAT_THEME.chipBorder,
                                  backgroundColor: AI_CHAT_THEME.inputBg,
                                  color: AI_CHAT_THEME.textMuted
                                }}
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleSaveAssistantEditableMemoryEntry(key)}
                                className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:brightness-[0.98]"
                                style={{
                                  borderColor: AI_CHAT_THEME.activeBorder,
                                  backgroundColor: AI_CHAT_THEME.activeBg,
                                  color: AI_CHAT_THEME.textPrimary
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
                                borderColor: AI_CHAT_THEME.panelBorder,
                                backgroundColor: AI_CHAT_THEME.panelBg
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
                                    borderColor: AI_CHAT_THEME.panelBorder,
                                    backgroundColor: 'rgba(255,255,255,0.84)'
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
                                      {item}
                                    </p>
                                    <button
                                      onClick={() => handleToggleAssistantEditableMemoryDelete(key, item)}
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
                                          onClick={() => setAssistantEditableMemoryDeleteTarget(null)}
                                          className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ddd6ce] bg-transparent text-[#71685f] transition-colors hover:bg-[#fffaf3]"
                                          title="取消删除"
                                        >
                                          <X size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleConfirmAssistantEditableMemoryDelete(key, item)}
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
                        onClick={handleOpenAssistantReminderComposer}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-[0.75rem] border text-xs font-medium transition-colors hover:bg-white"
                        style={{
                          borderColor: AI_CHAT_THEME.chipBorder,
                          backgroundColor: AI_CHAT_THEME.panelBg,
                          color: AI_CHAT_THEME.textSecondary
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
                          borderColor: AI_CHAT_THEME.panelBorder,
                          backgroundColor: AI_CHAT_THEME.panelBg
                        }}
                      >
                        <textarea
                          value={assistantReminderDrafts.text}
                          onChange={(event) => updateAssistantReminderDraft('text', event.target.value)}
                          placeholder="比如：周三上午记得回看导师邮件。"
                          rows={3}
                          className="w-full resize-none rounded-[0.75rem] border px-3 py-3 text-sm leading-6 outline-none"
                          style={{
                            borderColor: AI_CHAT_THEME.chipBorder,
                            backgroundColor: AI_CHAT_THEME.inputBg,
                            color: AI_CHAT_THEME.textPrimary
                          }}
                        />
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1.5">
                            <span className="text-xs font-medium text-stone-500">日期（YYYYMMDD）</span>
                            <input
                              value={assistantReminderDrafts.date}
                              onChange={(event) => updateAssistantReminderDraft('date', event.target.value.replace(/\D/g, '').slice(0, 8))}
                              placeholder="20260427"
                              inputMode="numeric"
                              className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
                              style={{
                                borderColor: AI_CHAT_THEME.chipBorder,
                                backgroundColor: AI_CHAT_THEME.inputBg,
                                color: AI_CHAT_THEME.textPrimary
                              }}
                            />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-xs font-medium text-stone-500">时间（HHMM）</span>
                            <input
                              value={assistantReminderDrafts.hour}
                              onChange={(event) => updateAssistantReminderDraft('hour', event.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="0930"
                              inputMode="numeric"
                              className="w-full rounded-[0.75rem] border px-3 py-2 text-sm outline-none"
                              style={{
                                borderColor: AI_CHAT_THEME.chipBorder,
                                backgroundColor: AI_CHAT_THEME.inputBg,
                                color: AI_CHAT_THEME.textPrimary
                              }}
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            onClick={handleCancelAssistantReminderComposer}
                            className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                            style={{
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.inputBg,
                              color: AI_CHAT_THEME.textMuted
                            }}
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveAssistantReminder}
                            className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors hover:brightness-[0.98]"
                            style={{
                              borderColor: AI_CHAT_THEME.activeBorder,
                              backgroundColor: AI_CHAT_THEME.activeBg,
                              color: AI_CHAT_THEME.textPrimary
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
                            borderColor: AI_CHAT_THEME.panelBorder,
                            backgroundColor: AI_CHAT_THEME.panelBg
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
                                borderColor: AI_CHAT_THEME.panelBorder,
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
                                  onClick={() => handleToggleAssistantReminderDelete(reminder.id)}
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
                                      onClick={() => setAssistantReminderDeleteTarget(null)}
                                      className="flex h-8 w-8 items-center justify-center rounded-[0.7rem] border border-[#ddd6ce] bg-transparent text-[#71685f] transition-colors hover:bg-[#fffaf3]"
                                      title="取消删除"
                                    >
                                      <X size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleConfirmAssistantReminderDelete(reminder.id)}
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
                        borderColor: AI_CHAT_THEME.panelBorder,
                        backgroundColor: AI_CHAT_THEME.panelBg,
                        color: AI_CHAT_THEME.textPrimary
                      }}
                    >
                      {assistantMemorySnapshot.recentDecisions[0] || '暂无'}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {isAssistantBackgroundHistoryViewerOpen && (
          <div className="absolute inset-0 z-20 bg-[rgba(15,23,42,0.14)] backdrop-blur-[10px]">
            <div
              className="flex h-full flex-col bg-[#f3f4f6]"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <div className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-4 backdrop-blur-md">
                <div>
                  <h3 className="font-serif text-lg font-bold leading-none text-[#201c19]">后台调用记录</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAssistantBackgroundCallHistory}
                    className="rounded-[0.75rem] border px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      borderColor: AI_CHAT_THEME.dangerBorder,
                      backgroundColor: AI_CHAT_THEME.dangerBg,
                      color: AI_CHAT_THEME.dangerText
                    }}
                  >
                    清空记录
                  </button>
                  <button
                    onClick={handleCloseAssistantBackgroundHistoryViewer}
                    className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#cfd8e3] hover:bg-[#f9fafb] hover:text-[#111827]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto max-w-4xl space-y-4">
                  {assistantBackgroundTimeline.length === 0 ? (
                    <div
                      className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-5"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                      }}
                    >
                      <p className="text-sm leading-6 text-stone-600">暂无后台诊断记录。</p>
                    </div>
                  ) : (
                    assistantBackgroundTimeline.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                          backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <p className="font-serif text-xl text-[#231f1b]">{getAssistantBackgroundTriggerLabel(entry.triggerType)}</p>
                          <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{
                            borderColor: AI_CHAT_THEME.chipBorder,
                            backgroundColor: AI_CHAT_THEME.panelBg,
                            color: AI_CHAT_THEME.textSecondary
                          }}>
                            {getAssistantBackgroundRequestStatusLabel(entry.requestStatus)}
                          </span>
                          {entry.debugExchange && (
                            <button
                              onClick={() => setDebugViewer({
                                title: `后台请求调试 · ${getAssistantBackgroundTriggerLabel(entry.triggerType)}`,
                                sections: [{
                                  label: '后台 AI 调用',
                                  exchange: entry.debugExchange
                                }]
                              })}
                              className="rounded-[0.75rem] border px-3 py-1 text-xs font-medium transition-colors"
                              style={{
                                borderColor: AI_CHAT_THEME.chipBorderStrong,
                                backgroundColor: AI_CHAT_THEME.panelBg,
                                color: AI_CHAT_THEME.textPrimary
                              }}
                            >
                              查看请求
                            </button>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-sm leading-6 text-stone-700">
                          <p>醒来时间：{entry.wakeAt || '未拿到原生时间'}</p>
                          <p>开始请求：{entry.requestStartedAt || '还没开始请求'}</p>
                          <p>请求结果：{entry.requestCompletedAt || (entry.requestStatus === 'pending' ? '进行中' : getAssistantBackgroundRequestStatusLabel(entry.requestStatus))}</p>
                          {entry.triggerId && <p>Trigger ID：{entry.triggerId}</p>}
                          <p>结果内容：{entry.outcomeSummary}</p>
                          {entry.message && <p>返回消息：{entry.message}</p>}
                          {entry.errorMessage && <p style={{ color: AI_CHAT_THEME.dangerText }}>错误：{entry.errorMessage}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {debugViewer && (
          <div className="absolute inset-0 z-20 bg-[rgba(15,23,42,0.14)] backdrop-blur-[10px]">
            <div
              className="flex h-full flex-col bg-[#f3f4f6]"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <div className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-4 backdrop-blur-md">
                <div>
                  <h3 className="font-serif text-lg font-bold leading-none text-[#201c19]">{debugViewer.title}</h3>
                </div>
                <button
                  onClick={() => setDebugViewer(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#cfd8e3] hover:bg-[#f9fafb] hover:text-[#111827]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto max-w-4xl space-y-4">
                  {debugViewer.sections.map((section) => (
                    <div
                      key={section.label}
                      className="rounded-[0.95rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                      }}
                    >
                      <p className="mb-3 font-serif text-xl text-[#231f1b]">{section.label}</p>
                      <div className="mb-3 space-y-3">
                        {buildDebugBlocks(section.exchange).map((block, index) => (
                          <div key={`${section.label}-${block.label}-${index}`}>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{block.label}</p>
                            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[0.85rem] border border-[#433a34] bg-[#2d2926] p-4 text-xs leading-6 text-[#efe7db] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                              {block.content}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <InputModal
          isOpen={isWeeklyReviewDateInputModalOpen}
          onClose={handleCloseWeeklyReviewDateInputModal}
          onConfirm={handleConfirmWeeklyReviewTemplateSelection}
          title="选择周范围"
          placeholder="20260511"
          maxLength={8}
          validateFn={(value) => (
            weeklyReviewTemplateService.parseWeekSelectionInput(value, new Date())
              ? null
              : '请输入 8 位日期 YYYYMMDD'
          )}
        />

      </div>
    </div>
  );
};
