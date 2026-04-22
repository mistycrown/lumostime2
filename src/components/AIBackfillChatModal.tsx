/**
 * @file AIBackfillChatModal.tsx
 * @input Target date, locally persisted chat history, user backfill questions
 * @output Local-only full-screen AI backfill chat view with single-turn replies and optional request debugging
 * @pos Component (AI Integration)
 * @description Replaces the old AI backfill parse-first flow with a chat-first full-screen conversation view that keeps visible local history while still sending each request as an independent turn. Supports a command-based debug mode for inspecting request and response payloads.
 * @updated 2026-04-22: Added command-based debug mode with per-call request/response inspection for AI backfill chat.
 * @updated 2026-04-22: Switched the AI backfill chat UI to a full-screen conversation layout with app-style header, scroll area, and composer.
 * @updated 2026-04-22: Added the first-step AI backfill chat UI with per-date local history persistence and single-turn AI replies.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bug, Bot, Loader2, Send, Sparkles, Trash2, User, X } from 'lucide-react';
import { aiService, type AIDebugExchange } from '../services/aiService';

type BackfillChatRole = 'user' | 'assistant';
type BackfillChatTone = 'normal' | 'system' | 'error';

interface BackfillChatMessage {
  id: string;
  role: BackfillChatRole;
  content: string;
  createdAt: number;
  tone?: BackfillChatTone;
  debugData?: AIDebugExchange;
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

const loadMessages = (storageKey: string): BackfillChatMessage[] => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is BackfillChatMessage => (
      item &&
      typeof item.id === 'string' &&
      (item.role === 'user' || item.role === 'assistant') &&
      typeof item.content === 'string' &&
      typeof item.createdAt === 'number' &&
      (!item.tone || item.tone === 'normal' || item.tone === 'system' || item.tone === 'error') &&
      (!item.debugData || isDebugExchange(item.debugData))
    ));
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

  useEffect(() => {
    setMessages(loadMessages(storageKey));
    setSelectedDebug(null);
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

  const appendMessages = (...nextMessages: BackfillChatMessage[]) => {
    setMessages((prev) => [...prev, ...nextMessages]);
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
          ? '已开启调试模式。之后每次 AI 调用都会保留请求和响应内容，你可以点击消息下方的“查看调试”。'
          : '已关闭调试模式。之后的新调用将不再显示调试入口。',
        createdAt: Date.now()
      }
    );

    setDebugMode(nextDebugMode);
    setInputText('');
    setError(null);
    return true;
  };

  const handleSend = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    if (handleDebugCommand(trimmedText)) {
      return;
    }

    const userMessage: BackfillChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedText,
      createdAt: Date.now()
    };

    appendMessages(userMessage);
    setInputText('');
    setError(null);
    setIsLoading(true);

    try {
      const result = await aiService.sendBackfillChatMessageWithDebug(trimmedText, {
        currentDateTime: new Date().toISOString(),
        targetDate: dateKey
      });

      appendMessages({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.reply.trim() || '我暂时没有生成有效回复，你可以换个说法再试一次。',
        createdAt: Date.now(),
        debugData: result.debug
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : '发送失败，请稍后重试。';
      const debugData = (sendError as Error & { debug?: AIDebugExchange }).debug;

      setError(message);

      if (debugData) {
        appendMessages({
          id: crypto.randomUUID(),
          role: 'assistant',
          tone: 'error',
          content: `调用失败：${message}`,
          createdAt: Date.now(),
          debugData
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const renderMessageBubble = (message: BackfillChatMessage) => {
    const isUser = message.role === 'user';
    const tone = message.tone || 'normal';

    let bubbleClassName = 'border border-stone-200 bg-white text-stone-700';
    if (isUser) {
      bubbleClassName = 'bg-stone-900 text-white';
    } else if (tone === 'system') {
      bubbleClassName = 'border border-amber-200 bg-amber-50 text-amber-800';
    } else if (tone === 'error') {
      bubbleClassName = 'border border-red-200 bg-red-50 text-red-700';
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
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {message.content}
              </p>
            </div>

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
                {formatDateLabel(resolvedTargetDate)} · 单轮调用 · 本地保留展示记录
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
              <p className="font-medium text-stone-700">可以先直接描述刚刚做了什么。</p>
              <p>比如：`刚刚从开完会到现在一直在写周报。`</p>
              <p>这一步先提供聊天体验，每次发送都会独立调用 AI，不读取上文作为上下文。</p>
              <p>输入 `/debug` 可以开启或关闭调试模式。</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map(renderMessageBubble)}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex max-w-[88%] items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                      <Bot size={15} />
                    </div>
                    <div className="flex items-center gap-2 rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">
                      <Loader2 size={16} className="animate-spin" />
                      <span>AI 正在回复…</span>
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
                placeholder="和 AI 说说这段时间你做了什么…"
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
                    <p className="mb-3 text-sm font-bold text-stone-800">服务器返回内容</p>
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
