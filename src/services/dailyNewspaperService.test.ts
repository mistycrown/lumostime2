/**
 * @file dailyNewspaperService.test.ts
 * @input Daily newspaper service public methods
 * @output Regression coverage for the ordinary-chat daily newspaper writeback flow
 * @description Verifies that strict newspaper tool-call parsing preserves the expected local date/mode and that daily newspaper prompts include the shared foreground context layers now used by the writeback flow.
 * @updated 2026-05-16: Added prompt-assembly coverage for base prompt, conversation summary, state context, memory snapshot, and Dream context in the daily newspaper writeback flow.
 * @updated 2026-05-16: Added initial coverage for the new ordinary-chat `小报` writeback service.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { assistantPromptService } from './assistantPromptService';
import { dailyNewspaperService } from './dailyNewspaperService';

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
});
