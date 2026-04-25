/**
 * @file AIBackfillChatModal.tsx
 * @input Unified AI chat sessions, local logs/todos/categories/scopes, and user natural-language messages
 * @output Full-screen AI time assistant with session history, persona settings, quick context cache, and direct log/todo application
 * @pos Component (AI Integration)
 * @description Provides the shared AI workspace for chat, backfill, and todo creation. Sessions persist locally, persona style is configurable per session, and recent context can be toggled into the formal AI request path.
 * @updated 2026-04-25: Added AI-driven todo updates, subtask creation, and log editing with local patch application plus undo support, and expanded intent routing so edit flows receive dedicated context and tool plans.
 * @updated 2026-04-25: Corrected applied-todo metadata to render task category as `@`, linked activity hierarchy as `#`, and scope domains as `%`, while respecting the auto-link scope toggle when merging activity rules.
 * @updated 2026-04-25: Fixed the applied-todo detail action so newly created todo results stay clickable even if the live todo lookup lags behind the message render.
 * @updated 2026-04-25: Matched applied-result metadata to the context-page prefix syntax by removing icons and using `# / % / @` markers for tags, domains, and todos.
 * @updated 2026-04-25: Softened the AI dialog shadow system so the shell, cards, and avatar surfaces feel lighter and less floating.
 * @updated 2026-04-25: Added a true grayscale fallback for the `default` color scheme so the AI workspace no longer picks up tinted beige/green surfaces when no themed accent is active.
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
  X
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
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import type { Log, TodoItem, TodoRecurrenceRule } from '../types';
import { formatDateKey, normalizeAIBackfillToolCalls, parseTimeOnDateKey } from '../utils/aiBackfillUtils';
import { getTodoProgressTrackingMode, syncSubtaskProgressToParentTodos } from '../utils/todoProgressUtils';
import { imageService } from '../services/imageService';
import { getNextChildOrder, normalizeTodoHierarchy, syncDirectChildTodosWithParent } from '../utils/todoHierarchyUtils';

type ChatTone = 'normal' | 'system' | 'error' | 'pending';
type AppliedActionStatus = 'applied' | 'undone' | 'failed';

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

interface AppliedCreateLogSnapshot {
  logId?: string;
  startTime: number;
  endTime: number;
  description: string;
  categoryId: string;
  categoryName: string;
  activityId: string;
  activityName: string;
  scopeIds: string[];
  scopeNames: string[];
  linkedTodoId?: string;
  linkedTodoTitle?: string;
  progressIncrement?: number;
}

interface AppliedCreateLogAction {
  actionId: string;
  kind: 'create_log';
  status: AppliedActionStatus;
  snapshot: AppliedCreateLogSnapshot;
  errorMessage?: string;
}

interface AppliedCreateTodoSnapshot {
  todoId?: string;
  title: string;
  categoryId: string;
  categoryName: string;
  linkedCategoryId?: string;
  linkedCategoryName?: string;
  linkedActivityId?: string;
  linkedActivityName?: string;
  defaultScopeIds: string[];
  defaultScopeNames: string[];
  note?: string;
  scheduledDate?: string;
  deadlineDate?: string;
  recurrenceRule?: TodoRecurrenceRule;
}

interface AppliedCreateTodoAction {
  actionId: string;
  kind: 'create_todo';
  status: AppliedActionStatus;
  snapshot: AppliedCreateTodoSnapshot;
  errorMessage?: string;
}

interface AppliedUpdateTodoSnapshot {
  todoId?: string;
  previousTodo?: TodoItem;
  nextTodo?: TodoItem;
}

interface AppliedUpdateTodoAction {
  actionId: string;
  kind: 'update_todo';
  status: AppliedActionStatus;
  snapshot: AppliedUpdateTodoSnapshot;
  errorMessage?: string;
}

interface AppliedCreateSubtaskSnapshot extends AppliedCreateTodoSnapshot {
  parentTodoId?: string;
  parentTodoTitle?: string;
}

interface AppliedCreateSubtaskAction {
  actionId: string;
  kind: 'create_subtask';
  status: AppliedActionStatus;
  snapshot: AppliedCreateSubtaskSnapshot;
  errorMessage?: string;
}

interface AppliedEditLogSnapshot {
  logId?: string;
  previousLog?: Log;
  nextLog?: Log;
}

interface AppliedEditLogAction {
  actionId: string;
  kind: 'edit_log';
  status: AppliedActionStatus;
  snapshot: AppliedEditLogSnapshot;
  errorMessage?: string;
}

type AppliedChatAction =
  | AppliedCreateLogAction
  | AppliedCreateTodoAction
  | AppliedUpdateTodoAction
  | AppliedCreateSubtaskAction
  | AppliedEditLogAction;

interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  tone?: ChatTone;
  debugSections?: AIChatDebugSection[];
  appliedActions?: AppliedChatAction[];
  retryInput?: string;
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
}

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

const BUILTIN_PERSONAS: AIChatPersona[] = [
  {
    id: 'builtin-default',
    name: '默认助理',
    avatarIcon: '✨',
    assistantSelfName: '时间助理',
    userCallName: '你',
    systemPrompt: '语气克制、清晰、执行导向。先帮用户把事情讲清楚，再给出简洁可落地的下一步。',
    contextMessageLimit: 6,
    isBuiltIn: true
  },
  {
    id: 'builtin-gentle',
    name: '温柔陪伴',
    avatarIcon: '🌷',
    assistantSelfName: '陪伴助手',
    userCallName: '你',
    systemPrompt: '语气温和、支持感更强。先接住情绪，再给出轻量建议，不要说教。',
    contextMessageLimit: 6,
    isBuiltIn: true
  },
  {
    id: 'builtin-planner',
    name: '严谨规划',
    avatarIcon: '📐',
    assistantSelfName: '规划助手',
    userCallName: '你',
    systemPrompt: '偏结构化、拆解式表达。遇到复杂请求时先澄清关键信息，再明确步骤和约束。',
    contextMessageLimit: 8,
    isBuiltIn: true
  },
  {
    id: 'builtin-chatty',
    name: '轻松聊天',
    avatarIcon: '☕',
    assistantSelfName: '聊天搭子',
    userCallName: '你',
    systemPrompt: '更自然、更像对话搭子。保持轻松口吻，但回答仍要有信息量，不要油腻。',
    contextMessageLimit: 6,
    isBuiltIn: true
  }
];

const DEFAULT_AI_PERSONAS: AIChatPersona[] = [
  {
    id: 'builtin-default',
    name: '私人助理',
    avatarIcon: '🗂️',
    assistantSelfName: '私人助理',
    userCallName: '老板',
    systemPrompt: '你是用户的私人助理，稳重、清晰、可靠。你的首要任务是帮用户把模糊的话整理成可执行的信息：能补记就补记，能落成待办就落成待办，缺信息时只追问最关键的一点。说话简洁、得体、不油腻，不夸张，不自我表演。你可以温和，但始终以解决问题和减轻用户负担为先。面对日常闲聊时，也保持陪伴感和分寸感，像一个真正有判断力的助理。',
    contextMessageLimit: 6,
    isBuiltIn: true
  },
  {
    id: 'builtin-gentle',
    name: '喵喵陪伴',
    avatarIcon: '🐱',
    assistantSelfName: '喵喵',
    userCallName: '主人',
    systemPrompt: '你是一个温柔、松弛、会陪人的喵喵助手。你说话轻一点，软一点，有陪伴感，但不要刻意卖萌，更不要频繁拟声词或过度角色扮演。你擅长先接住用户的情绪，再自然地帮他理顺事情：想聊天时能陪聊，想补记时能顺手整理时间，想建待办时能帮他收束成清楚的一条。你的存在感像一只安静趴在旁边的小猫，让人放松，但关键时刻也很靠谱。',
    contextMessageLimit: 6,
    isBuiltIn: true
  },
  {
    id: 'builtin-planner',
    name: '成长教练',
    avatarIcon: '🏃',
    assistantSelfName: '成长教练',
    userCallName: '同学',
    systemPrompt: '你是一位擅长行为设计和长期主义的成长教练。你关注的不是一时情绪，而是下一步怎么走、怎样更稳地推进。你的表达要有启发性，但不要空泛鼓励；要善于把大目标拆成小动作，把模糊愿望翻译成可以开始的第一步。遇到用户卡住、拖延、混乱时，先帮他看清阻力来自哪里，再给出低门槛、能执行的建议。语气坚定、专业、向前看，但不过度施压。',
    contextMessageLimit: 8,
    isBuiltIn: true
  },
  {
    id: 'builtin-chatty',
    name: '内阁首辅',
    avatarIcon: '🪶',
    assistantSelfName: '首辅',
    userCallName: '陛下',
    systemPrompt: '你是用户身边的内阁首辅，冷静、审慎、善于权衡轻重缓急。你看问题讲究全局、次序与分寸，擅长从杂乱信息中理出主次，迅速判断什么该先办、什么可暂缓、什么仍需澄清。你的表达应像一份简洁有力的条陈：不空喊口号，不情绪化，不拖泥带水。必要时可以更锋利一点，指出关键漏洞，但始终是为了帮用户把局面稳住、把事情往前推。',
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
        assistantSelfName: typeof candidate.assistantSelfName === 'string' && candidate.assistantSelfName.trim()
          ? candidate.assistantSelfName.trim()
          : '时间助理',
        userCallName: typeof candidate.userCallName === 'string' && candidate.userCallName.trim()
          ? candidate.userCallName.trim()
          : '你',
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

const formatLocalDateTimeContext = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const offsetRemainder = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} GMT${sign}${offsetHours}:${offsetRemainder}`;
};

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
  targetDate
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
  const activeRequestRef = useRef<ActiveRequestRef | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const userAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { logs, setLogs, todos, setTodos, todoCategories } = useData();
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

  const latestLog = useMemo(() => (
    logs.length > 0
      ? [...logs].sort((left, right) => right.endTime - left.endTime)[0]
      : null
  ), [logs]);

  const latestLogContext = useMemo(() => {
    if (!latestLog) {
      return null;
    }

    return {
      endDateTime: formatLocalDateTimeContext(new Date(latestLog.endTime)),
      date: formatDateKey(new Date(latestLog.endTime)),
      endTime: new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(latestLog.endTime),
      title: latestLog.title || '',
      note: latestLog.note || ''
    };
  }, [latestLog]);

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

  const todoPlanningContext = useMemo(() => (
    todos
      .filter((todo) => !todo.isCompleted)
      .map((todo, _, unfinishedTodos) => {
      const parentTodo = todo.parentTodoId
        ? unfinishedTodos.find((candidate) => candidate.id === todo.parentTodoId)
        : undefined;

      return {
        id: todo.id,
        title: todo.title,
        path: parentTodo ? `${parentTodo.title} / ${todo.title}` : todo.title,
        isProgress: todo.isProgress,
        progressTrackingMode: getTodoProgressTrackingMode(todo, todos),
        totalAmount: todo.totalAmount,
        unitAmount: todo.unitAmount,
        completedUnits: todo.completedUnits,
        parentTodoId: todo.parentTodoId,
        parentTodoTitle: parentTodo?.title
      };
    })
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeSession?.messages, isLoading]);

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
      assistantSelfName: '时间助理',
      userCallName: '你',
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

  const handleDebugCommand = (trimmedText: string): boolean => {
    const normalized = trimmedText.toLowerCase();
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

  const getRuleScopeIdsForActivity = (activityId?: string): string[] => (
    autoApplyAutoLinkRules && activityId
      ? autoLinkRules
        .filter((rule) => rule.activityId === activityId)
        .map((rule) => rule.scopeId)
      : []
  );

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

  const looksLikeSubtaskSchedulingRequest = (text: string): boolean => {
    const normalized = text.trim().toLowerCase();
    const schedulingKeywords = ['安排', '分配', '排一下', '排个', '什么时候', '哪天', '时间', '日程', '计划'];
    const subtaskKeywords = ['子任务', '每章', '章节', '章', '部分'];
    return schedulingKeywords.some((keyword) => normalized.includes(keyword))
      && subtaskKeywords.some((keyword) => normalized.includes(keyword));
  };

  const getMatchedParentTodoIds = (text: string): string[] => (
    todos
      .filter((todo) => !todo.parentTodoId)
      .filter((todo) => text.includes(todo.title))
      .filter((todo) => todos.some((child) => child.parentTodoId === todo.id))
      .map((todo) => todo.id)
  );

  const shouldTreatAsExistingSubtaskScheduling = (text: string): boolean => (
    looksLikeSubtaskSchedulingRequest(text) && getMatchedParentTodoIds(text).length > 0
  );

  const formatTimeKey = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const applyTodoSave = (currentTodos: TodoItem[], todo: TodoItem): TodoItem[] => {
    const normalizedTodo = normalizeTodoHierarchy(todo, currentTodos);
    const exists = currentTodos.find((item) => item.id === normalizedTodo.id);
    let nextTodos = exists
      ? currentTodos.map((item) => item.id === normalizedTodo.id ? normalizedTodo : item)
      : [normalizedTodo, ...currentTodos];

    if (!normalizedTodo.parentTodoId) {
      nextTodos = syncDirectChildTodosWithParent(nextTodos, normalizedTodo);
    }

    return syncSubtaskProgressToParentTodos(nextTodos);
  };

  const applyLogSave = (
    currentLogs: Log[],
    currentTodos: TodoItem[],
    nextLog: Log
  ): { logs: Log[]; todos: TodoItem[] } => {
    const existingLog = currentLogs.find((log) => log.id === nextLog.id);
    const nextTodos = [...currentTodos];

    if (nextLog.linkedTodoId || existingLog?.linkedTodoId) {
      if (existingLog?.linkedTodoId) {
        const oldTodoIndex = nextTodos.findIndex((todo) => todo.id === existingLog.linkedTodoId);
        if (oldTodoIndex >= 0 && getTodoProgressTrackingMode(nextTodos[oldTodoIndex], nextTodos) === 'manual') {
          nextTodos[oldTodoIndex] = {
            ...nextTodos[oldTodoIndex],
            isProgress: true,
            progressTrackingMode: 'manual',
            completedUnits: Math.max(0, (nextTodos[oldTodoIndex].completedUnits || 0) - (existingLog.progressIncrement || 0))
          };
        }
      }

      if (nextLog.linkedTodoId) {
        const newTodoIndex = nextTodos.findIndex((todo) => todo.id === nextLog.linkedTodoId);
        if (newTodoIndex >= 0 && getTodoProgressTrackingMode(nextTodos[newTodoIndex], nextTodos) === 'manual') {
          nextTodos[newTodoIndex] = {
            ...nextTodos[newTodoIndex],
            isProgress: true,
            progressTrackingMode: 'manual',
            completedUnits: Math.max(0, (nextTodos[newTodoIndex].completedUnits || 0) + (nextLog.progressIncrement || 0))
          };
        }
      }
    }

    const nextLogs = existingLog
      ? currentLogs.map((log) => log.id === nextLog.id ? nextLog : log)
      : [nextLog, ...currentLogs];

    return {
      logs: nextLogs,
      todos: nextTodos
    };
  };

  const applyLogDelete = (
    currentLogs: Log[],
    currentTodos: TodoItem[],
    logId: string
  ): { logs: Log[]; todos: TodoItem[] } => {
    const existingLog = currentLogs.find((log) => log.id === logId);
    if (!existingLog) {
      return {
        logs: currentLogs,
        todos: currentTodos
      };
    }

    const nextTodos = currentTodos.map((todo) => {
      if (todo.id !== existingLog.linkedTodoId || getTodoProgressTrackingMode(todo, currentTodos) !== 'manual') {
        return todo;
      }

      return {
        ...todo,
        isProgress: true,
        progressTrackingMode: 'manual',
        completedUnits: Math.max(0, (todo.completedUnits || 0) - (existingLog.progressIncrement || 0))
      };
    });

    return {
      logs: currentLogs.filter((log) => log.id !== logId),
      todos: nextTodos
    };
  };

  const applyPlannedLogToolCalls = (toolCalls: AIBackfillToolCall[]): AppliedChatAction[] => {
    const normalizedToolCalls = normalizeAIBackfillToolCalls(toolCalls, defaultDateKey);
    const actions: AppliedChatAction[] = [];
    let nextLogs = [...logs];
    let nextTodos = [...todos];

    normalizedToolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const actionDate = args.date || defaultDateKey;
      const startTime = parseTimeOnDateKey(actionDate, args.startTime);
      const endTime = parseTimeOnDateKey(actionDate, args.endTime);
      const category = categories.find((item) => item.id === args.categoryId)
        || categories.find((item) => item.activities.some((activity) => activity.id === args.activityId));
      const activity = category?.activities.find((item) => item.id === args.activityId)
        || categories.flatMap((item) => item.activities).find((item) => item.id === args.activityId);
      const linkedTodo = args.linkedTodoId
        ? nextTodos.find((todo) => todo.id === args.linkedTodoId)
        : undefined;

      if (!startTime || !endTime || endTime <= startTime || !category || !activity) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'create_log',
          status: 'failed',
          errorMessage: '这条补记的时间或分类信息不完整，我先没有替你自动应用。',
          snapshot: {
            startTime: startTime || Date.now(),
            endTime: endTime || Date.now(),
            description: args.description || '',
            categoryId: category?.id || args.categoryId,
            categoryName: category?.name || '未知分类',
            activityId: activity?.id || args.activityId,
            activityName: activity?.name || '未知标签',
            scopeIds: [],
            scopeNames: []
          }
        });
        return;
      }

      const scopeIds = dedupeStringArray([
        ...(args.scopeIds || []),
        ...(linkedTodo?.defaultScopeIds || []),
        ...getRuleScopeIdsForActivity(activity.id)
      ]).filter((scopeId) => scopes.some((scope) => scope.id === scopeId));

      const progressIncrement = (
        linkedTodo
        && typeof args.progressIncrement === 'number'
        && args.progressIncrement > 0
        && getTodoProgressTrackingMode(linkedTodo, nextTodos) === 'manual'
      )
        ? Math.max(1, Math.round(args.progressIncrement))
        : undefined;

      if (linkedTodo && progressIncrement) {
        const todoIndex = nextTodos.findIndex((todo) => todo.id === linkedTodo.id);
        if (todoIndex >= 0) {
          nextTodos[todoIndex] = {
            ...nextTodos[todoIndex],
            isProgress: true,
            progressTrackingMode: 'manual',
            completedUnits: Math.max(0, (nextTodos[todoIndex].completedUnits || 0) + progressIncrement)
          };
        }
      }

      const newLog: Log = {
        id: crypto.randomUUID(),
        categoryId: category.id,
        activityId: activity.id,
        title: activity.name,
        startTime,
        endTime,
        duration: Math.max(0, (endTime - startTime) / 1000),
        note: args.description,
        ...(scopeIds.length > 0 ? { scopeIds } : {}),
        ...(linkedTodo ? { linkedTodoId: linkedTodo.id } : {}),
        ...(progressIncrement ? { progressIncrement } : {})
      };

      const saveResult = applyLogSave(nextLogs, nextTodos, newLog);
      nextLogs = saveResult.logs;
      nextTodos = saveResult.todos;
      actions.push({
        actionId: crypto.randomUUID(),
        kind: 'create_log',
        status: 'applied',
        snapshot: {
          logId: newLog.id,
          startTime,
          endTime,
          description: args.description,
          categoryId: category.id,
          categoryName: category.name,
          activityId: activity.id,
          activityName: activity.name,
          scopeIds,
          scopeNames: getScopeNames(scopeIds),
          ...(linkedTodo ? { linkedTodoId: linkedTodo.id, linkedTodoTitle: linkedTodo.title } : {}),
          ...(progressIncrement ? { progressIncrement } : {})
        }
      });
    });

    if (actions.some((action) => action.kind === 'create_log' && action.status === 'applied')) {
      setLogs(nextLogs);
    }
    if (actions.some((action) => action.kind === 'create_log' && action.status === 'applied')) {
      setTodos(nextTodos);
    }

    return actions;
  };

  const applyPlannedTodoToolCalls = (toolCalls: AITodoToolCall[]): AppliedChatAction[] => {
    const actions: AppliedChatAction[] = [];
    let nextTodos = [...todos];

    toolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const resolvedTodoCategory = todoCategories.find((category) => category.id === args.categoryId) || todoCategories[0];
      const resolvedLinkedCategoryId = args.linkedCategoryId
        || (args.linkedActivityId
          ? categories.find((category) => category.activities.some((activity) => activity.id === args.linkedActivityId))?.id
          : undefined);
      const resolvedLinkedCategory = resolvedLinkedCategoryId
        ? categories.find((category) => category.id === resolvedLinkedCategoryId)
        : undefined;
      const resolvedActivity = args.linkedActivityId
        ? resolvedLinkedCategory?.activities.find((activity) => activity.id === args.linkedActivityId)
          || getActivityById(args.linkedActivityId)
        : undefined;

      if (!resolvedTodoCategory || !args.title.trim()) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'create_todo',
          status: 'failed',
          errorMessage: '这条待办缺少标题或待办分类，我先没有替你自动创建。',
          snapshot: {
            title: args.title || '未命名待办',
            categoryId: resolvedTodoCategory?.id || '',
            categoryName: resolvedTodoCategory?.name || '未知分类',
            defaultScopeIds: [],
            defaultScopeNames: []
          }
        });
        return;
      }

      const defaultScopeIds = dedupeStringArray([
        ...(args.defaultScopeIds || []),
        ...getRuleScopeIdsForActivity(args.linkedActivityId)
      ]).filter((scopeId) => scopes.some((scope) => scope.id === scopeId));

      const newTodo: TodoItem = {
        id: crypto.randomUUID(),
        categoryId: resolvedTodoCategory.id,
        title: args.title.trim(),
        isCompleted: false,
        pin: false,
        completedUnits: 0,
        ...(resolvedLinkedCategoryId ? { linkedCategoryId: resolvedLinkedCategoryId } : {}),
        ...(args.linkedActivityId ? { linkedActivityId: args.linkedActivityId } : {}),
        ...(defaultScopeIds.length > 0 ? { defaultScopeIds } : {}),
        ...(args.note ? { note: args.note } : {}),
        ...(args.scheduledDate ? { scheduledDate: args.scheduledDate } : {}),
        ...(args.deadlineDate ? { deadlineDate: args.deadlineDate } : {}),
        ...(args.recurrenceRule ? { recurrenceRule: args.recurrenceRule } : {})
      };

      nextTodos = applyTodoSave(nextTodos, newTodo);
      actions.push({
        actionId: crypto.randomUUID(),
        kind: 'create_todo',
        status: 'applied',
        snapshot: {
          todoId: newTodo.id,
          title: newTodo.title,
          categoryId: newTodo.categoryId,
          categoryName: resolvedTodoCategory.name,
          ...(resolvedLinkedCategoryId ? { linkedCategoryId: resolvedLinkedCategoryId } : {}),
          ...(resolvedLinkedCategory ? { linkedCategoryName: resolvedLinkedCategory.name } : {}),
          ...(args.linkedActivityId ? { linkedActivityId: args.linkedActivityId } : {}),
          ...(resolvedActivity ? { linkedActivityName: resolvedActivity.name } : {}),
          defaultScopeIds,
          defaultScopeNames: getScopeNames(defaultScopeIds),
          ...(args.note ? { note: args.note } : {}),
          ...(args.scheduledDate ? { scheduledDate: args.scheduledDate } : {}),
          ...(args.deadlineDate ? { deadlineDate: args.deadlineDate } : {}),
          ...(args.recurrenceRule ? { recurrenceRule: args.recurrenceRule } : {})
        }
      });
    });

    if (actions.some((action) => action.kind === 'create_todo' && action.status === 'applied')) {
      setTodos(nextTodos);
    }

    return actions;
  };

  const applyPlannedTodoUpdateToolCalls = (toolCalls: AITodoUpdateToolCall[]): AppliedChatAction[] => {
    const actions: AppliedChatAction[] = [];
    let nextTodos = [...todos];

    toolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const currentTodo = nextTodos.find((todo) => todo.id === args.todoId);
      if (!currentTodo) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'update_todo',
          status: 'failed',
          errorMessage: '杩欐潯寰呭姙娌℃壘鍒帮紝鎴戝厛娌℃湁鏇夸綘鑷姩淇敼銆?',
          snapshot: {
            todoId: args.todoId
          }
        });
        return;
      }

      const patch = args.patch;
      const resolvedActivity = patch.linkedActivityId === undefined
        ? undefined
        : patch.linkedActivityId === null
          ? null
          : getActivityById(patch.linkedActivityId);
      const resolvedLinkedCategory = patch.linkedActivityId === undefined
        ? undefined
        : patch.linkedActivityId === null
          ? null
          : getActivityCategory(patch.linkedActivityId);

      if (patch.linkedActivityId && (!resolvedActivity || !resolvedLinkedCategory)) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'update_todo',
          status: 'failed',
          errorMessage: '杩欐潯寰呭姙鐨勫叧鑱旀爣绛句俊鎭笉瀹屾暣锛屾垜鍏堟病鏈夎嚜鍔ㄤ慨鏀广€?',
          snapshot: {
            todoId: currentTodo.id,
            previousTodo: currentTodo
          }
        });
        return;
      }

      const nextDefaultScopeIds = patch.defaultScopeIds === undefined
        ? currentTodo.defaultScopeIds
        : patch.defaultScopeIds === null
          ? undefined
          : dedupeStringArray(patch.defaultScopeIds).filter((scopeId) => scopes.some((scope) => scope.id === scopeId));

      const nextTitle = patch.title === undefined ? currentTodo.title : patch.title.trim();
      if (!nextTitle) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'update_todo',
          status: 'failed',
          errorMessage: '寰呭姙鏍囬涓嶈兘涓虹┖锛屾垜鍏堟病鏈夎嚜鍔ㄤ慨鏀广€?',
          snapshot: {
            todoId: currentTodo.id,
            previousTodo: currentTodo
          }
        });
        return;
      }

      const nextLinkedCategoryId = patch.linkedActivityId !== undefined
        ? (resolvedLinkedCategory?.id || undefined)
        : patch.linkedCategoryId === undefined
          ? currentTodo.linkedCategoryId
          : patch.linkedCategoryId || undefined;

      const nextLinkedActivityId = patch.linkedActivityId === undefined
        ? currentTodo.linkedActivityId
        : patch.linkedActivityId || undefined;

      const shouldClearRecurrence = !currentTodo.parentTodoId
        && (patch.scheduledDate !== undefined || patch.deadlineDate !== undefined)
        && patch.recurrenceRule === undefined;

      const nextTodo: TodoItem = {
        ...currentTodo,
        title: nextTitle,
        ...(patch.note !== undefined ? { note: patch.note || undefined } : {}),
        ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
        ...(patch.linkedCategoryId !== undefined || patch.linkedActivityId !== undefined ? { linkedCategoryId: nextLinkedCategoryId } : {}),
        ...(patch.linkedActivityId !== undefined ? { linkedActivityId: nextLinkedActivityId } : {}),
        ...(patch.defaultScopeIds !== undefined ? { defaultScopeIds: nextDefaultScopeIds } : {}),
        ...(patch.scheduledDate !== undefined ? { scheduledDate: patch.scheduledDate || undefined } : {}),
        ...(patch.deadlineDate !== undefined ? { deadlineDate: patch.deadlineDate || undefined } : {}),
        ...(!currentTodo.parentTodoId && patch.recurrenceRule !== undefined ? { recurrenceRule: patch.recurrenceRule || undefined } : {}),
        ...(!currentTodo.parentTodoId && shouldClearRecurrence ? { recurrenceRule: undefined } : {}),
        ...(typeof patch.pin === 'boolean' ? { pin: patch.pin } : {}),
        ...(typeof patch.isCompleted === 'boolean'
          ? {
              isCompleted: patch.isCompleted,
              completedAt: patch.isCompleted
                ? (currentTodo.isCompleted ? currentTodo.completedAt : new Date().toISOString())
                : undefined
            }
          : {})
      };

      nextTodos = applyTodoSave(nextTodos, nextTodo);
      actions.push({
        actionId: crypto.randomUUID(),
        kind: 'update_todo',
        status: 'applied',
        snapshot: {
          todoId: nextTodo.id,
          previousTodo: currentTodo,
          nextTodo
        }
      });
    });

    if (actions.some((action) => action.kind === 'update_todo' && action.status === 'applied')) {
      setTodos(nextTodos);
    }

    return actions;
  };

  const applyPlannedCreateSubtaskToolCalls = (toolCalls: AICreateSubtaskToolCall[]): AppliedChatAction[] => {
    const actions: AppliedChatAction[] = [];
    let nextTodos = [...todos];

    toolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const parentTodo = nextTodos.find((todo) => todo.id === args.parentTodoId);

      if (!parentTodo || parentTodo.parentTodoId || parentTodo.recurrenceRule || !args.title.trim()) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'create_subtask',
          status: 'failed',
          errorMessage: '杩欐潯瀛愪换鍔＄己灏戠埗浠诲姟鎴栨爣棰橈紝鎴戝厛娌℃湁鏇夸綘鑷姩鍒涘缓銆?',
          snapshot: {
            title: args.title || '鏈懡鍚嶅瓙浠诲姟',
            categoryId: parentTodo?.categoryId || '',
            categoryName: todoCategories.find((category) => category.id === parentTodo?.categoryId)?.name || '鏈煡鍒嗙被',
            defaultScopeIds: parentTodo?.defaultScopeIds || [],
            defaultScopeNames: getScopeNames(parentTodo?.defaultScopeIds || []),
            parentTodoId: args.parentTodoId,
            parentTodoTitle: parentTodo?.title
          }
        });
        return;
      }

      const resolvedCategory = todoCategories.find((category) => category.id === parentTodo.categoryId);
      const newTodo: TodoItem = {
        id: crypto.randomUUID(),
        categoryId: parentTodo.categoryId,
        parentTodoId: parentTodo.id,
        childOrder: getNextChildOrder(nextTodos, parentTodo.id),
        title: args.title.trim(),
        isCompleted: false,
        pin: false,
        completedUnits: 0,
        ...(args.note ? { note: args.note } : {}),
        ...(args.scheduledDate ? { scheduledDate: args.scheduledDate } : {}),
        ...(args.deadlineDate ? { deadlineDate: args.deadlineDate } : {})
      };

      nextTodos = applyTodoSave(nextTodos, newTodo);
      const liveSubtask = nextTodos.find((todo) => todo.id === newTodo.id) || newTodo;
      actions.push({
        actionId: crypto.randomUUID(),
        kind: 'create_subtask',
        status: 'applied',
        snapshot: {
          todoId: liveSubtask.id,
          title: liveSubtask.title,
          categoryId: liveSubtask.categoryId,
          categoryName: resolvedCategory?.name || '',
          defaultScopeIds: liveSubtask.defaultScopeIds || [],
          defaultScopeNames: getScopeNames(liveSubtask.defaultScopeIds || []),
          ...(liveSubtask.note ? { note: liveSubtask.note } : {}),
          ...(liveSubtask.scheduledDate ? { scheduledDate: liveSubtask.scheduledDate } : {}),
          ...(liveSubtask.deadlineDate ? { deadlineDate: liveSubtask.deadlineDate } : {}),
          parentTodoId: parentTodo.id,
          parentTodoTitle: parentTodo.title
        }
      });
    });

    if (actions.some((action) => action.kind === 'create_subtask' && action.status === 'applied')) {
      setTodos(nextTodos);
    }

    return actions;
  };

  const applyPlannedEditLogToolCalls = (toolCalls: AIEditLogToolCall[]): AppliedChatAction[] => {
    const actions: AppliedChatAction[] = [];
    let nextLogs = [...logs];
    let nextTodos = [...todos];

    toolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const currentLog = nextLogs.find((log) => log.id === args.logId);
      if (!currentLog) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'edit_log',
          status: 'failed',
          errorMessage: '杩欐潯璁板綍娌℃壘鍒帮紝鎴戝厛娌℃湁鏇夸綘鑷姩淇敼銆?',
          snapshot: {
            logId: args.logId
          }
        });
        return;
      }

      const targetDateKey = args.patch.date || formatDateKey(new Date(currentLog.startTime));
      const startTime = args.patch.startTime
        ? parseTimeOnDateKey(targetDateKey, args.patch.startTime)
        : parseTimeOnDateKey(targetDateKey, formatTimeKey(currentLog.startTime));
      const endTime = args.patch.endTime
        ? parseTimeOnDateKey(targetDateKey, args.patch.endTime)
        : parseTimeOnDateKey(targetDateKey, formatTimeKey(currentLog.endTime));

      const resolvedActivity = args.patch.activityId
        ? getActivityById(args.patch.activityId)
        : undefined;
      const resolvedActivityCategory = args.patch.activityId
        ? getActivityCategory(args.patch.activityId)
        : undefined;
      const resolvedCategory = args.patch.categoryId
        ? categories.find((category) => category.id === args.patch.categoryId)
        : undefined;

      const nextCategory = resolvedActivityCategory
        || resolvedCategory
        || categories.find((category) => category.id === currentLog.categoryId);
      const nextActivity = resolvedActivity
        || nextCategory?.activities.find((activity) => activity.id === currentLog.activityId)
        || getActivityById(currentLog.activityId);

      if (!startTime || !endTime || endTime <= startTime || !nextCategory || !nextActivity) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'edit_log',
          status: 'failed',
          errorMessage: '杩欐潯璁板綍鐨勬椂闂存垨鍒嗙被淇℃伅涓嶅畬鏁达紝鎴戝厛娌℃湁鏇夸綘鑷姩淇敼銆?',
          snapshot: {
            logId: currentLog.id,
            previousLog: currentLog
          }
        });
        return;
      }

      const nextLinkedTodoId = args.patch.linkedTodoId === undefined
        ? currentLog.linkedTodoId
        : args.patch.linkedTodoId || undefined;
      if (nextLinkedTodoId && !nextTodos.some((todo) => todo.id === nextLinkedTodoId)) {
        actions.push({
          actionId: crypto.randomUUID(),
          kind: 'edit_log',
          status: 'failed',
          errorMessage: '璁板綍瑕佸叧鑱旂殑寰呭姙娌℃壘鍒帮紝鎴戝厛娌℃湁鑷姩淇敼銆?',
          snapshot: {
            logId: currentLog.id,
            previousLog: currentLog
          }
        });
        return;
      }

      const nextScopeIds = args.patch.scopeIds === undefined
        ? currentLog.scopeIds
        : args.patch.scopeIds === null
          ? undefined
          : dedupeStringArray(args.patch.scopeIds).filter((scopeId) => scopes.some((scope) => scope.id === scopeId));

      const nextLog: Log = {
        ...currentLog,
        categoryId: nextCategory.id,
        activityId: nextActivity.id,
        title: nextActivity.name,
        startTime,
        endTime,
        duration: Math.max(0, (endTime - startTime) / 1000),
        ...(args.patch.note !== undefined ? { note: args.patch.note || '' } : {}),
        ...(args.patch.linkedTodoId !== undefined ? { linkedTodoId: nextLinkedTodoId } : {}),
        ...(args.patch.scopeIds !== undefined ? { scopeIds: nextScopeIds } : {})
      };

      const saveResult = applyLogSave(nextLogs, nextTodos, nextLog);
      nextLogs = saveResult.logs;
      nextTodos = saveResult.todos;
      actions.push({
        actionId: crypto.randomUUID(),
        kind: 'edit_log',
        status: 'applied',
        snapshot: {
          logId: nextLog.id,
          previousLog: currentLog,
          nextLog
        }
      });
    });

    if (actions.some((action) => action.kind === 'edit_log' && action.status === 'applied')) {
      setLogs(nextLogs);
      setTodos(nextTodos);
    }

    return actions;
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
      ...(options?.retryInput ? { retryInput: options.retryInput } : {})
    });
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
      const currentDateTime = formatLocalDateTimeContext(new Date());
      const debugSections: AIChatDebugSection[] = [];

      const classifyResult = await aiService.classifyChatIntentWithDebug(trimmedText, {
        signal: controller.signal
      });

      if (debugMode) {
        debugSections.push({
          label: '意图识别',
          exchange: classifyResult.debug
        });
      }

      const matchedParentTodoIds = getMatchedParentTodoIds(trimmedText);
      const existingSubtaskSchedulingIntent = shouldTreatAsExistingSubtaskScheduling(trimmedText);
      const resolvedIntent = existingSubtaskSchedulingIntent
        ? 'update_todo'
        : classifyResult.result.intent;

      if (resolvedIntent === 'clarify') {
        replacePendingWithResult(
          sessionId,
          pendingMessageId,
          classifyResult.result.assistantReply || '你是想聊聊，还是想让我直接帮你补记/建待办？',
          {
            debugSections
          }
        );
        return;
      }

      if (resolvedIntent === 'chat') {
        const chatResult = await aiService.sendContextualChatReplyWithDebug(trimmedText, {
          currentDateTime,
          defaultDate: defaultDateKey,
          todayTimelineSummary,
          personaPrompt: buildPersonaPrompt(activePersona),
          conversationHistory: historyBeforeCurrent,
          latestLog: latestLogContext
        }, {
          signal: controller.signal
        });

        if (debugMode) {
          debugSections.push({
            label: '正式回复',
            exchange: chatResult.debug
          });
        }

        replacePendingWithResult(
          sessionId,
          pendingMessageId,
          chatResult.reply || '我在。',
          {
            debugSections
          }
        );
        return;
      }

      if (resolvedIntent === 'add_log') {
        const planningResult = await aiService.planBackfillToolCallsWithDebug(trimmedText, {
          currentDateTime,
          defaultDate: defaultDateKey,
          categories,
          scopes,
          personaPrompt: buildPersonaPrompt(activePersona),
          conversationHistory: historyBeforeCurrent,
          latestLog: latestLogContext,
          todos: todoPlanningContext
        }, {
          signal: controller.signal
        });

        if (debugMode) {
          debugSections.push({
            label: '补记规划',
            exchange: planningResult.debug
          });
        }

        const appliedActions = applyPlannedLogToolCalls(planningResult.plan.toolCalls);
        const successCount = appliedActions.filter((action) => action.status === 'applied').length;
        const content = planningResult.plan.assistantReply
          || (successCount > 0
            ? `我先帮你补记了 ${successCount} 条记录。`
            : '这次信息还不够我安全地下手，你可以再补充一下时间或分类。');

        replacePendingWithResult(
          sessionId,
          pendingMessageId,
          content,
          {
            debugSections,
            appliedActions
          }
        );
        return;
      }

      if (resolvedIntent === 'edit_log') {
        const planningResult = await aiService.planEditLogToolCallsWithDebug(trimmedText, {
          currentDateTime,
          defaultDate: defaultDateKey,
          categories,
          scopes,
          todos: todoUpdateContext.map((todo) => ({
            id: todo.id,
            title: todo.title,
            path: todo.path
          })),
          logs: logEditContext,
          personaPrompt: buildPersonaPrompt(activePersona),
          conversationHistory: historyBeforeCurrent
        }, {
          signal: controller.signal
        });

        if (debugMode) {
          debugSections.push({
            label: '记录修改规划',
            exchange: planningResult.debug
          });
        }

        const appliedActions = applyPlannedEditLogToolCalls(planningResult.plan.toolCalls);
        const successCount = appliedActions.filter((action) => action.status === 'applied').length;
        const content = planningResult.plan.assistantReply
          || (successCount > 0
            ? `我先帮你修改了 ${successCount} 条记录。`
            : '这次还差一点关键信息，你可以再补一下要改的是哪条记录。');

        replacePendingWithResult(sessionId, pendingMessageId, content, {
          debugSections,
          appliedActions
        });
        return;
      }

      if (resolvedIntent === 'update_todo') {
        const scopedTodoUpdateContext = existingSubtaskSchedulingIntent
          ? todoUpdateContext.filter((todo) => matchedParentTodoIds.includes(todo.parentTodoId || ''))
          : todoUpdateContext;
        const planningResult = await aiService.planTodoUpdateToolCallsWithDebug(trimmedText, {
          currentDateTime,
          defaultDate: defaultDateKey,
          todoCategories,
          activityCategories: categories,
          scopes,
          todos: scopedTodoUpdateContext,
          personaPrompt: buildPersonaPrompt(activePersona),
          conversationHistory: historyBeforeCurrent
        }, {
          signal: controller.signal
        });

        if (debugMode) {
          debugSections.push({
            label: '待办修改规划',
            exchange: planningResult.debug
          });
        }

        const appliedActions = applyPlannedTodoUpdateToolCalls(planningResult.plan.toolCalls);
        const successCount = appliedActions.filter((action) => action.status === 'applied').length;
        const content = planningResult.plan.assistantReply
          || (successCount > 0
            ? `我先帮你修改了 ${successCount} 条待办。`
            : '这次还差一点关键信息，你可以再补一下要改的是哪条待办。');

        replacePendingWithResult(sessionId, pendingMessageId, content, {
          debugSections,
          appliedActions
        });
        return;
      }

      if (resolvedIntent === 'create_subtask') {
        const planningResult = await aiService.planCreateSubtaskToolCallsWithDebug(trimmedText, {
          currentDateTime,
          defaultDate: defaultDateKey,
          parentTodos: subtaskParentContext,
          personaPrompt: buildPersonaPrompt(activePersona),
          conversationHistory: historyBeforeCurrent
        }, {
          signal: controller.signal
        });

        if (debugMode) {
          debugSections.push({
            label: '子任务规划',
            exchange: planningResult.debug
          });
        }

        const appliedActions = applyPlannedCreateSubtaskToolCalls(planningResult.plan.toolCalls);
        const successCount = appliedActions.filter((action) => action.status === 'applied').length;
        const content = planningResult.plan.assistantReply
          || (successCount > 0
            ? `我先帮你建好了 ${successCount} 条子任务。`
            : '这次还差一点关键信息，你可以再补一下要挂到哪个父任务下。');

        replacePendingWithResult(sessionId, pendingMessageId, content, {
          debugSections,
          appliedActions
        });
        return;
      }

      const todoPlanningResult = await aiService.planTodoToolCallsWithDebug(trimmedText, {
        currentDateTime,
        defaultDate: defaultDateKey,
        todoCategories,
        activityCategories: categories,
        scopes,
        personaPrompt: buildPersonaPrompt(activePersona),
        conversationHistory: historyBeforeCurrent
      }, {
        signal: controller.signal
      });

      if (debugMode) {
        debugSections.push({
          label: '待办规划',
          exchange: todoPlanningResult.debug
        });
      }

      const appliedActions = applyPlannedTodoToolCalls(todoPlanningResult.plan.toolCalls);
      const successCount = appliedActions.filter((action) => action.status === 'applied').length;
      const content = todoPlanningResult.plan.assistantReply
        || (successCount > 0
          ? `我先帮你建好了 ${successCount} 条待办。`
          : '这次还差一点关键信息，你可以再补一下标题、时间或待办分类。');

      replacePendingWithResult(
        sessionId,
        pendingMessageId,
        content,
        {
          debugSections,
          appliedActions
        }
      );
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
    const resolvedTodoCategoryName = todoCategories.find((category) => category.id === (liveTodo?.categoryId || action.snapshot.categoryId))?.name
      || action.snapshot.categoryName;
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
          {resolvedTodoCategoryName && (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">@</span>
              <span>{resolvedTodoCategoryName}</span>
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
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
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
                  {activePersona.name || '时间助理'}
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
                              placeholder="时间助理"
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
                              placeholder="时间助理"
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
                            placeholder="你"
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
                      <div className="space-y-3">
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">客户端发送</p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[1.3rem] border border-[#433a34] bg-[#2d2926] p-4 text-xs leading-6 text-[#efe7db] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                            {stringifyDebugSection(section.exchange.request)}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">服务端返回</p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-[1.3rem] border border-[#433a34] bg-[#2d2926] p-4 text-xs leading-6 text-[#efe7db] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                            {stringifyDebugSection(section.exchange.response)}
                          </pre>
                        </div>
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
