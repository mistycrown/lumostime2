/**
 * @file AIChatHome.tsx
 * @input Active AI persona, persisted sessions, letters, reminders, memory, and prompt shortcuts
 * @output The AI assistant landing workspace with entry points into chat and assistant tools
 * @pos Component (AI Integration)
 * @description Presents a calm, information-dense AI workspace before the user enters a conversation.
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
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)]">
          <section className="flex min-h-[15rem] flex-col justify-between rounded-[1.25rem] p-5 sm:p-6" style={{ backgroundColor: theme.panelBg, boxShadow: theme.cardShadowStrong }}>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em]" style={{ color: theme.textMuted }}>
                <MessageCircle size={15} />
                继续对话
              </div>
              {latestSession ? (
                <button type="button" onClick={() => onOpenChat(latestSession.id)} className="mt-5 block w-full text-left">
                  <p className="truncate font-serif text-2xl" style={{ color: theme.textPrimary }}>{latestSession.title || '最近一次对话'}</p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                    {getLastMessage(latestSession)?.content || '还没有消息，从这里开始吧。'}
                  </p>
                  <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>{formatConversationTime(latestSession.updatedAt)}</p>
                </button>
              ) : (
                <p className="mt-6 text-sm" style={{ color: theme.textMuted }}>还没有对话记录。</p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => onOpenChat(latestSession?.id)} className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium" style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }}>
                继续对话 <ArrowRight size={15} />
              </button>
              <button type="button" onClick={onStartNewSession} className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm" style={{ borderColor: theme.panelBorderStrong, color: theme.textSecondary }}>
                <Plus size={15} /> 新对话
              </button>
            </div>
          </section>

          <section className="rounded-[1.25rem] p-5 sm:p-6" style={{ backgroundColor: theme.panelBgSoft, boxShadow: theme.cardShadow }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em]" style={{ color: theme.textMuted }}><Mail size={15} /> 来信与小报</div>
              <button type="button" onClick={onOpenLetters} className="text-xs" style={{ color: theme.textSecondary }}>查看全部 <ChevronRight size={13} className="inline" /></button>
            </div>
            <div className="relative mt-5 min-h-[9.5rem]">
              {visibleLetters.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm" style={{ color: theme.textMuted }}>暂时没有新的来信</div>
              ) : visibleLetters.map((letter, index) => (
                <button key={letter.id} type="button" onClick={() => onOpenLetter(letter.id)} className="absolute left-0 right-0 rounded-[0.95rem] p-4 text-left transition-transform hover:-translate-y-1" style={{ top: `${index * 0.7}rem`, zIndex: visibleLetters.length - index, backgroundColor: theme.panelBg, boxShadow: theme.cardShadowStrong, transform: `rotate(${index === 0 ? '-1deg' : '1.2deg'})` }}>
                  <div className="flex items-center justify-between gap-3"><span className="truncate font-serif text-base" style={{ color: theme.textPrimary }}>{letter.title}</span><span className="shrink-0 text-[11px]" style={{ color: theme.textMuted }}>{formatShortDate(letter.sentAt)}</span></div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5" style={{ color: theme.textSecondary }}>{letter.preview}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[1.25rem] p-5 sm:p-6" style={{ backgroundColor: theme.panelBg, boxShadow: theme.cardShadow }}>
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em]" style={{ color: theme.textMuted }}><Zap size={15} /> 快捷按钮</div><button type="button" onClick={onOpenSettings} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5" style={{ color: theme.textMuted }} title="设置快捷按钮" aria-label="设置快捷按钮"><Settings size={15} /></button></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {shortcuts.map((shortcut) => { const Icon = shortcut.icon; return <button key={shortcut.id} type="button" disabled={isLoading} onClick={() => onSendShortcut(shortcut.text)} className="flex min-h-12 items-center gap-3 rounded-[0.85rem] px-3 text-left transition-colors hover:bg-black/[0.04] disabled:opacity-50" style={{ backgroundColor: theme.panelBgSoft, color: theme.textPrimary }}><Icon size={16} style={{ color: theme.textSecondary }} /><span className="truncate text-sm">{shortcut.title}</span><ArrowRight size={14} className="ml-auto shrink-0" style={{ color: theme.textFaint }} /></button>; })}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[1.25rem] p-5" style={{ backgroundColor: theme.panelBg, boxShadow: theme.cardShadow }}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em]" style={{ color: theme.textMuted }}><Bell size={15} /> 提醒</div><span className="text-xs" style={{ color: theme.textMuted }}>{pendingReminders.length} 条</span></div>
            {pendingReminders.length ? <div className="mt-4 space-y-2">{pendingReminders.slice(0, 3).map((reminder) => <button key={reminder.id} type="button" onClick={onOpenMemory} className="flex w-full items-start gap-3 text-left"><Clock3 size={15} className="mt-0.5 shrink-0" style={{ color: theme.textSecondary }} /><span className="min-w-0 flex-1 text-sm leading-5" style={{ color: theme.textPrimary }}>{reminder.text}</span><span className="shrink-0 text-[11px]" style={{ color: theme.textMuted }}>{formatShortDate(reminder.dueAt)}</span></button>)}</div> : <p className="mt-4 text-sm" style={{ color: theme.textMuted }}>暂无待处理提醒</p>}
          </section>
          <section className="rounded-[1.25rem] p-5" style={{ backgroundColor: theme.panelBg, boxShadow: theme.cardShadow }}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em]" style={{ color: theme.textMuted }}><Brain size={15} /> 长期记忆</div><button type="button" onClick={onOpenMemory} className="text-xs" style={{ color: theme.textSecondary }}>查看全部 <ChevronRight size={13} className="inline" /></button></div>
            <div className="mt-4 space-y-2">{[...assistantMemory.profileMemory, ...assistantMemory.preferenceMemory].slice(0, 3).map((item) => <p key={item} className="line-clamp-1 text-sm" style={{ color: theme.textPrimary }}>{item}</p>)}{assistantMemory.profileMemory.length + assistantMemory.preferenceMemory.length === 0 && <p className="text-sm" style={{ color: theme.textMuted }}>还没有形成长期记忆</p>}</div>
          </section>
        </div>

        <section className="rounded-[1.25rem] p-5" style={{ backgroundColor: theme.panelBg, boxShadow: theme.cardShadow }}>
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-medium tracking-[0.08em]" style={{ color: theme.textMuted }}><History size={15} /> 最近对话</div><button type="button" onClick={onOpenHistory} className="text-xs" style={{ color: theme.textSecondary }}>查看全部 <ChevronRight size={13} className="inline" /></button></div>
          <div className="mt-3 divide-y" style={{ borderColor: theme.panelBorder }}>{visibleSessions.map((session) => <button key={session.id} type="button" onClick={() => onOpenChat(session.id)} className="flex w-full items-center gap-3 py-3 text-left"><div className="h-8 w-8 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: theme.avatarBg }}><PersonaAvatar persona={getSessionPersona(session)} className="rounded-full" iconClassName="text-sm" /></div><span className="min-w-0 flex-1 truncate text-sm" style={{ color: theme.textPrimary }}>{session.title}</span><span className="shrink-0 text-[11px]" style={{ color: theme.textMuted }}>{formatConversationTime(session.updatedAt)}</span></button>)}</div>
        </section>

        <div className="rounded-full border p-1.5" style={{ borderColor: theme.panelBorderStrong, backgroundColor: theme.panelBg }}>
          <div className="flex items-center gap-2"><MessageCircle size={17} className="ml-3 shrink-0" style={{ color: theme.textMuted }} /><input value={quickChatText} onChange={(event) => setQuickChatText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendQuickChat(); } }} placeholder="和 AI 说点什么…" className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm outline-none" style={{ color: theme.textPrimary }} /><button type="button" onClick={sendQuickChat} disabled={!quickChatText.trim() || isLoading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-40" style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }} title="发送" aria-label="发送"><ArrowRight size={16} /></button></div>
        </div>
      </div>
    </div>
  );
};
