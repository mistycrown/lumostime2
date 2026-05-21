/**
 * @file AIBackfillChatConversationPane.tsx
 * @input Chat session messages, reveal/expansion state, message action renderers, and navigation callbacks
 * @output Empty-state prompt list plus the rendered AI/user conversation pane
 * @pos Component Support (AI Integration)
 * @description Extracts the heavy conversation rendering UI out of AIBackfillChatModal so the modal can focus on orchestration while the message list, writeback cards, and per-message metadata remain behaviorally unchanged.
 * @updated 2026-05-21: Treat assistant messages as standalone avatar groups so each AI reply starts with an avatar while multi-bubble displayParts still share one avatar.
 * @updated 2026-05-18: Added configurable width classes so compact desktop AI shells can reuse the conversation renderer without forcing the full-screen modal measure.
 * @updated 2026-05-15: Rebuilt the conversation pane with the extracted empty state, message bubble rendering, and writeback cards.
 */
import React from 'react';
import { ChevronDown, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import type { AppliedChatAction } from '../../services/assistantActionExecutor';
import type {
  AIChatDailyNewspaperWritebackResult,
  AIChatDailyReviewWritebackResult,
  AIChatDreamUpdateCard,
  AIChatMessage,
  AIChatMonthlyReviewWritebackResult,
  AIChatPersona,
  AIChatSession,
  AIChatUserProfile,
  AIChatWeeklyReviewWritebackResult,
  DebugViewerState
} from './AIBackfillChatShared';
import { PersonaAvatar, RevealingMessageBubble, UserAvatar } from './AIBackfillChatShared';

interface AIChatConversationTheme {
  activeBg: string;
  activeBorder: string;
  avatarBg: string;
  cardShadow: string;
  chipBorder: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  inputBg: string;
  panelBg: string;
  panelBgSoft: string;
  panelBgStrong: string;
  panelBorder: string;
  panelBorderStrong: string;
  pendingBg: string;
  pendingBorder: string;
  textFaint: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
}

interface EmptyPromptExampleGroup {
  title: string;
  prompt: string;
  requirement?: string;
}

interface AIBackfillChatConversationPaneProps {
  accentMix: (accentWeight: number, fallbackColor?: string) => string;
  activePersona: AIChatPersona;
  activeSession: AIChatSession | null;
  emptyPromptExampleGroups: EmptyPromptExampleGroup[];
  expandedDreamUpdateMessageIds: Set<string>;
  expandedMemoryUpdateMessageIds: Set<string>;
  expandedReasoningMessageIds: Set<string>;
  expandedReminderUpdateMessageIds: Set<string>;
  formatAssistantDateTimeForDisplay: (value: string) => string;
  formatConversationTime: (value: number) => string;
  getMessageDebugViewer: (message: AIChatMessage) => DebugViewerState | null;
  isLoading: boolean;
  markdownComponents: any;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onMessageRef: (messageId: string, node: HTMLDivElement | null) => void;
  onOpenDailyReviewNarrative: (date: string) => void;
  onOpenDailyNewspaper: (date: string) => void;
  onOpenDebugViewer: (viewer: DebugViewerState) => void;
  onOpenMonthlyReviewNarrative: (monthStartDate: string, monthEndDate: string) => void;
  onOpenWeeklyReviewNarrative: (weekStartDate: string, weekEndDate: string) => void;
  onRetryMessage: (message: AIChatMessage) => void;
  renderAppliedAction: (messageId: string, action: AppliedChatAction) => React.ReactNode;
  revealedAssistantPartCounts: Record<string, number>;
  setDreamUpdateExpansion: (messageId: string) => void;
  setMemoryUpdateExpansion: (messageId: string) => void;
  setReasoningExpansion: (messageId: string) => void;
  setReminderUpdateExpansion: (messageId: string) => void;
  theme: AIChatConversationTheme;
  userProfile: AIChatUserProfile;
  conversationMaxWidthClassName?: string;
  emptyStateMaxWidthClassName?: string;
}

const DailyReviewWritebackResultCard: React.FC<{
  onOpen: () => void;
  result: AIChatDailyReviewWritebackResult;
  theme: AIChatConversationTheme;
}> = ({ onOpen, result, theme }) => (
  <div
    className="border-l-2 pl-3 pr-1 py-1"
    style={{ borderColor: theme.activeBorder }}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="block w-full truncate text-left font-serif text-[1rem] leading-6 transition-colors hover:opacity-80"
          style={{ color: theme.textPrimary }}
          title="打开对应日报的 AI 叙事"
        >
          {result.title || 'AI 叙事'}
        </button>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: theme.textSecondary }}>
          {result.preview || '点击查看完整叙事'}
        </p>
      </div>
    </div>

    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
      <span>{result.date}</span>
      <span>{result.createdReview ? '已新建日报' : '已写入日报'}</span>
      <span>{result.mergeMode === 'overwrite' ? '覆盖写入' : '首次写入'}</span>
    </div>

    <div className="mt-2.5 flex justify-end gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs transition-colors"
        style={{
          borderColor: theme.chipBorder,
          backgroundColor: theme.inputBg,
          color: theme.textSecondary
        }}
        title="打开日报叙事"
      >
        打开
      </button>
    </div>
  </div>
);

