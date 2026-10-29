/**
 * @file todoExecutionTags.ts
 * @input Optional structured execution tags attached to a TodoItem
 * @output Preset definitions and pure helpers for selecting, normalizing, and creating execution tags
 * @pos Utility (Todo execution context)
 * @description Keeps the tag-shaped task context structured enough for future AI recommendations without turning it into a required form.
 */

import type { TodoExecutionTag, TodoExecutionTagGroup } from '../types';

export interface TodoExecutionTagPreset extends TodoExecutionTag {
  source: 'preset';
}

export const TODO_EXECUTION_TAG_GROUP_LABELS: Record<TodoExecutionTagGroup, string> = {
  energy: '精力',
  scene: '场景',
  time: '时段',
  custom: '自定义'
};

export const TODO_EXECUTION_TAG_PRESETS: TodoExecutionTagPreset[] = [
  { id: 'energy:low', name: '低精力', group: 'energy', source: 'preset' },
  { id: 'energy:medium', name: '中精力', group: 'energy', source: 'preset' },
  { id: 'energy:high', name: '高精力', group: 'energy', source: 'preset' },
  { id: 'scene:home', name: '家里', group: 'scene', source: 'preset' },
  { id: 'scene:office', name: '办公室', group: 'scene', source: 'preset' },
  { id: 'scene:outdoors', name: '外出', group: 'scene', source: 'preset' },
  { id: 'scene:computer', name: '电脑前', group: 'scene', source: 'preset' },
  { id: 'scene:phone', name: '手机即可', group: 'scene', source: 'preset' },
  { id: 'scene:quiet', name: '需要安静', group: 'scene', source: 'preset' },
  { id: 'time:morning', name: '早晨', group: 'time', source: 'preset' },
  { id: 'time:forenoon', name: '上午', group: 'time', source: 'preset' },
  { id: 'time:afternoon', name: '下午', group: 'time', source: 'preset' },
  { id: 'time:evening', name: '晚上', group: 'time', source: 'preset' },
  { id: 'time:night', name: '深夜', group: 'time', source: 'preset' }
];

const VALID_GROUPS = new Set<TodoExecutionTagGroup>(['energy', 'scene', 'time', 'custom']);
const MAX_EXECUTION_TAG_NAME_LENGTH = 60;

const normalizeTagName = (name: unknown): string => (
  typeof name === 'string' ? name.trim().slice(0, MAX_EXECUTION_TAG_NAME_LENGTH) : ''
);

const isExecutionTagGroup = (group: unknown): group is TodoExecutionTagGroup => (
  typeof group === 'string' && VALID_GROUPS.has(group as TodoExecutionTagGroup)
);

export const normalizeTodoExecutionTags = (value?: unknown): TodoExecutionTag[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: TodoExecutionTag[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return;
    }

    const source = (candidate as Partial<TodoExecutionTag>).source === 'preset' ? 'preset' : 'user';
    const name = normalizeTagName((candidate as Partial<TodoExecutionTag>).name);
    const id = typeof (candidate as Partial<TodoExecutionTag>).id === 'string'
      ? (candidate as Partial<TodoExecutionTag>).id.trim()
      : '';
    const group = isExecutionTagGroup((candidate as Partial<TodoExecutionTag>).group)
      ? (candidate as Partial<TodoExecutionTag>).group
      : 'custom';
    const nameKey = `${group}:${name.toLocaleLowerCase()}`;

    if (!id || !name || seenIds.has(id) || seenNames.has(nameKey)) {
      return;
    }

    if (group === 'energy') {
      for (let index = normalized.length - 1; index >= 0; index -= 1) {
        if (normalized[index].group === 'energy') {
          seenIds.delete(normalized[index].id);
          seenNames.delete(`energy:${normalized[index].name.toLocaleLowerCase()}`);
          normalized.splice(index, 1);
        }
      }
    }

    normalized.push({ id, name, group, source });
    seenIds.add(id);
    seenNames.add(nameKey);
  });

  return normalized;
};

export const toggleTodoExecutionTag = (
  current: TodoExecutionTag[] | undefined,
  nextTag: TodoExecutionTag
): TodoExecutionTag[] => {
  const normalized = normalizeTodoExecutionTags(current);
  if (normalized.some((tag) => tag.id === nextTag.id)) {
    return normalized.filter((tag) => tag.id !== nextTag.id);
  }

  const withoutSameGroup = nextTag.group === 'energy'
    ? normalized.filter((tag) => tag.group !== 'energy')
    : normalized;

  return normalizeTodoExecutionTags([...withoutSameGroup, nextTag]);
};

export const createCustomTodoExecutionTag = (
  rawName: string,
  id: string = `custom:${crypto.randomUUID()}`
): TodoExecutionTag | null => {
  const name = normalizeTagName(rawName);
  if (!name) {
    return null;
  }

  return {
    id,
    name,
    group: 'custom',
    source: 'user'
  };
};
