/**
 * @file nodeUtils.test.ts
 * @input Wiki-link notes, node metadata and logs
 * @output Regression checks for text-derived node relationships
 * @updated 2026-10-06: Covers parsing, duplicates, alias conversion, co-occurrence and rename conflicts.
 */
import { describe, expect, it } from 'vitest';
import type { Log, NoteNode } from '../types';
import { buildNodeIndex, discoverNodes, getNodeCandidates, getNodeNames, linkNodeInText, parseNodeLinks, renameNode } from './nodeUtils';

const node = (name: string, aliases: string[] = []): NoteNode => ({ id: name, name, aliases, description: '已有简介', createdAt: 1, updatedAt: 1 });
const log = (id: string, note: string, startTime = 1): Log => ({ id, note, startTime, endTime: startTime + 1000, duration: 1, categoryId: 'c', activityId: 'a' });

describe('node text relationships', () => {
  it('parses trimmed distinct names and leaves malformed or unsupported links ordinary', () => {
    expect(getNodeNames('和 [[ 小林 ]] 去 [[杭州]]，[[小林]] [[]] [[  ]] [[a|b]] [[[x]]] [[x\ny]] [[未结束')).toEqual(['小林', '杭州']);
    const [link] = parseNodeLinks('前 [[小林]] 后');
    expect(link).toEqual({ name: '小林', start: 2, end: 8 });
  });

  it('discovers nodes once, retains metadata and keeps array identity when unchanged', () => {
    const existing = [node('小林')];
    const logs = [log('a', '[[小林]] [[杭州]] [[杭州]]')];
    const result = discoverNodes(existing, logs, 42);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(existing[0]);
    expect(result[1]).toMatchObject({ name: '杭州', aliases: [], description: '', createdAt: 42 });
    expect(discoverNodes(result, logs)).toBe(result);
  });

  it('counts each log once and ranks backlinks by record time', () => {
    const index = buildNodeIndex([node('小林'), node('杭州')], [log('a', '[[小林]] [[杭州]] [[杭州]]', 1), log('b', '[[小林]] [[杭州]]', 5)]);
    expect(index.get('小林')?.logs.map((item) => item.id)).toEqual(['b', 'a']);
    expect(index.get('小林')?.related.get('杭州')).toBe(2);
    expect(index.get('小林')?.latestAt).toBe(5);
  });

  it('suggests names and aliases outside explicit links only', () => {
    const nodes = [node('北京大学', ['北大']), node('小林', ['林林'])];
    expect(getNodeCandidates('林林去了北大 [[小林]] [[北大项目]]', nodes).map((item) => item.node.name)).toEqual(['北京大学']);
    expect(getNodeCandidates('[[北大项目]]', nodes)).toEqual([]);
  });

  it('converts longest aliases without nesting links, including regex punctuation', () => {
    expect(linkNodeInText('北大同学、北大 [[北大项目]] [[北京大学]]', node('北京大学', ['北大', '北大同学']))).toBe('[[北京大学]]、[[北京大学]] [[北大项目]] [[北京大学]]');
    expect(linkNodeInText('C++ 和 C++', node('编程', ['C++']))).toBe('[[编程]] 和 [[编程]]');
    expect(linkNodeInText('小林 [[朋友|小林]]', node('小林'))).toBe('[[小林]] [[朋友|小林]]');
  });

  it('renames all exact links, adds old name as alias and preserves unrelated text', () => {
    const result = renameNode([node('小林')], [log('a', '小林 [[ 小林 ]] [[小林]] [[小林同学]]')], '小林', '林老师', 10);
    expect(result.nodes[0]).toMatchObject({ id: '小林', name: '林老师', aliases: ['小林'], description: '已有简介', updatedAt: 10 });
    expect(result.logs[0].note).toBe('小林 [[林老师]] [[林老师]] [[小林同学]]');
  });

  it('rejects conflicting and invalid names without modifying source data', () => {
    const nodes = [node('小林'), node('杭州')];
    expect(() => renameNode(nodes, [], '小林', '杭州')).toThrow('已存在同名节点');
    expect(() => renameNode(nodes, [], '小林', '[[新名字]]')).toThrow('有效名称');
    expect(nodes[0].name).toBe('小林');
  });
});
