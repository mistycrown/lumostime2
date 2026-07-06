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

const createJsonTextResponse = (payload: unknown) => {
  const text = JSON.stringify(payload);
  return {
    ok: true,
    status: 200,
    text: async () => text,
    json: async () => JSON.parse(text)
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
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'ok',
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
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.toolCalls).toBeUndefined();
  });

  it('keeps quick create_todo tool calls for the reserved 小事 bucket without linkedActivityId', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'ok',
              memoryAction: 'no_update',
              toolCalls: [{
                toolName: 'create_todo',
                args: {
                  title: '取快递',
                  categoryId: '__virtual_quick__',
                  kind: 'quick',
                  scheduledDate: '2026-05-15'
                }
              }]
            })
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.toolCalls).toEqual([{
      toolName: 'create_todo',
      args: {
        title: '取快递',
        categoryId: '__virtual_quick__',
        kind: 'quick',
        scheduledDate: '2026-05-15'
      }
    }]);
  });

  it('keeps reserved 未来 create_todo tool calls when linkedActivityId is present', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'ok',
              memoryAction: 'no_update',
              toolCalls: [{
                toolName: 'create_todo',
                args: {
                  title: '系统梳理博士申请材料',
                  categoryId: '__virtual_future__',
                  kind: 'project',
                  linkedCategoryId: 'study',
                  linkedActivityId: 'writing'
                }
              }]
            })
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.toolCalls).toEqual([{
      toolName: 'create_todo',
      args: {
        title: '系统梳理博士申请材料',
        categoryId: '__virtual_future__',
        kind: 'project',
        linkedCategoryId: 'study',
        linkedActivityId: 'writing'
      }
    }]);
  });

  it('keeps nested create_todo subtasks inside the same normalized tool call', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'ok',
              memoryAction: 'no_update',
              toolCalls: [{
                toolName: 'create_todo',
                args: {
                  title: 'Finish paper revision',
                  categoryId: 'project-general',
                  kind: 'project',
                  linkedCategoryId: 'study',
                  linkedActivityId: 'writing',
                  subtasks: [
                    {
                      title: 'Draft outline',
                      note: 'Focus on intro',
                      scheduledDate: '2026-05-19'
                    },
                    {
                      title: '   '
                    }
                  ]
                }
              }]
            })
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.toolCalls).toEqual([{
      toolName: 'create_todo',
      args: {
        title: 'Finish paper revision',
        categoryId: 'project-general',
        kind: 'project',
        linkedCategoryId: 'study',
        linkedActivityId: 'writing',
        subtasks: [{
          title: 'Draft outline',
          note: 'Focus on intro',
          scheduledDate: '2026-05-19'
        }]
      }
    }]);
  });

  it('keeps principle-library create tool calls after normalization', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'ok',
              memoryAction: 'no_update',
              toolCalls: [{
                toolName: 'create_principle',
                args: {
                  title: '先降低行动颗粒度',
                  frontText: '卡住时先做一个小到不会害怕的动作。',
                  backText: '适用于拖延、压力过载和启动困难。'
                }
              }]
            })
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.toolCalls).toEqual([{
      toolName: 'create_principle',
      args: {
        title: '先降低行动颗粒度',
        frontText: '卡住时先做一个小到不会害怕的动作。',
        backText: '适用于拖延、压力过载和启动困难。'
      }
    }]);
  });

  it('keeps self-belief create tool calls and strips blank descriptions', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'ok',
              memoryAction: 'no_update',
              toolCalls: [{
                toolName: 'create_self_belief',
                args: {
                  title: '我是一个学习能力很强的人',
                  descriptions: [
                    {
                      text: '两周学完基础编程并做出第一个工具。',
                      date: '2026-07-06'
                    },
                    {
                      text: '   '
                    }
                  ]
                }
              }]
            })
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.toolCalls).toEqual([{
      toolName: 'create_self_belief',
      args: {
        title: '我是一个学习能力很强的人',
        descriptions: [{
          text: '两周学完基础编程并做出第一个工具。',
          date: '2026-07-06'
        }]
      }
    }]);
  });

  it('keeps principle and self-belief update tool calls when they include existing ids', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'ok',
              memoryAction: 'no_update',
              toolCalls: [
                {
                  toolName: 'create_principle',
                  args: {
                    id: 'principle-1',
                    descriptions: [{
                      text: '新增一个适用场景。',
                      date: '2026-07-06'
                    }]
                  }
                },
                {
                  toolName: 'create_self_belief',
                  args: {
                    id: 'belief-1',
                    descriptions: [{
                      text: '新增一个自我认知描述。',
                      date: '2026-07-06'
                    }]
                  }
                }
              ]
            })
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.toolCalls).toEqual([
      {
        toolName: 'create_principle',
        args: {
          id: 'principle-1',
          descriptions: [{
            text: '新增一个适用场景。',
            date: '2026-07-06'
          }]
        }
      },
      {
        toolName: 'create_self_belief',
        args: {
          id: 'belief-1',
          descriptions: [{
            text: '新增一个自我认知描述。',
            date: '2026-07-06'
          }]
        }
      }
    ]);
  });

  it('treats empty unified-turn content as a failed decision instead of a silent success', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: ''
          }
        }]
      })),
      configurable: true
    });

    await expect(aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'background',
      systemPrompt: 'system',
      userPrompt: 'user'
    })).rejects.toThrow('AI returned no assistant decision.');
  });

  it('adds provider-aware prompt cache hints and captures cached-token metrics from OpenAI-compatible responses', async () => {
    localStorage.setItem('lumostime_ai_config', JSON.stringify({
      provider: 'openai',
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      modelName: 'test-model'
    }));

    const fetchSpy = vi.fn().mockResolvedValue(createJsonTextResponse({
        usage: {
          prompt_tokens_details: {
            cached_tokens: 512
          }
        },
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'cache hit',
              memoryAction: 'no_update'
            })
          }
        }]
      }));

    Object.defineProperty(globalThis, 'fetch', {
      value: fetchSpy,
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: '=== Stable ===\nshared prefix\n=== Volatile State Anchors ===\ncurrent time',
      userPrompt: '=== Conversation Context ===\nshared thread\n=== Trigger ===\nright now',
      cacheHint: {
        keySeed: 'shared-prefix',
        scope: 'assistant_unified_turn'
      }
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as { body?: string } | undefined;
    const requestBody = requestInit?.body ? JSON.parse(requestInit.body) : {};

    expect(requestBody.prompt_cache_key).toContain('lumostime:openai:assistant_unified_turn:test-model:');
    expect(result.debug.cache).toEqual({
      providerFamily: 'openai',
      strategy: 'prompt_cache_key',
      key: requestBody.prompt_cache_key,
      metrics: {
        cachedTokens: 512
      }
    });
  });

  it('adds explicit cache_control blocks for DashScope-compatible prompts and reads cache creation metrics', async () => {
    localStorage.setItem('lumostime_ai_config', JSON.stringify({
      provider: 'openai',
      apiKey: 'test-key',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      modelName: 'qwen-plus'
    }));

    const fetchSpy = vi.fn().mockResolvedValue(createJsonTextResponse({
        usage: {
          prompt_tokens_details: {
            cached_tokens: 256,
            cache_creation_input_tokens: 1024
          }
        },
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'dashscope cache',
              memoryAction: 'no_update'
            })
          }
        }]
      }));

    Object.defineProperty(globalThis, 'fetch', {
      value: fetchSpy,
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system prompt',
      userPrompt: '=== Conversation Context ===\nshared thread\n=== Trigger ===\nturn-specific trigger',
      cacheHint: {
        keySeed: 'shared-prefix',
        scope: 'assistant_unified_turn'
      }
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as { body?: string } | undefined;
    const requestBody = requestInit?.body ? JSON.parse(requestInit.body) : {};
    const userMessage = requestBody.messages?.[requestBody.messages.length - 1];

    expect(Array.isArray(userMessage?.content)).toBe(true);
    expect(userMessage.content[0]).toMatchObject({
      type: 'text',
      text: '=== Conversation Context ===\nshared thread',
      cache_control: { type: 'ephemeral' }
    });
    expect(result.debug.cache).toMatchObject({
      providerFamily: 'dashscope',
      strategy: 'explicit_cache_control',
      metrics: {
        cachedTokens: 256,
        cacheCreationInputTokens: 1024
      }
    });
    expect(result.debug.cache?.key).toContain('lumostime:dashscope:assistant_unified_turn:qwen-plus:');
  });

  it('adds top-level cache_control for OpenRouter Anthropic models', async () => {
    localStorage.setItem('lumostime_ai_config', JSON.stringify({
      provider: 'openai',
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      modelName: 'anthropic/claude-3.7-sonnet'
    }));

    const fetchSpy = vi.fn().mockResolvedValue(createJsonTextResponse({
        usage: {
          prompt_tokens_details: {
            cache_write_tokens: 2048
          }
        },
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'openrouter cache',
              memoryAction: 'no_update'
            })
          }
        }]
      }));

    Object.defineProperty(globalThis, 'fetch', {
      value: fetchSpy,
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
      cacheHint: {
        keySeed: 'shared-prefix',
        scope: 'assistant_unified_turn'
      }
    });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as { body?: string } | undefined;
    const requestBody = requestInit?.body ? JSON.parse(requestInit.body) : {};

    expect(requestBody.cache_control).toEqual({ type: 'ephemeral' });
    expect(result.debug.cache).toMatchObject({
      providerFamily: 'openrouter',
      strategy: 'top_level_cache_control',
      metrics: {
        cacheWriteTokens: 2048
      }
    });
    expect(result.debug.cache?.key).toContain('lumostime:openrouter:assistant_unified_turn:anthropic/claude-3.7-sonnet:');
  });

  it('extracts reasoning_content from OpenAI-compatible unified-turn responses', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              outcome: 'reply',
              assistantReply: 'final answer',
              memoryAction: 'no_update'
            }),
            reasoning_content: 'step one\nstep two'
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.reasoning).toEqual({
      parts: [{
        text: 'step one\nstep two'
      }],
      providerLabel: 'unknown'
    });
  });

  it('extracts Gemini thought parts into normalized reasoning summaries', async () => {
    localStorage.setItem('lumostime_ai_config', JSON.stringify({
      provider: 'gemini',
      apiKey: 'test-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      modelName: 'gemini-2.5-flash'
    }));

    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                outcome: 'reply',
                assistantReply: 'gemini answer',
                memoryAction: 'no_update'
              })
            }, {
              text: 'first thought',
              thought: true
            }, {
              text: 'second thought',
              type: 'reasoning'
            }]
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestAssistantUnifiedTurnWithDebug({
      mode: 'foreground',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(result.output.reasoning).toEqual({
      parts: [
        { text: 'first thought' },
        { text: 'second thought' }
      ],
      providerLabel: 'gemini'
    });
  });

  it('passes reasoning metadata through structured JSON normalization helpers', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue(createJsonTextResponse({
        choices: [{
          message: {
            content: JSON.stringify({
              assistantReply: 'structured answer'
            }),
            reasoning_content: 'structured step one\nstructured step two'
          }
        }]
      })),
      configurable: true
    });

    const result = await aiService.requestStructuredJsonWithDebug({
      systemPrompt: 'system',
      userPrompt: 'user',
      normalizeResult: (rawValue, meta) => ({
        ...rawValue,
        ...(meta?.reasoning ? { reasoning: meta.reasoning } : {})
      })
    });

    expect(result.result).toMatchObject({
      assistantReply: 'structured answer',
      reasoning: {
        parts: [{
          text: 'structured step one\nstructured step two'
        }],
        providerLabel: 'unknown'
      }
    });
  });
});

