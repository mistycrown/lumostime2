/**
 * @file dailyReviewTemplateService.test.ts
 * @input Daily-review template service public methods
 * @output Regression coverage for the ordinary-chat daily review writeback flow
 * @description Verifies that daily-review writeback prompts come from the TS constants and that strict tool-call parsing keeps the expected local date/mode.
 * @updated 2026-05-14: Added initial coverage for the new ordinary-chat `日报` writeback service.
 */

import { describe, expect, it } from 'vitest';
import { DAILY_REVIEW_TEMPLATE_PROMPTS } from '../constants/dailyReviewTemplatePrompts';
import { dailyReviewTemplateService } from './dailyReviewTemplateService';

describe('dailyReviewTemplateService', () => {
  it('uses the TS prompt constants for daily review narrative writeback prompts', async () => {
    const result = await dailyReviewTemplateService.buildNarrativeWritebackPrompts({
      dayDataText: 'date: 2026-05-14',
      conversationSummary: '用户希望把今天写得更具体一点。',
      mergeMode: 'overwrite'
    });

    expect(result.systemPrompt).toContain(DAILY_REVIEW_TEMPLATE_PROMPTS.writebackCommonPrompt);
    expect(result.userPrompt).toContain('date: 2026-05-14');
    expect(result.userPrompt).toContain('mode: overwrite');
  });

  it('parses strict daily review tool-call responses while preserving the expected local target', () => {
    const result = dailyReviewTemplateService.parseNarrativeToolCallResponse(JSON.stringify({
      assistantReply: '今天的主线我帮你收束好了。',
      toolCall: {
        toolName: 'write_daily_review_narrative',
        args: {
          date: '1999-01-01',
          mode: 'create',
          narrativeMarkdown: '# 标题\n\n正文\n\n> 金句'
        }
      }
    }), '2026-05-14', 'overwrite');

    expect(result).toEqual({
      assistantReply: '今天的主线我帮你收束好了。',
      toolCall: {
        toolName: 'write_daily_review_narrative',
        args: {
          date: '2026-05-14',
          mode: 'overwrite',
          narrativeMarkdown: '# 标题\n\n正文\n\n> 金句'
        }
      }
    });
  });
});
