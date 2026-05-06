import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assistantPromptService } from './assistantPromptService';

describe('assistantPromptService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn().mockRejectedValue(new Error('offline')),
      configurable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'fetch', {
      value: originalFetch,
      configurable: true
    });
  });

  it('fallback foreground mode prompt includes explicit intent recognition guidance', async () => {
    const prompt = await assistantPromptService.getForegroundModePrompt();

    expect(prompt).toContain('Core operating sequence:');
    expect(prompt).toContain('Intent taxonomy:');
    expect(prompt).toContain('daily_planning');
    expect(prompt).toContain('Use the intent taxonomy only for internal routing.');
    expect(prompt).toContain('Behavior by intent:');
  });

  it('fallback foreground tools prompt includes intent-to-action routing guidance', async () => {
    const prompt = await assistantPromptService.getForegroundToolsPrompt();

    expect(prompt).toContain('Intent-to-action routing:');
    expect(prompt).toContain('Mixed-intent rules:');
    expect(prompt).toContain('Hard safety rules:');
    expect(prompt).toContain('Never invent ids.');
  });
});
