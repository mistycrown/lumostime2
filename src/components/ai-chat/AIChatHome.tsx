/**
 * @file AIChatHome.tsx
 * @input Active AI persona, persisted sessions, letters, reminders, memory, and prompt shortcuts
 * @output The AI assistant landing workspace with entry points into chat and assistant tools
 * @pos Component (AI Integration)
 * @description Presents an editorial AI workbench before the user enters a conversation.
 */
import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Brain,
  ChevronRight,
  Clock3,
  FileText,
  History,
  Mail,
  MessageCircle,
  Plus,
  Settings,
  Sparkles,
  Zap
} from 'lucide-react';
import type { AssistantLetter, AssistantMemory, AssistantReminder } from '../../types/assistant';
import type { AIChatCustomPromptBlock, AIChatPersona, AIChatSession } from './AIBackfillChatShared';
import { PersonaAvatar } from './AIBackfillChatShared';

interface AIChatHomeTheme {
  shellBg: string;
  shellLayerBg: string;
  panelBg: string;
  panelBgStrong: string;
  panelBgSoft: string;
  panelBorder: string;
  panelBorderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  primaryButtonBg: string;
  primaryButtonText: string;
  activeBg: string;
  activeBorder: string;
  avatarBg: string;
  cardShadow: string;
  cardShadowStrong: string;
}

interface AIChatHomeProps {
  assistantMemory: AssistantMemory;
  assistantReminders: AssistantReminder[];
  assistantLetters: AssistantLetter[];
  customPromptBlocks: AIChatCustomPromptBlock[];
  sessions: AIChatSession[];
  sortedSessions: AIChatSession[];
  theme: AIChatHomeTheme;
  isLoading: boolean;
  formatConversationTime: (value: number) => string;
  getSessionPersona: (session: AIChatSession) => AIChatPersona;
  onOpenChat: (sessionId?: string) => void;
  onStartNewSession: () => void;
  onOpenLetters: () => void;
  onOpenLetter: (letterId: string) => void;
  onOpenMemory: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onSendShortcut: (text: string) => void;
}

const formatShortDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

const getLastMessage = (session: AIChatSession) => (
  [...session.messages].reverse().find((message) => message.tone !== 'pending')
);