const DailyNewspaperWritebackResultCard: React.FC<{
  onOpen: () => void;
  result: AIChatDailyNewspaperWritebackResult;
  theme: AIChatConversationTheme;
}> = ({ onOpen, result, theme }) => (
  <div
    className="border-l-2 pl-3 pr-1 py-1"
    style={{ borderColor: theme.activeBorder }}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="block w-full truncate text-left font-serif text-[1rem] leading-6 transition-colors hover:opacity-80"
          style={{ color: theme.textPrimary }}
          title="打开对应日报的小报"
        >
          {result.title || 'AI 小报'}
        </button>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: theme.textSecondary }}>
          {result.preview || '点击查看完整小报'}
        </p>
      </div>
    </div>

    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
      <span>{result.date}</span>
      <span>{result.createdReview ? '已新建日报' : '已写入日报'}</span>
      <span>{result.mergeMode === 'overwrite' ? '覆盖写入' : '首次写入'}</span>
    </div>

    <div className="mt-2.5 flex justify-end gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs transition-colors"
        style={{
          borderColor: theme.chipBorder,
          backgroundColor: theme.inputBg,
          color: theme.textSecondary
        }}
        title="打开日报小报"
      >
        打开
      </button>
    </div>
  </div>
);

const WeeklyReviewWritebackResultCard: React.FC<{
  onOpen: () => void;
  result: AIChatWeeklyReviewWritebackResult;
  theme: AIChatConversationTheme;
}> = ({ onOpen, result, theme }) => (
  <div
    className="border-l-2 pl-3 pr-1 py-1"
    style={{ borderColor: theme.activeBorder }}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="block w-full truncate text-left font-serif text-[1rem] leading-6 transition-colors hover:opacity-80"
          style={{ color: theme.textPrimary }}
          title="打开对应周回顾的 AI 叙事"
        >
          {result.title || 'AI 叙事'}
        </button>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: theme.textSecondary }}>
          {result.preview || '点击查看完整叙事'}
        </p>
      </div>
    </div>

    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
      <span>{`${result.weekStartDate} ~ ${result.weekEndDate}`}</span>
      <span>{result.createdReview ? '已新建周回顾' : '已写入周回顾'}</span>
      <span>{result.mergeMode === 'overwrite' ? '覆盖写入' : '首次写入'}</span>
    </div>

    <div className="mt-2.5 flex justify-end gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs transition-colors"
        style={{
          borderColor: theme.chipBorder,
          backgroundColor: theme.inputBg,
          color: theme.textSecondary
        }}
        title="打开周回顾叙事"
      >
        打开
      </button>
    </div>
  </div>
);

const MonthlyReviewWritebackResultCard: React.FC<{
  onOpen: () => void;
  result: AIChatMonthlyReviewWritebackResult;
  theme: AIChatConversationTheme;
}> = ({ onOpen, result, theme }) => (
  <div
    className="border-l-2 pl-3 pr-1 py-1"
    style={{ borderColor: theme.activeBorder }}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="block w-full truncate text-left font-serif text-[1rem] leading-6 transition-colors hover:opacity-80"
          style={{ color: theme.textPrimary }}
          title="打开对应月回顾的 AI 叙事"
        >
          {result.title || 'AI 叙事'}
        </button>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-6" style={{ color: theme.textSecondary }}>
          {result.preview || '点击查看完整叙事'}
        </p>
      </div>
    </div>

    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: theme.textMuted }}>
      <span>{`${result.monthStartDate} ~ ${result.monthEndDate}`}</span>
      <span>{result.createdReview ? '已新建月回顾' : '已写入月回顾'}</span>
      <span>{result.mergeMode === 'overwrite' ? '覆盖写入' : '首次写入'}</span>
    </div>

    <div className="mt-2.5 flex justify-end gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs transition-colors"
        style={{
          borderColor: theme.chipBorder,
          backgroundColor: theme.inputBg,
          color: theme.textSecondary
        }}
        title="打开月回顾叙事"
      >
        打开
      </button>
    </div>
  </div>
);

