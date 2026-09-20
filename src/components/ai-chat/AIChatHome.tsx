/**
 * @file AIChatHome.tsx
 * @input Active AI persona, persisted sessions, letters, reminders, memory, and prompt shortcuts
 * @output The AI assistant landing workspace with entry points into chat and assistant tools
 * @pos Component (AI Integration)
 * @description Presents an editorial AI workbench before the user enters a conversation.
 * @updated 2026-09-20: Removed the composer separator line and kept compact spacing before the shortcut section.
 */
import React, { useMemo, useRef, useState } from 'react';
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
  Settings,
  Sparkles,
  Zap,
  type LucideIcon
} from 'lucide-react';
import type { AssistantLetter, AssistantMemory, AssistantReminder } from '../../types/assistant';
import type { AIChatCustomPromptBlock, AIChatPersona, AIChatSession } from './AIBackfillChatShared';
import { PersonaAvatar } from './AIBackfillChatShared';

export interface AIChatNewspaperItem {
  id: string;
  title: string;
  preview: string;
  dateLabel: string;
  updatedAt: number;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate?: string;
}

interface AIChatFeedItem {
  id: string;
  title: string;
  preview: string;
  dateLabel: string;
  updatedAt: number;
  kind: 'letter' | 'newspaper';
  letterId?: string;
  newspaper?: AIChatNewspaperItem;
}

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
  newspapers: AIChatNewspaperItem[];
  customPromptBlocks: AIChatCustomPromptBlock[];
  sortedSessions: AIChatSession[];
  theme: AIChatHomeTheme;
  isLoading: boolean;
  formatConversationTime: (value: number) => string;
  getSessionPersona: (session: AIChatSession) => AIChatPersona;
  onOpenChat: (sessionId?: string) => void;
  onOpenLetters: () => void;
  onOpenNewspapers: () => void;
  onOpenLetter: (letterId: string) => void;
  onOpenNewspaper: (item: AIChatNewspaperItem) => void;
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

const SectionHeading: React.FC<{
  index: string;
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  theme: AIChatHomeTheme;
}> = ({ index, icon: Icon, title, action, theme }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="h-4 w-1 shrink-0 rounded-full" style={{ backgroundColor: theme.primaryButtonBg }} />
      <span className="shrink-0 text-[10px] tracking-[0.22em]" style={{ color: theme.textFaint }}>{index}</span>
      <Icon size={14} className="shrink-0" style={{ color: theme.textMuted }} />
      <span className="truncate text-[11px] font-medium tracking-[0.16em]" style={{ color: theme.textMuted }}>{title}</span>
    </div>
    {action}
  </div>
);

