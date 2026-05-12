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

  it('fallback foreground tools prompt prefers a small lead time for punctual attendance reminders', async () => {
    const prompt = await assistantPromptService.getForegroundToolsPrompt();

    expect(prompt).toContain('punctual attendance event');
    expect(prompt).toContain('use 5 minutes early as the default');
  });

  it('fallback foreground tools prompt keeps reminder text free of relative time wording', async () => {
    const prompt = await assistantPromptService.getForegroundToolsPrompt();

    expect(prompt).toContain('must not include relative time adverbs such as today, tomorrow, or the day after tomorrow');
    expect(prompt).toContain('not "tomorrow remind the user to stretch"');
  });

  it('fallback foreground tools prompt encourages timed follow-up reminders for ongoing progress tracking', async () => {
    const prompt = await assistantPromptService.getForegroundToolsPrompt();

    expect(prompt).toContain('requires checking the user\'s later implementation and progress');
    expect(prompt).toContain('background agent can wake up and check status');
  });

  it('fallback memory rules keep fired-reminder cleanup in runtime instead of the model', async () => {
    const prompt = await assistantPromptService.getMemoryRulesPrompt();

    expect(prompt).toContain('the runtime will reconcile fired reminders after successful consumption');
    expect(prompt).not.toContain('Remove a reminder from activeReminders once it has already come due and this turn is reacting to it');
  });

  it('fallback memory rules keep active reminder text descriptive instead of relative-time based', async () => {
    const prompt = await assistantPromptService.getMemoryRulesPrompt();

    expect(prompt).toContain('keep reminder text purely descriptive');
    expect(prompt).toContain('not "tomorrow remind the user to submit the weekly report"');
    expect(prompt).toContain('requires continued attention to the user\'s execution or progress');
  });
});
