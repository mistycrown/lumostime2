/**
 * @file AIBackfillChatModal.tsx
 * @input Target date, locally persisted chat history, user backfill questions
 * @output Local-only AI backfill chat modal with single-turn replies
 * @pos Component (AI Integration)
 * @description Replaces the old AI backfill parse-first flow with a chat-first modal that keeps visible local history while still sending each request as an independent turn.
 * @updated 2026-04-22: Added the first-step AI backfill chat UI with per-date local history persistence and single-turn AI replies.
 *
 * Once I am updated, be sure to update my header comment and the folder's md.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles, Trash2, User, X } from 'lucide-react';
import { aiService } from '../services/aiService';

type BackfillChatRole = 'user' | 'assistant';

interface BackfillChatMessage {
  id: string;
  role: BackfillChatRole;
  content: string;
  createdAt: number;
}

interface AIBackfillChatModalProps {
  onClose: () => void;
  targetDate?: Date;
}

const STORAGE_KEY_PREFIX = 'lumostime_ai_backfill_chat_v1_';

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
      typeof item.createdAt === 'number'
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    persistMessages(storageKey, messages);
  }, [messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const handleClearHistory = () => {
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(storageKey);
    } catch (persistError) {
      console.error('[AIBackfillChatModal] Failed to clear local chat history', persistError);
    }
  };

  const handleSend = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    const userMessage: BackfillChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedText,
      createdAt: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setError(null);
    setIsLoading(true);

    try {
      const reply = await aiService.sendBackfillChatMessage(trimmedText, {
        currentDateTime: new Date().toISOString(),
        targetDate: dateKey
      });

      const assistantMessage: BackfillChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply.trim() || '我暂时没有生成有效回复，你可以换个说法再试一次。',
        createdAt: Date.now()
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : '发送失败，请稍后重试。';
      setError(message);
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-[#f8f5ee] shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-stone-800">AI 补记对话</h2>
              <p className="text-xs text-stone-400">
                {formatDateLabel(resolvedTargetDate)} · 单轮调用，本地保留展示记录
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              title="清空本地对话"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f6f2ea] px-5 py-5">
          {messages.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-stone-200 bg-white/80 px-5 py-6 text-sm leading-7 text-stone-500 shadow-sm">
              <p className="font-medium text-stone-700">可以先直接描述刚刚做了什么。</p>
              <p>比如：`刚刚从开完会到现在一直在写周报。`</p>
              <p>这一步先提供聊天体验，每次发送都会独立调用 AI，不读取上文作为上下文。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isUser = message.role === 'user';
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
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {isUser ? <User size={15} /> : <Bot size={15} />}
                      </div>

                      <div
                        className={`rounded-[1.5rem] px-4 py-3 shadow-sm ${
                          isUser
                            ? 'bg-stone-900 text-white'
                            : 'border border-stone-200 bg-white text-stone-700'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

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

        <div className="border-t border-stone-200 bg-white px-5 py-4">
          {error && (
            <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="rounded-[1.75rem] border border-stone-200 bg-[#faf8f3] p-3 shadow-sm">
            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="和 AI 说说这段时间你做了什么…"
              className="min-h-[96px] w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-300"
              autoFocus
            />

            <div className="mt-3 flex items-center justify-between">
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
    </div>
  );
};