export const AIChatHome: React.FC<AIChatHomeProps> = ({
  assistantMemory,
  assistantReminders,
  assistantLetters,
  newspapers,
  customPromptBlocks,
  sortedSessions,
  theme,
  isLoading,
  formatConversationTime,
  getSessionPersona,
  onOpenChat,
  onOpenLetters,
  onOpenNewspapers,
  onOpenLetter,
  onOpenNewspaper,
  onOpenMemory,
  onOpenHistory,
  onOpenSettings,
  onSendShortcut,
}) => {
  const [quickChatText, setQuickChatText] = useState('');
  const [dismissedFeedIds, setDismissedFeedIds] = useState<string[]>([]);
  const [draggedLetterId, setDraggedLetterId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [swipingLetterId, setSwipingLetterId] = useState<string | null>(null);
  const letterDragRef = useRef<{ id: string; startX: number } | null>(null);
  const suppressLetterClickRef = useRef(false);
  const pendingReminders = assistantReminders.filter((reminder) => reminder.status === 'pending');
  const feedItems = useMemo<AIChatFeedItem[]>(() => [
    ...assistantLetters.map((letter) => ({
      id: `letter:${letter.id}`,
      title: letter.title,
      preview: letter.preview,
      dateLabel: formatShortDate(letter.sentAt),
      updatedAt: new Date(letter.sentAt).getTime(),
      kind: 'letter' as const,
      letterId: letter.id
    })),
    ...newspapers.map((newspaper) => ({
      id: `newspaper:${newspaper.id}`,
      title: newspaper.title,
      preview: newspaper.preview,
      dateLabel: newspaper.dateLabel,
      updatedAt: newspaper.updatedAt,
      kind: 'newspaper' as const,
      newspaper
    }))
  ].sort((left, right) => right.updatedAt - left.updatedAt), [assistantLetters, newspapers]);
  const visibleFeedItems = feedItems.filter((item) => !dismissedFeedIds.includes(item.id)).slice(0, 3);
  const visibleSessions = sortedSessions.slice(0, 3);
  const memoryItems = [...assistantMemory.profileMemory, ...assistantMemory.preferenceMemory].slice(0, 4);
  const memoryLabels = ['偏好', '研究', '写作', '状态'];
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

  const handleLetterPointerDown = (event: React.PointerEvent<HTMLButtonElement>, feedId: string) => {
    if (swipingLetterId || visibleFeedItems[0]?.id !== feedId) return;
    letterDragRef.current = { id: feedId, startX: event.clientX };
    suppressLetterClickRef.current = false;
    setDraggedLetterId(feedId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLetterPointerMove = (event: React.PointerEvent<HTMLButtonElement>, feedId: string) => {
    if (letterDragRef.current?.id !== feedId) return;
    const offset = event.clientX - letterDragRef.current.startX;
    if (Math.abs(offset) > 6) suppressLetterClickRef.current = true;
    setDragOffset(offset);
  };

  const resetLetterDrag = () => {
    letterDragRef.current = null;
    setDraggedLetterId(null);
    setDragOffset(0);
  };

  const handleLetterPointerUp = (event: React.PointerEvent<HTMLButtonElement>, feedId: string) => {
    if (letterDragRef.current?.id !== feedId) return;
    const offset = event.clientX - letterDragRef.current.startX;
    if (Math.abs(offset) > 72) {
      setSwipingLetterId(feedId);
      setDragOffset(offset > 0 ? 560 : -560);
      window.setTimeout(() => {
        setDismissedFeedIds((current) => current.includes(feedId) ? current : [...current, feedId]);
        resetLetterDrag();
        setSwipingLetterId(null);
      }, 180);
      letterDragRef.current = null;
      return;
    }
    resetLetterDrag();
  };

  const handleFeedItemClick = (item: AIChatFeedItem) => {
    if (suppressLetterClickRef.current) {
      suppressLetterClickRef.current = false;
      return;
    }
    if (item.kind === 'letter' && item.letterId) {
      onOpenLetter(item.letterId);
    } else if (item.newspaper) {
      onOpenNewspaper(item.newspaper);
    }
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div className="h-full min-h-0 overflow-y-auto px-4 pb-32 pt-3 sm:px-8 sm:pb-36 sm:pt-4">
        <div className="mx-auto max-w-6xl">
          <main className="space-y-5">
            <section>
              <SectionHeading
                index="01"
                icon={Mail}
                title="来信与小报"
                theme={theme}
                action={(
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={onOpenLetters} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>来信 <ChevronRight size={13} /></button>
                    <button type="button" onClick={onOpenNewspapers} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>小报 <ChevronRight size={13} /></button>
                  </div>
                )}
              />
              <div className="relative mt-3 pr-1" style={{ minHeight: `${Math.max(8, 6.4 + visibleFeedItems.length * 1.05)}rem` }}>
                  {visibleFeedItems.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-sm" style={{ color: theme.textMuted }}>暂时没有新的来信或小报</div>
                  ) : visibleFeedItems.map((item, index) => {
                    const isTopLetter = index === 0;
                    const isDragging = draggedLetterId === item.id;
                    const isSwiping = swipingLetterId === item.id;
                    const rotation = index === 0 ? '-0.6deg' : index === 1 ? '0.5deg' : '-0.2deg';
                    const translatedX = isTopLetter && (isDragging || isSwiping) ? dragOffset : 0;
                    return <button key={item.id} type="button" onClick={() => handleFeedItemClick(item)} onPointerDown={(event) => handleLetterPointerDown(event, item.id)} onPointerMove={(event) => handleLetterPointerMove(event, item.id)} onPointerUp={(event) => handleLetterPointerUp(event, item.id)} onPointerCancel={resetLetterDrag} aria-label={isTopLetter ? '拖拽移除这条内容，或点击打开' : undefined} className={`absolute left-1 right-0 rounded-[0.65rem] p-3.5 text-left sm:p-4 ${isTopLetter ? 'cursor-grab active:cursor-grabbing' : ''}`} style={{ top: `${index * 1.05}rem`, zIndex: visibleFeedItems.length - index, pointerEvents: isTopLetter ? 'auto' : 'none', backgroundColor: theme.panelBg, boxShadow: theme.cardShadowStrong, transform: `translate3d(${translatedX}px, 0, 0) rotate(${rotation})`, transition: isDragging ? 'none' : 'transform 180ms ease-out', touchAction: 'pan-y' }}>
                      <div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2 truncate font-serif text-base" style={{ color: theme.textPrimary }}>{item.kind === 'newspaper' ? <FileText size={14} className="shrink-0" style={{ color: theme.primaryButtonBg }} /> : <Mail size={14} className="shrink-0" style={{ color: theme.primaryButtonBg }} />}<span className="truncate">{item.title}</span></span><span className="shrink-0 text-[11px]" style={{ color: theme.textMuted }}>{item.dateLabel}</span></div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5" style={{ color: theme.textSecondary }}>{item.preview}</p>
                    </button>;
                  })}
              </div>
            </section>

            <section className="pt-4 pb-3">
              <SectionHeading index="02" icon={Zap} title="快捷指令" theme={theme} action={<button type="button" onClick={onOpenSettings} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }} title="设置快捷指令" aria-label="设置快捷指令"><Settings size={14} /> 设置</button>} />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {shortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return <button key={shortcut.id} type="button" disabled={isLoading} onClick={() => onSendShortcut(shortcut.text)} className="group inline-flex min-h-7 items-center gap-1.5 border-b pb-0.5 text-xs disabled:opacity-50" style={{ borderColor: theme.panelBorder, color: theme.textPrimary }}><Icon size={15} style={{ color: theme.textSecondary }} /><span>{shortcut.title}</span><ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" style={{ color: theme.textFaint }} /></button>;
                })}
              </div>
            </section>

            <section className="py-3">
              <SectionHeading index="03" icon={Bell} title="提醒" theme={theme} action={<span className="text-[11px]" style={{ color: theme.textMuted }}>{pendingReminders.length} 条</span>} />
              {pendingReminders.length ? <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">{pendingReminders.slice(0, 3).map((reminder) => <button key={reminder.id} type="button" onClick={onOpenMemory} className="inline-flex max-w-full items-center gap-2 text-left text-xs" style={{ color: theme.textPrimary }}><Clock3 size={14} className="shrink-0" style={{ color: theme.textSecondary }} /><span className="line-clamp-1">{reminder.text}</span><span className="shrink-0 text-[10px]" style={{ color: theme.textMuted }}>{formatShortDate(reminder.dueAt)}</span></button>)}</div> : <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>暂无待处理提醒</p>}
            </section>

            <section className="py-3">
              <SectionHeading index="04" icon={Brain} title="长期记忆" theme={theme} action={<button type="button" onClick={onOpenMemory} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>查看全部 <ChevronRight size={13} /></button>} />
              <div className="mt-3 space-y-2">
                {memoryItems.map((item, index) => <button key={item} type="button" onClick={onOpenMemory} className="flex w-full items-center gap-3 text-left"><span className="w-12 shrink-0 rounded-[0.35rem] px-2 py-1 text-center text-xs" style={{ backgroundColor: theme.panelBgSoft, color: theme.primaryButtonBg }}>{memoryLabels[index] || '记忆'}</span><span className="line-clamp-1 text-sm" style={{ color: theme.textPrimary }}>{item}</span></button>)}
                {memoryItems.length === 0 && <p className="text-sm" style={{ color: theme.textMuted }}>还没有形成长期记忆</p>}
              </div>
            </section>

            <section className="py-3">
              <SectionHeading index="05" icon={History} title="最近对话" theme={theme} action={<button type="button" onClick={onOpenHistory} className="inline-flex items-center gap-1 text-xs" style={{ color: theme.textSecondary }}>查看全部 <ChevronRight size={13} /></button>} />
              <div className="mt-2 divide-y" style={{ borderColor: theme.panelBorder }}>
                {visibleSessions.map((session) => <button key={session.id} type="button" onClick={() => onOpenChat(session.id)} className="flex w-full items-center gap-2 py-2 text-left first:pt-1"><div className="h-6 w-6 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: theme.avatarBg }}><PersonaAvatar persona={getSessionPersona(session)} className="rounded-full" iconClassName="text-sm" /></div><span className="min-w-0 flex-1 truncate text-sm" style={{ color: theme.textPrimary }}>{session.title}</span><span className="shrink-0 text-[10px]" style={{ color: theme.textMuted }}>{formatConversationTime(session.updatedAt)}</span><ChevronRight size={14} className="shrink-0" style={{ color: theme.textFaint }} /></button>)}
                {visibleSessions.length === 0 && <p className="py-2 text-sm" style={{ color: theme.textMuted }}>还没有对话记录</p>}
              </div>
            </section>
          </main>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-8 sm:pb-5">
        <div className="pointer-events-auto mx-auto max-w-6xl pt-3" style={{ backgroundColor: theme.shellLayerBg }}>
          <div className="rounded-full border p-1.5" style={{ borderColor: theme.panelBorderStrong, backgroundColor: theme.panelBg }}>
            <div className="flex items-center gap-2"><MessageCircle size={17} className="ml-3 shrink-0" style={{ color: theme.textMuted }} /><input value={quickChatText} onChange={(event) => setQuickChatText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendQuickChat(); } }} placeholder="和 AI 说点什么…" className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm outline-none" style={{ color: theme.textPrimary }} /><button type="button" onClick={sendQuickChat} disabled={!quickChatText.trim() || isLoading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-40" style={{ backgroundColor: theme.primaryButtonBg, color: theme.primaryButtonText }} title="发送" aria-label="发送"><ArrowRight size={16} /></button></div>
          </div>
        </div>
      </div>
    </div>
  );
};
