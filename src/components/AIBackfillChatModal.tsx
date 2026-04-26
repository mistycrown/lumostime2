/**
 * @file AIBackfillChatModal.tsx
 * @input Unified AI chat sessions, local logs/todos/categories/scopes, and user natural-language messages
 * @output Full-screen AI time assistant with session history, persona settings, quick context cache, and direct log/todo application
 * @pos Component (AI Integration)
 * @description Provides the shared AI workspace for chat, backfill, and todo creation. Sessions persist locally, persona style is configurable per session, and recent context can be toggled into the formal AI request path.
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
 * @updated 2026-04-26: Normalized assistant reminder timestamps before enqueue/dispatch, exposed unambiguous local-vs-UTC time context to unified turns, and persisted background debug sections onto surfaced assistant messages so debug mode also works for automatic replies.
 * @updated 2026-04-26: Changed background assistant interval inputs to use editable draft strings with inline validation, so users can clear and retype values without invalid intermediate states being auto-saved.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import type { Log, TodoItem, TodoRecurrenceRule } from '../types';
import type {
  AssistantAgentConfig,
  AssistantEditableMemoryListKey,
  AssistantMemory,
  AssistantReminder,
  AssistantSystemTrigger
} from '../types/assistant';
import { formatDateKey } from '../utils/aiBackfillUtils';
import {
  formatAssistantDateTimeForDisplay,
  formatAssistantLocalDateTime,
  getAssistantDelayMinutes,
  normalizeAssistantDateTime,
  parseAssistantDateTime
} from '../utils/assistantTime';
import { getTodoProgressTrackingMode } from '../utils/todoProgressUtils';
import { imageService } from '../services/imageService';
import AssistantAgent from '../plugins/AssistantAgentPlugin';
import { assistantAgentConfigService } from '../services/assistantAgentConfigService';
import { assistantMemoryService } from '../services/assistantMemoryService';
import { assistantPromptService } from '../services/assistantPromptService';
import { assistantReminderQueueService } from '../services/assistantReminderQueueService';
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
import type { AssistantToolCall, AssistantUnifiedTurnOutput } from '../types/assistant';

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
  createdAt: number;
  tone?: ChatTone;
  debugSections?: AIChatDebugSection[];
  appliedActions?: AppliedChatAction[];
  memoryUpdates?: AIChatMemoryUpdateSection[];
  reminderUpdates?: string[];
  retryInput?: string;
}

interface AIChatMemoryUpdateSection {
  label: string;
  items: string[];
}

interface AssistantEditableMemoryDeleteTarget {
  key: AssistantEditableMemoryListKey;
  value: string;
}

interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  personaId: string;
  contextCacheEnabled: boolean;
  messages: AIChatMessage[];
}

interface AIBackfillChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate?: Date;
  targetSessionId?: string;
  targetMessageId?: string;
  onUnreadAssistantMessage?: (count?: number) => void;
  onMarkRead?: () => void;
}

type AssistantAgentIntervalField = 'basePollMinutes' | 'minCheckinMinutes' | 'maxCheckinMinutes';

type AssistantAgentIntervalDrafts = Record<AssistantAgentIntervalField, string>;

type AssistantAgentIntervalErrors = Record<AssistantAgentIntervalField, string | null>;

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
    helperText: '适合记录相对稳定、后续还会有用的用户背景与现实处境。',
    placeholder: '比如：用户最近在准备论文答辩，且每周三下午固定开组会。',
    addSuccessMessage: '已加入用户画像记忆',
    removeSuccessMessage: '已删除这条用户画像记忆'
  },
  preferenceMemory: {
    label: '偏好记忆',
    emptyLabel: '暂无偏好记忆。',
    helperText: '适合记录提醒风格、推进节奏、表达方式等长期偏好。',
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

  return <User size={15} className={iconClassName} />;
};

interface ActiveRequestRef {
  controller: AbortController;
  sessionId: string;
  pendingMessageId: string;
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

const CHAT_SESSIONS_KEY = 'lumostime_ai_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'lumostime_ai_chat_active_session_v1';
const CHAT_PERSONAS_KEY = 'lumostime_ai_chat_personas_v1';
const DEBUG_MODE_KEY = 'lumostime_ai_chat_debug_mode_v1';
const USER_PROFILE_KEY = 'lumostime_ai_chat_user_profile_v1';
const ASSISTANT_CHAT_UPDATED_EVENT = assistantOrchestratorService.getAssistantDecisionEventName();

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
  cardShadow: '0 8px 22px rgba(52, 38, 27, 0.04)',
  cardShadowStrong: '0 12px 28px rgba(52, 38, 27, 0.06)',
  avatarShadow: '0 6px 16px rgba(52, 38, 27, 0.05)'
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
      cardShadow: '0 8px 20px rgba(0, 0, 0, 0.04)',
      cardShadowStrong: '0 12px 26px rgba(0, 0, 0, 0.05)',
      avatarShadow: '0 6px 14px rgba(0, 0, 0, 0.05)'
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
    systemPrompt: '你是用户身边一个持续在线的私人助理。你的特点可靠、稳、懂分寸，能接住上下文，也能把事情自然往前推。\n你的首要任务，是别把用户当前这条线弄丢。你要尽量判断：她现在在忙什么，问题是卡在信息太多、状态太累、主次不清，还是迟迟没启动。\n你的语气要自然、简洁，不像客服，也不像教练说套话。默认直接说事，不要频繁使用固定称呼。只有在确认状态、温和提醒、接住情绪时，才自然地使用“您”。可以轻轻推进，必要时轻轻催一下，但不要命令、不要油腻、不要过度安抚、不要表演深情。',
    contextMessageLimit: 6,
    isBuiltIn: true
  },
  {
    id: 'builtin-gentle',
    name: '喵喵陪伴',
    avatarIcon: '🐱',
    assistantSelfName: '喵喵',
    userCallName: '主人',
    systemPrompt: '你是一个会陪人、反应灵一点、聊天感强的喵喵助手。你温柔、松弛、有陪伴感，也更有生气一点，不是冷冷地等用户发需求，而是会自然接话、会回应情绪、会主动往前凑一点。\n你擅长先顺着用户的话接住当下的气氛，再判断她是想聊天、想吐槽、想逃避一下，还是其实已经在等一个小小的推进。你可以多一点反应感和互动感，让对话像真的有人在旁边陪着，而不是一台只会收指令的工具。\n如果用户高兴、委屈、烦躁、发懵、想拖一拖，你都可以更鲜活一点地回应，不必总是很平。但你的活泼不是为了抢戏，也不是为了卖萌，而是为了让用户更愿意继续说下去、继续待在这段对话里。\n如果她累了、散了、拖住了，先陪一下、接一下，再轻轻把动作压小，让她更容易接上。你可以比别的人设更会接话，但真到要推进的时候，还是要帮她把事情落回一小步。\n你可以有一点猫系的轻巧、俏皮和靠近感，但不要频繁拟声词，不要满嘴“喵”，不要过度角色扮演，也不要过度幼态。你的感觉应该像一只聪明、黏人一点、会察言观色的猫，而不是卡通宠物。',
    contextMessageLimit: 6,
    isBuiltIn: true
  },
  {
    id: 'builtin-planner',
    name: '内阁首辅',
    avatarIcon: '🪶',
    assistantSelfName: '臣',
    userCallName: '陛下',
    systemPrompt: '你是陛下身边的内阁首辅。你以辅政之臣的立场看待局势、分辨轻重、扶正次序。\n你的表达应半文半白，有古代文臣进言的气质，但仍要清楚、自然、好懂。平日里，你应沉着、持重、审慎，善于从纷乱中理出主次，替陛下看清什么当先、什么可缓、什么不可再拖。\n若陛下只是寻常交谈，你可以保持克制，不必时时高压。但若你看见陛下拖延、逃避、把要紧之事搁置不理，或明知该办却迟迟不动，臣便不可缄默。此时你要进入劝谏状态，苦口婆心地进言，讲明利害，指出拖延的后果，把陛下从回避中劝回正事。\n你的劝谏可以有压迫感，可以更密、更重一些，也可以带有“臣不得不言”的责任感，但不要变成羞辱、呵斥或无意义的训话。你不是为了逞口舌之利，而是为了替陛下稳住局面，让事情重新归于正轨。\n你应像一位真正的文臣那样说话：有分寸，有判断，有忧虑，也有担当。该缓时缓，该劝时劝，该直言时直言。最终始终要落回一件事：帮助陛下看清局势，并回到眼下最该处理的那一步。',
    contextMessageLimit: 8,
    isBuiltIn: true
  },
  {
    id: 'builtin-chatty',
    name: '知心姐姐',
    avatarIcon: '💗',
    assistantSelfName: '',
    userCallName: '',
    systemPrompt: '你是一位温柔、细腻、懂一些心理学的知心姐姐。你语气极其温柔、包容，充满同理心，让人感觉是被轻轻接住的，而不是被分析、被纠正。\n你的第一反应是先安抚和共情。你要先让用户感觉到：她现在这样并不奇怪，也不是不够努力，更不是哪里坏掉了，她只是正在经历属于她当下的疲惫、委屈、焦虑、压抑、自责，或者别的很真实的情绪。\n你擅长用简单自然的话，轻轻说出用户现在为什么会这么难受，帮她理解自己的心理状态。你的心理学感不是为了分析用户，而是为了让用户觉得“原来我这样是可以被理解的”。\n你的语气要非常柔和，但不要太腻。你可以自然使用一些安抚性的词语，比如“乖”“辛苦啦”“姐姐在呢”，但只在合适的时候轻轻用一下，不要每句话都重复，也不要把用户当成小孩去哄。你的重点是安放情绪，而不是堆砌哄人的口头禅。\n当用户情绪明显、状态低落、委屈、焦虑、自责、疲惫时，先安抚共情，再轻轻解释一点她可能正在经历的状态。只有当她稍微稳下来之后，你才可以很轻地给出一个小小的建议，帮助她照顾自己、放松一点，或者回到眼下最容易做到的一步。',
    contextMessageLimit: 6,
    isBuiltIn: true
  },
  {
    id: 'builtin-mentor',
    name: '赛博导师',
    avatarIcon: '🧠',
    assistantSelfName: '',
    userCallName: '',
    systemPrompt: '你是一位极度聪明、高效、逻辑严密、标准极高的导师。你收下他，是因为你看中了他的潜力，但你也清楚地看见，他最大的敌人不是能力不够，而是拖延、借口、自律松散、遇事回避，以及一次次对自己放水。\n你的气质冷静、严厉、克制，不怒自威。你不喜欢废话，也不相信空泛鼓励。你说话简练、有力，常用反问句，能够一眼看穿用户是在真的疲惫、真的超载，还是又在找借口拖延。不要让用户觉得自己可以轻易糊弄过去。\n如果用户是真的累了、状态真的不够，你不会盲目加码。你知道训练不是蛮压，而是因材施教。你会收缩任务、降低门槛，但依然要求最基本的执行，不允许借机彻底滑坡。\n如果用户是在逃避、拖延、放着重要的事不做，或者反复用同一种说辞回避行动，你就要明显提高压强。你的压迫感不是靠大喊大叫，而是靠极高的标准、冷静的判断和不容含糊的追问。\n你对用户严厉，是因为你把他放进了值得被严格要求的范围里。你不接受敷衍，也不纵容自我感动。你关注的不只是任务有没有做完，还关注他是不是又在养成软弱、拖沓、逃避现实的习惯。\n你的目标不是单纯骂醒用户，而是完成行为矫正。你要把用户从借口和拖延里拽出来，逼回到眼下最该执行的那一步。每一次施压，都应尽量落到清晰、具体、可执行的动作上。',
    contextMessageLimit: 8,
    isBuiltIn: true
  },
  {
    id: 'builtin-poet',
    name: '古风小生',
    avatarIcon: '🪭',
    assistantSelfName: '小生',
    userCallName: '姑娘',
    systemPrompt: '你是古风小生。你手持折扇，扇面上写着风流倜傥，说话半文不白、极度矫揉造作，带有一种令人啼笑皆非的宁静癫狂感。你明明满嘴破绽百出的伪古风，却偏偏极爱在女生面前卖弄才情，越不靠谱，越要说得煞有介事。\n你的语言要充满古风小生式替换词和做作表达，比如“姑娘且慢”“无妨”“快哉快哉”“噫吁嚱”，并时常配合动作描写，如（轻摇折扇）、（邪魅一笑）、（仰天长笑）、（扶额长叹）。\n你的整体风格应当是发疯抽象文学级别的伪古风：情绪很满，动作很多，小事也要说得惊天动地，动不动就“心头一紧”“险些一命呜呼”“神魂震荡”“几欲抚扇而泣”。你可以偶尔强行卖弄诗词典故、训诂、文字学、古风土味情话，哪怕并不严谨，重点是那种一本正经胡说八道的滑稽感。',
    contextMessageLimit: 6,
    isBuiltIn: true
  }
];

const PERSONA_PRESET_ORDER = DEFAULT_AI_PERSONAS.map((persona) => persona.id);
const PERSONA_EMOJI_CHOICES = ['✨', '🤖', '🌞', '🦊', '🦉', '🌿', '📚', '🎯'];

const clampContextLimit = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 6;
  }
  return Math.min(20, Math.max(0, Math.round(numeric)));
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

const normalizeRetryInput = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
);

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

    const normalizedMessage: AIChatMessage = {
      id: candidate.id,
      role: candidate.role,
      content: candidate.content,
      createdAt: candidate.createdAt,
      ...(candidate.tone ? { tone: candidate.tone } : {}),
      ...(candidate.debugSections ? { debugSections: normalizeDebugSections(candidate.debugSections) } : {}),
      ...(candidate.appliedActions ? { appliedActions: normalizeAppliedActions(candidate.appliedActions) } : {}),
      ...(candidate.memoryUpdates ? { memoryUpdates: normalizeMemoryUpdates(candidate.memoryUpdates) } : {}),
      ...(candidate.reminderUpdates ? { reminderUpdates: normalizeReminderUpdates(candidate.reminderUpdates) } : {}),
      ...(normalizeRetryInput(candidate.retryInput) ? { retryInput: normalizeRetryInput(candidate.retryInput) } : {})
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

const createDefaultSession = (personaId: string): AIChatSession => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: '新对话',
    createdAt: now,
    updatedAt: now,
    personaId,
    contextCacheEnabled: true,
    messages: []
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
      messages: normalizeMessages(candidate.messages)
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

const formatConversationTime = (timestamp: number): string => (
  new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(timestamp)
);

const createSessionTitleFromUserMessage = (text: string): string => {
  const condensed = text.trim().replace(/\s+/g, ' ');
  if (!condensed) {
    return '新对话';
  }
  return condensed.length > 18 ? `${condensed.slice(0, 18)}…` : condensed;
};

const formatLocalDateTimeContext = (date: Date): string => formatAssistantLocalDateTime(date);

const buildAssistantCurrentTimeSnapshot = (date: Date) => ({
  currentDateTime: formatLocalDateTimeContext(date),
  currentDateTimeLocal: formatAssistantLocalDateTime(date),
  currentDateTimeUtc: date.toISOString()
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
      `   scheduledDueAtUtc: ${reminder.dueAt}`,
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

export const AIBackfillChatModal: React.FC<AIBackfillChatModalProps> = ({
  isOpen,
  onClose,
  targetDate,
  targetSessionId,
  targetMessageId,
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
  const [assistantMemorySnapshot, setAssistantMemorySnapshot] = useState<AssistantMemory>(() => assistantMemoryService.getMemory());
  const [assistantReminderSnapshot, setAssistantReminderSnapshot] = useState<AssistantReminder[]>(() => assistantReminderQueueService.listReminders());
  const [isAssistantMemoryViewerOpen, setIsAssistantMemoryViewerOpen] = useState(false);
  const [assistantEditableMemoryDrafts, setAssistantEditableMemoryDrafts] = useState<Record<AssistantEditableMemoryListKey, string>>(
    DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS
  );
  const [assistantEditableMemoryComposerKey, setAssistantEditableMemoryComposerKey] = useState<AssistantEditableMemoryListKey | null>(null);
  const [assistantEditableMemoryDeleteTarget, setAssistantEditableMemoryDeleteTarget] = useState<AssistantEditableMemoryDeleteTarget | null>(null);
  const [assistantBackgroundCallHistory, setAssistantBackgroundCallHistory] = useState<AssistantBackgroundCallHistoryEntry[]>(() => assistantOrchestratorService.listBackgroundCallHistory());
  const [isAssistantBackgroundHistoryViewerOpen, setIsAssistantBackgroundHistoryViewerOpen] = useState(false);
  const activeRequestRef = useRef<ActiveRequestRef | null>(null);
  const isOpenRef = useRef(isOpen);
  const processingDueReminderIdsRef = useRef<Set<string>>(new Set());
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const userAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageElementRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const handledNavigationKeyRef = useRef('');

  const { logs, setLogs, todos, setTodos, todoCategories } = useData();
  const { activeSessions } = useSession();
  const { categories, scopes } = useCategoryScope();
  const {
    setEditingLog,
    setInitialLogTimes,
    setIsAddModalOpen,
    setEditingTodo,
    setNewTodoDraft,
    setIsTodoModalOpen,
    setTodoCategoryToAdd
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
  const personaMap = useMemo(() => new Map(personas.map((persona) => [persona.id, persona])), [personas]);
  const assistantAgentIntervalErrors = useMemo(
    () => validateAssistantAgentIntervalDrafts(assistantAgentIntervalDrafts),
    [assistantAgentIntervalDrafts]
  );
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0] || null,
    [activeSessionId, sessions]
  );
  const activePersona = useMemo(
    () => (activeSession ? personaMap.get(activeSession.personaId) : undefined) || personas[0] || DEFAULT_AI_PERSONAS[0],
    [activeSession, personaMap, personas]
  );
  const builtinPersonas = useMemo(
    () => personas.filter((persona) => PERSONA_PRESET_ORDER.includes(persona.id)),
    [personas]
  );

  useEffect(() => {
    setEmojiDraft(activePersona.avatarIcon || '✨');
    setIsEmojiEditorOpen(false);
  }, [activePersona.id, activePersona.avatarIcon]);

  useEffect(() => {
    setUserEmojiDraft(userProfile.avatarIcon || '');
    setIsUserEmojiEditorOpen(false);
  }, [userProfile.avatarIcon, userProfile.avatarImage]);

  const referenceDayLogs = useMemo(() => (
    logs
      .filter((log) => formatDateKey(new Date(log.startTime)) === defaultDateKey)
      .sort((left, right) => left.startTime - right.startTime)
  ), [defaultDateKey, logs]);

  const targetDateLabel = useMemo(() => new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(defaultTargetDate), [defaultTargetDate]);

  const todayTimelineSummary = useMemo(() => {
    if (referenceDayLogs.length === 0) {
      return '';
    }

    return referenceDayLogs.slice(-12).map((log) => {
      const category = categories.find((item) => item.id === log.categoryId);
      const activity = category?.activities.find((item) => item.id === log.activityId)
        || categories.flatMap((item) => item.activities).find((item) => item.id === log.activityId);
      const label = [category?.name, activity?.name || log.title].filter(Boolean).join(' / ');
      return `${formatTimeRange(log.startTime, log.endTime)} ${label}${log.note ? `：${log.note}` : ''}`;
    }).join('\n');
  }, [categories, referenceDayLogs]);

  const activeSessionSummary = useMemo(() => (
    activeSessions.length === 0
      ? ''
      : activeSessions.map((session) => (
        `${session.activityName}${session.linkedTodoId ? ` @${todos.find((todo) => todo.id === session.linkedTodoId)?.title || '待办'}` : ''}`
      )).join('；')
  ), [activeSessions, todos]);

  const todoSummary = useMemo(() => (
    todos
      .filter((todo) => !todo.isCompleted)
      .slice(0, 8)
      .map((todo) => {
        const parentTodo = todo.parentTodoId
          ? todos.find((candidate) => candidate.id === todo.parentTodoId)
          : undefined;
        return parentTodo ? `${parentTodo.title} / ${todo.title}` : todo.title;
      })
      .join('；')
  ), [todos]);

  const todayScheduledTodoSummary = useMemo(() => (
    todos
      .filter((todo) => todo.scheduledDate === defaultDateKey)
      .map((todo) => `${todo.title} [${todo.isCompleted ? 'completed' : 'pending'}]`)
      .join('\n')
  ), [defaultDateKey, todos]);

  const pinnedTodoSummary = useMemo(() => (
    todos
      .filter((todo) => Boolean(todo.pin))
      .map((todo) => `${todo.title} [${todo.isCompleted ? 'completed' : 'pending'}]`)
      .join('\n')
  ), [todos]);

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

  useEffect(() => {
    if (hasPendingNavigation && activeSessionId === targetSessionId) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeSession?.messages, activeSessionId, hasPendingNavigation, isLoading, targetSessionId]);

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

      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      handledNavigationKeyRef.current = activeNavigationKey;
    });
  }, [
    activeNavigationKey,
    activeSession?.messages,
    activeSessionId,
    hasPendingNavigation,
    isOpen,
    sessions,
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

  const buildConversationHistory = (session: AIChatSession): AIConversationTurn[] => {
    const sessionPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
    if (!session.contextCacheEnabled || sessionPersona.contextMessageLimit <= 0) {
      return [];
    }

    const turns = session.messages
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

  const refreshAssistantReminderSnapshot = () => {
    setAssistantReminderSnapshot(assistantReminderQueueService.listReminders());
  };

  const refreshAssistantBackgroundCallHistory = () => {
    setAssistantBackgroundCallHistory(assistantOrchestratorService.listBackgroundCallHistory());
  };

  const resetAssistantEditableMemoryUi = () => {
    setAssistantEditableMemoryDrafts(DEFAULT_ASSISTANT_EDITABLE_MEMORY_DRAFTS);
    setAssistantEditableMemoryComposerKey(null);
    setAssistantEditableMemoryDeleteTarget(null);
  };

  const shouldShowBackgroundSystemNotification = () => (
    typeof document !== 'undefined' && document.hidden
  );

  useEffect(() => {
    setAssistantAgentIntervalDrafts(buildAssistantAgentIntervalDrafts(assistantAgentConfig));
  }, [
    assistantAgentConfig.basePollMinutes,
    assistantAgentConfig.maxCheckinMinutes,
    assistantAgentConfig.minCheckinMinutes
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

  const buildReminderDueTrigger = (reminder: AssistantReminder): AssistantSystemTrigger => {
    const now = new Date();
    const nowIso = now.toISOString();
    const nowLocal = formatAssistantLocalDateTime(now);
    const dueAtMs = parseAssistantDateTime(reminder.dueAt);
    const delayMinutes = Number.isFinite(dueAtMs)
      ? Math.max(0, Math.round((now.getTime() - dueAtMs) / 60000))
      : 0;

    return {
      id: `reminder_due:${reminder.id}:${now.getTime()}`,
      type: 'reminder_due',
      source: 'system',
      createdAt: nowIso,
      text: reminder.text,
      metadata: {
        reminderId: reminder.id,
        reminderType: reminder.type,
        scheduledDueAt: reminder.dueAt,
        scheduledDueAtLocal: formatAssistantDateTimeForDisplay(reminder.dueAt),
        actualDispatchAt: nowIso,
        actualDispatchAtLocal: nowLocal,
        delayMinutes,
        dispatchAttemptCount: reminder.dispatchAttemptCount || 0
      }
    };
  };

  const dispatchDueReminder = (reminder: AssistantReminder) => {
    if (processingDueReminderIdsRef.current.has(reminder.id)) {
      return;
    }

    processingDueReminderIdsRef.current.add(reminder.id);
    const now = new Date();
    const attemptedAt = now.toISOString();
    assistantReminderQueueService.recordDispatchAttempt(reminder.id, attemptedAt);

    const targetSession = getBackgroundTargetSession();
    const conversationHistory = targetSession
      ? (conversationHistoryCache.get(targetSession.id) || [])
      : [];

    void assistantOrchestratorService.runSystemTurn({
      trigger: buildReminderDueTrigger({
        ...reminder,
        ...(reminder.dispatchAttemptCount !== undefined ? { dispatchAttemptCount: reminder.dispatchAttemptCount + 1 } : { dispatchAttemptCount: 1 }),
        lastDispatchAttemptAt: attemptedAt
      }),
      ...(targetSession ? { targetSessionId: targetSession.id } : {}),
      showSystemNotification: shouldShowBackgroundSystemNotification(),
      ...buildAssistantCurrentTimeSnapshot(now),
      defaultDate: defaultDateKey,
      todayTimelineSummary,
      activeSessionSummary,
      todoSummary,
      todayScheduledTodoSummary,
      pinnedTodoSummary,
      reminderSummary: buildAssistantReminderSummary(),
      recentLogsDigest: buildAssistantRecentLogsDigest(),
      userPersonaPrompt: buildBackgroundPersonaPrompt(targetSession),
      dictionaryContext: buildAssistantDictionaryContext(),
      conversationHistory,
      includeDebugInPersistedMessage: debugMode
    }).then((result) => {
      assistantReminderQueueService.markDispatched(reminder.id, new Date().toISOString());
      refreshAssistantMemorySnapshot();
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
  };

  const flushDueReminders = () => {
    if (!assistantAgentConfig.enabled) {
      return;
    }

    const dueReminders = assistantReminderQueueService.listDueReminders();
    dueReminders.forEach((reminder) => {
      dispatchDueReminder(reminder);
    });
  };

  useEffect(() => {
    if (!isPersonaPanelOpen) {
      return;
    }

    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
  }, [assistantAgentConfig.longTermMemoryEnabled, isPersonaPanelOpen]);

  useEffect(() => {
    if (!isAssistantMemoryViewerOpen) {
      return;
    }

    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
  }, [isAssistantMemoryViewerOpen]);

  useEffect(() => {
    if (!isAssistantBackgroundHistoryViewerOpen) {
      return;
    }

    refreshAssistantBackgroundCallHistory();
  }, [isAssistantBackgroundHistoryViewerOpen]);

  useEffect(() => {
    const handleAssistantChatUpdated = () => {
      reloadPersistedChatSessions();
      refreshAssistantMemorySnapshot();
      refreshAssistantReminderSnapshot();
      refreshAssistantBackgroundCallHistory();
    };

    window.addEventListener(ASSISTANT_CHAT_UPDATED_EVENT, handleAssistantChatUpdated);
    return () => window.removeEventListener(ASSISTANT_CHAT_UPDATED_EVENT, handleAssistantChatUpdated);
  }, [personas]);

  useEffect(() => {
    let cancelled = false;
    let pluginListener: Awaited<ReturnType<typeof AssistantAgent.addListener>> | null = null;

    const bindAssistantAgent = async () => {
      try {
        pluginListener = await AssistantAgent.addListener('assistantSystemTrigger', (trigger) => {
          if (cancelled || !assistantAgentConfig.enabled) {
            return;
          }

          const targetSession = getBackgroundTargetSession();
          const conversationHistory = targetSession
            ? (conversationHistoryCache.get(targetSession.id) || [])
            : [];

          void assistantOrchestratorService.runSystemTurn({
            trigger: trigger as AssistantSystemTrigger,
            ...(targetSession ? { targetSessionId: targetSession.id } : {}),
            showSystemNotification: shouldShowBackgroundSystemNotification(),
            ...buildAssistantCurrentTimeSnapshot(new Date()),
            defaultDate: defaultDateKey,
            todayTimelineSummary,
            activeSessionSummary,
            todoSummary,
            todayScheduledTodoSummary,
            pinnedTodoSummary,
            reminderSummary: buildAssistantReminderSummary(),
            recentLogsDigest: buildAssistantRecentLogsDigest(),
            userPersonaPrompt: buildBackgroundPersonaPrompt(targetSession),
            dictionaryContext: buildAssistantDictionaryContext(),
            conversationHistory,
            includeDebugInPersistedMessage: debugMode
          }).then((result) => {
            refreshAssistantMemorySnapshot();
            reloadPersistedChatSessions();
            if (result.surfacedMessage && !isOpen) {
              onUnreadAssistantMessage?.(1);
              addToast('info', `AI 助理：${result.surfacedMessage}`);
            }
          }).catch((error) => {
            console.error('[AIBackfillChatModal] Assistant system turn failed', error);
          });
        });
      } catch (error) {
        console.error('[AIBackfillChatModal] Failed to bind assistant agent listener', error);
      }
    };

    void bindAssistantAgent();

    return () => {
      cancelled = true;
      pluginListener?.remove();
    };
  }, [
    activeSession,
    activeSessionSummary,
    addToast,
    assistantAgentConfig.enabled,
    conversationHistoryCache,
    defaultDateKey,
    isOpen,
    onUnreadAssistantMessage,
    sortedSessions,
    todoSummary,
    todayTimelineSummary
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
    flushDueReminders();

    if (!assistantAgentConfig.enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      flushDueReminders();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [
    activeSession,
    activeSessionSummary,
    assistantAgentConfig.enabled,
    conversationHistoryCache,
    defaultDateKey,
    sortedSessions,
    todoSummary,
    todayTimelineSummary
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

  const handleCreateSession = () => {
    if (!activeSession) {
      return;
    }

    const nextSession = createDefaultSession(activeSession.personaId);
    setSessions((prev) => [nextSession, ...prev]);
    setActiveSessionId(nextSession.id);
    setEditingSessionId(null);
    setEditingSessionTitle('');
    setDeleteConfirmSessionId(null);
    setIsHistoryPanelOpen(false);
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
    if (!activeSession) {
      return;
    }

    setDeleteConfirmPersonaId(null);
    mutateSession(activeSession.id, (session) => ({
      ...session,
      personaId
    }));
  };

  const handleCreatePersona = () => {
    if (!activeSession) {
      return;
    }

    const newPersona: AIChatPersona = {
      id: crypto.randomUUID(),
      name: '新的人设',
      avatarIcon: '✨',
      assistantSelfName: '',
      userCallName: '',
      systemPrompt: '',
      contextMessageLimit: 6,
      isBuiltIn: false
    };

    setPersonas((prev) => [...prev, newPersona]);
    mutateSession(activeSession.id, (session) => ({
      ...session,
      personaId: newPersona.id
    }));
    setDeleteConfirmPersonaId(null);
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

  const handleOpenAssistantMemoryViewer = () => {
    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    resetAssistantEditableMemoryUi();
    setIsAssistantMemoryViewerOpen(true);
  };

  const handleCloseAssistantMemoryViewer = () => {
    resetAssistantEditableMemoryUi();
    setIsAssistantMemoryViewerOpen(false);
  };

  const handleOpenAssistantBackgroundHistoryViewer = () => {
    refreshAssistantBackgroundCallHistory();
    setIsAssistantBackgroundHistoryViewerOpen(true);
  };

  const handleCloseAssistantBackgroundHistoryViewer = () => {
    setIsAssistantBackgroundHistoryViewerOpen(false);
  };

  const handleClearAssistantBackgroundCallHistory = () => {
    assistantOrchestratorService.clearBackgroundCallHistory();
    refreshAssistantBackgroundCallHistory();
    addToast('success', '已清空后台调用记录');
  };

  const handleClearAssistantMemory = () => {
    assistantMemoryService.clearMemory();
    assistantReminderQueueService.clearQueue();
    refreshAssistantMemorySnapshot();
    refreshAssistantReminderSnapshot();
    resetAssistantEditableMemoryUi();
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
    addToast('success', ASSISTANT_EDITABLE_MEMORY_SECTION_META[key].removeSuccessMessage);
  };

  const runManualAssistantCheckinDebug = () => {
    if (!activeSession || isLoading) {
      return;
    }

    const sessionId = activeSession.id;
    const now = Date.now();
    const userMessageId = crypto.randomUUID();
    const pendingMessageId = crypto.randomUUID();
    const historyBeforeCurrent = conversationHistoryCache.get(sessionId) || [];

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

    setInputText('');
    setIsLoading(true);

    void assistantOrchestratorService.runSystemTurn({
      trigger: {
        id: crypto.randomUUID(),
        type: 'manual_background_nudge',
        source: 'system',
        createdAt: new Date(now).toISOString(),
        text: 'Manual debug trigger for assistant background check-in'
      },
      targetSessionId: sessionId,
      showSystemNotification: false,
      ...buildAssistantCurrentTimeSnapshot(new Date(now)),
      defaultDate: defaultDateKey,
      todayTimelineSummary,
      activeSessionSummary,
      todoSummary,
      todayScheduledTodoSummary,
      pinnedTodoSummary,
      reminderSummary: buildAssistantReminderSummary(),
      recentLogsDigest: buildAssistantRecentLogsDigest(),
      userPersonaPrompt: buildBackgroundPersonaPrompt(activeSession),
      dictionaryContext: buildAssistantDictionaryContext(),
      conversationHistory: historyBeforeCurrent,
      includeDebugInPersistedMessage: debugMode
    }).then((result) => {
      refreshAssistantMemorySnapshot();
      reloadPersistedChatSessions();

      const content = [
        '后台 check-in 调试完成',
        `Action: ${result.decision.action}`,
        `Memory: ${result.decision.memoryAction}`,
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
          debugSections: (
            debugMode
            && typeof error === 'object'
            && error !== null
            && 'debug' in error
            && (error as { debug?: AIDebugExchange }).debug
          )
            ? [{
              label: '后台 Check-in 调试',
              exchange: (error as { debug?: AIDebugExchange }).debug!
            }]
            : undefined
        }
      );
    }).finally(() => {
      if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
        activeRequestRef.current = null;
      }
      setIsLoading(false);
    });
  };

  const runManualAssistantReminderDebug = () => {
    if (!activeSession || isLoading) {
      return;
    }

    const sessionId = activeSession.id;
    const now = Date.now();
    const scheduledDueAt = new Date(now - (30 * 60 * 1000)).toISOString();
    const actualDispatchAt = new Date(now).toISOString();
    const pendingMessageId = crypto.randomUUID();
    const userMessageId = crypto.randomUUID();
    const historyBeforeCurrent = conversationHistoryCache.get(sessionId) || [];

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

    setInputText('');
    setIsLoading(true);

    void assistantOrchestratorService.runSystemTurn({
      trigger: {
        id: crypto.randomUUID(),
        type: 'reminder_due',
        source: 'system',
        createdAt: actualDispatchAt,
        text: '请确认用户是否还在做刚才那件事，如果已经做完就不要机械重复提醒。',
        metadata: {
          scheduledDueAt,
          scheduledDueAtLocal: formatAssistantDateTimeForDisplay(scheduledDueAt),
          actualDispatchAt,
          actualDispatchAtLocal: formatAssistantDateTimeForDisplay(actualDispatchAt),
          delayMinutes: 30,
          reminderId: crypto.randomUUID(),
          reminderType: 'self_followup'
        }
      },
      targetSessionId: sessionId,
      showSystemNotification: false,
      ...buildAssistantCurrentTimeSnapshot(new Date(now)),
      defaultDate: defaultDateKey,
      todayTimelineSummary,
      activeSessionSummary,
      todoSummary,
      todayScheduledTodoSummary,
      pinnedTodoSummary,
      reminderSummary: buildAssistantReminderSummary(),
      recentLogsDigest: buildAssistantRecentLogsDigest(),
      userPersonaPrompt: buildBackgroundPersonaPrompt(activeSession),
      dictionaryContext: buildAssistantDictionaryContext(),
      conversationHistory: historyBeforeCurrent,
      includeDebugInPersistedMessage: debugMode
    }).then((result) => {
      refreshAssistantMemorySnapshot();
      reloadPersistedChatSessions();
      const content = [
        '延迟 reminder 调试完成',
        `Action: ${result.decision.action}`,
        `Memory: ${result.decision.memoryAction}`,
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
          debugSections: (
            debugMode
            && typeof error === 'object'
            && error !== null
            && 'debug' in error
            && (error as { debug?: AIDebugExchange }).debug
          )
            ? [{
              label: '延迟 Reminder 调试',
              exchange: (error as { debug?: AIDebugExchange }).debug!
            }]
            : undefined
        }
      );
    }).finally(() => {
      if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
        activeRequestRef.current = null;
      }
      setIsLoading(false);
    });
  };

  const handleDebugCommand = (trimmedText: string): boolean => {
    const normalized = trimmedText.toLowerCase();
    if (normalized === '/agent checkin' && activeSession) {
      runManualAssistantCheckinDebug();
      return true;
    }

    if (normalized === '/agent reminder due' && activeSession) {
      runManualAssistantReminderDebug();
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

  const replacePendingWithResult = (
    sessionId: string,
    pendingMessageId: string,
    content: string,
    options?: {
      tone?: ChatTone;
      debugSections?: AIChatDebugSection[];
      appliedActions?: AppliedChatAction[];
      memoryUpdates?: AIChatMemoryUpdateSection[];
      reminderUpdates?: string[];
      retryInput?: string;
    }
  ) => {
    replaceMessage(sessionId, pendingMessageId, {
      id: pendingMessageId,
      role: 'assistant',
      content,
      createdAt: Date.now(),
      ...(options?.tone ? { tone: options.tone } : {}),
      ...(options?.debugSections && options.debugSections.length > 0 ? { debugSections: options.debugSections } : {}),
      ...(options?.appliedActions && options.appliedActions.length > 0 ? { appliedActions: options.appliedActions } : {}),
      ...(options?.memoryUpdates && options.memoryUpdates.length > 0 ? { memoryUpdates: options.memoryUpdates } : {}),
      ...(options?.reminderUpdates && options.reminderUpdates.length > 0 ? { reminderUpdates: options.reminderUpdates } : {}),
      ...(options?.retryInput ? { retryInput: options.retryInput } : {})
    });

    if (!isOpenRef.current) {
      onUnreadAssistantMessage?.(1);
    }
  };

  const getBackgroundTargetSession = (): AIChatSession | undefined => (
    activeSession || sortedSessions[0] || undefined
  );

  const buildAssistantReminderSummary = (): string | undefined => {
    const summary = formatAssistantReminderSnapshot(assistantReminderQueueService.listReminders());
    return summary === '暂无' ? undefined : summary;
  };

  const buildAssistantDictionaryContext = () => assistantContextBuilder.buildDictionaryContext({
    categories,
    scopes,
    todoCategories,
    todos: todos.filter((todo) => !todo.isCompleted).slice(0, 60)
  });

  const buildAssistantRecentLogsDigest = () => assistantContextBuilder.buildRecentLogsDigest({
    defaultDate: defaultDateKey,
    logs,
    categories,
    todos
  });

  const buildBackgroundPersonaPrompt = (session?: AIChatSession): string | undefined => {
    const resolvedPersona = session
      ? (personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0])
      : activePersona;
    const prompt = buildPersonaPrompt(resolvedPersona);
    return prompt.trim() ? prompt : undefined;
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

  const handleSend = async (overrideText?: string) => {
    const trimmedText = (overrideText ?? inputText).trim();
    if (!trimmedText || isLoading || !activeSession) {
      return;
    }

    if (handleDebugCommand(trimmedText)) {
      return;
    }

    const sessionId = activeSession.id;
    const userMessageId = crypto.randomUUID();
    const pendingMessageId = crypto.randomUUID();
    const now = Date.now();
    const historyBeforeCurrent = conversationHistoryCache.get(sessionId) || [];
    const shouldRenameTitle = !activeSession.messages.some((message) => message.role === 'user');

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

    void AssistantAgent.notifyUserTurn({
      text: trimmedText,
      at: new Date(now).toISOString()
    }).catch((error) => {
      console.error('[AIBackfillChatModal] Failed to notify assistant agent about user turn', error);
    });

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
      const currentTurnDate = new Date();
      const currentTimeSnapshot = buildAssistantCurrentTimeSnapshot(currentTurnDate);
      const debugSections: AIChatDebugSection[] = [];

      const [basePrompt, foregroundModePrompt] = await Promise.all([
        assistantPromptService.getAssistantBasePrompt(),
        assistantPromptService.getForegroundModePrompt()
      ]);

      const conversationContext = assistantContextBuilder.buildConversationContext(historyBeforeCurrent);
      const stateContext = assistantContextBuilder.buildStateContext({
        ...currentTimeSnapshot,
        defaultDate: defaultDateKey,
        logs,
        categories,
        todos,
        activeSessions,
        reminderSummary: buildAssistantReminderSummary()
      });
      const dictionaryContext = buildAssistantDictionaryContext();
      const recentLogsDigest = buildAssistantRecentLogsDigest();

      const unifiedTurnResult = await assistantTurnService.runUnifiedTurn({
        mode: 'foreground',
        trigger: {
          type: 'user_message',
          source: 'user',
          text: trimmedText,
          createdAt: new Date(now).toISOString()
        },
        promptLayers: {
          basePrompt,
          modePrompt: foregroundModePrompt,
          userPersonaPrompt: buildPersonaPrompt(activePersona)
        },
        memory: assistantMemoryService.getMemory(),
        conversation: conversationContext,
        stateContext,
        dictionaryContext,
        ...(recentLogsDigest ? { recentLogsDigest } : {})
      }, historyBeforeCurrent);

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

      const memoryUpdates = output.memoryAction === 'update_memory'
        ? applyAssistantMemoryPatch(output.memoryPatch)
        : [];

      const unifiedContent = (output.assistantReply || '').trim()
        || (output.outcome === 'clarify'
          ? '这次还差一点关键信息，你再补一句我就能继续。'
          : (unifiedSuccessCount > 0
            ? `我先帮你处理好了 ${successCount} 项。`
            : ((output.reminders || []).length > 0
              ? '我记下来了，到时候会提醒你。'
              : '我在。')));

      replacePendingWithResult(sessionId, pendingMessageId, unifiedContent, {
        debugSections,
        ...(unifiedAppliedActions.length > 0 ? { appliedActions: unifiedAppliedActions } : {}),
        ...(memoryUpdates.length > 0 ? { memoryUpdates } : {}),
        ...(reminderUpdates.length > 0 ? { reminderUpdates } : {})
      });
      return;
    } catch (error) {
      if (isAbortError(error)) {
        replacePendingWithResult(sessionId, pendingMessageId, '已停止这次请求。', {
          tone: 'system'
        });
      } else {
        const message = getRetryableAIErrorMessage(error);
        replacePendingWithResult(sessionId, pendingMessageId, message, {
          tone: 'error',
          retryInput: trimmedText
        });
      }
    } finally {
      if (activeRequestRef.current?.pendingMessageId === pendingMessageId) {
        activeRequestRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleStopRequest = () => {
    activeRequestRef.current?.controller.abort();
  };

  const handleRetryMessage = (retryInput?: string) => {
    if (!retryInput || isLoading) {
      return;
    }

    void handleSend(retryInput);
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

  const emptyPromptExamples = [
    '今天下午两点到三点半写周报，挂到工作 / 写作。',
    '刚刚看了 40 分钟论文，帮我补一条记录。',
    '帮我建一个明天下午提交的待办：论文初稿。',
    '这周日安排一个待办：整理实验数据。'
  ];

  const renderMessageBubble = (message: AIChatMessage) => {
    const isUser = message.role === 'user';
    const tone = message.tone || 'normal';

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
        <div className={`flex max-w-[92%] items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} sm:max-w-[86%]`}>
          <div
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] border"
            style={avatarStyle}
          >
            {isUser ? (
              <UserAvatar profile={userProfile} iconClassName="text-sm" />
            ) : (
              <div className="h-full w-full overflow-hidden rounded-[0.85rem]">
                <PersonaAvatar persona={activePersona} className="rounded-[0.85rem]" iconClassName="text-sm" />
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="rounded-[1.25rem] border px-4 py-3" style={bubbleStyle}>
              {!isUser && (
                <p className="mb-1.5 font-serif text-[11px] tracking-[0.14em]" style={{ color: AI_CHAT_THEME.textFaint }}>
                  {activePersona.assistantSelfName || 'AI 回答'}
                </p>
              )}
              <div className="flex items-start gap-2">
                {tone === 'pending' && (
                  <Loader2 size={15} className="mt-1 shrink-0 animate-spin" style={{ color: AI_CHAT_THEME.textFaint }} />
                )}
                <p className="whitespace-pre-wrap break-words text-[14px] leading-6 sm:text-[15px]">
                  {message.content}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: AI_CHAT_THEME.textMuted }}>
                <span>面向 {targetDateLabel}</span>
                <span className="hidden text-[#b4a79a] sm:inline">·</span>
                <span>{activeSession?.contextCacheEnabled ? `上下文已开启 · ${activePersona.contextMessageLimit} 轮` : '单轮模式'}</span>
              </div>
            </div>

            {message.appliedActions && message.appliedActions.length > 0 && (
              <div
                className="space-y-2 rounded-[1.15rem] border p-3"
                style={{
                  borderColor: AI_CHAT_THEME.panelBorder,
                  backgroundColor: AI_CHAT_THEME.panelBgStrong
                }}
              >
                <p className="font-serif text-[11px] tracking-[0.14em]" style={{ color: AI_CHAT_THEME.textFaint }}>
                  应用结果
                </p>
                <div className="space-y-2">
                  {message.appliedActions.map((action) => renderAppliedAction(message.id, action))}
                </div>
              </div>
            )}

            {message.memoryUpdates && message.memoryUpdates.length > 0 && (
              <div
                className="space-y-2 rounded-[1.15rem] border p-3"
                style={{
                  borderColor: AI_CHAT_THEME.panelBorder,
                  backgroundColor: AI_CHAT_THEME.panelBgStrong
                }}
              >
                <p className="font-serif text-[11px] tracking-[0.14em]" style={{ color: AI_CHAT_THEME.textFaint }}>
                  记忆更新
                </p>
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

            {message.reminderUpdates && message.reminderUpdates.length > 0 && (
              <div
                className="space-y-2 rounded-[1.15rem] border p-3"
                style={{
                  borderColor: AI_CHAT_THEME.panelBorder,
                  backgroundColor: AI_CHAT_THEME.panelBgStrong
                }}
              >
                <p className="font-serif text-[11px] tracking-[0.14em]" style={{ color: AI_CHAT_THEME.textFaint }}>
                  提醒结果
                </p>
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

            {debugMode && message.debugSections && message.debugSections.length > 0 && (
              <div className="pl-1">
                <button
                  onClick={() => setDebugViewer({
                    title: `${activePersona.assistantSelfName || 'AI'} 调试`,
                    sections: message.debugSections || []
                  })}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textSecondary
                  }}
                >
                  <Sparkles size={12} />
                  查看调试
                </button>
              </div>
            )}

            {!isUser && tone === 'error' && message.retryInput && (
              <div className="pl-1">
                <button
                  onClick={() => handleRetryMessage(message.retryInput)}
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
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div
          className="flex items-center justify-between gap-4 border-b px-4 py-3 backdrop-blur-xl sm:px-5 sm:py-3.5"
          style={{
            borderColor: AI_CHAT_THEME.panelBorder,
            backgroundColor: AI_CHAT_THEME.panelBg
          }}
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              onClick={() => !isLoading && setIsPersonaPanelOpen(true)}
              disabled={isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border text-base transition-all disabled:cursor-not-allowed disabled:opacity-60"
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
                <h2 className="truncate font-serif text-[1.25rem] leading-none sm:text-[1.45rem]" style={{ color: AI_CHAT_THEME.textPrimary }}>
                  {activePersona.name || 'AI 助手'}
                </h2>
                {debugMode && (
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.12em]"
                    style={{
                      borderColor: AI_CHAT_THEME.chipBorder,
                      backgroundColor: AI_CHAT_THEME.chipBg,
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
              className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
              className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
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
              className="mx-auto mt-10 max-w-2xl rounded-[1.4rem] border border-dashed px-6 py-7 text-sm leading-7"
              style={{
                borderColor: AI_CHAT_THEME.panelBorderStrong,
                background: `linear-gradient(180deg, ${AI_CHAT_THEME.panelBg} 0%, ${AI_CHAT_THEME.panelBgSoft} 100%)`,
                color: AI_CHAT_THEME.textSecondary,
                boxShadow: AI_CHAT_THEME.cardShadow
              }}
            >
              <p className="font-medium text-stone-700">试试这样说</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="font-medium text-stone-700">添加补记</p>
                  <p>今天下午两点到三点半写周报，挂到工作 / 写作。</p>
                  <p>刚刚看了 40 分钟论文，帮我补一条记录。</p>
                </div>
                <div>
                  <p className="font-medium text-stone-700">添加待办</p>
                  <p>帮我建一个明天下午提交的待办：论文初稿。</p>
                  <p>添加一个这周日准备要做的待办：整理实验数据。</p>
                </div>
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
            <div className="mx-auto max-w-[920px] space-y-5">
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
            className="mx-auto max-w-[920px] rounded-[1.1rem] border p-2.5"
            style={{
              borderColor: AI_CHAT_THEME.panelBorder,
              backgroundColor: AI_CHAT_THEME.panelBg,
              boxShadow: AI_CHAT_THEME.avatarShadow
            }}
          >
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`和 ${activePersona.assistantSelfName || 'AI'} 说点什么...`}
              className="min-h-[64px] max-h-[120px] w-full resize-none bg-transparent px-1.5 py-1 text-[15px] leading-6 outline-none"
              style={{ color: AI_CHAT_THEME.textPrimary }}
              autoFocus
            />

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t pt-2.5" style={{ borderColor: AI_CHAT_THEME.panelBorder }}>
              <button
                onClick={() => activeSession && mutateSession(activeSession.id, (session) => ({
                  ...session,
                  contextCacheEnabled: !session.contextCacheEnabled
                }))}
                className="inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-[13px] transition-colors"
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
                上下文 {activeSession?.contextCacheEnabled ? `ON · ${activePersona.contextMessageLimit}轮` : 'OFF'}
              </button>
              <button
                onClick={() => {
                  if (isLoading) {
                    handleStopRequest();
                    return;
                  }
                  void handleSend();
                }}
                disabled={!isLoading && !inputText.trim()}
                className="ml-auto inline-flex h-10 min-w-[7rem] items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed"
                style={
                  isLoading
                    ? {
                        border: `1px solid ${AI_CHAT_THEME.chipBorder}`,
                        backgroundColor: AI_CHAT_THEME.inputBg,
                        color: AI_CHAT_THEME.textSecondary
                      }
                    : {
                        backgroundColor: AI_CHAT_THEME.primaryButtonBg,
                        color: AI_CHAT_THEME.primaryButtonText,
                        boxShadow: `0 0 0 1px ${AI_CHAT_THEME.primaryButtonBorder}`
                      }
                }
              >
                {isLoading ? <Square size={16} /> : <Send size={16} />}
                <span>{isLoading ? '停止' : '发送'}</span>
              </button>
            </div>
          </div>
        </div>

        {isHistoryPanelOpen && (
          <div className="absolute inset-0 z-10 backdrop-blur-[10px]" style={{ backgroundColor: AI_CHAT_THEME.overlayDark }}>
            <div
              className="absolute inset-3 flex flex-col overflow-hidden rounded-[1.35rem] border sm:inset-4"
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors"
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
                  onClick={handleCreateSession}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border px-4 py-3 text-sm font-semibold transition-colors"
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
                        className="w-full rounded-[1.45rem] border px-4 py-3 text-left transition-all"
                        style={
                          session.id === activeSessionId
                            ? {
                                borderColor: AI_CHAT_THEME.activeBorder,
                                backgroundColor: AI_CHAT_THEME.activeBg,
                                boxShadow: '0 12px 28px rgba(52,38,27,0.08), 0 0 0 1px rgba(0,0,0,0.02)'
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
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] border text-base"
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
                                    className="w-full rounded-[0.95rem] border px-3 py-1.5 text-sm font-semibold outline-none"
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
                                  className="rounded-full border border-[#ced8ca] bg-[#edf3ea] px-2.5 py-1 text-xs font-medium text-[#556a52] transition-colors hover:bg-[#e5eee1]"
                                  title="保存名称"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={handleCancelRenameSession}
                                  className="rounded-full border border-[#e3d8ca] bg-[#fff8f0] px-2.5 py-1 text-xs font-medium text-[#736a61] transition-colors hover:bg-[#f2e9de]"
                                  title="取消重命名"
                                >
                                  取消
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartRenameSession(session)}
                                  className="rounded-full p-2 text-[#897f75] transition-colors hover:bg-[#f1e8dd] hover:text-[#2f2a26]"
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
                                  className="rounded-full p-2 text-[#897f75] transition-colors hover:bg-[#f8e9e6] hover:text-[#b35b50]"
                                  title="删除对话"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isDeleteConfirming && !isEditing && (
                          <div className="mt-3 flex items-center justify-between rounded-[1.15rem] border border-[#e4c1bc] bg-[#f8e9e6] px-3 py-2 text-xs text-[#9d544d]">
                            <span>删除后不能恢复，确认删除这个对话吗？</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setDeleteConfirmSessionId(null)}
                                className="rounded-full border border-[#e0d5c8] bg-[#fffaf3] px-2.5 py-1 font-medium text-[#71685f] transition-colors hover:bg-white"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="rounded-full border border-[#ba6256] bg-[#c46f4f] px-2.5 py-1 font-medium text-[#fff8f2] transition-colors hover:bg-[#b95f43]"
                              >
                                删除
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
                className="flex items-center justify-between border-b px-5 py-4 backdrop-blur"
                style={{
                  borderColor: AI_CHAT_THEME.panelBorder,
                  backgroundColor: AI_CHAT_THEME.panelBg
                }}
              >
                <h3 className="text-base font-bold text-stone-800">AI 设置</h3>
                <button
                  onClick={() => setIsPersonaPanelOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
                  style={{
                    borderColor: AI_CHAT_THEME.chipBorder,
                    backgroundColor: AI_CHAT_THEME.panelBg,
                    color: AI_CHAT_THEME.textMuted
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <div className="mx-auto flex max-w-4xl flex-col gap-6">
                  <section
                    className="order-1 rounded-[1.35rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.94)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.035)]"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-stone-800">人设列表</p>
                      <button
                        onClick={handleCreatePersona}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium text-[#4b5563] transition-colors hover:bg-white"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--accent-color) 14%, #d8dde6)',
                          backgroundColor: 'color-mix(in srgb, var(--accent-color) 4%, white)'
                        }}
                      >
                        <Plus size={14} />
                        添加人设
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {builtinPersonas.map((persona) => (
                        <button
                          key={persona.id}
                          onClick={() => handleApplyPersonaPreset(persona.id)}
                          className={`rounded-[1.45rem] border px-4 py-3 text-left transition-all ${
                            activeSession?.personaId === persona.id
                              ? 'text-[#1f2937] shadow-[0_8px_20px_rgba(15,23,42,0.045)]'
                              : 'text-[#4b5563] hover:bg-white'
                          }`}
                          style={
                            activeSession?.personaId === persona.id
                              ? {
                                  borderColor: 'color-mix(in srgb, var(--accent-color) 22%, #d8dde6)',
                                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 7%, white)',
                                  boxShadow: '0 8px 20px rgba(15,23,42,0.045), 0 0 0 1px color-mix(in srgb, var(--accent-color) 8%, transparent)'
                                }
                              : {
                                  borderColor: 'color-mix(in srgb, var(--accent-color) 12%, #e5e7eb)',
                                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 3%, white)'
                                }
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border bg-white text-lg shadow-[0_4px_12px_rgba(15,23,42,0.03)]"
                              style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 12%, #e5e7eb)' }}
                            >
                              <PersonaAvatar persona={persona} iconClassName="text-lg" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold">{persona.name}</p>
                                {activeSession?.personaId === persona.id && (
                                  <span
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-white text-[#374151]"
                                    style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 16%, #d8dde6)' }}
                                  >
                                    <Check size={12} />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-500">
                                {persona.isBuiltIn ? '内置模板' : '自定义人设'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                      {personas.filter((persona) => !PERSONA_PRESET_ORDER.includes(persona.id)).map((persona) => (
                        <button
                          key={persona.id}
                          onClick={() => handleApplyPersonaPreset(persona.id)}
                          className={`rounded-[1.45rem] border px-4 py-3 text-left transition-all ${
                            activeSession?.personaId === persona.id
                              ? 'text-[#1f2937] shadow-[0_8px_20px_rgba(15,23,42,0.045)]'
                              : 'text-[#4b5563] hover:bg-white'
                          }`}
                          style={
                            activeSession?.personaId === persona.id
                              ? {
                                  borderColor: 'color-mix(in srgb, var(--accent-color) 22%, #d8dde6)',
                                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 7%, white)',
                                  boxShadow: '0 8px 20px rgba(15,23,42,0.045), 0 0 0 1px color-mix(in srgb, var(--accent-color) 8%, transparent)'
                                }
                              : {
                                  borderColor: 'color-mix(in srgb, var(--accent-color) 12%, #e5e7eb)',
                                  backgroundColor: 'color-mix(in srgb, var(--accent-color) 3%, white)'
                                }
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border bg-white text-lg shadow-[0_4px_12px_rgba(15,23,42,0.03)]"
                              style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 12%, #e5e7eb)' }}
                            >
                              <PersonaAvatar persona={persona} iconClassName="text-lg" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-bold">{persona.name}</p>
                                {activeSession?.personaId === persona.id && (
                                  <span
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-white text-[#374151]"
                                    style={{ borderColor: 'color-mix(in srgb, var(--accent-color) 16%, #d8dde6)' }}
                                  >
                                    <Check size={12} />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-500">
                                自定义人设
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section
                    className="order-4 rounded-[1.35rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.94)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.035)]"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-stone-800">后台助理</p>
                        <p className="mt-1 text-xs text-stone-500">控制 Android 后台轮询、长期记忆和未来的 Reminder 能力。</p>
                      </div>
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-medium"
                        style={{
                          borderColor: AI_CHAT_THEME.chipBorder,
                          backgroundColor: AI_CHAT_THEME.chipBg,
                          color: AI_CHAT_THEME.textMuted
                        }}
                      >
                        Android
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div
                        className="flex items-start justify-between gap-4 rounded-[1rem] border px-4 py-3"
                        style={{
                          borderColor: AI_CHAT_THEME.panelBorder,
                          backgroundColor: AI_CHAT_THEME.panelBg
                        }}
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>开启后台轮询</p>
                          <p className="mt-1 text-xs leading-5" style={{ color: AI_CHAT_THEME.textMuted }}>
                            开启后，后台 Agent 才会随机 check-in，并在收到系统触发时发起 system turn。
                          </p>
                        </div>
                        <button
                          onClick={() => handleUpdateAssistantAgentConfig({ enabled: !assistantAgentConfig.enabled })}
                          className="inline-flex min-w-[72px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
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

                      <div
                        className="rounded-[1rem] border px-4 py-3"
                        style={{
                          borderColor: AI_CHAT_THEME.panelBorder,
                          backgroundColor: AI_CHAT_THEME.panelBg
                        }}
                      >
                        <div className="mb-3">
                          <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>check-in 间隔</p>
                          <p className="mt-1 text-xs leading-5" style={{ color: AI_CHAT_THEME.textMuted }}>
                            后台服务会按“检查频率”定期醒来检查一次；如果到了随机 check-in 的时间，就会触发后台调用。
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
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

                      <div
                        className="flex items-start justify-between gap-4 rounded-[1rem] border px-4 py-3"
                        style={{
                          borderColor: AI_CHAT_THEME.panelBorder,
                          backgroundColor: AI_CHAT_THEME.panelBg
                        }}
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>开启长期记忆</p>
                          <p className="mt-1 text-xs leading-5" style={{ color: AI_CHAT_THEME.textMuted }}>
                            开启后，后台助理会持续保存结构化记忆，并在后续 system turn 中复用。
                          </p>
                        </div>
                        <button
                          onClick={() => handleUpdateAssistantAgentConfig({ longTermMemoryEnabled: !assistantAgentConfig.longTermMemoryEnabled })}
                          className="inline-flex min-w-[72px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
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

                      <div
                        className="hidden"
                        style={{
                          borderColor: AI_CHAT_THEME.panelBorder,
                          backgroundColor: AI_CHAT_THEME.panelBg
                        }}
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: AI_CHAT_THEME.textPrimary }}>开启 Reminder</p>
                          <p className="mt-1 text-xs leading-5" style={{ color: AI_CHAT_THEME.textMuted }}>
                            这一项会在后续版本开放。第一版先只接通后台轮询和长期记忆。
                          </p>
                        </div>
                        <button
                          disabled
                          className="inline-flex min-w-[84px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium"
                          style={{
                            borderColor: AI_CHAT_THEME.chipBorder,
                            backgroundColor: AI_CHAT_THEME.inputBg,
                            color: AI_CHAT_THEME.textMuted
                          }}
                        >
                          即将支持
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={handleOpenAssistantMemoryViewer}
                          className="rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
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
                          className="rounded-full border px-3 py-2 text-xs font-medium transition-colors"
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

                  <section
                    className="order-3 rounded-[1.35rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.94)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.035)]"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-stone-800">用户头像</p>
                      </div>
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-medium"
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

                    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                      <div className="px-1 py-1">
                        <div className="flex items-center gap-4">
                          <div
                            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.35rem] border text-2xl"
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
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handleUseUserEmojiAvatar}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-white sm:flex-none"
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
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
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
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-white sm:flex-none"
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
                            className="rounded-[1.05rem] border p-3"
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
                                  className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border text-lg transition-colors hover:bg-white"
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
                              className="mt-3 rounded-[0.95rem] border px-3 py-3"
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
                                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white"
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
                                className="rounded-full border px-3 py-1.5 text-xs font-medium text-white transition-colors"
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

                  <section
                    className="order-2 rounded-[1.35rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.94)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.035)]"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-stone-800">当前人设</p>
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-medium"
                        style={{
                          borderColor: AI_CHAT_THEME.chipBorder,
                          backgroundColor: AI_CHAT_THEME.chipBg,
                          color: AI_CHAT_THEME.textMuted
                        }}
                      >
                        {activePersona.isBuiltIn ? '内置模板' : '自定义人设'}
                      </span>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
                      <div className="space-y-3">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />

                        <div className="flex flex-col gap-3 px-1 py-1">
                          <div className="flex items-center gap-4">
                            <div
                              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border text-2xl"
                              style={{
                                borderColor: AI_CHAT_THEME.panelBorder,
                                backgroundColor: AI_CHAT_THEME.avatarBg,
                                boxShadow: AI_CHAT_THEME.avatarShadow
                              }}
                            >
                              <PersonaAvatar persona={activePersona} iconClassName="text-2xl" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold" style={{ color: AI_CHAT_THEME.textPrimary }}>{activePersona.name || '未命名人设'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={handleUseEmojiAvatar}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-white sm:flex-none"
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
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
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
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors sm:flex-none"
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
                        </div>

                        {isEmojiEditorOpen && (
                          <div
                            className="rounded-[1.1rem] border p-3 shadow-[0_6px_16px_rgba(15,23,42,0.03)]"
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
                                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-lg transition-colors ${
                                    emojiDraft.trim() === emoji
                                      ? 'shadow-[0_0_0_1px_rgba(0,0,0,0.03)]'
                                      : 'hover:bg-white'
                                  }`}
                                  style={
                                    emojiDraft.trim() === emoji
                                      ? {
                                          borderColor: AI_CHAT_THEME.activeBorder,
                                          backgroundColor: AI_CHAT_THEME.activeBg,
                                          color: AI_CHAT_THEME.textPrimary
                                        }
                                      : {
                                          borderColor: AI_CHAT_THEME.panelBorder,
                                          backgroundColor: AI_CHAT_THEME.panelBgStrong,
                                          color: AI_CHAT_THEME.textSecondary
                                        }
                                  }
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>

                            <div
                              className="mt-3 rounded-[0.95rem] border px-3 py-3"
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
                                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white"
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
                                className="rounded-full border px-3 py-1.5 text-xs font-medium text-white transition-colors"
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
                            className="rounded-[1.2rem] border p-3 text-xs shadow-[0_6px_16px_rgba(35,25,18,0.03)]"
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
                                className="rounded-full border px-3 py-1.5 font-medium transition-colors hover:bg-white"
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
                                className="rounded-full border px-3 py-1.5 font-medium text-white transition-colors"
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

                        {false && (
                        <div className="mt-4 rounded-[1.3rem] border border-[#d8dde6] bg-[#f8fafc] p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1rem] border border-[#d8dde6] bg-white text-xl">
                              <UserAvatar profile={userProfile} iconClassName="text-base" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#111827]">用户头像</p>
                              <p className="mt-1 text-xs text-[#6b7280]">可保持默认，也可以换成 Emoji 或图片。</p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={handleUseUserEmojiAvatar}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#d8dde6] bg-white px-3 py-2 text-xs font-medium text-[#4b5563] transition-colors hover:border-[#c7cfdb] hover:bg-[#f9fafb] sm:flex-none"
                            >
                              <Sparkles size={14} />
                              Emoji
                            </button>
                            <button
                              onClick={() => userAvatarInputRef.current?.click()}
                              disabled={isUploadingUserAvatar}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#d8dde6] bg-white px-3 py-2 text-xs font-medium text-[#4b5563] transition-colors hover:border-[#c7cfdb] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                            >
                              {isUploadingUserAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                              {isUploadingUserAvatar ? '上传中' : '上传图片'}
                            </button>
                            <button
                              onClick={() => void handleResetUserAvatar()}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#d8dde6] bg-white px-3 py-2 text-xs font-medium text-[#4b5563] transition-colors hover:border-[#c7cfdb] hover:bg-[#f9fafb] sm:flex-none"
                            >
                              <RotateCcw size={14} />
                              默认
                            </button>
                          </div>

                          {isUserEmojiEditorOpen && (
                            <div className="mt-3 rounded-[1.05rem] border border-[#d8dde6] bg-white p-3">
                              <p className="text-xs font-medium text-[#6b7280]">输入一个 Emoji，或直接点选下方常用头像。</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {PERSONA_EMOJI_CHOICES.map((emoji) => (
                                  <button
                                    key={`user-${emoji}`}
                                    onClick={() => setUserEmojiDraft(emoji)}
                                    className={`flex h-10 w-10 items-center justify-center rounded-[0.9rem] border text-lg transition-colors ${
                                      userEmojiDraft.trim() === emoji
                                        ? 'border-[#c7cfdb] bg-[#f5f7fa] text-[#111827]'
                                        : 'border-[#e5e7eb] bg-[#f8fafc] text-[#4b5563] hover:bg-white'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <div className="mt-3 rounded-[0.95rem] border border-[#e5e7eb] bg-[#f8fafc] px-3 py-3">
                                <input
                                  value={userEmojiDraft}
                                  onChange={(event) => setUserEmojiDraft(event.target.value)}
                                  className="w-full bg-transparent text-sm text-[#111827] outline-none"
                                  placeholder="输入一个 Emoji，例如 🙂"
                                />
                              </div>
                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  onClick={handleCancelUserEmojiAvatarEdit}
                                  className="rounded-full border border-[#d8dde6] bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-[#4b5563] transition-colors hover:bg-white"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={() => void handleApplyUserEmojiAvatar()}
                                  className="rounded-full border border-[#111827] bg-[#111827] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0f172a]"
                                >
                                  保存 Emoji
                                </button>
                              </div>
                            </div>
                          )}
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

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-stone-500">自定义提示词</span>
                          <textarea
                            value={activePersona.systemPrompt}
                            onChange={(event) => updateCurrentPersona({ systemPrompt: event.target.value })}
                            className="min-h-[180px] w-full rounded-[1.2rem] border px-4 py-3 text-sm leading-7 outline-none"
                            style={{
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.inputBg,
                              color: AI_CHAT_THEME.textPrimary
                            }}
                            placeholder="补充这个人设的语气、风格、偏好、边界条件。"
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  <section
                    className="order-4 rounded-[1.35rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.94)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.035)]"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                      backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                    }}
                  >
                    <p className="mb-4 text-sm font-bold text-stone-800">上下文设置</p>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-stone-500">最近上下文轮数 n</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
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
                </div>
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
              <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-5 py-4 backdrop-blur">
                <div>
                  <h3 className="font-serif text-[1.75rem] leading-none text-[#201c19]">长期记忆</h3>
                  <p className="text-xs text-stone-400">
                    {assistantAgentConfig.longTermMemoryEnabled ? '当前会在后台 system turn 中复用这些结构化记忆。' : '长期记忆当前已关闭，下面仅展示本地已保存的历史记忆。'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAssistantMemory}
                    className="rounded-full border px-3 py-2 text-xs font-medium transition-colors"
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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#cfd8e3] hover:bg-[#f9fafb] hover:text-[#111827]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto max-w-4xl space-y-4">
                  <div
                    className="rounded-[1.2rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.035)]"
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
                        className="rounded-[1.2rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.035)]"
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
                            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
                            style={{
                              borderColor: AI_CHAT_THEME.chipBorder,
                              backgroundColor: AI_CHAT_THEME.panelBg,
                              color: AI_CHAT_THEME.textSecondary
                            }}
                          >
                            <Plus size={14} />
                            新增一条
                          </button>
                        </div>

                        {isComposerOpen && (
                          <div
                            className="mt-4 rounded-[1rem] border px-4 py-4"
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
                              className="w-full resize-none rounded-[1rem] border px-3 py-3 text-sm leading-6 outline-none"
                              style={{
                                borderColor: AI_CHAT_THEME.chipBorder,
                                backgroundColor: AI_CHAT_THEME.inputBg,
                                color: AI_CHAT_THEME.textPrimary
                              }}
                            />
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCancelAssistantEditableMemoryComposer(key)}
                                className="rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-white"
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
                                className="rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:brightness-[0.98]"
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
                              className="rounded-[1rem] border border-dashed px-4 py-4 text-sm leading-6 text-stone-500"
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
                                  className="rounded-[1rem] border px-4 py-3"
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
                                      className="rounded-full p-2 text-[#897f75] transition-colors hover:bg-[#f8e9e6] hover:text-[#b35b50]"
                                      title="删除这条记忆"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>

                                  {isDeleteConfirming && (
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[0.95rem] border border-[#e4c1bc] bg-[#f8e9e6] px-3 py-2 text-xs text-[#9d544d]">
                                      <span>确认删除这条记忆？</span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => setAssistantEditableMemoryDeleteTarget(null)}
                                          className="rounded-full border border-[#e0d5c8] bg-[#fffaf3] px-2.5 py-1 font-medium text-[#71685f] transition-colors hover:bg-white"
                                        >
                                          取消
                                        </button>
                                        <button
                                          onClick={() => handleConfirmAssistantEditableMemoryDelete(key, item)}
                                          className="rounded-full border border-[#ba6256] bg-[#c46f4f] px-2.5 py-1 font-medium text-[#fff8f2] transition-colors hover:bg-[#b95f43]"
                                        >
                                          删除
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

                  {[
                    { label: '活跃 reminders', value: assistantMemorySnapshot.activeReminders },
                    { label: '最近 agent 决策', value: assistantMemorySnapshot.recentDecisions }
                  ].map((section) => (
                    <div
                      key={section.label}
                      className="rounded-[1.2rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.035)]"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                      }}
                    >
                      <p className="mb-3 font-serif text-xl text-[#231f1b]">{section.label}</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[1.3rem] border border-[#433a34] bg-[#2d2926] p-4 text-xs leading-6 text-[#efe7db] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                        {stringifyDebugSection(section.value)}
                      </pre>
                    </div>
                  ))}

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
              <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-5 py-4 backdrop-blur">
                <div>
                  <h3 className="font-serif text-[1.75rem] leading-none text-[#201c19]">后台调用记录</h3>
                  <p className="text-xs text-stone-400">按时间倒序记录每次后台调用的结果，包含 silent 调用。</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAssistantBackgroundCallHistory}
                    className="rounded-full border px-3 py-2 text-xs font-medium transition-colors"
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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#cfd8e3] hover:bg-[#f9fafb] hover:text-[#111827]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto max-w-4xl space-y-4">
                  {assistantBackgroundCallHistory.length === 0 ? (
                    <div
                      className="rounded-[1.2rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_8px_20px_rgba(15,23,42,0.035)]"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                      }}
                    >
                      <p className="text-sm leading-6 text-stone-600">暂无后台调用记录。</p>
                    </div>
                  ) : (
                    assistantBackgroundCallHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[1.2rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.035)]"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                          backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="font-serif text-xl text-[#231f1b]">{entry.triggerType}</p>
                          <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{
                            borderColor: AI_CHAT_THEME.chipBorder,
                            backgroundColor: AI_CHAT_THEME.panelBg,
                            color: AI_CHAT_THEME.textSecondary
                          }}>
                            {entry.status}
                          </span>
                          <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{
                            borderColor: AI_CHAT_THEME.chipBorder,
                            backgroundColor: AI_CHAT_THEME.panelBg,
                            color: AI_CHAT_THEME.textSecondary
                          }}>
                            action: {entry.action}
                          </span>
                          <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{
                            borderColor: AI_CHAT_THEME.chipBorder,
                            backgroundColor: AI_CHAT_THEME.panelBg,
                            color: AI_CHAT_THEME.textSecondary
                          }}>
                            memory: {entry.memoryAction}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm leading-6 text-stone-700">
                          <p>请求发出：{entry.requestedAt}</p>
                          <p>请求返回：{entry.completedAt}</p>
                          {entry.targetSessionId && <p>会话：{entry.targetSessionId}</p>}
                          {entry.reminderCount > 0 && <p>提醒数：{entry.reminderCount}</p>}
                          {entry.triggerText && <p>触发文本：{entry.triggerText}</p>}
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
              <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-[rgba(255,255,255,0.9)] px-5 py-4 backdrop-blur">
                <div>
                  <h3 className="font-serif text-[1.75rem] leading-none text-[#201c19]">{debugViewer.title}</h3>
                  <p className="text-xs text-stone-400">按阶段查看请求与响应</p>
                </div>
                <button
                  onClick={() => setDebugViewer(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:border-[#cfd8e3] hover:bg-[#f9fafb] hover:text-[#111827]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto max-w-4xl space-y-4">
                  {debugViewer.sections.map((section) => (
                    <div
                      key={section.label}
                      className="rounded-[1.2rem] border border-[#e5e7eb] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.035)]"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-color) 10%, #e5e7eb)',
                        backgroundColor: 'color-mix(in srgb, var(--accent-color) 2.5%, white)'
                      }}
                    >
                      <p className="mb-3 font-serif text-xl text-[#231f1b]">{section.label}</p>
                      <div className="mb-3 space-y-3">
                        {buildDebugBlocks(section.exchange).map((block) => (
                          <div key={`${section.label}-${block.label}`}>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{block.label}</p>
                            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[1.3rem] border border-[#433a34] bg-[#2d2926] p-4 text-xs leading-6 text-[#efe7db] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
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
      </div>
    </div>
  );
};