const todayLabel = (): string => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date()).replace(/\//g, '.');

export const AIChatHome: React.FC<AIChatHomeProps> = ({
  assistantMemory,
  assistantReminders,
  assistantLetters,
  customPromptBlocks,
  sessions,
  sortedSessions,
  theme,
  isLoading,
  formatConversationTime,
  getSessionPersona,
  onOpenChat,
  onStartNewSession,
  onOpenLetters,
  onOpenLetter,
  onOpenMemory,
  onOpenHistory,
  onOpenSettings,
  onSendShortcut,
}) => {
  const [quickChatText, setQuickChatText] = useState('');
  const latestSession = sortedSessions[0] || sessions[0] || null;
  const pendingReminders = assistantReminders.filter((reminder) => reminder.status === 'pending');
  const visibleLetters = assistantLetters.slice(0, 2);
  const visibleSessions = sortedSessions.slice(0, 4);
  const memoryItems = [...assistantMemory.profileMemory, ...assistantMemory.preferenceMemory].slice(0, 3);
  const defaultShortcuts = useMemo(() => [
    { id: 'newspaper', title: '生成小报', text: '小报', icon: FileText },
    { id: 'narrative', title: '生成叙事', text: '叙事', icon: Sparkles }
  ], []);
  const shortcuts = [
    ...defaultShortcuts,
    ...customPromptBlocks.filter((block) => block.enabled).slice(0, 4).map((block) => ({
      id: block.id,
      title: block.title || '自定义指令',
      text: block.content,
      icon: Zap
    }))
  ];

  const sendQuickChat = () => {
    const text = quickChatText.trim();
    if (!text || isLoading) return;
    setQuickChatText('');
    onSendShortcut(text);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div className="h-full min-h-0 overflow-y-auto px-4 pb-32 pt-3 sm:px-8 sm:pb-36 sm:pt-4 lg:overflow-y-auto">
        <div className="mx-auto max-w-6xl">
          <header className="border-b pb-2.5" style={{ borderColor: theme.textPrimary }}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.28em]" style={{ color: theme.textMuted }}>
                  LUMOS / AI DESK
                </p>
                <h1 className="mt-1 font-serif text-2xl tracking-[0.02em] sm:text-3xl" style={{ color: theme.textPrimary }}>
                  今日工作台
                </h1>
              </div>
              <div className="text-right text-[9px] leading-4 tracking-[0.12em]" style={{ color: theme.textMuted }}>
                <div>AI EDITION · 01</div>
                <div>{todayLabel()} · DAILY BRIEF</div>
              </div>
            </div>
          </header>

          <main className="mt-3 space-y-4 lg:grid lg:grid-cols-12 lg:grid-rows-[minmax(0,1.15fr)_minmax(0,0.8fr)_minmax(0,0.75fr)] lg:gap-x-5 lg:gap-y-3 lg:space-y-0">
            <div className="grid gap-4 lg:contents">
              <section className="border-y py-3 sm:py-4 lg:col-span-7 lg:row-span-2" style={{ borderColor: theme.panelBorder }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]" style={{ color: theme.textMuted }}>
                    <span style={{ color: theme.textFaint }}>01</span>
                    <MessageCircle size={14} />
                    继续对话
                  </div>
                    <span className="text-[9px] tracking-[0.12em]" style={{ color: theme.textFaint }}>LATEST THREAD</span>
                </div>
                {latestSession ? (
                  <button type="button" onClick={() => onOpenChat(latestSession.id)} className="mt-4 block w-full text-left">
                    <p className="truncate font-serif text-xl sm:text-2xl" style={{ color: theme.textPrimary }}>
                      {latestSession.title || '最近一次对话'}
                    </p>
                    <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 sm:text-sm" style={{ color: theme.textSecondary }}>
                      {getLastMessage(latestSession)?.content || '还没有消息，从这里开始吧。'}
                    </p>
                    <p className="mt-2 text-[10px] tracking-[0.08em]" style={{ color: theme.textMuted }}>
                      {formatConversationTime(latestSession.updatedAt)}
                    </p>
                  </button>
                ) : (
                  <p className="mt-6 text-sm" style={{ color: theme.textMuted }}>还没有对话记录。</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button type="button" onClick={() => onOpenChat(latestSession?.id)} className="inline-flex items-center gap-2 border-b pb-1 text-sm font-medium" style={{ borderColor: theme.primaryButtonBg, color: theme.primaryButtonBg }}>
                    继续对话 <ArrowRight size={15} />
                  </button>
                  <button type="button" onClick={onStartNewSession} className="inline-flex items-center gap-2 border-b pb-1 text-sm" style={{ borderColor: theme.panelBorderStrong, color: theme.textSecondary }}>
                    <Plus size={15} /> 新对话
                  </button>
                </div>
              </section>

              <section className="border-y py-3 sm:py-4 lg:col-span-5 lg:row-span-1" style={{ borderColor: theme.panelBorder }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]" style={{ color: theme.textMuted }}>
                    <span style={{ color: theme.textFaint }}>02</span>
                    <Mail size={14} />
                    来信与小报
                  </div>
                  <button type="button" onClick={onOpenLetters} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>
                    查看全部 <ChevronRight size={13} />
                  </button>
                </div>
                <div className="relative mt-3 min-h-[7rem] pr-2">
                  {visibleLetters.length === 0 ? (
                    <div className="flex h-24 items-center justify-center text-sm" style={{ color: theme.textMuted }}>暂时没有新的来信</div>
                  ) : visibleLetters.map((letter, index) => (
                    <button
                      key={letter.id}
                      type="button"
                      onClick={() => onOpenLetter(letter.id)}
                      className="absolute left-1 right-0 rounded-[0.65rem] p-3 text-left transition-transform hover:-translate-y-1"
                      style={{
                        top: `${index * 0.7}rem`,
                        zIndex: visibleLetters.length - index,
                        backgroundColor: theme.panelBg,
                        boxShadow: theme.cardShadowStrong,
                        transform: `rotate(${index === 0 ? '-1deg' : '1.2deg'})`
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-serif text-base" style={{ color: theme.textPrimary }}>{letter.title}</span>
                        <span className="shrink-0 text-[11px]" style={{ color: theme.textMuted }}>{formatShortDate(letter.sentAt)}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs leading-5" style={{ color: theme.textSecondary }}>{letter.preview}</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <section className="border-y py-3 lg:col-span-5 lg:row-span-1" style={{ borderColor: theme.panelBorder }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]" style={{ color: theme.textMuted }}>
                  <span style={{ color: theme.textFaint }}>03</span>
                  <Zap size={14} />
                  快捷指令
                </div>
                <button type="button" onClick={onOpenSettings} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }} title="设置快捷指令" aria-label="设置快捷指令">
                  <Settings size={14} /> 设置
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {shortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <button
                      key={shortcut.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => onSendShortcut(shortcut.text)}
                      className="group inline-flex min-h-7 items-center gap-1.5 border-b pb-0.5 text-left text-xs transition-colors disabled:opacity-50"
                      style={{ borderColor: theme.panelBorder, color: theme.textPrimary }}
                    >
                      <Icon size={15} style={{ color: theme.textSecondary }} />
                      <span className="truncate">{shortcut.title}</span>
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" style={{ color: theme.textFaint }} />
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-4 lg:contents">
              <section className="border-y py-3 lg:col-span-3 lg:row-span-1" style={{ borderColor: theme.panelBorder }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]" style={{ color: theme.textMuted }}>
                    <span style={{ color: theme.textFaint }}>04</span>
                    <Bell size={14} />
                    提醒
                  </div>
                  <span className="text-[11px]" style={{ color: theme.textMuted }}>{pendingReminders.length} 条</span>
                </div>
                {pendingReminders.length ? (
                  <div className="mt-2 divide-y" style={{ borderColor: theme.panelBorder }}>
                    {pendingReminders.slice(0, 3).map((reminder) => (
                      <button key={reminder.id} type="button" onClick={onOpenMemory} className="flex w-full items-start gap-3 py-3 text-left first:pt-0 last:pb-0">
                        <Clock3 size={15} className="mt-0.5 shrink-0" style={{ color: theme.textSecondary }} />
                        <span className="min-w-0 flex-1 line-clamp-1 text-xs leading-5" style={{ color: theme.textPrimary }}>{reminder.text}</span>
                        <span className="shrink-0 text-[11px]" style={{ color: theme.textMuted }}>{formatShortDate(reminder.dueAt)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm" style={{ color: theme.textMuted }}>暂无待处理提醒</p>
                )}
              </section>

              <section className="border-y py-3 lg:col-span-4 lg:row-span-1 lg:border-l lg:pl-5" style={{ borderColor: theme.panelBorder }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]" style={{ color: theme.textMuted }}>
                    <span style={{ color: theme.textFaint }}>05</span>
                    <Brain size={14} />
                    长期记忆
                  </div>
                  <button type="button" onClick={onOpenMemory} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>
                    查看全部 <ChevronRight size={13} />
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {memoryItems.map((item) => (
                    <p key={item} className="line-clamp-1 text-xs leading-5" style={{ color: theme.textPrimary }}>{item}</p>
                  ))}
                  {memoryItems.length === 0 && <p className="text-sm" style={{ color: theme.textMuted }}>还没有形成长期记忆</p>}
                </div>
              </section>
            </div>

            <section className="border-y py-3 lg:col-span-5 lg:row-span-1" style={{ borderColor: theme.panelBorder }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em]" style={{ color: theme.textMuted }}>
                  <span style={{ color: theme.textFaint }}>06</span>
                  <History size={14} />
                  最近对话
                </div>
                <button type="button" onClick={onOpenHistory} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>
                  查看全部 <ChevronRight size={13} />
                </button>
              </div>
              <div className="mt-1 divide-y" style={{ borderColor: theme.panelBorder }}>
                {visibleSessions.map((session) => (
                  <button key={session.id} type="button" onClick={() => onOpenChat(session.id)} className="flex w-full items-center gap-2 py-1.5 text-left first:pt-1">
                    <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: theme.avatarBg }}>
                      <PersonaAvatar persona={getSessionPersona(session)} className="rounded-full" iconClassName="text-sm" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs" style={{ color: theme.textPrimary }}>{session.title}</span>
                    <span className="shrink-0 text-[10px]" style={{ color: theme.textMuted }}>{formatConversationTime(session.updatedAt)}</span>
                  </button>
                ))}
                {visibleSessions.length === 0 && <p className="py-3 text-sm" style={{ color: theme.textMuted }}>还没有对话记录</p>}
              </div>
            </section>
          </main>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-8 sm:pb-5">
        <div className="pointer-events-auto mx-auto max-w-6xl border-t pt-3" style={{ borderColor: theme.panelBorder, backgroundColor: theme.shellLayerBg }}>
          <div className="rounded-full border p-1.5" style={{ borderColor: theme.panelBorderStrong, backgroundColor: theme.panelBg }}>
            <div className="flex items-center gap-2">
              <MessageCircle size={17} className="ml-3 shrink-0" style={{ color: theme.textMuted }} />
              <input
                value={quickChatText}
                onChange={(event) => setQuickChatText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    sendQuickChat();
                  }
                }}
                placeholder="和 AI 说点什么…"
                className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm outline-none"
                style={{ color: theme.textPrimary }}
              />
              <button type="button" onClick={sendQuickChat} disabled={!quickChatText.trim() || isLoading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-40" style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }} title="发送" aria-label="发送">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
