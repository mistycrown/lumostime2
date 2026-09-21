/**
 * @file useAIBackfillChatSessionState.ts
 * @input Local chat storage readiness, persisted persona/session/profile data, and local-date normalization
 * @output Chat persistence state and hydration coordination refs
 * @pos Component Support (AI Integration)
 * @description Isolates session-domain state initialization while leaving the modal's existing persistence effects unchanged.
 */
import { useRef, useState } from 'react';
import { getLocalDateStr } from '../../utils/dateUtils';
import { aiChatStorageService } from '../../services/aiChatStorageService';
import {
  CHAT_SYNC_ENABLED_KEY,
  loadInitialChatState,
  normalizePersistedSessions
} from './AIBackfillChatInitialization';
import type {
  AIChatCustomPromptBlock,
  AIChatPersona,
  AIChatSession,
  AIChatUserProfile,
  AIChatShortcut,
  InitialChatState
} from './AIBackfillChatShared';

export const useAIBackfillChatSessionState = () => {
  const [initialState] = useState<InitialChatState>(() => {
    const state = loadInitialChatState(getLocalDateStr);
    if (!aiChatStorageService.isReady()) {
      return state;
    }

    const hydratedSessions = normalizePersistedSessions(
      aiChatStorageService.getSessions(),
      state.personas,
      getLocalDateStr
    );
    const hydratedActiveSessionId = hydratedSessions.some((session) => session.id === state.activeSessionId)
      ? state.activeSessionId
      : hydratedSessions[0]?.id || state.activeSessionId;

    return {
      ...state,
      sessions: hydratedSessions,
      activeSessionId: hydratedActiveSessionId
    };
  });
  const [personas, setPersonas] = useState<AIChatPersona[]>(initialState.personas);
  const [customPromptBlocks, setCustomPromptBlocks] = useState<AIChatCustomPromptBlock[]>(initialState.customPromptBlocks);
  const [shortcuts, setShortcuts] = useState<AIChatShortcut[]>(initialState.shortcuts);
  const [sessions, setSessions] = useState<AIChatSession[]>(initialState.sessions);
  const [isChatStorageReady, setIsChatStorageReady] = useState(() => aiChatStorageService.isReady());
  const isChatStorageHydratingRef = useRef(false);
  const [activeSessionId, setActiveSessionId] = useState(initialState.activeSessionId);
  const [debugMode, setDebugMode] = useState(initialState.debugMode);
  const [userProfile, setUserProfile] = useState<AIChatUserProfile>(initialState.userProfile);
  const [chatSyncEnabled, setChatSyncEnabled] = useState(() => localStorage.getItem(CHAT_SYNC_ENABLED_KEY) !== 'false');

  return {
    initialState,
    personas, setPersonas,
    customPromptBlocks, setCustomPromptBlocks,
    shortcuts, setShortcuts,
    sessions, setSessions,
    isChatStorageReady, setIsChatStorageReady,
    isChatStorageHydratingRef,
    activeSessionId, setActiveSessionId,
    debugMode, setDebugMode,
    userProfile, setUserProfile,
    chatSyncEnabled, setChatSyncEnabled
  };
};
