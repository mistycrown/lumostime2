/**
 * @file AIBackfillChatHelpers.test.ts
 * @input Persona prompt fixtures with labeled custom prompt blocks
 * @output Regression coverage for persona prompt assembly
 * @pos Component Support Tests (AI Integration)
 * @description Verifies that persona prompt serialization keeps the base persona text and appends custom prompt blocks in order.
 * @updated 2026-05-16: Added debug-block coverage so prompt text before the first labeled section remains visible in the debug viewer.
 * @updated 2026-05-16: Added coverage for labeled custom prompt blocks and fallback block labels.
 */
import { describe, expect, it } from 'vitest';
import { buildDebugBlocks, buildPersonaPrompt } from './AIBackfillChatHelpers';

describe('buildPersonaPrompt', () => {
  it('appends labeled custom prompt blocks after the base persona prompt', () => {
    const prompt = buildPersonaPrompt({
      id: 'persona-1',
      name: '半两',
      avatarIcon: '🐱',
      assistantSelfName: '半两',
      userCallName: '你',
      systemPrompt: '保持自然、轻盈的陪伴感。',
      contextMessageLimit: 30,
      isBuiltIn: false
    }, [
      {
        id: 'block-1',
        title: '文风设置',
        content: '多用短句，避免过度抒情。',
        enabled: true
      },
      {
        id: 'block-2',
        title: '',
        content: '默认使用中文回复。',
        enabled: true
      },
      {
        id: 'block-3',
        title: '禁用条目',
        content: '这条不该被拼进去。',
        enabled: false
      }
    ]);

    expect(prompt).toContain('你当前的人设名字是“半两”。');
    expect(prompt).toContain('如果需要自称，优先使用“半两”。');
    expect(prompt).toContain('请额外遵守以下自定义提示词块：');
    expect(prompt).toContain('【文风设置】\n多用短句，避免过度抒情。');
    expect(prompt).toContain('【提示词块 2】\n默认使用中文回复。');
    expect(prompt).not.toContain('禁用条目');
  });
});

describe('buildDebugBlocks', () => {
  it('keeps prompt text that appears before the first labeled section', () => {
    const blocks = buildDebugBlocks({
      provider: 'openai',
      requestedAt: '2026-05-16T10:00:00+08:00',
      completedAt: '2026-05-16T10:00:02+08:00',
      request: {
        url: 'https://example.test/v1/chat/completions',
        method: 'POST',
        headers: {},
        body: {
          model: 'test-model',
          messages: [
            {
              role: 'system',
              content: [
                '你现在要为 LumosTime 准备一个本地 tool call。',
                '请用中文写。',
                '',
                '=== Structured Output Contract ===',
                'You must return exactly one strict JSON object.'
              ].join('\n')
            },
            {
              role: 'user',
              content: [
                '今天的时间轴如下。',
                '',
                '=== Required Tool Arguments ===',
                'date: 2026-05-16'
              ].join('\n')
            }
          ]
        }
      },
      response: {
        status: 200,
        headers: {},
        body: {
          choices: [
            {
              message: {
                content: '{"assistantReply":"好的","toolCalls":[],"newspaperToolCall":{"toolName":"write_daily_newspaper","args":{"date":"2026-05-16","mode":"create","title":"test","overallComment":"test","annotations":[]}}}'
              }
            }
          ]
        }
      }
    });

    expect(blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '前置系统提示',
        content: expect.stringContaining('你现在要为 LumosTime 准备一个本地 tool call。')
      }),
      expect.objectContaining({
        label: '前置用户输入',
        content: expect.stringContaining('今天的时间轴如下。')
      }),
      expect.objectContaining({
        label: 'Structured Output Contract',
        content: expect.stringContaining('You must return exactly one strict JSON object.')
      }),
      expect.objectContaining({
        label: 'Required Tool Arguments',
        content: expect.stringContaining('date: 2026-05-16')
      })
    ]));
  });
});
