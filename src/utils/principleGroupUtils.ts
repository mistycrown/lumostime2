/**
 * @file principleGroupUtils.ts
 * @updated 2026-10-18: Adds immutable batch grouping and relative ordering helpers.
 * @input Persisted principle groups, principles, and scene card selections
 * @output Group normalization, filtering, and daily random principle resolution
 * @updated 2026-10-18: Adds stable principle groups and group-scoped daily selection.
 */
import type { SceneCardData } from '../types';

export interface PrincipleGroup {
  id: string;
  name: string;
}

export interface GroupedPrinciple {
  id: string;
  title: string;
  frontText: string;
  backText: string;
  groupId?: string;
}

export const PRINCIPLE_GROUPS_STORAGE_KEY = 'lumostime_principle_groups';
export const UNGROUPED_PRINCIPLES = '__ungrouped__';

export const movePrinciplesToGroup = <T extends { id: string; groupId?: string }>(
  principles: T[], ids: string[], groupId?: string, targetId?: string, after = false
): T[] => {
  const selected = new Set(ids);
  const moving = principles.filter((item) => selected.has(item.id));
  if (!moving.length || (targetId && selected.has(targetId))) return principles;
  const remaining = principles.filter((item) => !selected.has(item.id));
  let index = targetId ? remaining.findIndex((item) => item.id === targetId) : -1;
  if (index >= 0) {
    if (after) index++;
  } else {
    index = remaining.length;
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (remaining[i].groupId === groupId) { index = i + 1; break; }
    }
  }
  return [...remaining.slice(0, index), ...moving.map((item) => ({ ...item, groupId })), ...remaining.slice(index)];
};

export const reorderPrincipleGroups = (groups: PrincipleGroup[], id: string, targetId: string, after = false): PrincipleGroup[] => {
  const source = groups.find((group) => group.id === id);
  if (!source || id === targetId || !groups.some((group) => group.id === targetId)) return groups;
  const remaining = groups.filter((group) => group.id !== id);
  const index = remaining.findIndex((group) => group.id === targetId) + (after ? 1 : 0);
  return [...remaining.slice(0, index), source, ...remaining.slice(index)];
};

export const normalizePrincipleGroups = (value: unknown): PrincipleGroup[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item.id !== 'string' || !item.id.trim()
      || typeof item.name !== 'string' || !item.name.trim() || ids.has(item.id.trim())) return [];
    ids.add(item.id.trim());
    return [{ id: item.id.trim(), name: item.name.trim() }];
  });
};

export const loadPrincipleGroups = (): PrincipleGroup[] => {
  try {
    return normalizePrincipleGroups(JSON.parse(localStorage.getItem(PRINCIPLE_GROUPS_STORAGE_KEY) || '[]'));
  } catch {
    return [];
  }
};

export const loadGroupedPrinciples = (): GroupedPrinciple[] => {
  try {
    const value = JSON.parse(localStorage.getItem('lumostime_principles') || '[]');
    return Array.isArray(value) ? value.filter((item) => item && typeof item.id === 'string'
      && typeof item.title === 'string' && typeof item.frontText === 'string') : [];
  } catch {
    return [];
  }
};

export const filterPrinciplesByGroup = <T extends { groupId?: string }>(
  principles: T[], groupId?: string, groups: PrincipleGroup[] = []
): T[] => {
  if (!groupId) return principles;
  if (groupId === UNGROUPED_PRINCIPLES) {
    return principles.filter((item) => !item.groupId || !groups.some((group) => group.id === item.groupId));
  }
  return groups.some((group) => group.id === groupId)
    ? principles.filter((item) => item.groupId === groupId)
    : [];
};

export const resolvePrincipleCard = (data: SceneCardData, date = new Date()): SceneCardData => {
  if (data.type !== 'principle' || !['random', 'library'].includes(data.principleSource || '')) return data;
  const principles = loadGroupedPrinciples();
  if (data.principleSource === 'library') {
    const principle = principles.find((item) => item.id === data.principleId);
    return principle
      ? { ...data, title: principle.title, frontText: principle.frontText, backText: principle.backText }
      : { ...data, title: data.title || '原则', frontText: '原则不存在', backText: '请重新选择原则' };
  }
  const groups = loadPrincipleGroups();
  const candidates = filterPrinciplesByGroup(principles, data.principleGroupId, groups);
  if (!candidates.length) {
    const missingGroup = data.principleGroupId && data.principleGroupId !== UNGROUPED_PRINCIPLES
      && !groups.some((group) => group.id === data.principleGroupId);
    return {
      ...data,
      title: '随机原则',
      frontText: missingGroup ? '原则分组已删除' : data.principleGroupId ? '该分组暂无原则' : '原则库为空，请先添加原则',
      backText: missingGroup ? '请重新选择原则分组' : '请在设置中添加原则'
    };
  }
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  // Preserve the existing all-library cache and isolate each group's daily selection.
  const cacheKey = `principle_random_${data.id}_${today}${data.principleGroupId ? `_${data.principleGroupId}` : ''}`;
  const cachedId = localStorage.getItem(cacheKey);
  const selected = candidates.find((item) => item.id === cachedId)
    || candidates[Math.floor(Math.random() * candidates.length)];
  if (selected.id !== cachedId) localStorage.setItem(cacheKey, selected.id);
  return { ...data, title: selected.title, frontText: selected.frontText, backText: selected.backText };
};
