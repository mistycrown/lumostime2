/**
 * @file assistantBackupService.ts
 * @input Local AI chat, assistant-agent, Dream, and preset storage state
 * @output Unified AI backup payloads plus restore helpers for export/import/cloud sync
 * @pos Service (AI Backup)
 * @description Centralizes all AI-related data that should travel inside the app's main backup JSON, while explicitly excluding API keys and preserving any compatible local keys during restore.
 * @updated 2026-05-17: Added unified AI backup export/restore helpers covering chat sessions, persona settings, background assistant state, Dream state, and sanitized AI presets.
 */

import { Capacitor } from '@capacitor/core';
import AssistantAgent from '../plugins/AssistantAgentPlugin';
import {
  ACTIVE_SESSION_KEY,
  CHAT_CUSTOM_PROMPT_BLOCKS_KEY,
  CHAT_PERSONAS_KEY,
  CHAT_SESSIONS_KEY,
  DEBUG_MODE_KEY,
  USER_PROFILE_KEY
} from '../components/ai-chat/AIBackfillChatInitialization';
import { aiService, type AIConfig, type AIPreset } from './aiService';
import { assistantAgentConfigService } from './assistantAgentConfigService';
import { assistantMemoryService } from './assistantMemoryService';
import { assistantOrchestratorService } from './assistantOrchestratorService';
import { assistantReminderQueueService } from './assistantReminderQueueService';
import { assistantScheduledTaskService } from './assistantScheduledTaskService';
import { dreamService } from './dreamService';

const AI_CONFIG_KEY = 'lumostime_ai_config';
const AI_PRESETS_KEY = 'lumostime_ai_presets';
const AI_CURRENT_PRESET_KEY = 'lumostime_ai_current_preset';

type SanitizedAIConfig = Omit<AIConfig, 'apiKey'>;

interface SanitizedAIPreset {
  id: string;
  name: string;
  config: SanitizedAIConfig;
}

interface AIBackupPresetState {
  presets: SanitizedAIPreset[];
  currentPresetId: string;
}

interface AIBackupChatState {
  sessions: unknown[];
  activeSessionId: string;
  personas: unknown[];
  customPromptBlocks: unknown[];
  debugMode: boolean;
  userProfile: unknown;
}

interface AIBackupAssistantState {
  agentConfig: unknown;
  memory: unknown;
  reminders: unknown[];
  scheduledTasks: unknown[];
  backgroundCallHistory: unknown[];
}

export interface AIBackupPayload {
  version: 1;
  exportedAt: string;
  chat: AIBackupChatState;
  presets: AIBackupPresetState;
  assistant: AIBackupAssistantState;
  dream: unknown;
}

const safeParseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error('[assistantBackupService] Failed to parse JSON', error);
    return fallback;
  }
};

const hasOwn = (value: unknown, key: string): boolean => (
  Boolean(value)
  && typeof value === 'object'
  && Object.prototype.hasOwnProperty.call(value, key)
);

const sanitizeAIConfig = (config: AIConfig): SanitizedAIConfig => ({
  provider: config.provider,
  ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
  modelName: config.modelName
});

const sanitizeAIPreset = (preset: AIPreset): SanitizedAIPreset => ({
  id: preset.id,
  name: preset.name,
  config: sanitizeAIConfig(preset.config)
});

const normalizeSanitizedAIConfig = (value: unknown): SanitizedAIConfig | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<SanitizedAIConfig>;
  const provider = candidate.provider === 'gemini' ? 'gemini' : candidate.provider === 'openai' ? 'openai' : '';
  const modelName = typeof candidate.modelName === 'string' ? candidate.modelName.trim() : '';
  const baseUrl = typeof candidate.baseUrl === 'string' ? candidate.baseUrl.trim() : '';
  if (!provider || !modelName) {
    return null;
  }

  return {
    provider,
    ...(baseUrl ? { baseUrl } : {}),
    modelName
  };
};

const normalizeSanitizedAIPreset = (value: unknown): SanitizedAIPreset | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<SanitizedAIPreset>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  const config = normalizeSanitizedAIConfig(candidate.config);
  if (!id || !name || !config) {
    return null;
  }

  return {
    id,
    name,
    config
  };
};

const readSanitizedPresetStateFromBackup = (value: unknown): AIBackupPresetState | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<AIBackupPresetState>;
  const presets = Array.isArray(candidate.presets)
    ? candidate.presets
      .map(normalizeSanitizedAIPreset)
      .filter((item): item is SanitizedAIPreset => Boolean(item))
    : [];
  const currentPresetId = typeof candidate.currentPresetId === 'string'
    ? candidate.currentPresetId.trim()
    : '';

  if (presets.length === 0) {
    return null;
  }

  return {
    presets,
    currentPresetId
  };
};

