/**
 * @file assistantBackupService.test.ts
 * @input Mocked AI storage and unified AI backup payloads
 * @output Regression coverage for AI persona, custom prompt block, and memory backup and live restore notifications
 * @pos Test (AI Backup)
 * @description Verifies that global AI chat state round-trips through the main backup and notifies mounted chat interfaces after restore.
 * @updated 2026-09-03: Added persona and long-term memory cloud-sync backup and restore regression coverage.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false)
  }
}));

vi.mock('../plugins/AssistantAgentPlugin', () => ({
  default: {
    syncNativeAIConfig: vi.fn()
  }
}));

vi.mock('../components/ai-chat/AIBackfillChatInitialization', () => ({
  ACTIVE_SESSION_KEY: 'test_active_session',
  CHAT_CUSTOM_PROMPT_BLOCKS_KEY: 'test_custom_prompt_blocks',
  CHAT_PERSONAS_KEY: 'test_personas',
  CHAT_SESSIONS_KEY: 'test_sessions',
  DEBUG_MODE_KEY: 'test_debug_mode',
  USER_PROFILE_KEY: 'test_user_profile'
}));

vi.mock('./aiService', () => ({
  aiService: {
    getCurrentPreset: vi.fn(() => ({
      id: 'preset-1',
      name: 'Preset',
      config: { provider: 'openai', apiKey: 'secret', modelName: 'model-1' }
    })),
    getPresets: vi.fn(() => [{
      id: 'preset-1',
      name: 'Preset',
      config: { provider: 'openai', apiKey: 'secret', modelName: 'model-1' }
    }])
  }
}));

vi.mock('./assistantAgentConfigService', () => ({
  assistantAgentConfigService: {
    getConfig: vi.fn(() => ({})),
    saveConfig: vi.fn()
  }
}));

vi.mock('./assistantMemoryService', () => ({
  assistantMemoryService: {
    getMemory: vi.fn(() => ({})),
    saveMemory: vi.fn()
  }
}));

vi.mock('./assistantLetterService', () => ({
  assistantLetterService: {
    listLetters: vi.fn(() => []),
    replaceLetters: vi.fn()
  }
}));

vi.mock('./assistantOrchestratorService', () => ({
  assistantOrchestratorService: {
    getAssistantDecisionEventName: vi.fn(() => 'test:assistant-updated'),
    getBackgroundCallHistoryStorageKey: vi.fn(() => 'test_background_history'),
    listBackgroundCallHistory: vi.fn(() => [])
  }
}));

vi.mock('./assistantReminderQueueService', () => ({
  assistantReminderQueueService: {
    listReminders: vi.fn(() => []),
    saveReminders: vi.fn()
  }
}));

vi.mock('./assistantScheduledTaskService', () => ({
  assistantScheduledTaskService: {
    listTasks: vi.fn(() => []),
    saveTasks: vi.fn(),
    syncScheduledTaskReminders: vi.fn()
  }
}));

vi.mock('./dreamService', () => ({
  dreamService: {
    getState: vi.fn(() => ({})),
    saveState: vi.fn()
  }
}));

import {
  ASSISTANT_CHAT_RESTORED_EVENT,
  type AssistantChatRestoredDetail
} from '../utils/aiBackupChange';
import { assistantMemoryService } from './assistantMemoryService';
import { assistantBackupService } from './assistantBackupService';

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
};

describe('assistantBackupService AI chat state', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    Object.defineProperty(globalThis, 'window', {
      value: new EventTarget(),
      configurable: true
    });
    vi.mocked(assistantMemoryService.getMemory).mockReset().mockReturnValue({} as any);
    vi.mocked(assistantMemoryService.saveMemory).mockReset();
  });

  it('includes every global custom prompt block in the unified backup payload', () => {
    const blocks = [
      { id: 'block-1', title: 'Language', content: 'Reply in Chinese.', enabled: true },
      { id: 'block-2', title: 'Format', content: 'Keep replies concise.', enabled: false }
    ];
    localStorage.setItem('test_custom_prompt_blocks', JSON.stringify(blocks));

    const payload = assistantBackupService.buildBackupPayload();

    expect(payload.chat.customPromptBlocks).toEqual(blocks);
  });

  it('includes personas and long-term memory in the unified backup payload', () => {
    const personas = [{ id: 'persona-1', name: 'Cloud persona' }];
    const memory = { version: 1, profileMemory: ['Prefers concise answers'] };
    localStorage.setItem('test_personas', JSON.stringify(personas));
    vi.mocked(assistantMemoryService.getMemory).mockReturnValue(memory as any);

    const payload = assistantBackupService.buildBackupPayload();

    expect(payload.chat.personas).toEqual(personas);
    expect(payload.assistant.memory).toEqual(memory);
  });

  it('restores prompt blocks and emits the live chat restore event', async () => {
    const blocks = [
      { id: 'block-cloud', title: 'Cloud', content: 'Restored content.', enabled: true }
    ];
    const restoredEvent = vi.fn<(event: Event) => void>();
    window.addEventListener(ASSISTANT_CHAT_RESTORED_EVENT, restoredEvent);

    const personas = [{ id: 'persona-cloud', name: 'Cloud persona' }];
    const memory = { version: 1, profileMemory: ['Cloud memory'] };
    vi.mocked(assistantMemoryService.getMemory).mockReturnValue(memory as any);
    await assistantBackupService.applyBackupPayload({
      chat: {
        customPromptBlocks: blocks,
        personas
      },
      assistant: { memory }
    });

    expect(JSON.parse(localStorage.getItem('test_custom_prompt_blocks') || '[]')).toEqual(blocks);
    expect(restoredEvent).toHaveBeenCalledTimes(1);
    const event = restoredEvent.mock.calls[0][0] as CustomEvent<AssistantChatRestoredDetail>;
    expect(event.detail.customPromptBlocks).toEqual(blocks);
    expect(event.detail.personas).toEqual(personas);
    expect(event.detail.memory).toEqual(memory);
    expect(assistantMemoryService.saveMemory).toHaveBeenCalledWith(memory);
  });

  it('preserves local persona and prompt state when an older backup omits those fields', async () => {
    const localPersonas = [{ id: 'local-persona', name: 'Local persona' }];
    const localBlocks = [{ id: 'local-block', title: 'Local', content: 'Keep me.', enabled: true }];
    localStorage.setItem('test_personas', JSON.stringify(localPersonas));
    localStorage.setItem('test_custom_prompt_blocks', JSON.stringify(localBlocks));
    const restoredEvent = vi.fn<(event: Event) => void>();
    window.addEventListener(ASSISTANT_CHAT_RESTORED_EVENT, restoredEvent);

    await assistantBackupService.applyBackupPayload({ chat: { sessions: [] } });

    expect(JSON.parse(localStorage.getItem('test_personas') || '[]')).toEqual(localPersonas);
    expect(JSON.parse(localStorage.getItem('test_custom_prompt_blocks') || '[]')).toEqual(localBlocks);
    const event = restoredEvent.mock.calls[0][0] as CustomEvent<AssistantChatRestoredDetail>;
    expect(event.detail).not.toHaveProperty('personas');
    expect(event.detail).not.toHaveProperty('customPromptBlocks');
  });
});