describe('aiService preset storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    localStorage.setItem('lumostime_ai_config', JSON.stringify({
      provider: 'openai',
      apiKey: 'default-key',
      baseUrl: 'https://api.openai.com/v1',
      modelName: 'gpt-4o-mini'
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('migrates legacy single-config storage into the default preset and keeps extra legacy profiles', () => {
    localStorage.setItem('lumostime_ai_profiles', JSON.stringify({
      deepseek: {
        provider: 'openai',
        apiKey: 'deepseek-key',
        baseUrl: 'https://api.deepseek.com',
        modelName: 'deepseek-chat'
      }
    }));

    const presets = aiService.getPresets();
    const currentPreset = aiService.getCurrentPreset();

    expect(currentPreset.id).toBe('default');
    expect(currentPreset.name).toBe('默认预设');
    expect(currentPreset.config).toEqual({
      provider: 'openai',
      apiKey: 'default-key',
      baseUrl: 'https://api.openai.com/v1',
      modelName: 'gpt-4o-mini'
    });
    expect(presets.map((preset) => preset.name)).toEqual(expect.arrayContaining(['默认预设', 'DeepSeek']));
  });

  it('creates, updates, switches, and deletes custom presets while syncing the current config', () => {
    const createdPreset = aiService.createPreset('Gemini 备用', {
      provider: 'gemini',
      apiKey: 'gemini-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      modelName: 'gemini-2.5-flash'
    });

    expect(aiService.getCurrentPresetId()).toBe(createdPreset.id);
    expect(aiService.getConfig()).toEqual(createdPreset.config);

    const renamedPreset = aiService.updatePreset(createdPreset.id, {
      name: 'Gemini 工作流'
    });
    expect(renamedPreset?.name).toBe('Gemini 工作流');

    aiService.saveConfig({
      provider: 'gemini',
      apiKey: 'gemini-key-2',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      modelName: 'gemini-2.5-pro'
    });

    expect(aiService.getCurrentPreset().config).toEqual({
      provider: 'gemini',
      apiKey: 'gemini-key-2',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      modelName: 'gemini-2.5-pro'
    });

    aiService.setCurrentPreset(createdPreset.id);
    const deleteResult = aiService.deletePreset(createdPreset.id);

    expect(deleteResult.deleted).toBe(true);
    expect(deleteResult.currentPreset.id).toBe('default');
    expect(aiService.getCurrentPresetId()).toBe('default');
    expect(aiService.getPresets().some((preset) => preset.id === createdPreset.id)).toBe(false);
  });
});
