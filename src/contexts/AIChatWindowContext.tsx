/**
 * @file AIChatWindowContext.tsx
 * @description Keeps the shared AI chat window mounted at the app level so closing the modal only hides UI and does not interrupt in-flight AI execution.
 * @updated 2026-04-30: Added a shared hardware-back bridge so Android back presses can unwind AI subpages before closing the root chat window.
 * @updated 2026-04-26: Added session/message navigation targets so Android assistant notifications can reopen the shared chat at the exact background message.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AIBackfillChatModal } from '../components/AIBackfillChatModal';

interface OpenAIChatOptions {
  targetDate?: Date;
  targetSessionId?: string;
  targetMessageId?: string;
}

interface AIChatWindowContextValue {
  isAIChatOpen: boolean;
  unreadCount: number;
  targetDate?: Date;
  targetSessionId?: string;
  targetMessageId?: string;
  openAIChat: (options?: OpenAIChatOptions) => void;
  closeAIChat: () => void;
  handleAIChatBack: () => boolean;
  incrementUnreadCount: (count?: number) => void;
  markAIChatRead: () => void;
}

const AIChatWindowContext = createContext<AIChatWindowContextValue | undefined>(undefined);

export const useAIChatWindow = (): AIChatWindowContextValue => {
  const context = useContext(AIChatWindowContext);
  if (!context) {
    throw new Error('useAIChatWindow must be used within an AIChatWindowProvider');
  }
  return context;
};

export const AIChatWindowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [targetSessionId, setTargetSessionId] = useState<string | undefined>(undefined);
  const [targetMessageId, setTargetMessageId] = useState<string | undefined>(undefined);
  const aiChatBackHandlerRef = useRef<(() => boolean) | null>(null);

  const openAIChat = useCallback((options?: OpenAIChatOptions) => {
    setTargetDate(options?.targetDate ? new Date(options.targetDate) : undefined);
    setTargetSessionId(options?.targetSessionId?.trim() || undefined);
    setTargetMessageId(options?.targetMessageId?.trim() || undefined);
    setUnreadCount(0);
    setIsAIChatOpen(true);
  }, []);

  const closeAIChat = useCallback(() => {
    setIsAIChatOpen(false);
    setTargetDate(undefined);
    setTargetSessionId(undefined);
    setTargetMessageId(undefined);
  }, []);

  const registerAIChatBackHandler = useCallback((handler: (() => boolean) | null) => {
    aiChatBackHandlerRef.current = handler;
  }, []);

  const handleAIChatBack = useCallback(() => {
    if (!isAIChatOpen) {
      return false;
    }

    if (aiChatBackHandlerRef.current) {
      return aiChatBackHandlerRef.current();
    }

    closeAIChat();
    return true;
  }, [closeAIChat, isAIChatOpen]);

  const incrementUnreadCount = useCallback((count = 1) => {
    if (count <= 0) {
      return;
    }

    setUnreadCount((previous) => previous + count);
  }, []);

  const markAIChatRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const value = useMemo<AIChatWindowContextValue>(() => ({
    isAIChatOpen,
    unreadCount,
    targetDate,
    targetSessionId,
    targetMessageId,
    openAIChat,
    closeAIChat,
    handleAIChatBack,
    incrementUnreadCount,
    markAIChatRead
  }), [
    closeAIChat,
    handleAIChatBack,
    incrementUnreadCount,
    isAIChatOpen,
    markAIChatRead,
    openAIChat,
    targetDate,
    targetMessageId,
    targetSessionId,
    unreadCount
  ]);

  return (
    <AIChatWindowContext.Provider value={value}>
      {children}
      <AIBackfillChatModal
        isOpen={isAIChatOpen}
        onClose={closeAIChat}
        targetDate={targetDate}
        targetSessionId={targetSessionId}
        targetMessageId={targetMessageId}
        registerBackHandler={registerAIChatBackHandler}
        onUnreadAssistantMessage={incrementUnreadCount}
        onMarkRead={markAIChatRead}
      />
    </AIChatWindowContext.Provider>
  );
};
