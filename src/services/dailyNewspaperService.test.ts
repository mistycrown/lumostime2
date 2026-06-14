/**
 * @file dailyNewspaperService.test.ts
 * @input Daily newspaper service public methods
 * @output Regression coverage for the ordinary-chat daily newspaper writeback flow
 * @description Verifies that strict newspaper tool-call parsing preserves the expected local date/mode and that daily newspaper prompts include the shared foreground context layers now used by the writeback flow.
 * @updated 2026-06-13: Added coverage for local daily-newspaper comment reply prompts, parsing, append behavior, and overwrite preservation.
 * @updated 2026-05-16: Added prompt-assembly coverage for base prompt, conversation summary, state context, memory snapshot, and Dream context in the daily newspaper writeback flow.
 * @updated 2026-05-16: Added initial coverage for the new ordinary-chat `小报` writeback service.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { assistantPromptService } from './assistantPromptService';
import { dailyNewspaperService } from './dailyNewspaperService';
import type { DailyNewspaper, DailyReview } from '../types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dailyNewspaperService', () => {
  it('builds strict daily newspaper prompts with shared foreground context sections', async () => {
    vi.spyOn(assistantPromptService, 'getAssistantBasePrompt').mockResolvedValue('BASE_PROMPT');

    const result = await dailyNewspaperService.buildWritebackPrompts({
      personaPrompt: 'Speak like an editor.',
      dayDataText: 'date: 2026-05-16',
      conversationSummary: 'User wants the newspaper to feel sharp and specific.',
      mergeMode: 'overwrite',
      stateContext: {
        currentDateTime: '2026-05-16 20:00',
        stateContextDate: '2026-05-16',
        currentLocalDate: '2026-05-16',
        currentWeekday: 'Friday',
        timelineSummaryForDate: '10:00-11:00 Writing',
        activeSessionSummary: 'Writing @Essay',
        reminderSummary: '20:30 Review notes'
      },
      memorySnapshot: {
        version: 1,
        updatedAt: '2026-05-16T20:00:00+08:00',
        profileMemory: ['Prefers concrete feedback'],
        preferenceMemory: ['Likes concise summaries'],
        activeReminders: [],
        recentDecisions: ['Ship the daily newspaper in editorial tone']
      },
      dreamContext: 'Dream topic: execution rhythm stays fragile after lunch.'
    });

    expect(result.systemPrompt).toContain('=== User Persona Prompt ===');
    expect(result.systemPrompt).toContain('=== Assistant Base Prompt ===');
    expect(result.systemPrompt).toContain('BASE_PROMPT');
    expect(result.systemPrompt).toContain('=== Daily Newspaper Writeback Prompt ===');
    expect(result.systemPrompt).toContain('write_daily_newspaper');
    expect(result.systemPrompt).toContain('=== Stable State Context ===');
    expect(result.systemPrompt).toContain('timelineSummaryForDate');
    expect(result.systemPrompt).toContain('=== Volatile State Anchors ===');
    expect(result.systemPrompt).toContain('currentDateTime');
    expect(result.systemPrompt).toContain('=== Memory Snapshot ===');
    expect(result.systemPrompt).toContain('Prefers concrete feedback');
    expect(result.systemPrompt).toContain('=== Dream Context ===');
    expect(result.systemPrompt).toContain('execution rhythm stays fragile after lunch');
    expect(result.userPrompt).toContain('=== Conversation Context ===');
    expect(result.userPrompt).toContain('User wants the newspaper to feel sharp and specific.');
    expect(result.userPrompt).toContain('date: 2026-05-16');
    expect(result.userPrompt).toContain('mode: overwrite');
  });

  it('parses strict daily newspaper tool-call responses while preserving expected target date and mode', () => {
    const result = dailyNewspaperService.parseWritebackResponse(JSON.stringify({
      assistantReply: 'I organized today\'s newspaper.',
      toolCalls: [],
      newspaperToolCall: {
        toolName: 'write_daily_newspaper',
        args: {
          date: '1999-01-01',
          mode: 'create',
          title: '1999-01-01 Daily Newspaper',
          overallComment: 'The day had a clear throughline.',
          annotations: [
            {
              logId: 'log-1',
              comment: 'This turn changed the pace of the day.'
            }
          ]
        }
      }
    }), '2026-05-16', 'overwrite');

    expect(result).toEqual({
      assistantReply: 'I organized today\'s newspaper.',
      toolCalls: [],
      newspaperToolCall: {
        toolName: 'write_daily_newspaper',
        args: {
          date: '2026-05-16',
          mode: 'overwrite',
          title: '1999-01-01 Daily Newspaper',
          overallComment: 'The day had a clear throughline.',
          annotations: [
            {
              logId: 'log-1',
              comment: 'This turn changed the pace of the day.'
            }
          ]
        }
      }
    });
  });

  it('builds strict comment reply prompts for a target newspaper annotation', async () => {
    vi.spyOn(assistantPromptService, 'getAssistantBasePrompt').mockResolvedValue('BASE_PROMPT');

    const newspaper: DailyNewspaper = {
      version: 1,
      date: '2026-06-13',
      title: 'A Day With Friction',
      assistantReply: 'I wrote the newspaper.',
      overallComment: 'The day bent around a difficult middle.',
      annotations: [{ logId: 'log-1', comment: 'This was the hinge point.' }],
      commentThreads: [{
        logId: 'log-1',
        messages: [{
          id: 'm-1',
          role: 'user',
          content: 'Why do you call it the hinge?',
          createdAt: 1000
        }],
        updatedAt: 1000
      }],
      updatedAt: 1000
    };

    const result = await dailyNewspaperService.buildCommentReplyPrompts({
      date: '2026-06-13',
      dayDataText: 'date: 2026-06-13\n- logId: log-1',
      newspaper,
      annotation: newspaper.annotations[0],
      threadMessages: newspaper.commentThreads![0].messages,
      userReply: 'Can you explain more?',
      personaPrompt: 'Be concrete.'
    });

    expect(result.systemPrompt).toContain('=== Daily Newspaper Comment Reply Prompt ===');
    expect(result.systemPrompt).toContain('BASE_PROMPT');
    expect(result.userPrompt).toContain('A Day With Friction');
    expect(result.userPrompt).toContain('This was the hinge point.');
    expect(result.userPrompt).toContain('Can you explain more?');
  });

  it('parses comment reply responses', () => {
    expect(dailyNewspaperService.parseCommentReplyResponse(JSON.stringify({
      assistantReply: 'Because that block changed the pace of the day.'
    }))).toEqual({
      assistantReply: 'Because that block changed the pace of the day.'
    });
  });

  it('appends local comment turns to the matching daily newspaper thread', () => {
    const review: DailyReview = {
      id: 'review-1',
      date: '2026-06-13',
      createdAt: 1000,
      updatedAt: 1000,
      answers: [],
      aiNewspaper: {
        version: 1,
        date: '2026-06-13',
        title: 'Daily',
        assistantReply: 'Done.',
        overallComment: 'A clear arc.',
        annotations: [{ logId: 'log-1', comment: 'This mattered.' }],
        updatedAt: 1000
      }
    };

    const result = dailyNewspaperService.appendDailyNewspaperCommentTurn(
      [review],
      'review-1',
      'log-1',
      'Why?',
      'Because it changed your next decision.',
      2000
    );

    expect(result[0].aiNewspaper?.commentThreads).toHaveLength(1);
    expect(result[0].aiNewspaper?.commentThreads?.[0].messages).toMatchObject([
      { role: 'user', content: 'Why?', createdAt: 2000 },
      { role: 'assistant', content: 'Because it changed your next decision.', createdAt: 2001 }
    ]);
  });

  it('preserves existing comment threads when overwriting newspaper content', () => {
    const existingThread = {
      logId: 'log-1',
      messages: [{
        id: 'm-1',
        role: 'user' as const,
        content: 'Keep this?',
        createdAt: 1000
      }],
      updatedAt: 1000
    };
    const review: DailyReview = {
      id: 'review-1',
      date: '2026-06-13',
      createdAt: 1000,
      updatedAt: 1000,
      answers: [],
      aiNewspaper: {
        version: 1,
        date: '2026-06-13',
        title: 'Old',
        assistantReply: 'Old.',
        overallComment: 'Old comment.',
        annotations: [{ logId: 'log-1', comment: 'Old annotation.' }],
        commentThreads: [existingThread],
        updatedAt: 1000
      }
    };
    const nextNewspaper: DailyNewspaper = {
      version: 1,
      date: '2026-06-13',
      title: 'New',
      assistantReply: 'New.',
      overallComment: 'New comment.',
      annotations: [{ logId: 'log-1', comment: 'New annotation.' }],
      updatedAt: 2000
    };

    const result = dailyNewspaperService.updateDailyReviewNewspaper([review], 'review-1', nextNewspaper);

    expect(result[0].aiNewspaper?.title).toBe('New');
    expect(result[0].aiNewspaper?.commentThreads).toEqual([existingThread]);
  });
});
