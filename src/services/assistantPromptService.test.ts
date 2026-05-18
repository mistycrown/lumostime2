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
    vi.unmock('../prompts/assistant/assistant-base.md?raw');
    vi.unmock('../prompts/assistant/background-mode.md?raw');
    vi.unmock('../prompts/assistant/foreground-mode.md?raw');
    vi.unmock('../prompts/assistant/foreground-tools.md?raw');
    vi.unmock('../prompts/assistant/memory-rules.md?raw');
  });

  it('loads prompt content from bundled assistant markdown sources', async () => {
    const { assistantPromptService } = await import('./assistantPromptService');
    const prompt = await assistantPromptService.getForegroundModePrompt();

    expect(prompt).toContain('# 前台用户消息模式');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('does not depend on runtime fetch availability', async () => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockRejectedValue(new Error('should not be called')),
      configurable: true
    });

    const { assistantPromptService } = await import('./assistantPromptService');
    const first = await assistantPromptService.getAssistantBasePrompt();
    const second = await assistantPromptService.getAssistantBasePrompt();

    expect(first).toContain('LumosTime');
    expect(second).toBe(first);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('throws when a bundled prompt asset is empty', async () => {
    vi.doMock('../prompts/assistant/foreground-tools.md?raw', () => ({
      default: '   '
    }));

    const { assistantPromptService } = await import('./assistantPromptService');

    await expect(assistantPromptService.getForegroundToolsPrompt()).rejects.toThrow(
      '[assistantPromptService] Failed to load bundled prompt src/prompts/assistant/foreground-tools.md: asset is empty'
    );
  });
});
