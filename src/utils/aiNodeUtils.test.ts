/**
 * @file aiNodeUtils.test.ts
 * @input Synthetic node dictionaries, logs and assistant requests
 * @output Regression coverage for node matching, creation and note links
 * @pos Test (AI Nodes)
 * @updated 2026-10-09: Covers aliases, latest actual logs, validation and duplicate writes.
 */
import { describe, expect, it } from 'vitest';
import type { Log, NoteNode } from '../types';
import { applyAINodeUpdate, linkAINoteNodes } from './aiNodeUtils';

const node: NoteNode = { id: 'wang', name: '王小明', aliases: ['小王'], description: '喜欢咖啡', categoryId: 'people', createdAt: 1, updatedAt: 1 };
const log: Log = { id: 'log', categoryId: 'life', activityId: 'chat', startTime: 10, endTime: 20, duration: 10, note: '聊天' };

describe('AI node writeback', () => {
  it('appends facts by alias without losing metadata or changing logs', () => {
    const result = applyAINodeUpdate([node], [log], { name: '小王', description: '怕鸟' }, 100);
    expect(result.nodes).toEqual([{ ...node, description: '喜欢咖啡\n\n怕鸟', updatedAt: 100 }]);
    expect(result.logs).toEqual([log]);
    expect(result.snapshot.previousNode).toEqual(node);
  });

  it('uses explicit replacement and does not append an identical fact twice', () => {
    const first = applyAINodeUpdate([node], [log], { nodeId: node.id, description: '怕鸟' }, 100);
    const repeated = applyAINodeUpdate(first.nodes, first.logs, { nodeId: node.id, description: '怕鸟' }, 200);
    expect(repeated.nodes).toEqual(first.nodes);
    expect(applyAINodeUpdate(first.nodes, [log], { nodeId: node.id, description: '现在不怕鸟了', mode: 'replace' }).nodes[0].description).toBe('现在不怕鸟了');
  });

  it('creates a node through the newest actual log across days and preserves its note', () => {
    const newer = { ...log, id: 'newer', startTime: 30, endTime: 40 };
    const plan = { ...log, id: 'plan', startTime: 999, isPlanned: true };
    const result = applyAINodeUpdate([], [plan, log, newer], { name: '小王', description: '怕鸟' }, 1000);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({ name: '小王', description: '怕鸟', aliases: [] });
    expect(result.logs.find((item) => item.id === 'newer')?.note).toBe('聊天\n[[小王]]：怕鸟');
    expect(result.logs.find((item) => item.id === 'plan')).toEqual(plan);
    expect(result.logs.find((item) => item.id === log.id)).toEqual(log);
    expect(result.snapshot.previousLog).toEqual(newer);
  });

  it('converts an existing ordinary mention and reuses a text-discovered node', () => {
    expect(applyAINodeUpdate([], [{ ...log, note: '和小王聊天' }], { name: '小王', description: '怕鸟' }).logs[0].note).toBe('和[[小王]]聊天');
    const result = applyAINodeUpdate([], [{ ...log, note: '和[[小王]]聊天' }], { name: '小王', description: '怕鸟' });
    expect(result.nodes).toHaveLength(1);
    expect(result.snapshot.previousNode).toBeDefined();
    expect(result.logs[0].note).toBe('和[[小王]]聊天');
  });

  it('requires an actual log only for creation', () => {
    expect(() => applyAINodeUpdate([], [], { name: '小王', description: '怕鸟' })).toThrow('Log');
    expect(() => applyAINodeUpdate([], [{ ...log, isPlanned: true }], { name: '小王', description: '怕鸟' })).toThrow('Log');
    expect(applyAINodeUpdate([node], [], { nodeId: node.id, description: '怕鸟' }).nodes[0].description).toContain('怕鸟');
  });

  it('rejects invalid IDs, mismatched names, ambiguous aliases and invalid names', () => {
    expect(() => applyAINodeUpdate([node], [log], { nodeId: 'missing', name: '小王', description: '怕鸟' })).toThrow('没有找到');
    expect(() => applyAINodeUpdate([node], [log], { nodeId: node.id, name: '李四', description: '怕鸟' })).toThrow('不一致');
    const other = { ...node, id: 'other', name: '王二' };
    expect(() => applyAINodeUpdate([node, other], [log], { name: '小王', description: '怕鸟' })).toThrow('多个节点');
    expect(() => applyAINodeUpdate([], [log], { name: '[[小王]]', description: '怕鸟' })).toThrow('有效');
    expect(() => applyAINodeUpdate([node], [log], { nodeId: node.id, description: ' ' })).toThrow('不能为空');
  });

  it('prefers canonical names to aliases and does not duplicate existing links', () => {
    const canonical = { ...node, id: 'canonical', name: '小王', aliases: [] };
    expect(applyAINodeUpdate([node, canonical], [log], { name: '小王', description: '怕鸟' }).snapshot.nodeId).toBe('canonical');
    expect(linkAINoteNodes('小王和[[王小明]]一起聊天', [node])).toBe('[[小王丨王小明]]和[[王小明]]一起聊天');
    expect(linkAINoteNodes('小王', [node, { ...node, id: 'other', name: '王二' }])).toBe('小王');
    expect(linkAINoteNodes('小王', [node], ['missing'])).toBe('小王');
  });
});
