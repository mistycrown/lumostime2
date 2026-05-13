/**
 * @file monthlyReviewTemplateService.test.ts
 * @input Monthly-review template service public methods
 * @output Regression coverage for TS-backed monthly-review prompts and strict method selection
 * @description Verifies that monthly-review chat/writeback prompts come from the TS constants and that only the four supported methods are accepted.
 * @updated 2026-05-13: Added initial coverage for the new monthly-review template service.
 */

import { describe, expect, it } from 'vitest';
import { MONTHLY_REVIEW_TEMPLATE_PROMPTS } from '../constants/monthlyReviewTemplatePrompts';
import { monthlyReviewTemplateService } from './monthlyReviewTemplateService';

describe('monthlyReviewTemplateService', () => {
  it('uses the TS prompt constants for monthly review chat prompts', async () => {
    const result = await monthlyReviewTemplateService.buildChatPrompts({
      monthDataText: 'monthStartDate: 2026-05-01\nmonthEndDate: 2026-05-31',
      userMessage: '帮我看看这个月哪里最值得复盘',
      methodId: 'systems'
    });

    expect(result.systemPrompt).toContain(MONTHLY_REVIEW_TEMPLATE_PROMPTS.chatCommonPrompt);
    expect(result.systemPrompt).toContain(MONTHLY_REVIEW_TEMPLATE_PROMPTS.chatMethodPrompts.systems);
    expect(result.systemPrompt).toContain('=== Monthly Review Method Prompt (系统复盘) ===');
  });

  it('uses the TS prompt constants for monthly review narrative writeback prompts', async () => {
    const result = await monthlyReviewTemplateService.buildNarrativeWritebackPrompts({
      monthDataText: 'monthStartDate: 2026-05-01\nmonthEndDate: 2026-05-31',
      conversationSummary: '用户希望把这个月写得更诚实一点。',
      mergeMode: 'overwrite'
    });

    expect(result.systemPrompt).toContain(MONTHLY_REVIEW_TEMPLATE_PROMPTS.writebackCommonPrompt);
    expect(result.userPrompt).toContain('monthStartDate: 2026-05-01');
    expect(result.userPrompt).toContain('monthEndDate: 2026-05-31');
  });

  it('parses month selection and only accepts the four supported review methods', () => {
    const selection = monthlyReviewTemplateService.parseMonthSelectionInput('20260513', new Date('2026-06-10T12:00:00'));
    expect(selection).toEqual({
      monthStartDate: '2026-05-01',
      monthEndDate: '2026-05-31',
      selectedRangeLabel: 'custom_date'
    });

    expect(monthlyReviewTemplateService.parseMethodSelectionInput('PDCA')).toBe('pdca');
    expect(monthlyReviewTemplateService.parseMethodSelectionInput('系统复盘')).toBe('systems');
    expect(monthlyReviewTemplateService.parseMethodSelectionInput('CBT')).toBe('cbt');
    expect(monthlyReviewTemplateService.parseMethodSelectionInput('叙事疗法')).toBe('narrative');
    expect(monthlyReviewTemplateService.parseMethodSelectionInput('普通聊天')).toBeNull();
  });
});
