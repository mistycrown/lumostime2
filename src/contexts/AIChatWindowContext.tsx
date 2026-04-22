/**
 * @file AIChatWindowContext.tsx
 * @description Keeps the shared AI chat window mounted at the app level so closing the modal only hides UI and does not interrupt in-flight AI execution.
 */
import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AIBackfillChatModal } from '../components/AIBackfillChatModal';

interface OpenAIChatOptions {
  targetDate?: Date;
}

interface AIChatWindowContextValue {
  isAIChatOpen: boolean;
  targetDate?: Date;
  openAIChat: (options?: OpenAIChatOptions) => void;
  closeAIChat: () => void;
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
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);

  const openAIChat = useCallback((options?: OpenAIChatOptions) => {
    setTargetDate(options?.targetDate ? new Date(options.targetDate) : undefined);
    setIsAIChatOpen(true);
  }, []);

  const closeAIChat = useCallback(() => {
    setIsAIChatOpen(false);
  }, []);

  const value = useMemo<AIChatWindowContextValue>(() => ({
    isAIChatOpen,
    targetDate,
    openAIChat,
    closeAIChat
  }), [closeAIChat, isAIChatOpen, openAIChat, targetDate]);

  return (
    <AIChatWindowContext.Provider value={value}>
      {children}
      <AIBackfillChatModal
        isOpen={isAIChatOpen}
        onClose={closeAIChat}
        targetDate={targetDate}
      />
    </AIChatWindowContext.Provider>
  );
};
