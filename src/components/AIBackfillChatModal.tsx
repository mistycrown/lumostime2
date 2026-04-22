/**
 * @file AIBackfillChatModal.tsx
 * @input Unified AI chat sessions, local logs/todos/categories/scopes, and user natural-language messages
 * @output Full-screen AI time assistant with session history, persona settings, quick context cache, and direct log/todo application
 * @pos Component (AI Integration)
 * @description Provides the shared AI workspace for chat, backfill, and todo creation. Sessions persist locally, persona style is configurable per session, and recent context can be toggled into the formal AI request path.
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
  Bot,
  Check,
  Clock3,
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
  Upload,
  User,
  X
} from 'lucide-react';
import {
  aiService,
  type AIDebugExchange,
  type AIBackfillToolCall,
  type AIConversationTurn,
  type AITodoToolCall
} from '../services/aiService';
import { IconRenderer } from './IconRenderer';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import type { Log, TodoItem, TodoRecurrenceRule } from '../types';
import { formatDateKey, normalizeAIBackfillToolCalls, parseTimeOnDateKey } from '../utils/aiBackfillUtils';
import { getTodoProgressTrackingMode } from '../utils/todoProgressUtils';
import { imageService } from '../services/imageService';

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

type AppliedChatAction = AppliedCreateLogAction | AppliedCreateTodoAction;

interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  tone?: ChatTone;
  debugSections?: AIChatDebugSection[];
  appliedActions?: AppliedChatAction[];
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
}

const CHAT_SESSIONS_KEY = 'lumostime_ai_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'lumostime_ai_chat_active_session_v1';
const CHAT_PERSONAS_KEY = 'lumostime_ai_chat_personas_v1';
const DEBUG_MODE_KEY = 'lumostime_ai_chat_debug_mode_v1';

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
      ...(candidate.appliedActions ? { appliedActions: normalizeAppliedActions(candidate.appliedActions) } : {})
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
  const storedActiveSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
  const activeSessionId = sessions.some((session) => session.id === storedActiveSessionId)
    ? storedActiveSessionId as string
    : [...sessions].sort((left, right) => right.updatedAt - left.updatedAt)[0].id;

  return {
    personas,
    sessions,
    activeSessionId,
    debugMode: localStorage.getItem(DEBUG_MODE_KEY) === 'true'
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
  const activeRequestRef = useRef<ActiveRequestRef | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
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
  const { autoLinkRules } = useSettings();

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

  const referenceDayLogs = useMemo(() => (
    logs
      .filter((log) => formatDateKey(new Date(log.startTime)) === defaultDateKey)
      .sort((left, right) => left.startTime - right.startTime)
  ), [defaultDateKey, logs]);

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
    activityId
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

  const applyPlannedLogToolCalls = (toolCalls: AIBackfillToolCall[]): AppliedChatAction[] => {
    const normalizedToolCalls = normalizeAIBackfillToolCalls(toolCalls, defaultDateKey);
    const createdLogs: Log[] = [];
    const actions: AppliedChatAction[] = [];
    const nextTodos = [...todos];

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

      createdLogs.push(newLog);
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

    if (createdLogs.length > 0) {
      setLogs((prev) => [...createdLogs, ...prev]);
    }
    if (actions.some((action) => action.kind === 'create_log' && action.status === 'applied')) {
      setTodos(nextTodos);
    }

    return actions;
  };

  const applyPlannedTodoToolCalls = (toolCalls: AITodoToolCall[]): AppliedChatAction[] => {
    const createdTodos: TodoItem[] = [];
    const actions: AppliedChatAction[] = [];

    toolCalls.forEach((toolCall) => {
      const { args } = toolCall;
      const resolvedTodoCategory = todoCategories.find((category) => category.id === args.categoryId) || todoCategories[0];
      const resolvedLinkedCategoryId = args.linkedCategoryId
        || (args.linkedActivityId
          ? categories.find((category) => category.activities.some((activity) => activity.id === args.linkedActivityId))?.id
          : undefined);
      const resolvedActivity = args.linkedActivityId
        ? categories
          .flatMap((category) => category.activities)
          .find((activity) => activity.id === args.linkedActivityId)
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

      createdTodos.push(newTodo);
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

    if (createdTodos.length > 0) {
      setTodos((prev) => [...createdTodos, ...prev]);
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

    setLogs((prev) => prev.filter((log) => log.id !== liveLog.id));

    if (action.snapshot.linkedTodoId && action.snapshot.progressIncrement) {
      setTodos((prev) => prev.map((todo) => {
        if (todo.id !== action.snapshot.linkedTodoId || getTodoProgressTrackingMode(todo, prev) !== 'manual') {
          return todo;
        }

        return {
          ...todo,
          isProgress: true,
          progressTrackingMode: 'manual',
          completedUnits: Math.max(0, (todo.completedUnits || 0) - action.snapshot.progressIncrement)
        };
      }));
    }

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
    }
  ) => {
    replaceMessage(sessionId, pendingMessageId, {
      id: pendingMessageId,
      role: 'assistant',
      content,
      createdAt: Date.now(),
      ...(options?.tone ? { tone: options.tone } : {}),
      ...(options?.debugSections && options.debugSections.length > 0 ? { debugSections: options.debugSections } : {}),
      ...(options?.appliedActions && options.appliedActions.length > 0 ? { appliedActions: options.appliedActions } : {})
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

      if (classifyResult.result.intent === 'clarify') {
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

      if (classifyResult.result.intent === 'chat') {
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

      if (classifyResult.result.intent === 'add_log') {
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
        const message = error instanceof Error ? error.message : 'AI 请求失败';
        replacePendingWithResult(sessionId, pendingMessageId, message, {
          tone: 'error'
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

    return (
      <div
        key={action.actionId}
        className={`rounded-xl border px-3 py-2.5 ${
          action.status === 'failed'
            ? 'border-red-200 bg-red-50'
            : action.status === 'undone'
              ? 'border-stone-200 bg-stone-50 opacity-75'
              : 'border-stone-200 bg-stone-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
              <Clock3 size={13} />
              <span>{formatDateTimeRange(action.snapshot.startTime, action.snapshot.endTime)}</span>
            </div>
            <p className="mt-1 text-[15px] font-medium leading-5 text-stone-800">
              {liveActivity?.name || action.snapshot.activityName}
            </p>
            {action.snapshot.description && (
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-stone-600">
                {action.snapshot.description}
              </p>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              action.status === 'failed'
                ? 'bg-red-100 text-red-700'
                : action.status === 'undone'
                  ? 'bg-stone-200 text-stone-500'
                  : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {action.status === 'failed' ? '失败' : action.status === 'undone' ? '已撤销' : '已应用'}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-stone-500">
          <span className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2 py-0.5">
            <IconRenderer
              icon={liveCategory?.icon || ''}
              uiIcon={liveCategory?.uiIcon}
              className="text-xs"
            />
            <span>{liveCategory?.name || action.snapshot.categoryName}</span>
          </span>

          {action.snapshot.scopeNames.map((scopeName) => (
            <span key={`${action.actionId}-${scopeName}`} className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5">
              %{scopeName}
            </span>
          ))}

          {(liveLinkedTodo?.title || action.snapshot.linkedTodoTitle) && (
            <span className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5">
              @{liveLinkedTodo?.title || action.snapshot.linkedTodoTitle}
            </span>
          )}
        </div>

        {action.errorMessage && (
          <p className="mt-2 text-xs text-red-600">{action.errorMessage}</p>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <button
            onClick={() => handleOpenLogEditor(action.snapshot.logId)}
            disabled={!liveLog || action.status !== 'applied'}
            className="inline-flex h-8 items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil size={12} className="mr-1" />
            编辑
          </button>
          <button
            onClick={() => handleUndoLogAction(messageId, action)}
            disabled={action.status !== 'applied'}
            className="inline-flex h-8 items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={12} className="mr-1" />
            撤销
          </button>
        </div>
      </div>
    );
  };

  const renderTodoAction = (messageId: string, action: AppliedCreateTodoAction) => {
    const liveTodo = action.snapshot.todoId
      ? todos.find((todo) => todo.id === action.snapshot.todoId)
      : undefined;

    return (
      <div
        key={action.actionId}
        className={`rounded-xl border px-3 py-2.5 ${
          action.status === 'failed'
            ? 'border-red-200 bg-red-50'
            : action.status === 'undone'
              ? 'border-stone-200 bg-stone-50 opacity-75'
              : 'border-stone-200 bg-stone-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[15px] font-medium leading-5 text-stone-800">
              {liveTodo?.title || action.snapshot.title}
            </p>
            {action.snapshot.note && (
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-stone-600">
                {action.snapshot.note}
              </p>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              action.status === 'failed'
                ? 'bg-red-100 text-red-700'
                : action.status === 'undone'
                  ? 'bg-stone-200 text-stone-500'
                  : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {action.status === 'failed' ? '失败' : action.status === 'undone' ? '已撤销' : '已创建'}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-stone-500">
          <span className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5">
            {action.snapshot.categoryName}
          </span>

          {action.snapshot.linkedActivityName && (
            <span className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5">
              #{action.snapshot.linkedActivityName}
            </span>
          )}

          {action.snapshot.defaultScopeNames.map((scopeName) => (
            <span key={`${action.actionId}-${scopeName}`} className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5">
              %{scopeName}
            </span>
          ))}

          {action.snapshot.scheduledDate && (
            <span className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5">
              安排 {action.snapshot.scheduledDate}
            </span>
          )}

          {action.snapshot.deadlineDate && (
            <span className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5">
              截止 {action.snapshot.deadlineDate}
            </span>
          )}

          {action.snapshot.recurrenceRule && (
            <span className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5">
              循环 {action.snapshot.recurrenceRule.frequency}
            </span>
          )}
        </div>

        {action.errorMessage && (
          <p className="mt-2 text-xs text-red-600">{action.errorMessage}</p>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <button
            onClick={() => handleOpenTodoDetail(action.snapshot.todoId)}
            disabled={!liveTodo || action.status !== 'applied'}
            className="inline-flex h-8 items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil size={12} className="mr-1" />
            详情
          </button>
          <button
            onClick={() => handleUndoTodoAction(messageId, action)}
            disabled={action.status !== 'applied'}
            className="inline-flex h-8 items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={12} className="mr-1" />
            撤销
          </button>
        </div>
      </div>
    );
  };

  const renderAppliedAction = (messageId: string, action: AppliedChatAction) => (
    action.kind === 'create_log'
      ? renderLogAction(messageId, action)
      : renderTodoAction(messageId, action)
  );

  const renderMessageBubble = (message: AIChatMessage) => {
    const isUser = message.role === 'user';
    const tone = message.tone || 'normal';

    let bubbleClassName = 'border border-stone-200 bg-white text-stone-700';
    if (isUser) {
      bubbleClassName = 'bg-stone-900 text-white';
    } else if (tone === 'system') {
      bubbleClassName = 'border border-amber-200 bg-amber-50 text-amber-800';
    } else if (tone === 'error') {
      bubbleClassName = 'border border-red-200 bg-red-50 text-red-700';
    } else if (tone === 'pending') {
      bubbleClassName = 'border border-stone-200 bg-stone-50 text-stone-600';
    }

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex max-w-[88%] items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div
            className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isUser
                ? 'bg-stone-900 text-white'
                : tone === 'error'
                  ? 'bg-red-100 text-red-700'
                  : tone === 'system'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-white text-stone-700'
            }`}
          >
            {isUser ? (
              <User size={15} />
            ) : (
              <div className="h-full w-full overflow-hidden rounded-full">
                <PersonaAvatar persona={activePersona} className="rounded-full" iconClassName="text-sm" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className={`rounded-[1.5rem] px-4 py-3 shadow-sm ${bubbleClassName}`}>
              {!isUser && (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
                  {activePersona.assistantSelfName || 'AI 回答'}
                </p>
              )}
              <div className="flex items-start gap-2">
                {tone === 'pending' && (
                  <Loader2 size={15} className="mt-1 shrink-0 animate-spin text-stone-400" />
                )}
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {message.content}
                </p>
              </div>
            </div>

            {message.appliedActions && message.appliedActions.length > 0 && (
              <div className="space-y-2 rounded-[1.5rem] border border-stone-200 bg-white p-3 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
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
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700"
                >
                  <Sparkles size={12} />
                  查看调试
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#f3efe7]">
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div className="flex items-center justify-between border-b border-stone-200/80 bg-[#f7f3eb]/95 px-5 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => !isLoading && setIsPersonaPanelOpen(true)}
              disabled={isLoading}
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white text-lg shadow-sm transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              title="打开 AI 设置"
            >
              <PersonaAvatar persona={activePersona} iconClassName="text-lg" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-bold text-stone-800">
                  {activePersona.name || '时间助理'}
                </h2>
                {debugMode && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
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
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
              title="历史对话"
            >
              <History size={18} />
            </button>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-700"
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-dashed border-stone-200 bg-white/85 px-6 py-7 text-sm leading-7 text-stone-500 shadow-sm">
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
            <div className="mx-auto max-w-3xl space-y-4">
              {activeSession.messages.map(renderMessageBubble)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-stone-200/80 bg-[#f7f3eb]/96 px-4 pb-4 pt-3 backdrop-blur sm:px-6">
          <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`和 ${activePersona.assistantSelfName || 'AI'} 说点什么...`}
              className="min-h-[72px] max-h-[144px] w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-300"
              autoFocus
            />

            <div className="mt-2 flex items-end justify-between gap-3">
              <button
                onClick={() => activeSession && mutateSession(activeSession.id, (session) => ({
                  ...session,
                  contextCacheEnabled: !session.contextCacheEnabled
                }))}
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeSession?.contextCacheEnabled
                    ? 'border-stone-300 bg-white text-stone-700'
                    : 'border-stone-200 bg-white text-stone-500'
                }`}
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
                className={`ml-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  isLoading
                    ? 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-800'
                    : 'bg-stone-900 text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300'
                }`}
              >
                {isLoading ? <Square size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {isHistoryPanelOpen && (
          <div className="absolute inset-0 z-10 bg-black/25 backdrop-blur-[2px]">
            <div className="absolute inset-y-0 right-0 w-full max-w-sm border-l border-stone-200 bg-[#f8f4ed] shadow-2xl">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                <div>
                  <h3 className="text-base font-bold text-stone-800">历史对话</h3>
                  <p className="text-xs text-stone-400">默认一直留在同一条会话里，只有这里才能新建。</p>
                </div>
                <button
                  onClick={() => setIsHistoryPanelOpen(false)}
                  className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="border-b border-stone-200 px-5 py-4">
                <button
                  onClick={handleCreateSession}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black"
                >
                  <MessageSquarePlus size={16} />
                  新建对话
                </button>
              </div>

              <div className="h-[calc(100%-132px)] overflow-y-auto px-3 py-3">
                <div className="space-y-2">
                  {sortedSessions.map((session) => {
                    const sessionPersona = personaMap.get(session.personaId) || personas[0] || DEFAULT_AI_PERSONAS[0];
                    const lastMessage = [...session.messages].reverse().find((message) => message.tone !== 'pending');
                    const isEditing = editingSessionId === session.id;
                    const isDeleteConfirming = deleteConfirmSessionId === session.id;
                    return (
                      <div
                        key={session.id}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                          session.id === activeSessionId
                            ? 'border-stone-900 bg-white shadow-sm'
                            : 'border-stone-200 bg-white/60 hover:bg-white'
                        }`}
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
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-base shadow-sm">
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
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-bold text-stone-800 outline-none focus:border-stone-400 focus:bg-white"
                                    autoFocus
                                  />
                                ) : (
                                  <p className="truncate text-sm font-bold text-stone-800">{session.title}</p>
                                )}
                                <span className="shrink-0 text-[11px] text-stone-400">
                                  {formatConversationTime(session.updatedAt)}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-stone-500">
                                {lastMessage?.content || '还没有消息'}
                              </p>
                              <div className="mt-2 flex items-center gap-2 text-[11px] text-stone-400">
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
                                  className="rounded-full px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
                                  title="保存名称"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={handleCancelRenameSession}
                                  className="rounded-full px-2.5 py-1 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100"
                                  title="取消重命名"
                                >
                                  取消
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartRenameSession(session)}
                                  className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
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
                                  className="rounded-full p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  title="删除对话"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isDeleteConfirming && !isEditing && (
                          <div className="mt-3 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                            <span>删除后不能恢复，确认删除这个对话吗？</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setDeleteConfirmSessionId(null)}
                                className="rounded-full px-2.5 py-1 font-medium text-stone-500 transition-colors hover:bg-white"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="rounded-full bg-red-600 px-2.5 py-1 font-medium text-white transition-colors hover:bg-red-700"
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
          <div className="absolute inset-0 z-10 bg-[#f6f2ea]">
            <div
              className="flex h-full flex-col"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <div className="flex items-center justify-between border-b border-stone-200 bg-white/90 px-5 py-4 backdrop-blur">
                <h3 className="text-base font-bold text-stone-800">AI 设置</h3>
                <button
                  onClick={() => setIsPersonaPanelOpen(false)}
                  className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-6">
                  <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-stone-800">人设列表</p>
                      <button
                        onClick={handleCreatePersona}
                        className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
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
                          className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                            activeSession?.personaId === persona.id
                              ? 'border-stone-900 bg-stone-50 text-stone-700 shadow-sm'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-lg shadow-sm">
                              <PersonaAvatar persona={persona} iconClassName="text-lg" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold">{persona.name}</p>
                                {activeSession?.personaId === persona.id && (
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700">
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
                          className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                            activeSession?.personaId === persona.id
                              ? 'border-stone-900 bg-stone-50 text-stone-700 shadow-sm'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-lg shadow-sm">
                              <PersonaAvatar persona={persona} iconClassName="text-lg" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-bold">{persona.name}</p>
                                {activeSession?.personaId === persona.id && (
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700">
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

                  <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-stone-800">当前人设</p>
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-500">
                        {activePersona.isBuiltIn ? '内置模板' : '自定义人设'}
                      </span>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-4">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />

                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] bg-white text-2xl shadow-sm">
                              <PersonaAvatar persona={activePersona} iconClassName="text-2xl" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-stone-800">{activePersona.name || '未命名人设'}</p>
                              <p className="mt-1 text-xs text-stone-500">当前会话使用中</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={handleUseEmojiAvatar}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 sm:flex-none"
                            >
                              <Sparkles size={14} />
                              Emoji
                            </button>
                            <button
                              onClick={() => avatarInputRef.current?.click()}
                              disabled={isUploadingAvatar}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                            >
                              {isUploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                              {isUploadingAvatar ? '上传中' : '上传图片'}
                            </button>
                            {!activePersona.isBuiltIn && (
                              <button
                                onClick={() => setDeleteConfirmPersonaId((current) => current === activePersona.id ? null : activePersona.id)}
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 sm:flex-none"
                              >
                                <Trash2 size={14} />
                                删除人设
                              </button>
                            )}
                          </div>
                        </div>

                        {isEmojiEditorOpen && (
                          <div className="mt-4 rounded-[1.25rem] border border-stone-200 bg-white p-3 shadow-sm">
                            <p className="text-xs font-medium text-stone-500">输入一个 Emoji，或直接点选下方常用头像。</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {PERSONA_EMOJI_CHOICES.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => setEmojiDraft(emoji)}
                                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-lg transition-colors ${
                                    emojiDraft.trim() === emoji
                                      ? 'border-stone-300 bg-white text-stone-700 shadow-sm'
                                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                                  }`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>

                            <div className="mt-3 rounded-[1rem] border border-stone-200 bg-stone-50 px-3 py-3">
                              <input
                                value={emojiDraft}
                                onChange={(event) => setEmojiDraft(event.target.value)}
                                className="w-full bg-transparent text-sm text-stone-700 outline-none"
                                placeholder="输入一个 Emoji，例如 ✨"
                              />
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                onClick={handleCancelEmojiAvatarEdit}
                                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => void handleApplyEmojiAvatar()}
                                className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-700"
                              >
                                保存 Emoji
                              </button>
                            </div>
                          </div>
                        )}
                        {deleteConfirmPersonaId === activePersona.id && !activePersona.isBuiltIn && (
                          <div className="mt-4 rounded-[1.25rem] border border-red-100 bg-red-50 p-3 text-xs text-red-700 shadow-sm">
                            <p>删除后，这个人设会从所有会话中移除，并回退到默认预设。</p>
                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                onClick={() => setDeleteConfirmPersonaId(null)}
                                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => void handleDeleteCurrentPersona()}
                                className="rounded-full bg-red-600 px-3 py-1.5 font-medium text-white transition-colors hover:bg-red-700"
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
                              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none focus:border-stone-400 focus:bg-white"
                              placeholder="时间助理"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-stone-500">AI 自称</span>
                            <input
                              value={activePersona.assistantSelfName}
                              onChange={(event) => updateCurrentPersona({ assistantSelfName: event.target.value })}
                              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none focus:border-stone-400 focus:bg-white"
                              placeholder="时间助理"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-stone-500">对用户称呼</span>
                          <input
                            value={activePersona.userCallName}
                            onChange={(event) => updateCurrentPersona({ userCallName: event.target.value })}
                            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none focus:border-stone-400 focus:bg-white"
                            placeholder="你"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-stone-500">自定义提示词</span>
                          <textarea
                            value={activePersona.systemPrompt}
                            onChange={(event) => updateCurrentPersona({ systemPrompt: event.target.value })}
                            className="min-h-[160px] w-full rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700 outline-none focus:border-stone-400 focus:bg-white"
                            placeholder="补充这个人设的语气、风格、偏好、边界条件。"
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
                    <p className="mb-4 text-sm font-bold text-stone-800">上下文设置</p>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-stone-500">最近上下文轮数 n</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={activePersona.contextMessageLimit}
                        onChange={(event) => updateCurrentPersona({ contextMessageLimit: Number(event.target.value) })}
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 outline-none focus:border-stone-400 focus:bg-white"
                      />
                      <p className="mt-2 text-xs text-stone-400">这里只控制正式请求最多带上几轮历史，不属于人设信息本身。</p>
                    </label>
                  </section>
                </div>
              </div>
            </div>
          </div>
        )}

        {debugViewer && (
          <div className="absolute inset-0 z-20 bg-black/30 backdrop-blur-sm">
            <div
              className="flex h-full flex-col bg-[#f6f2ea]"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <div className="flex items-center justify-between border-b border-stone-200 bg-white/90 px-5 py-4 backdrop-blur">
                <div>
                  <h3 className="text-base font-bold text-stone-800">{debugViewer.title}</h3>
                  <p className="text-xs text-stone-400">按阶段查看请求与响应</p>
                </div>
                <button
                  onClick={() => setDebugViewer(null)}
                  className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-4">
                  {debugViewer.sections.map((section) => (
                    <div key={section.label} className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm">
                      <p className="mb-3 text-sm font-bold text-stone-800">{section.label}</p>
                      <div className="space-y-3">
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">客户端发送</p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-stone-900 p-4 text-xs leading-6 text-stone-100">
                            {stringifyDebugSection(section.exchange.request)}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">服务端返回</p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-stone-900 p-4 text-xs leading-6 text-stone-100">
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
