/**
 * @file assistantNodeActions.test.ts
 * @input Synthetic foreground tool batches, dictionaries and reversible snapshots
 * @output Integration coverage for node execution, prompt context and rollback
 * @pos Test (Assistant Nodes)
 * @updated 2026-10-09: Covers multi-action writeback, exact note fragments and retry restoration.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { Log, NoteNode } from '../types';
import { assistantActionExecutor, rollbackAppliedChatActions, type AssistantActionExecutionContext } from './assistantActionExecutor';
import { assistantContextBuilder } from './assistantContextBuilder';

const node: NoteNode = { id: 'wang', name: '王小明', aliases: ['小王'], description: '喜欢咖啡', createdAt: 1, updatedAt: 1 };
const log: Log = { id: 'log', categoryId: 'life', activityId: 'chat', startTime: new Date('2026-10-09T10:00:00').getTime(), endTime: new Date('2026-10-09T11:00:00').getTime(), duration: 3600, note: '聊天' };
const context = (nodes: NoteNode[] = []): AssistantActionExecutionContext => ({
  defaultDateKey: '2026-10-09', logs: [log], nodes, todos: [], scopes: [], todoCategories: [], autoApplyAutoLinkRules: false, autoLinkRules: [],
  categories: [{ id: 'life', name: '生活', icon: '○', themeColor: '#78716c', activities: [{ id: 'chat', name: '聊天', icon: '○', color: '#78716c' }] }]
});
beforeEach(() => Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem: () => {} } }));

describe('assistant node integration', () => {
  it('serializes the complete dictionary with multiline descriptions and aliases', () => {
    const nodes = Array.from({ length: 150 }, (_, index) => ({ ...node, id: `node-${index}`, name: `节点${index}`, description: '喜欢咖啡\n怕鸟' }));
    const dictionary = assistantContextBuilder.buildDictionaryContext({ nodes });
    expect(dictionary.nodes).toHaveLength(150);
    expect(dictionary.nodes?.[149]).toMatchObject({ name: '节点149', aliases: ['小王'], description: '喜欢咖啡\n怕鸟' });
    expect(assistantContextBuilder.buildDictionaryDigest(dictionary)).toContain('[Nodes] rows=150');
    expect(assistantContextBuilder.buildDictionaryDigest(dictionary)).toContain('喜欢咖啡\\n怕鸟');
  });

  it('rolls back new nodes and their log mentions together', () => {
    const original = context();
    const result = assistantActionExecutor.applyNodeToolCalls(original, [{ toolName: 'upsert_node', args: { name: '小王', description: '怕鸟' } }]);
    expect(result.actions[0].status).toBe('applied');
    const restored = rollbackAppliedChatActions(result.actions, result.nextLogs, result.nextTodos, result.nextNodes);
    expect(restored.logs).toEqual(original.logs);
    expect(restored.nodes).toEqual([]);
    expect(restored.undoneActionIds).toEqual(result.actions.map((action) => action.actionId));
  });

  it('rolls back multiple writes to the same node in reverse order', () => {
    const original = context([node]);
    const result = assistantActionExecutor.applyNodeToolCalls(original, [
      { toolName: 'upsert_node', args: { nodeId: node.id, description: '怕鸟' } },
      { toolName: 'upsert_node', args: { nodeId: node.id, description: '喜欢猫' } }
    ]);
    expect(result.nextNodes?.[0].description).toBe('喜欢咖啡\n\n怕鸟\n\n喜欢猫');
    expect(rollbackAppliedChatActions(result.actions, result.nextLogs, [], result.nextNodes).nodes).toEqual([node]);
  });

  it('keeps log creation, editing and node writeback in a single batch', () => {
    const original = context();
    const result = assistantActionExecutor.applyForegroundToolCalls(original, [
      { toolName: 'create_log', args: { date: '2026-10-09', startTime: '12:00', endTime: '13:00', categoryId: 'life', activityId: 'chat', description: '午间聊天' } },
      { toolName: 'edit_log', args: { logId: log.id, patch: { note: '上午聊天' } } },
      { toolName: 'upsert_node', args: { name: '小王', description: '怕鸟' } }
    ], '午间聊天，小王怕鸟', { principles: false, selfBeliefs: false });
    expect(result.actions.map((action) => action.status)).toEqual(['applied', 'applied', 'applied']);
    expect(result.nextLogs).toHaveLength(2);
    expect(result.nextLogs.find((item) => item.id === log.id)?.note).toBe('上午聊天');
    expect(result.nextLogs.find((item) => item.id !== log.id)?.note).toBe('午间聊天\n[[小王]]：怕鸟');
    const restored = rollbackAppliedChatActions(result.actions, result.nextLogs, result.nextTodos, result.nextNodes);
    expect(restored.logs).toEqual(original.logs);
    expect(restored.nodes).toEqual([]);
  });

  it('reports creation failure without persisting a standalone node', () => {
    const result = assistantActionExecutor.applyNodeToolCalls({ ...context(), logs: [] }, [{ toolName: 'upsert_node', args: { name: '小王', description: '怕鸟' } }]);
    expect(result.actions[0]).toMatchObject({ kind: 'upsert_node', status: 'failed' });
    expect(result.nextNodes).toEqual([]);
    expect(result.nextLogs).toEqual([]);
  });

  it('links exact user note fragments and rejects rewritten fragments', () => {
    const result = assistantActionExecutor.applyAppendLogNotesToolCalls(context([node]), [{ toolName: 'append_log_notes', args: { items: [
      { logId: log.id, text: '小王怕鸟', nodeIds: [node.id] },
      { logId: log.id, text: '小王讨厌鸟', nodeIds: [node.id] }
    ] } }], '小王怕鸟');
    expect(result.nextLogs[0].note).toBe('聊天\n[[小王丨王小明]]怕鸟');
    expect(rollbackAppliedChatActions(result.actions, result.nextLogs, [], [node]).logs).toEqual([log]);
  });
});
