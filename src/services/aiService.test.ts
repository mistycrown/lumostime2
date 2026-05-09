import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiService } from './aiService';

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createLocalStorageMock = (): LocalStorageMock => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
};

describe('aiService unified turn normalization', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    localStorage.setItem('lumostime_ai_config', JSON.stringify({
      provider: 'openai',
      apiKey: 'test-key',
      baseUrl: 'https://example.test/v1',
      modelName: 'test-model'
    }));
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'fetch', {
      value: originalFetch,
      configurable: true
    });
    vi.restoreAllMocks();
  });

  it('drops create_todo tool calls that omit linkedActivityId', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                outcome: 'reply',
                assistantReply: '好的',
                memoryAction: 'no_update',
                toolCalls: [{
                  toolName: 'create_todo',
                  args: {
                    title: 'Read paper',
                    categoryId: 'todo-general'
                  }
                }]
              })
            }
          }]
        })
      }),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.toolCalls).toBeUndefined();
  });

  it('treats empty unified-turn content as a failed decision instead of a silent success', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: ''
            }
          }]
        })
      }),
      configurable: true
    });

    await expect(aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'background',
      systemPrompt: 'system',
      userPrompt: 'user'
    })).rejects.toThrow('AI returned no assistant decision.');
  });
});
