import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('assistantPromptService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'fetch', {
      value: originalFetch,
      configurable: true
    });
  });

  it('loads prompt content from the public assistant markdown asset', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '前台用户消息模式（FOREGROUND USER MESSAGE MODE）'
      }),
      configurable: true
    });

    const { assistantPromptService } = await import('./assistantPromptService');
    const prompt = await assistantPromptService.getForegroundModePrompt();

    expect(prompt).toBe('前台用户消息模式（FOREGROUND USER MESSAGE MODE）');
    expect(globalThis.fetch).toHaveBeenCalledWith('/assistant/foreground-mode.md', { cache: 'no-cache' });
  });

  it('caches loaded prompt assets after the first successful fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '你是 LumosTime 里的长期陪伴型助手。'
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true
    });

    const { assistantPromptService } = await import('./assistantPromptService');
    const first = await assistantPromptService.getAssistantBasePrompt();
    const second = await assistantPromptService.getAssistantBasePrompt();

    expect(first).toBe('你是 LumosTime 里的长期陪伴型助手。');
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when prompt asset fetch fails instead of falling back', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockRejectedValue(new Error('offline')),
      configurable: true
    });

    const { assistantPromptService } = await import('./assistantPromptService');

    await expect(assistantPromptService.getMemoryRulesPrompt()).rejects.toThrow(
      '[assistantPromptService] Failed to load prompt asset /assistant/memory-rules.md: offline'
    );
  });

  it('throws when prompt asset returns a non-ok response', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }),
      configurable: true
    });

    const { assistantPromptService } = await import('./assistantPromptService');

    await expect(assistantPromptService.getBackgroundModePrompt()).rejects.toThrow(
      '[assistantPromptService] Failed to load prompt asset /assistant/background-mode.md: HTTP 404 Not Found'
    );
  });

  it('throws when prompt asset is empty', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '   '
      }),
      configurable: true
    });

    const { assistantPromptService } = await import('./assistantPromptService');

    await expect(assistantPromptService.getForegroundToolsPrompt()).rejects.toThrow(
      '[assistantPromptService] Failed to load prompt asset /assistant/foreground-tools.md: asset is empty'
    );
  });
});
