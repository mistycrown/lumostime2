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
import { buildNodeDescriptionPrompt, generateNodeDescription } from './nodeDescriptionService';

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