const restoreSanitizedPresetState = async (value: unknown): Promise<void> => {
  const incomingState = readSanitizedPresetStateFromBackup(value);
  if (!incomingState) {
    return;
  }

  const existingPresets = aiService.getPresets();
  const existingPresetMap = new Map(existingPresets.map((preset) => [preset.id, preset]));
  const nextPresets: AIPreset[] = incomingState.presets.map((preset) => {
    const existingPreset = existingPresetMap.get(preset.id);
    return {
      id: preset.id,
      name: preset.name,
      config: {
        provider: preset.config.provider,
        apiKey: existingPreset?.config.apiKey || '',
        ...(preset.config.baseUrl ? { baseUrl: preset.config.baseUrl } : {}),
        modelName: preset.config.modelName
      }
    };
  });
  const resolvedCurrentPresetId = nextPresets.some((preset) => preset.id === incomingState.currentPresetId)
    ? incomingState.currentPresetId
    : nextPresets[0].id;
  const currentPreset = nextPresets.find((preset) => preset.id === resolvedCurrentPresetId) || nextPresets[0];

  localStorage.setItem(AI_PRESETS_KEY, JSON.stringify(nextPresets));
  localStorage.setItem(AI_CURRENT_PRESET_KEY, resolvedCurrentPresetId);
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(currentPreset.config));

  if (Capacitor.isNativePlatform()) {
    try {
      await AssistantAgent.syncNativeAIConfig(currentPreset.config);
    } catch (error) {
      console.error('[assistantBackupService] Failed to sync restored native AI config', error);
    }
  }
};

const dispatchAssistantChatUpdated = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(assistantOrchestratorService.getAssistantDecisionEventName()));
};

export const assistantBackupService = {
  buildBackupPayload(): AIBackupPayload {
    const currentPreset = aiService.getCurrentPreset();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      chat: {
        sessions: safeParseJson<unknown[]>(localStorage.getItem(CHAT_SESSIONS_KEY), []),
        activeSessionId: localStorage.getItem(ACTIVE_SESSION_KEY) || '',
        personas: safeParseJson<unknown[]>(localStorage.getItem(CHAT_PERSONAS_KEY), []),
        customPromptBlocks: safeParseJson<unknown[]>(localStorage.getItem(CHAT_CUSTOM_PROMPT_BLOCKS_KEY), []),
        debugMode: localStorage.getItem(DEBUG_MODE_KEY) === 'true',
        userProfile: safeParseJson<unknown>(localStorage.getItem(USER_PROFILE_KEY), null)
      },
      presets: {
        presets: aiService.getPresets().map(sanitizeAIPreset),
        currentPresetId: currentPreset.id
      },
      assistant: {
        agentConfig: assistantAgentConfigService.getConfig(),
        memory: assistantMemoryService.getMemory(),
        reminders: assistantReminderQueueService.listReminders(),
        scheduledTasks: assistantScheduledTaskService.listTasks(),
        backgroundCallHistory: assistantOrchestratorService.listBackgroundCallHistory()
      },
      dream: dreamService.getState()
    };
  },

  async applyBackupPayload(value: unknown): Promise<void> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    const payload = value as Partial<AIBackupPayload>;

    if (payload.chat && typeof payload.chat === 'object') {
      const chat = payload.chat as Partial<AIBackupChatState>;
      if (hasOwn(chat, 'sessions')) {
        localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(Array.isArray(chat.sessions) ? chat.sessions : []));
      }
      if (hasOwn(chat, 'activeSessionId')) {
        const activeSessionId = typeof chat.activeSessionId === 'string' ? chat.activeSessionId.trim() : '';
        if (activeSessionId) {
          localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
        } else {
          localStorage.removeItem(ACTIVE_SESSION_KEY);
        }
      }
      if (hasOwn(chat, 'personas')) {
        localStorage.setItem(CHAT_PERSONAS_KEY, JSON.stringify(Array.isArray(chat.personas) ? chat.personas : []));
      }
      if (hasOwn(chat, 'customPromptBlocks')) {
        localStorage.setItem(
          CHAT_CUSTOM_PROMPT_BLOCKS_KEY,
          JSON.stringify(Array.isArray(chat.customPromptBlocks) ? chat.customPromptBlocks : [])
        );
      }
      if (hasOwn(chat, 'debugMode')) {
        localStorage.setItem(DEBUG_MODE_KEY, String(chat.debugMode === true));
      }
      if (hasOwn(chat, 'userProfile')) {
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(chat.userProfile ?? null));
      }
    }

    await restoreSanitizedPresetState(payload.presets);

    if (payload.assistant && typeof payload.assistant === 'object') {
      const assistant = payload.assistant as Partial<AIBackupAssistantState>;
      if (hasOwn(assistant, 'agentConfig') && assistant.agentConfig && typeof assistant.agentConfig === 'object') {
        assistantAgentConfigService.saveConfig(assistant.agentConfig);
      }
      if (hasOwn(assistant, 'memory') && assistant.memory && typeof assistant.memory === 'object') {
        assistantMemoryService.saveMemory(assistant.memory as any);
      }
      if (hasOwn(assistant, 'scheduledTasks')) {
        assistantScheduledTaskService.saveTasks(Array.isArray(assistant.scheduledTasks) ? assistant.scheduledTasks as any[] : []);
      }
      if (hasOwn(assistant, 'reminders')) {
        assistantReminderQueueService.saveReminders(Array.isArray(assistant.reminders) ? assistant.reminders as any[] : []);
      }
      if (hasOwn(assistant, 'scheduledTasks') || hasOwn(assistant, 'reminders')) {
        assistantScheduledTaskService.syncScheduledTaskReminders();
      }
      if (hasOwn(assistant, 'backgroundCallHistory')) {
        localStorage.setItem(
          assistantOrchestratorService.getBackgroundCallHistoryStorageKey(),
          JSON.stringify(Array.isArray(assistant.backgroundCallHistory) ? assistant.backgroundCallHistory : [])
        );
      }
    }

    if (hasOwn(payload, 'dream') && payload.dream && typeof payload.dream === 'object') {
      dreamService.saveState(payload.dream as any);
    }

    dispatchAssistantChatUpdated();
  }
};
