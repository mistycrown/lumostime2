/**
 * @file AIBackfillChatModal.tsx
 * @input Target date, locally persisted chat history, user backfill questions
 * @output Local-only full-screen AI backfill chat view with direct tool application, edit/undo controls, and optional request debugging
 * @pos Component (AI Integration)
 * @description Replaces the old AI backfill parse-first flow with a chat-first full-screen conversation view that can let AI plan create-log tool calls, apply them immediately, and keep visible local history with per-call edit/undo affordances.
 * @updated 2026-04-22: Added AI-planned create-log application with per-result edit and undo actions.
 * @updated 2026-04-22: Added command-based debug mode with per-call request/response inspection for AI backfill chat.
 * @updated 2026-04-22: Added local pending-request recovery plus stop/retry controls so interrupted AI requests can be resent safely.
 * @updated 2026-04-22: Switched the AI backfill chat UI to a full-screen conversation layout with app-style header, scroll area, and composer.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bug, Bot, Clock3, Loader2, Pencil, RotateCcw, Send, Sparkles, Square, Trash2, User, X } from 'lucide-react';
import {
  aiService,
  type AIDebugExchange,
  type AIBackfillToolCall
} from '../services/aiService';
import { IconRenderer } from '../components/IconRenderer';
import { useData } from '../contexts/DataContext';
import { useCategoryScope } from '../contexts/CategoryScopeContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import type { Log } from '../types';
import { getTodoProgressTrackingMode } from '../utils/todoProgressUtils';

type BackfillChatRole = 'user' | 'assistant';
type BackfillChatTone = 'normal' | 'system' | 'error' | 'pending';
type AppliedActionStatus = 'applied' | 'undone' | 'failed';
type BackfillRequestStatus = 'pending' | 'stopped' | 'failed';

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

interface AppliedToolAction {
  actionId: string;
  toolName: 'create_log';
  status: AppliedActionStatus;
  snapshot: AppliedCreateLogSnapshot;
  errorMessage?: string;
}

interface BackfillChatMessage {
  id: string;
  role: BackfillChatRole;
  content: string;
  createdAt: number;
  tone?: BackfillChatTone;
  debugData?: AIDebugExchange;
  appliedActions?: AppliedToolAction[];
  requestState?: {
    requestId: string;
    sourceText: string;
    status: BackfillRequestStatus;
    createdAt: number;
    errorMessage?: string;
  };
}

interface ActiveRequestRef {
  requestId: string;
  messageId: string;
  controller: AbortController | null;
  cancelled: boolean;
}

interface AIBackfillChatModalProps {
  onClose: () => void;
  targetDate?: Date;
}

const STORAGE_KEY_PREFIX = 'lumostime_ai_backfill_chat_v1_';
const DEBUG_MODE_KEY = 'lumostime_ai_backfill_debug_mode_v1';

const formatStorageDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) => (
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date)
);

const formatTimeRange = (startTime: number, endTime: number) => {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${formatter.format(startTime)} - ${formatter.format(endTime)}`;
};

const isDebugExchange = (value: unknown): value is AIDebugExchange => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as AIDebugExchange;
  return (
    (candidate.provider === 'openai' || candidate.provider === 'gemini') &&
    typeof candidate.requestedAt === 'string' &&
    typeof candidate.completedAt === 'string' &&
    typeof candidate.request === 'object' &&
    typeof candidate.response === 'object'
  );
};

const isAppliedToolAction = (value: unknown): value is AppliedToolAction => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as AppliedToolAction;
  return (
    candidate.toolName === 'create_log' &&
    typeof candidate.actionId === 'string' &&
    (candidate.status === 'applied' || candidate.status === 'undone' || candidate.status === 'failed') &&
    typeof candidate.snapshot === 'object'
  );
};

const isRequestState = (value: unknown): value is NonNullable<BackfillChatMessage['requestState']> => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as NonNullable<BackfillChatMessage['requestState']>;
  return (
    typeof candidate.requestId === 'string' &&
    typeof candidate.sourceText === 'string' &&
    typeof candidate.createdAt === 'number' &&
    (candidate.status === 'pending' || candidate.status === 'stopped' || candidate.status === 'failed') &&
    (!candidate.errorMessage || typeof candidate.errorMessage === 'string')
  );
};

const recoverInterruptedRequests = (messages: BackfillChatMessage[]): BackfillChatMessage[] => (
  messages.map((message) => {
    if (message.requestState?.status !== 'pending') {
      return message;
    }

    return {
      ...message,
      tone: 'error',
      content: '这次请求在等待 AI 响应时中断了，你可以点击下方按钮重新发送。',
      requestState: {
        ...message.requestState,
        status: 'failed',
        errorMessage: '请求已中断'
      }
    };
  })
);

const loadMessages = (storageKey: string): BackfillChatMessage[] => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return recoverInterruptedRequests(parsed.filter((item): item is BackfillChatMessage => (
      item &&
      typeof item.id === 'string' &&
      (item.role === 'user' || item.role === 'assistant') &&
      typeof item.content === 'string' &&
      typeof item.createdAt === 'number' &&
      (!item.tone || item.tone === 'normal' || item.tone === 'system' || item.tone === 'error' || item.tone === 'pending') &&
      (!item.debugData || isDebugExchange(item.debugData)) &&
      (!item.appliedActions || (Array.isArray(item.appliedActions) && item.appliedActions.every(isAppliedToolAction))) &&
      (!item.requestState || isRequestState(item.requestState))
    )));
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to load local chat history', error);
    return [];
  }
};

const persistMessages = (storageKey: string, messages: BackfillChatMessage[]) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to persist local chat history', error);
  }
};

const loadDebugMode = (): boolean => {
  try {
    return localStorage.getItem(DEBUG_MODE_KEY) === 'true';
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to load debug mode', error);
    return false;
  }
};

const persistDebugMode = (value: boolean) => {
  try {
    localStorage.setItem(DEBUG_MODE_KEY, String(value));
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to persist debug mode', error);
  }
};

const stringifyDebugSection = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    console.error('[AIBackfillChatModal] Failed to stringify debug payload', error);
    return String(value);
  }
};

const parseTimeOnDate = (targetDate: Date, hhmm: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const next = new Date(targetDate);
  next.setHours(hour, minute, 0, 0);
  return next.getTime();
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

export const AIBackfillChatModal: React.FC<AIBackfillChatModalProps> = ({
  onClose,
  targetDate
}) => {
  const resolvedTargetDate = targetDate || new Date();
  const dateKey = useMemo(() => formatStorageDate(resolvedTargetDate), [resolvedTargetDate]);
  const storageKey = `${STORAGE_KEY_PREFIX}${dateKey}`;
  const [messages, setMessages] = useState<BackfillChatMessage[]>(() => loadMessages(storageKey));
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(() => loadDebugMode());
  const [selectedDebug, setSelectedDebug] = useState<AIDebugExchange | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeRequestRef = useRef<ActiveRequestRef | null>(null);

  const { logs, setLogs, todos, setTodos } = useData();
  const { categories, scopes } = useCategoryScope();
  const { setEditingLog, setInitialLogTimes, setIsAddModalOpen } = useNavigation();
  const { addToast } = useToast();

  useEffect(() => {
    activeRequestRef.current?.controller?.abort();
    activeRequestRef.current = null;
    setIsLoading(false);
    setMessages(loadMessages(storageKey));
    setSelectedDebug(null);
    setError(null);
  }, [storageKey]);

  useEffect(() => {
    persistMessages(storageKey, messages);
  }, [messages, storageKey]);

  useEffect(() => {
    persistDebugMode(debugMode);
  }, [debugMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => (
    () => {
      activeRequestRef.current?.controller?.abort();
      activeRequestRef.current = null;
    }
  ), []);

  const appendMessages = (...nextMessages: BackfillChatMessage[]) => {
    setMessages((prev) => [...prev, ...nextMessages]);
  };

  const updateMessage = (
    messageId: string,
    updater: (message: BackfillChatMessage) => BackfillChatMessage
  ) => {
    setMessages((prev) => prev.map((message) => (
      message.id === messageId ? updater(message) : message
    )));
  };

  const updateActionStatus = (messageId: string, actionId: string, nextStatus: AppliedActionStatus) => {
    setMessages((prev) => prev.map((message) => {
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
    }));
  };

  const finalizeActiveRequest = (requestId: string) => {
    if (activeRequestRef.current?.requestId === requestId) {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setError(null);
    setSelectedDebug(null);
    try {
      localStorage.removeItem(storageKey);
    } catch (persistError) {
      console.error('[AIBackfillChatModal] Failed to clear local chat history', persistError);
    }
  };

  const handleDebugCommand = (trimmedText: string): boolean => {
    const normalized = trimmedText.toLowerCase();
    if (!['/debug', '/debug on', '/debug off'].includes(normalized)) {
      return false;
    }

    const nextDebugMode = normalized === '/debug'
      ? !debugMode
      : normalized === '/debug on';

    appendMessages(
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedText,
        createdAt: Date.now()
      },
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        tone: 'system',
        content: nextDebugMode
          ? '已开启调试模式。之后每次 AI 调用都会保留客户端发送内容和服务端返回内容，你可以点击消息下方的“查看调试”。'
          : '已关闭调试模式。之后的新调用将不再显示调试入口。',
        createdAt: Date.now()
      }
    );

    setDebugMode(nextDebugMode);
    setInputText('');
    setError(null);
    return true;
  };

  const applyPlannedToolCalls = (toolCalls: AIBackfillToolCall[]): AppliedToolAction[] => {
    const createdLogs: Log[] = [];
    const actions: AppliedToolAction[] = [];
    const nextTodos = [...todos];

    for (const toolCall of toolCalls) {
      const { args } = toolCall;
      const startTime = parseTimeOnDate(resolvedTargetDate, args.startTime);
      const endTime = parseTimeOnDate(resolvedTargetDate, args.endTime);

      const category = categories.find((item) => item.id === args.categoryId);
      const activity = category?.activities.find((item) => item.id === args.activityId)
        || categories.flatMap((item) => item.activities).find((item) => item.id === args.activityId);
      const activityCategory = category || categories.find((item) => (
        item.activities.some((activityItem) => activityItem.id === args.activityId)
      ));

      if (!startTime || !endTime || endTime <= startTime || !activity || !activityCategory) {
        actions.push({
          actionId: crypto.randomUUID(),
          toolName: 'create_log',
          status: 'failed',
          errorMessage: '这条工具调用里的时间或标签信息不完整，暂时没有自动应用。',
          snapshot: {
            startTime: startTime || Date.now(),
            endTime: endTime || Date.now(),
            description: args.description || '',
            categoryId: args.categoryId || '',
            categoryName: activityCategory?.name || '未知分类',
            activityId: args.activityId || '',
            activityName: activity?.name || '未知标签',
            scopeIds: [],
            scopeNames: []
          }
        });
        continue;
      }

      const validScopes = (args.scopeIds || [])
        .map((scopeId) => scopes.find((scope) => scope.id === scopeId))
        .filter((scope): scope is NonNullable<typeof scope> => Boolean(scope));
      const linkedTodo = args.linkedTodoId
        ? nextTodos.find((todo) => todo.id === args.linkedTodoId)
        : undefined;

      const progressIncrement = (
        linkedTodo &&
        typeof args.progressIncrement === 'number' &&
        args.progressIncrement > 0 &&
        getTodoProgressTrackingMode(linkedTodo, nextTodos) === 'manual'
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
        categoryId: activityCategory.id,
        activityId: activity.id,
        title: activity.name,
        startTime,
        endTime,
        duration: Math.max(0, (endTime - startTime) / 1000),
        note: args.description,
        ...(validScopes.length > 0 ? { scopeIds: validScopes.map((scope) => scope.id) } : {}),
        ...(linkedTodo ? { linkedTodoId: linkedTodo.id } : {}),
        ...(progressIncrement ? { progressIncrement } : {})
      };

      createdLogs.push(newLog);
      actions.push({
        actionId: crypto.randomUUID(),
        toolName: 'create_log',
        status: 'applied',
        snapshot: {
          logId: newLog.id,
          startTime,
          endTime,
          description: args.description,
          categoryId: activityCategory.id,
          categoryName: activityCategory.name,
          activityId: activity.id,
          activityName: activity.name,
          scopeIds: validScopes.map((scope) => scope.id),
          scopeNames: validScopes.map((scope) => scope.name),
          ...(linkedTodo ? { linkedTodoId: linkedTodo.id, linkedTodoTitle: linkedTodo.title } : {}),
          ...(progressIncrement ? { progressIncrement } : {})
        }
      });
    }

    setTodos(nextTodos);

    if (createdLogs.length > 0) {
      setLogs((prev) => [...createdLogs, ...prev]);
      addToast('success', `已应用 ${createdLogs.length} 条 AI 补记`);
    }

    return actions;
  };

  const legacyHandleSend = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    if (handleDebugCommand(trimmedText)) {
      return;
    }

    appendMessages({
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedText,
      createdAt: Date.now()
    });

    setInputText('');
    setError(null);
    setIsLoading(true);

    try {
      const planningResult = await aiService.planBackfillToolCallsWithDebug(trimmedText, {
        currentDateTime: formatLocalDateTimeContext(new Date()),
        targetDate: dateKey,
        categories,
        scopes,
        todos: todos.map((todo) => ({
          id: todo.id,
          title: todo.title,
          isProgress: todo.isProgress,
          progressTrackingMode: todo.progressTrackingMode,
          totalAmount: todo.totalAmount,
          completedUnits: todo.completedUnits,
          parentTodoId: todo.parentTodoId
        }))
      });

      const appliedActions = applyPlannedToolCalls(planningResult.plan.toolCalls);

      appendMessages({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: planningResult.plan.assistantReply.trim() || '我已经按你的描述处理好了。',
        createdAt: Date.now(),
        ...(debugMode ? { debugData: planningResult.debug } : {}),
        ...(appliedActions.length > 0 ? { appliedActions } : {})
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : '发送失败，请稍后重试。';
      const debugData = (sendError as Error & { debug?: AIDebugExchange }).debug;

      setError(message);

      appendMessages({
        id: crypto.randomUUID(),
        role: 'assistant',
        tone: 'error',
        content: `调用失败：${message}`,
        createdAt: Date.now(),
        ...(debugMode && debugData ? { debugData } : {})
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendUserMessage = async (rawText: string, options?: { isRetry?: boolean }) => {
    const trimmedText = rawText.trim();
    if (!trimmedText || isLoading) return;

    if (!options?.isRetry && handleDebugCommand(trimmedText)) {
      return;
    }

    const requestId = crypto.randomUUID();
    const pendingMessageId = crypto.randomUUID();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const createdAt = Date.now();

    activeRequestRef.current = {
      requestId,
      messageId: pendingMessageId,
      controller,
      cancelled: false
    };

    appendMessages(
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedText,
        createdAt
      },
      {
        id: pendingMessageId,
        role: 'assistant',
        tone: 'pending',
        content: '思考中...',
        createdAt: createdAt + 1,
        requestState: {
          requestId,
          sourceText: trimmedText,
          status: 'pending',
          createdAt
        }
      }
    );

    setInputText('');
    setError(null);
    setIsLoading(true);

    try {
      const planningResult = await aiService.planBackfillToolCallsWithDebug(trimmedText, {
        currentDateTime: formatLocalDateTimeContext(new Date()),
        targetDate: dateKey,
        categories,
        scopes,
        todos: todos.map((todo) => ({
          id: todo.id,
          title: todo.title,
          isProgress: todo.isProgress,
          progressTrackingMode: todo.progressTrackingMode,
          totalAmount: todo.totalAmount,
          completedUnits: todo.completedUnits,
          parentTodoId: todo.parentTodoId
        }))
      }, {
        signal: controller?.signal
      });

      if (activeRequestRef.current?.requestId !== requestId || activeRequestRef.current?.cancelled) {
        return;
      }

      const appliedActions = applyPlannedToolCalls(planningResult.plan.toolCalls);

      updateMessage(pendingMessageId, (message) => ({
        ...message,
        tone: 'normal',
        content: planningResult.plan.assistantReply.trim() || '我已经按你的描述处理好了。',
        createdAt: Date.now(),
        requestState: undefined,
        ...(debugMode ? { debugData: planningResult.debug } : {}),
        ...(appliedActions.length > 0 ? { appliedActions } : {})
      }));
    } catch (sendError) {
      if (activeRequestRef.current?.requestId !== requestId || activeRequestRef.current?.cancelled) {
        return;
      }

      const message = sendError instanceof Error ? sendError.message : '发送失败，请稍后重试。';
      const debugData = (sendError as Error & { debug?: AIDebugExchange }).debug;

      setError(message);

      updateMessage(pendingMessageId, (pendingMessage) => ({
        ...pendingMessage,
        tone: 'error',
        content: `调用失败：${message}`,
        createdAt: Date.now(),
        requestState: pendingMessage.requestState
          ? {
            ...pendingMessage.requestState,
            status: 'failed',
            errorMessage: message
          }
          : undefined,
        ...(debugMode && debugData ? { debugData } : {})
      }));
    } finally {
      finalizeActiveRequest(requestId);
    }
  };

  const handleSend = async () => {
    await sendUserMessage(inputText);
  };

  const handleStopRequest = (messageId: string, requestId: string) => {
    const activeRequest = activeRequestRef.current;
    if (!activeRequest || activeRequest.requestId !== requestId) {
      return;
    }

    activeRequest.cancelled = true;
    activeRequest.controller?.abort();

    updateMessage(messageId, (message) => ({
      ...message,
      tone: 'system',
      content: '这次请求已停止，你可以点击下方按钮重新发送。',
      requestState: message.requestState
        ? {
          ...message.requestState,
          status: 'stopped',
          errorMessage: '用户已停止请求'
        }
        : undefined
    }));

    setError(null);
    finalizeActiveRequest(requestId);
  };

  const handleRetryRequest = async (sourceText: string) => {
    await sendUserMessage(sourceText, { isRetry: true });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleOpenLogEditor = (logId?: string) => {
    if (!logId) return;

    const log = logs.find((item) => item.id === logId);
    if (!log) {
      addToast('error', '这条记录已经不存在，暂时无法打开详情。');
      return;
    }

    setInitialLogTimes(null);
    setEditingLog(log);
    setIsAddModalOpen(true);
  };

  const handleUndoAction = (messageId: string, action: AppliedToolAction) => {
    if (action.status !== 'applied' || !action.snapshot.logId) {
      return;
    }

    const logToDelete = logs.find((item) => item.id === action.snapshot.logId);

    if (logToDelete?.linkedTodoId && logToDelete.progressIncrement) {
      setTodos((prevTodos) => prevTodos.map((todo) => {
        if (todo.id === logToDelete.linkedTodoId && getTodoProgressTrackingMode(todo, prevTodos) === 'manual') {
          return {
            ...todo,
            isProgress: true,
            progressTrackingMode: 'manual',
            completedUnits: Math.max(0, (todo.completedUnits || 0) - (logToDelete.progressIncrement || 0))
          };
        }
        return todo;
      }));
    }

    setLogs((prev) => prev.filter((item) => item.id !== action.snapshot.logId));
    updateActionStatus(messageId, action.actionId, 'undone');
    addToast('success', '已撤销这条 AI 应用结果');
  };

  const renderAppliedAction = (messageId: string, action: AppliedToolAction) => {
    const liveLog = action.snapshot.logId
      ? logs.find((item) => item.id === action.snapshot.logId)
      : undefined;
    const liveCategory = liveLog
      ? categories.find((category) => category.id === liveLog.categoryId)
      : categories.find((category) => category.id === action.snapshot.categoryId);
    const liveActivity = liveLog
      ? liveCategory?.activities.find((activity) => activity.id === liveLog.activityId)
      : liveCategory?.activities.find((activity) => activity.id === action.snapshot.activityId);

    const startTime = liveLog?.startTime || action.snapshot.startTime;
    const endTime = liveLog?.endTime || action.snapshot.endTime;
    const note = liveLog?.note || action.snapshot.description;
    const categoryName = liveCategory?.name || action.snapshot.categoryName;
    const activityName = liveLog
      ? (
        liveActivity?.name || action.snapshot.activityName
      )
      : action.snapshot.activityName;
    const categoryIcon = liveCategory?.icon || '';
    const categoryUiIcon = liveCategory?.uiIcon;
    const activityIcon = liveActivity?.icon || '';
    const activityUiIcon = liveActivity?.uiIcon;
    const categoryThemeColor = liveCategory?.themeColor || '#a8a29e';
    const scopeData = (liveLog?.scopeIds || action.snapshot.scopeIds)
      .map((scopeId) => scopes.find((scope) => scope.id === scopeId))
      .filter((scope): scope is NonNullable<typeof scope> => Boolean(scope));
    const linkedTodoTitle = liveLog?.linkedTodoId
      ? todos.find((todo) => todo.id === liveLog.linkedTodoId)?.title
      : action.snapshot.linkedTodoTitle;
    const progressIncrement = liveLog?.progressIncrement || action.snapshot.progressIncrement;

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
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-stone-700">
              <Clock3 size={13} />
              <span>{formatTimeRange(startTime, endTime)}</span>
            </div>
            <p className="mt-1 text-[15px] font-medium leading-5 text-stone-800">{activityName}</p>
            {note && (
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-stone-600">
                {note}
              </p>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold leading-5 ${
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

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500">
            <span className="font-bold" style={{ color: categoryThemeColor }}>#</span>
            <IconRenderer
              icon={categoryIcon}
              uiIcon={categoryUiIcon}
              className="text-xs"
            />
            <span className="flex items-center">
              <span>{categoryName}</span>
              <span className="mx-1 text-stone-300">/</span>
              <IconRenderer
                icon={activityIcon}
                uiIcon={activityUiIcon}
                className="text-xs mr-1"
              />
              <span className="text-stone-500">{activityName}</span>
            </span>
          </span>

          {scopeData.map((scope) => (
            <span
              key={`${action.actionId}-${scope.id}`}
              className="inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500"
            >
              <span className="font-bold text-stone-400">%</span>
              <IconRenderer
                icon={scope.icon}
                uiIcon={scope.uiIcon}
                className="text-xs"
              />
              <span>{scope.name}</span>
            </span>
          ))}

          {linkedTodoTitle && (
            <span className="inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-50/30 px-2 py-0.5 text-[10px] font-medium text-stone-500">
              <span className="font-bold text-stone-400">@</span>
              <span className="line-clamp-1">{linkedTodoTitle}</span>
              {progressIncrement && (
                <span className="ml-0.5 font-mono text-stone-400">+{progressIncrement}</span>
              )}
            </span>
          )}
        </div>

        {!linkedTodoTitle && progressIncrement && (
          <div className="mt-1.5 text-[10px] font-medium text-stone-400">
            进度 +{progressIncrement}
          </div>
        )}

        {action.errorMessage && (
          <p className="mt-2 text-xs text-red-600">{action.errorMessage}</p>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <button
            onClick={() => handleOpenLogEditor(action.snapshot.logId)}
            disabled={action.status !== 'applied' || !liveLog}
            title="编辑记录"
            aria-label="编辑记录"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => handleUndoAction(messageId, action)}
            disabled={action.status !== 'applied'}
            title="撤销应用"
            aria-label="撤销应用"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    );
  };

  const renderMessageBubble = (message: BackfillChatMessage) => {
    const isUser = message.role === 'user';
    const tone = message.tone || 'normal';
    const hasAppliedActions = Boolean(message.appliedActions && message.appliedActions.length > 0);
    const requestState = message.requestState;

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
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`flex max-w-[88%] items-start gap-3 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <div
            className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isUser
                ? 'bg-stone-900 text-white'
                : tone === 'error'
                  ? 'bg-red-100 text-red-700'
                  : tone === 'system'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-stone-100 text-stone-700'
            }`}
          >
            {isUser ? <User size={15} /> : <Bot size={15} />}
          </div>

          <div className="space-y-2">
            <div className={`rounded-[1.5rem] px-4 py-3 shadow-sm ${bubbleClassName}`}>
              {!isUser && (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
                  {tone === 'error' ? '调用结果' : 'AI 回答'}
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

            {requestState && (
              <div className="flex flex-wrap items-center gap-2 pl-1">
                {requestState.status !== 'pending' && (
                  <button
                    onClick={() => handleRetryRequest(requestState.sourceText)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={11} />
                    <span>{requestState.status === 'stopped' ? '重新发送' : '重试'}</span>
                  </button>
                )}
              </div>
            )}

            {hasAppliedActions && (
              <div className="space-y-2 rounded-[1.5rem] border border-stone-200 bg-white p-3 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
                  应用结果
                </p>
                <div className="space-y-2">
                  {message.appliedActions?.map((action) => renderAppliedAction(message.id, action))}
                </div>
              </div>
            )}

            {debugMode && message.debugData && (
              <div className="pl-1">
                <button
                  onClick={() => setSelectedDebug(message.debugData || null)}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700"
                >
                  <Bug size={12} />
                  <span>查看调试</span>
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-bold text-stone-800">时间助理</h2>
                {debugMode && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    调试中
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                {formatDateLabel(resolvedTargetDate)} · 单轮调用 · 本地保留对话记录
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={handleClearHistory}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-white hover:text-stone-700"
              title="清空本地对话"
            >
              <Trash2 size={18} />
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
          {messages.length === 0 ? (
            <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-dashed border-stone-200 bg-white/85 px-6 py-7 text-sm leading-7 text-stone-500 shadow-sm">
              <p className="font-medium text-stone-700">
                可以直接描述你刚刚做了什么，我会尝试帮你补记并直接应用。
              </p>
              <p>
                比如：“下午 2 点到 3 点半写周报，挂到工作/写作，顺手关联一下‘周报提交’这个待办。”
              </p>
              <p>
                如果信息足够明确，我会先给你自然语言回复，再把应用结果列在下面，支持继续编辑或撤销。
              </p>
              <p>输入 `/debug` 可以开启或关闭调试模式。</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map(renderMessageBubble)}

              {false && isLoading && (
                <div className="flex justify-start">
                  <div className="flex max-w-[88%] items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                      <Bot size={15} />
                    </div>
                    <div className="flex items-center gap-2 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">
                      <Loader2 size={16} className="animate-spin" />
                      <span>AI 正在规划并应用...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-stone-200/80 bg-[#f7f3eb]/96 px-4 pb-4 pt-3 backdrop-blur sm:px-6">
          <div className="mx-auto max-w-3xl">
            {error && (
              <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="rounded-[1.75rem] border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="和 AI 说说这段时间你做了什么..."
                className="min-h-[72px] max-h-[144px] w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-300"
                autoFocus
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-stone-400">Enter 发送，Shift+Enter 换行</p>
                <button
                  onClick={handleSend}
                  disabled={isLoading || !inputText.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>发送</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {selectedDebug && (
          <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-sm">
            <div
              className="flex h-full flex-col bg-[#f6f2ea]"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
              }}
            >
              <div className="flex items-center justify-between border-b border-stone-200 bg-white/90 px-5 py-4 backdrop-blur">
                <div>
                  <h3 className="text-base font-bold text-stone-800">调用调试</h3>
                  <p className="text-xs text-stone-400">
                    {selectedDebug.provider} · {selectedDebug.requestedAt}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDebug(null)}
                  className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                  title="关闭调试窗口"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-4">
                  <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-sm font-bold text-stone-800">客户端发送内容</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-stone-900 p-4 text-xs leading-6 text-stone-100">
                      {stringifyDebugSection(selectedDebug.request)}
                    </pre>
                  </div>

                  <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-sm font-bold text-stone-800">服务端返回内容</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-stone-900 p-4 text-xs leading-6 text-stone-100">
                      {stringifyDebugSection(selectedDebug.response)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
