/**
 * @file nodeDescriptionService.test.ts
 * @input Node metadata, records and an isolated AI adapter
 * @output Evidence-bound prompt and failure-path checks without network requests
 * @updated 2026-10-06: Tests all-record context, missing configuration and empty responses.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Log, NoteNode } from '../types';
const mocks = vi.hoisted(() => ({ getConfig: vi.fn(), generateNarrative: vi.fn() }));
vi.mock('./aiService', () => ({ aiService: mocks }));
import { buildNodeDescriptionPrompt, formatNodeDescription, generateNodeDescription, generateNodeDescriptionResult, parseNodeDescriptionResult } from './nodeDescriptionService';

const node: NoteNode = { id: 'n', name: '小林', aliases: ['林林'], description: '原有简介', createdAt: 1, updatedAt: 1 };
const logs = [1, 2].map((id) => ({ id: String(id), note: `[[小林]] 记录 ${id}`, title: `标题${id}`, startTime: id * 1000 } as Log));
beforeEach(() => { vi.clearAllMocks(); mocks.getConfig.mockReturnValue({ apiKey: 'test-only' }); });
describe('node description generation', () => {
  it('includes all related notes, times, aliases and existing description', () => {
    const data = JSON.parse(buildNodeDescriptionPrompt(node, logs));
    expect(data.别名).toEqual(['林林']);
    expect(data.已有简介).toBe('原有简介');
    expect(data.相关记录.map((entry: { 备注: string }) => entry.备注)).toEqual(logs.map((log) => log.note));
    expect(data.相关记录.every((entry: { 时间: string }) => entry.时间)).toBe(true);
  });
  it('returns editable text and constrains unsupported personal inference', async () => {
    mocks.generateNarrative.mockResolvedValue('  一起讨论科研和项目。  ');
    expect(await generateNodeDescription(node, logs)).toBe('一起讨论科研和项目。');
    expect(mocks.generateNarrative.mock.calls[0][1]).toContain('禁止猜测性格、动机、亲密程度或用户情感');
  });
  it('parses structured fields and formats a stable biography while preserving existing text', () => {
    const result = parseNodeDescriptionResult(JSON.stringify({
      basicInfo: { identity: '', relationship: '同事' },
      bioAdditions: ['共同准备项目汇报。'],
      recentInteractions: [{ date: '2026-10-07', summary: '一起讨论项目。' }, { date: '2026-10-07', summary: '讨论项目并吃饭。' }]
    }));
    const formatted = formatNodeDescription('用户原写的背景。', result);
    expect(formatted).toContain('## 基本信息\n- 身份：\n- 关系：同事');
    expect(formatted).toContain('用户原写的背景。\n共同准备项目汇报。');
    expect(formatted).toContain('- 10月7日：一起讨论项目。；讨论项目并吃饭。');
  });
  it('formats custom node sections without forcing the people template', () => {
    const result = parseNodeDescriptionResult(JSON.stringify({
      nodeType: '项目',
      sections: [{ title: '项目状态', items: [{ label: '阶段', value: '方案设计' }] }],
      basicInfo: { identity: '', relationship: '' },
      bioAdditions: [],
      recentInteractions: []
    }));
    expect(formatNodeDescription('', result)).toBe('## 项目状态\n- 阶段：方案设计');
    expect(formatNodeDescription('', result)).toBe('## 项目状态\n- 阶段：方案设计');
    expect(formatNodeDescription('## 项目状态\n- 阶段：立项', result)).toContain('## 项目状态（补充）\n- 阶段：方案设计');
  });
  it('allows typed review answers as the only evidence source', async () => {
    mocks.generateNarrative.mockResolvedValue(JSON.stringify({ basicInfo: { identity: '', relationship: '' }, bioAdditions: [], recentInteractions: [] }));
    const reviewAnswers = [
      { kind: 'weekly' as const, date: '2026-09-28 ~ 2026-10-04', question: '见了谁', answer: '和[[小林]]吃饭' },
      { kind: 'monthly' as const, date: '2026-10', question: '重要进展', answer: '与[[小林]]完成项目复盘' }
    ];
    await expect(generateNodeDescriptionResult(node, [], reviewAnswers)).resolves.toMatchObject({ basicInfo: { identity: '', relationship: '' } });
    const prompt = JSON.parse(mocks.generateNarrative.mock.calls[0][0]);
    expect(prompt.关联回顾回答.map((item: { 类型: string }) => item.类型)).toEqual(['weekly', 'monthly']);
  });
  it('rejects missing configuration and records without making a request', async () => {
    mocks.getConfig.mockReturnValue({ apiKey: '' });
    await expect(generateNodeDescription(node, logs)).rejects.toThrow('AI 设置');
    mocks.getConfig.mockReturnValue({ apiKey: 'test-only' });
    await expect(generateNodeDescription(node, [])).rejects.toThrow('暂无关联记录');
    expect(mocks.generateNarrative).not.toHaveBeenCalled();
  });
  it('rejects empty output so an existing description is not erased', async () => {
    mocks.generateNarrative.mockResolvedValue('   ');
    await expect(generateNodeDescription(node, logs)).rejects.toThrow('未返回简介');
  });
});
