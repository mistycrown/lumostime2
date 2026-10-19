/**
 * @file principleGroupUtils.test.ts
 * @updated 2026-10-18: Covers immutable batch movement, metadata, and relative ordering.
 * @input Legacy/grouped libraries, daily caches, and stale scene selections
 * @output Regression coverage for group isolation and daily random selection
 * @updated 2026-10-18: Covers groups, cache validation, and deleted/empty states.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneCardData } from '../types';
import { filterPrinciplesByGroup, loadPrincipleGroups, movePrinciplesToGroup, normalizePrincipleGroups, PRINCIPLE_GROUPS_STORAGE_KEY, reorderPrincipleGroups, resolvePrincipleCard, UNGROUPED_PRINCIPLES } from './principleGroupUtils';

const groups = [{ id: 'work', name: '工作' }, { id: 'life', name: '生活' }];
const principles = [
  { id: 'a', title: 'A', frontText: 'A front', backText: 'A back', groupId: 'work' },
  { id: 'b', title: 'B', frontText: 'B front', backText: 'B back', groupId: 'work' },
  { id: 'c', title: 'C', frontText: 'C front', backText: 'C back', groupId: 'life' },
  { id: 'd', title: 'D', frontText: 'D front', backText: 'D back' }
];
const card: SceneCardData = { id: 'card', type: 'principle', title: '', action: { type: 'none' }, principleSource: 'random' };
const today = new Date(2026, 9, 18, 12);

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  });
  localStorage.setItem(PRINCIPLE_GROUPS_STORAGE_KEY, JSON.stringify(groups));
  localStorage.setItem('lumostime_principles', JSON.stringify(principles));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('principle groups', () => {
  it('moves selected principles as an ordered block without losing metadata or mutating the draft source', () => {
    const source = principles.map((item) => ({ ...item, descriptions: [{ text: 'keep' }] }));
    const moved = movePrinciplesToGroup(source, ['b', 'a'], 'life', 'c');
    expect(moved.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(moved.slice(0, 2).every((item) => item.groupId === 'life')).toBe(true);
    expect(moved[0].descriptions).toEqual([{ text: 'keep' }]);
    expect(source[0].groupId).toBe('work');
    expect(movePrinciplesToGroup(source, ['a'], undefined).find((item) => item.id === 'a')?.groupId).toBeUndefined();
  });

  it('supports group-end drops, relative ordering and no-op drops onto the selected block', () => {
    expect(movePrinciplesToGroup(principles, ['a'], 'work', 'b', true).map((item) => item.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(movePrinciplesToGroup(principles, ['d'], 'life').map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(movePrinciplesToGroup(principles, ['a', 'b'], 'life', 'b')).toBe(principles);
    expect(movePrinciplesToGroup(principles, ['missing'], 'work')).toBe(principles);
    expect(reorderPrincipleGroups(groups, 'life', 'work')).toEqual([groups[1], groups[0]]);
    expect(reorderPrincipleGroups(groups, 'work', 'life', true)).toEqual([groups[1], groups[0]]);
    expect(reorderPrincipleGroups(groups, 'work', 'missing')).toBe(groups);
  });

  it('normalizes groups and safely reads corrupt storage', () => {
    expect(normalizePrincipleGroups([null, {}, { id: ' work ', name: ' 工作 ' }, groups[0]])).toEqual([groups[0]]);
    localStorage.setItem(PRINCIPLE_GROUPS_STORAGE_KEY, '{bad');
    expect(loadPrincipleGroups()).toEqual([]);
  });

  it('preserves all-library scope and treats legacy and orphan principles as ungrouped', () => {
    expect(filterPrinciplesByGroup(principles)).toEqual(principles);
    expect(filterPrinciplesByGroup(principles, 'work', groups)).toEqual(principles.slice(0, 2));
    expect(filterPrinciplesByGroup([...principles, { groupId: 'deleted' }], UNGROUPED_PRINCIPLES, groups)).toEqual([principles[3], { groupId: 'deleted' }]);
  });

  it('selects only within a group and holds the same principle for the day', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const scopedCard = { ...card, principleGroupId: 'work' };
    expect(resolvePrincipleCard(scopedCard, today).title).toBe('B');
    random.mockReturnValue(0);
    expect(resolvePrincipleCard(scopedCard, today).title).toBe('B');
    expect(resolvePrincipleCard(scopedCard, new Date(2026, 9, 19)).title).toBe('A');
  });

  it('isolates group caches and rejects cached principles moved outside the group', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    localStorage.setItem('principle_random_card_2026-10-18', 'c');
    localStorage.setItem('principle_random_card_2026-10-18_work', 'c');
    expect(resolvePrincipleCard({ ...card, principleGroupId: 'work' }, today).title).toBe('A');
    expect(resolvePrincipleCard({ ...card, principleGroupId: 'life' }, today).title).toBe('C');
    expect(resolvePrincipleCard(card, today).title).toBe('C');
  });

  it('reports empty and deleted groups without selecting outside them', () => {
    localStorage.setItem(PRINCIPLE_GROUPS_STORAGE_KEY, JSON.stringify([...groups, { id: 'empty', name: '空组' }]));
    expect(resolvePrincipleCard({ ...card, principleGroupId: 'empty' }, today).frontText).toBe('该分组暂无原则');
    expect(resolvePrincipleCard({ ...card, principleGroupId: 'deleted' }, today).frontText).toBe('原则分组已删除');
    expect(resolvePrincipleCard({ ...card, principleGroupId: UNGROUPED_PRINCIPLES }, today).title).toBe('D');
  });

  it('keeps direct references and manual content independent of random scope', () => {
    expect(resolvePrincipleCard({ ...card, principleSource: 'library', principleId: 'c', principleGroupId: 'work' }).title).toBe('C');
    const manual = { ...card, principleSource: 'manual' as const, title: 'Manual' };
    expect(resolvePrincipleCard(manual)).toBe(manual);
    localStorage.setItem('lumostime_principles', '{bad');
    expect(resolvePrincipleCard(card).frontText).toContain('原则库为空');
  });
});
