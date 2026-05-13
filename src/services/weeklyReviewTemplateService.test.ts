/**
 * @file weeklyReviewTemplateService.test.ts
 * @input Weekly-review template service public methods
 * @output Regression coverage for TS-backed weekly-review prompts and strict method selection
 * @description Verifies that weekly-review chat/writeback prompts come from the TS constants and that only the four supported methods are accepted.
 * @updated 2026-05-13: Added coverage for the new TS prompt constants after removing markdown-backed prompt loading.
 */

import { describe, expect, it } from 'vitest';
import { WEEKLY_REVIEW_TEMPLATE_PROMPTS } from '../constants/weeklyReviewTemplatePrompts';
import { weeklyReviewTemplateService } from './weeklyReviewTemplateService';

describe('weeklyReviewTemplateService', () => {
  it('uses the TS prompt constants for weekly review chat prompts', async () => {
    const result = await weeklyReviewTemplateService.buildChatPrompts({
      weekDataText: 'weekStartDate: 2026-05-05\nweekEndDate: 2026-05-11',
      userMessage: '帮我看看这周哪里最值得复盘',
      methodId: 'systems'
    });

    expect(result.systemPrompt).toContain(WEEKLY_REVIEW_TEMPLATE_PROMPTS.chatCommonPrompt);
    expect(result.systemPrompt).toContain(WEEKLY_REVIEW_TEMPLATE_PROMPTS.chatMethodPrompts.systems);
    expect(result.systemPrompt).toContain('=== Weekly Review Method Prompt (系统复盘) ===');
  });

  it('uses the TS prompt constants for weekly review narrative writeback prompts', async () => {
    const result = await weeklyReviewTemplateService.buildNarrativeWritebackPrompts({
      weekDataText: 'weekStartDate: 2026-05-05\nweekEndDate: 2026-05-11',
      conversationSummary: '用户希望把这一周写得更诚实一点。',
      mergeMode: 'overwrite'
    });

    expect(result.systemPrompt).toContain(WEEKLY_REVIEW_TEMPLATE_PROMPTS.writebackCommonPrompt);
    expect(result.userPrompt).toContain('weekStartDate: 2026-05-05');
    expect(result.userPrompt).toContain('weekEndDate: 2026-05-11');
  });

  it('only accepts the four supported weekly review methods', () => {
    expect(weeklyReviewTemplateService.parseMethodSelectionInput('PDCA')).toBe('pdca');
    expect(weeklyReviewTemplateService.parseMethodSelectionInput('系统复盘')).toBe('systems');
    expect(weeklyReviewTemplateService.parseMethodSelectionInput('CBT')).toBe('cbt');
    expect(weeklyReviewTemplateService.parseMethodSelectionInput('叙事疗法')).toBe('narrative');
    expect(weeklyReviewTemplateService.parseMethodSelectionInput('普通聊天')).toBeNull();
  });
});
