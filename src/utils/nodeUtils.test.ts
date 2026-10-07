/**
 * @file nodeUtils.test.ts
 * @updated 2026-10-07: Covers full-width links and quick insertion selections, caret positions and bracket completion.
 * @updated 2026-10-07: Covers capsule moves, ordering boundaries and metadata preservation.
 * @updated 2026-10-07: Covers alias-first syntax, alias preservation and classification fallback.
 * @input Wiki-link notes, node metadata and logs
 * @output Regression checks for text-derived node relationships
 * @updated 2026-10-06: Covers parsing, duplicates, alias conversion, co-occurrence and rename conflicts.
 */
import { describe, expect, it } from 'vitest';
import type { Log, NoteNode } from '../types';
import { buildNodeIndex, createNodeCategory, discoverNodes, getNodeCandidates, getNodeCategoryId, getNodeNames, insertNodeBrackets, linkNodeInText, moveNodeToCategory, parseNodeLinks, reorderNodeItems, renameNode } from './nodeUtils';

const node = (name: string, aliases: string[] = []): NoteNode => ({ id: name, name, aliases, description: '已有简介', createdAt: 1, updatedAt: 1 });
const log = (id: string, note: string, startTime = 1): Log => ({ id, note, startTime, endTime: startTime + 1000, duration: 1, categoryId: 'c', activityId: 'a' });