export const AIBackfillChatConversationPane: React.FC<AIBackfillChatConversationPaneProps> = ({
  accentMix,
  activePersona,
  activeSession,
  emptyPromptExampleGroups,
  expandedDreamUpdateMessageIds,
  expandedMemoryUpdateMessageIds,
  expandedReasoningMessageIds,
  expandedReminderUpdateMessageIds,
  formatAssistantDateTimeForDisplay,
  formatConversationTime,
  getMessageDebugViewer,
  isLoading,
  markdownComponents,
  messagesEndRef,
  onMessageRef,
  onOpenDailyReviewNarrative,
  onOpenDailyNewspaper,
  onOpenDebugViewer,
  onOpenMonthlyReviewNarrative,
  onOpenWeeklyReviewNarrative,
  onRetryMessage,
  renderAppliedAction,
  revealedAssistantPartCounts,
  setDreamUpdateExpansion,
  setMemoryUpdateExpansion,
  setReasoningExpansion,
  setReminderUpdateExpansion,
  theme,
  userProfile,
  conversationMaxWidthClassName = 'max-w-[920px]',
  emptyStateMaxWidthClassName = 'max-w-2xl'
}) => {
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
    const reasoningParts = message.reasoning?.parts || [];
    const hasReasoning = !isUser && reasoningParts.length > 0;
    const isReasoningExpanded = expandedReasoningMessageIds.has(message.id);
    const isMemoryUpdatesExpanded = expandedMemoryUpdateMessageIds.has(message.id);
    const isDreamUpdatesExpanded = expandedDreamUpdateMessageIds.has(message.id);
    const isReminderUpdatesExpanded = expandedReminderUpdateMessageIds.has(message.id);
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !isUser || !previousMessage || previousMessage.role !== message.role;

    let bubbleStyle = {
      borderColor: theme.panelBorder,
      backgroundColor: theme.panelBg,
      color: theme.textPrimary,
      boxShadow: `0 0 0 1px ${accentMix(8, 'rgba(0,0,0,0.02)')}`
    };
    if (isUser) {
      bubbleStyle = {
        borderColor: theme.activeBorder,
        backgroundColor: theme.activeBg,
        color: theme.textPrimary,
        boxShadow: `0 0 0 1px ${accentMix(10, 'rgba(0,0,0,0.03)')}`
      };
    } else if (tone === 'system') {
      bubbleStyle = {
        borderColor: theme.panelBorder,
        backgroundColor: theme.inputBg,
        color: theme.textSecondary,
        boxShadow: `0 0 0 1px ${accentMix(7, 'rgba(0,0,0,0.02)')}`
      };
    } else if (tone === 'error') {
      bubbleStyle = {
        borderColor: theme.dangerBorder,
        backgroundColor: theme.dangerBg,
        color: theme.dangerText,
        boxShadow: '0 0 0 1px rgba(157,84,77,0.08)'
      };
    } else if (tone === 'pending') {
      bubbleStyle = {
        borderColor: theme.pendingBorder,
        backgroundColor: theme.pendingBg,
        color: theme.textMuted,
        boxShadow: `0 0 0 1px ${accentMix(6, 'rgba(0,0,0,0.02)')}`
      };
    }

    const avatarStyle = isUser
      ? {
        borderColor: theme.activeBorder,
        backgroundColor: theme.activeBg,
        color: theme.textSecondary
      }
      : tone === 'error'
        ? {
          borderColor: theme.dangerBorder,
          backgroundColor: theme.dangerBg,
          color: theme.dangerText
        }
        : tone === 'system'
          ? {
            borderColor: theme.panelBorder,
            backgroundColor: theme.inputBg,
            color: theme.textMuted
          }
          : {
            borderColor: theme.panelBorder,
            backgroundColor: theme.avatarBg,
            color: theme.textSecondary
          };
    const messageDebugViewer = getMessageDebugViewer(message);

    return (
      <div
        key={message.id}
        ref={(node) => onMessageRef(message.id, node)}
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
            {hasReasoning && (
              <div className="px-1 pb-0.5 text-left">
                <button
                  type="button"
                  onClick={() => setReasoningExpansion(message.id)}
                  className="inline-flex items-center gap-1.5 text-[11px] transition-colors hover:opacity-100"
                  style={{ color: theme.textFaint }}
                >
                  {isReasoningExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span>推理过程</span>
                  <span>{isReasoningExpanded ? '收起' : '展开'}</span>
                </button>
                {isReasoningExpanded && (
                  <div className="mt-1.5 space-y-2 pl-5">
                    {reasoningParts.map((part, reasoningIndex) => (
                      <div
                        key={`${message.id}-reasoning-${reasoningIndex}`}
                        className="text-[12px] leading-6"
                        style={{ color: theme.textMuted }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={markdownComponents}
                        >
                          {part.text}
                        </ReactMarkdown>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {visibleDisplayParts.map((part, partIndex) => (
              <RevealingMessageBubble
                key={`${message.id}-part-${partIndex}`}
                className={`rounded-[0.95rem] border px-4 py-3 ${isUser ? 'ml-auto' : ''}`}
                style={bubbleStyle}
                revealMode={isAnimatedAssistantMessage ? 'assistantStaggered' : 'default'}
                partIndex={partIndex}
                partCount={displayParts.length}
              >
                <div className="flex items-start gap-2 text-left">
                  {tone === 'pending' && partIndex === 0 && (
                    <Loader2 size={15} className="mt-1 shrink-0 animate-spin" style={{ color: theme.textFaint }} />
                  )}
                  <div className="min-w-0 flex-1 break-words text-left text-[14px] leading-6 sm:text-[15px]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={markdownComponents}
                    >
                      {part}
                    </ReactMarkdown>
                  </div>
                </div>
              </RevealingMessageBubble>
            ))}
            {allDisplayPartsRevealed && (
              <div className={`px-1 text-[10px] ${isUser ? 'text-right' : 'text-left'}`} style={{ color: theme.textMuted }}>
                <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span>{formatConversationTime(message.createdAt)}</span>
                  <span className="hidden text-[#b4a79a] sm:inline">·</span>
                  <span>{activeSession?.contextCacheEnabled ? `上下文开启 · ${activePersona.contextMessageLimit}轮` : '单轮'}</span>
                  {message.memoryUpdates && message.memoryUpdates.length > 0 && (
                    <>
                      <span className="hidden text-[#b4a79a] sm:inline">·</span>
                      <button
                        type="button"
                        onClick={() => setMemoryUpdateExpansion(message.id)}
                        className="transition-colors hover:opacity-100"
                        style={{ color: theme.textMuted }}
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
                        onClick={() => setDreamUpdateExpansion(message.id)}
                        className="transition-colors hover:opacity-100"
                        style={{ color: theme.textMuted }}
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
                        onClick={() => setReminderUpdateExpansion(message.id)}
                        className="transition-colors hover:opacity-100"
                        style={{ color: theme.textMuted }}
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
                        onClick={() => onOpenDebugViewer(messageDebugViewer)}
                        className="transition-colors hover:opacity-100"
                        style={{ color: theme.textMuted }}
                      >
                        查看调试
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {allDisplayPartsRevealed && ((message.appliedActions && message.appliedActions.length > 0) || message.dailyReviewWriteback || message.dailyNewspaperWriteback || message.weeklyReviewWriteback || message.monthlyReviewWriteback) && (
              <div
                className="space-y-2 border-l pl-3 pr-1 py-1"
                style={{
                  borderColor: theme.activeBorder
                }}
              >
                <p className="font-serif text-[10px] tracking-[0.08em]" style={{ color: theme.textFaint }}>
                  应用结果
                </p>
                <div className="space-y-2">
                  {message.appliedActions?.map((action) => renderAppliedAction(message.id, action))}
                  {message.dailyReviewWriteback && (
                    <DailyReviewWritebackResultCard
                      onOpen={() => onOpenDailyReviewNarrative(message.dailyReviewWriteback!.date)}
                      result={message.dailyReviewWriteback}
                      theme={theme}
                    />
                  )}
                  {message.dailyNewspaperWriteback && (
                    <DailyNewspaperWritebackResultCard
                      onOpen={() => onOpenDailyNewspaper(message.dailyNewspaperWriteback!.date)}
                      result={message.dailyNewspaperWriteback}
                      theme={theme}
                    />
                  )}
                  {message.weeklyReviewWriteback && (
                    <WeeklyReviewWritebackResultCard
                      onOpen={() => onOpenWeeklyReviewNarrative(
                        message.weeklyReviewWriteback!.weekStartDate,
                        message.weeklyReviewWriteback!.weekEndDate
                      )}
                      result={message.weeklyReviewWriteback}
                      theme={theme}
                    />
                  )}
                  {message.monthlyReviewWriteback && (
                    <MonthlyReviewWritebackResultCard
                      onOpen={() => onOpenMonthlyReviewNarrative(
                        message.monthlyReviewWriteback!.monthStartDate,
                        message.monthlyReviewWriteback!.monthEndDate
                      )}
                      result={message.monthlyReviewWriteback}
                      theme={theme}
                    />
                  )}
                </div>
              </div>
            )}

            {allDisplayPartsRevealed && message.memoryUpdates && message.memoryUpdates.length > 0 && isMemoryUpdatesExpanded && (
              <div
                className="space-y-2 border-l pl-3 pr-1 py-1"
                style={{
                  borderColor: theme.activeBorder
                }}
              >
                <div className="space-y-2">
                  {message.memoryUpdates.map((section) => (
                    <div
                      key={`${message.id}-memory-${section.label}`}
                      className="border-l-2 pl-3 pr-1 py-1"
                      style={{ borderColor: theme.activeBorder }}
                    >
                      <p className="text-[11px] font-semibold" style={{ color: theme.textSecondary }}>
                        {section.label}
                      </p>
                      <div className="mt-1.5 space-y-1 text-[13px] leading-6" style={{ color: theme.textPrimary }}>
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
                  borderColor: theme.activeBorder
                }}
              >
                <div className="space-y-2">
                  {message.dreamUpdates.map((card: AIChatDreamUpdateCard, cardIndex) => (
                    <div
                      key={`${message.id}-dream-${card.topicId}-${cardIndex}`}
                      className="border-l-2 pl-3 pr-1 py-1"
                      style={{ borderColor: theme.activeBorder }}
                    >
                      <p className="text-[11px] font-semibold" style={{ color: theme.textSecondary }}>
                        {card.topicTitle} · {card.action === 'created' ? '新增' : card.action === 'deleted' ? '删除' : '改写'}
                      </p>
                      <div className="mt-1.5 space-y-1 text-[13px] leading-6" style={{ color: theme.textPrimary }}>
                        <p>{card.content}</p>
                        {(card.observedRangeStart && card.observedRangeEnd) && (
                          <p className="text-[12px]" style={{ color: theme.textSecondary }}>
                            观察窗口：{card.observedRangeStart} 至 {card.observedRangeEnd}
                          </p>
                        )}
                        <p className="text-[12px]" style={{ color: theme.textSecondary }}>
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
                  borderColor: theme.activeBorder
                }}
              >
                <div className="space-y-2">
                  {message.reminderUpdates.map((item) => (
                    <div
                      key={`${message.id}-reminder-${item}`}
                      className="border-l-2 pl-3 pr-1 py-1"
                      style={{ borderColor: theme.activeBorder }}
                    >
                      <p className="text-[13px] leading-6" style={{ color: theme.textPrimary }}>
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
                  onClick={() => onRetryMessage(message)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: theme.chipBorder,
                    backgroundColor: theme.panelBg,
                    color: theme.textSecondary
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
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
      {!activeSession || activeSession.messages.length === 0 ? (
        <div
          className={`mx-auto mt-10 ${emptyStateMaxWidthClassName} rounded-[0.9rem] border border-dashed px-6 py-7 text-sm leading-7`}
          style={{
            borderColor: theme.panelBorderStrong,
            background: `linear-gradient(180deg, ${theme.panelBg} 0%, ${theme.panelBgSoft} 100%)`,
            color: theme.textSecondary,
            boxShadow: theme.cardShadow
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
      ) : (
        <div className={`mx-auto ${conversationMaxWidthClassName} space-y-4`}>
          {activeSession.messages.map(renderMessageBubble)}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};