describe('node text relationships', () => {
  it('recognizes full-width and mixed brackets with the same canonical names and exact text offsets', () => {
    const text = '与 ［［浩特］］ 和 [[浩特]]、［［小浩丨浩特］］ 见面';
    expect(getNodeNames(text)).toEqual(['浩特']);
    expect(parseNodeLinks(text).map((link) => text.slice(link.start, link.end))).toEqual(['［［浩特］］', '[[浩特]]', '［［小浩丨浩特］］']);
    expect(parseNodeLinks(text).at(-1)).toMatchObject({ name: '浩特', label: '小浩' });
    expect(getNodeNames('[［浩特]］ ［[杭州］]')).toEqual(['浩特', '杭州']);
    expect(getNodeNames('［［［浩特］］］ ［［］］ ［［a|b］］ ［［a\nb］］')).toEqual([]);
    const discovered = discoverNodes([], [log('full', text)]);
    expect(discovered.map((item) => item.name)).toEqual(['浩特']);
    expect(buildNodeIndex(discovered, [log('full', text)]).get(discovered[0].id)?.logs).toHaveLength(1);
  });

  it('protects full-width links from suggestions/conversion and preserves their delimiters when renaming', () => {
    const source = node('浩特', ['小浩']);
    expect(getNodeCandidates('［［浩特］］ 小浩', [source])).toEqual([]);
    expect(getNodeCandidates('［［小浩项目］］', [source])).toEqual([]);
    expect(linkNodeInText('小浩 ［［小浩项目］］ ［［小浩丨浩特］］', source)).toBe('[[小浩丨浩特]] ［［小浩项目］］ ［［小浩丨浩特］］');
    expect(renameNode([source], [log('full', '［［小浩丨浩特］］ [[浩特]]')], source.id, '浩老师').logs[0].note).toBe('［［小浩丨浩老师］］ [[浩老师]]');
    expect(() => renameNode([source], [], source.id, '［浩特］')).toThrow('有效');
  });

  it('wraps the exact selection and keeps the remainder and caret after the closing brackets', () => {
    expect(insertNodeBrackets('今天和浩特见面', 3, 5)).toEqual({ text: '今天和[[浩特]]见面', caret: 9 });
    expect(insertNodeBrackets('🙂浩特', 2, 4)).toEqual({ text: '🙂[[浩特]]', caret: 8 });
    expect(insertNodeBrackets('浩特', 0, 2)).toEqual({ text: '[[浩特]]', caret: 6 });
  });

  it('opens or completes a node at the caret without closing an already complete earlier node', () => {
    expect(insertNodeBrackets('')).toEqual({ text: '[[', caret: 2 });
    expect(insertNodeBrackets('与浩特见面', 1)).toEqual({ text: '与[[浩特见面', caret: 3 });
    expect(insertNodeBrackets('与[[浩特')).toEqual({ text: '与[[浩特]]', caret: 7 });
    expect(insertNodeBrackets('与［［浩特')).toEqual({ text: '与［［浩特］］', caret: 7 });
    expect(insertNodeBrackets('与[浩特')).toEqual({ text: '与[[浩特]]', caret: 7 });
    expect(insertNodeBrackets('与［浩特')).toEqual({ text: '与［［浩特］］', caret: 7 });
    expect(insertNodeBrackets('[[浩特]]，')).toEqual({ text: '[[浩特]]，[[', caret: 9 });
    expect(insertNodeBrackets('[[浩特]]', 4)).toEqual({ text: '[[浩特]]', caret: 6 });
  });

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
    expect(linkNodeInText('北大同学、北大 [[北大项目]] [[北京大学]]', node('北京大学', ['北大', '北大同学']))).toBe('[[北大同学丨北京大学]]、[[北大丨北京大学]] [[北大项目]] [[北京大学]]');
    expect(linkNodeInText('C++ 和 C++', node('编程', ['C++']))).toBe('[[C++丨编程]] 和 [[C++丨编程]]');
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

  it('resolves alias-first links to the canonical node and rejects incomplete aliases', () => {
    expect(parseNodeLinks('[[ 林林 丨 小林 ]]')[0]).toMatchObject({ name: '小林', label: '林林' });
    expect(getNodeNames('[[林林丨小林]] [[小林]] [[小林同学丨小林]]')).toEqual(['小林']);
    expect(getNodeNames('[[丨小林]] [[林林丨]] [[a丨b丨c]]')).toEqual([]);
    expect(discoverNodes([], [log('a', '[[林林丨小林]]')]).map((item) => item.name)).toEqual(['小林']);
    expect(buildNodeIndex([node('小林')], [log('a', '[[林林丨小林]] [[小林]]')]).get('小林')?.logs).toHaveLength(1);
  });

  it('renames alias targets without changing display labels or category assignments', () => {
    const source = { ...node('小林', ['林林']), categoryId: 'people' };
    const result = renameNode([source], [log('a', '[[林林丨小林]] [[小林]] [[小林丨另一人]]')], '小林', '林老师');
    expect(result.logs[0].note).toBe('[[林林丨林老师]] [[林老师]] [[小林丨另一人]]');
    expect(result.nodes[0].categoryId).toBe('people');
  });

  it('repairs old alias-token node names without losing existing metadata', () => {
    const existing = [node('小林'), { ...node('林林丨小林'), description: '旧别名简介', categoryId: 'people' }];
    const result = discoverNodes(existing, [log('a', '[[林林丨小林]]')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '小林', name: '小林', aliases: ['林林'], categoryId: 'people' });
    expect(result[0].description).toContain('已有简介');
    expect(result[0].description).toContain('旧别名简介');
    expect(discoverNodes(result, [])).toBe(result);
  });

  it('creates unique categories and treats missing/obsolete assignments as uncategorized', () => {
    const category = createNodeCategory([], ' 人物 ', 2);
    expect(category).toMatchObject({ name: '人物', createdAt: 2, updatedAt: 2 });
    expect(() => createNodeCategory([category], '人物')).toThrow('同名');
    expect(() => createNodeCategory([], '未分类')).toThrow('其他');
    expect(() => createNodeCategory([], '   ')).toThrow('有效');
    expect(getNodeCategoryId(node('小林'), [category])).toBe('');
    expect(getNodeCategoryId({ ...node('小林'), categoryId: 'deleted' }, [category])).toBe('');
    expect(getNodeCategoryId({ ...node('小林'), categoryId: category.id }, [category])).toBe(category.id);
  });

  it('moves capsules between categories at exact positions and preserves metadata', () => {
    const categories = [createNodeCategory([], '人物'), createNodeCategory([], '地点')];
    const source = [{ ...node('小林', ['林林']), categoryId: categories[0].id }, { ...node('杭州'), categoryId: categories[1].id }, node('项目'), { ...node('北京'), categoryId: categories[1].id }];
    const moved = moveNodeToCategory(source, categories, '小林', categories[1].id, '北京', false, 10);
    expect(moved.map((item) => item.id)).toEqual(['杭州', '项目', '小林', '北京']);
    expect(moved[2]).toMatchObject({ categoryId: categories[1].id, aliases: ['林林'], description: '已有简介', createdAt: 1, updatedAt: 10 });
    expect(source[0].categoryId).toBe(categories[0].id);
    expect(moveNodeToCategory(moved, categories, '小林', '').find((item) => item.id === '小林')?.categoryId).toBeUndefined();
    const empty = createNodeCategory(categories, '空分类');
    expect(moveNodeToCategory(source, [...categories, empty], '小林', empty.id).at(-1)?.id).toBe('小林');
  });

  it('reorders within groups and ignores invalid/self targets', () => {
    const category = createNodeCategory([], '人物');
    const source = ['a', 'b', 'c'].map((name) => ({ ...node(name), categoryId: category.id }));
    expect(moveNodeToCategory(source, [category], 'c', category.id, 'a').map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(moveNodeToCategory(source, [category], 'a', category.id).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(moveNodeToCategory(source, [category], 'b', category.id, 'c', true).map((item) => item.id)).toEqual(['a', 'c', 'b']);
    expect(moveNodeToCategory(source, [category], 'a', 'missing')).toBe(source);
    expect(moveNodeToCategory(source, [category], 'a', category.id, 'a')).toBe(source);
    expect(moveNodeToCategory(source, [category], 'a', '', 'b')).toBe(source);
    expect(reorderNodeItems(source, 'b', 'a', true)).toBe(source);
    expect(reorderNodeItems(source, 'a', 'missing')).toBe(source);
    expect(reorderNodeItems(source, 'unknown', 'a')).toBe(source);
    expect(reorderNodeItems(source, 'c', 'a').map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});
