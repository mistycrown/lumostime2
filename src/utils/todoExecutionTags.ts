/**
 * @file todoExecutionTags.ts
 * @updated 2026-10-29: Preserves library category assignments independently of execution semantics.
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
  energy: '\u7cbe\u529b',
  scene: '\u573a\u666f',
  time: '\u65f6\u6bb5',
  custom: '\u81ea\u5b9a\u4e49'
};

export const TODO_EXECUTION_TAG_PRESETS: TodoExecutionTagPreset[] = [
  { id: 'energy:low', name: '\u4f4e\u7cbe\u529b', group: 'energy', source: 'preset' },
  { id: 'energy:medium', name: '\u4e2d\u7cbe\u529b', group: 'energy', source: 'preset' },
  { id: 'energy:high', name: '\u9ad8\u7cbe\u529b', group: 'energy', source: 'preset' },
  { id: 'scene:home', name: '\u5bb6\u91cc', group: 'scene', source: 'preset' },
  { id: 'scene:office', name: '\u529e\u516c\u5ba4', group: 'scene', source: 'preset' },
  { id: 'scene:outdoors', name: '\u5916\u51fa', group: 'scene', source: 'preset' },
  { id: 'scene:computer', name: '\u7535\u8111\u524d', group: 'scene', source: 'preset' },
  { id: 'scene:phone', name: '\u624b\u673a\u5373\u53ef', group: 'scene', source: 'preset' },
  { id: 'scene:quiet', name: '\u9700\u8981\u5b89\u9759', group: 'scene', source: 'preset' },
  { id: 'time:morning', name: '\u65e9\u6668', group: 'time', source: 'preset' },
  { id: 'time:forenoon', name: '\u4e0a\u5348', group: 'time', source: 'preset' },
  { id: 'time:afternoon', name: '\u4e0b\u5348', group: 'time', source: 'preset' },
  { id: 'time:evening', name: '\u665a\u4e0a', group: 'time', source: 'preset' },
  { id: 'time:night', name: '\u6df1\u591c', group: 'time', source: 'preset' }
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
  if (!Array.isArray(value)) return [];

  const normalized: TodoExecutionTag[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object') return;
    const source = (candidate as Partial<TodoExecutionTag>).source === 'preset' ? 'preset' : 'user';
    const name = normalizeTagName((candidate as Partial<TodoExecutionTag>).name);
    const id = typeof (candidate as Partial<TodoExecutionTag>).id === 'string'
      ? (candidate as Partial<TodoExecutionTag>).id.trim()
      : '';
    const group = isExecutionTagGroup((candidate as Partial<TodoExecutionTag>).group)
      ? (candidate as Partial<TodoExecutionTag>).group
      : 'custom';
    const categoryId = typeof (candidate as Partial<TodoExecutionTag>).categoryId === 'string'
      ? (candidate as Partial<TodoExecutionTag>).categoryId.trim()
      : '';
    const nameKey = (categoryId || group) + ':' + name.toLocaleLowerCase();
    if (!id || !name || seenIds.has(id) || seenNames.has(nameKey)) return;

    if (group === 'energy') {
      for (let index = normalized.length - 1; index >= 0; index -= 1) {
        if (normalized[index].group === 'energy') {
          seenIds.delete(normalized[index].id);
          seenNames.delete((normalized[index].categoryId || 'energy') + ':' + normalized[index].name.toLocaleLowerCase());
          normalized.splice(index, 1);
        }
      }
    }

    normalized.push({ id, name, group, source, ...(categoryId ? { categoryId } : {}) });
    seenIds.add(id);
    seenNames.add(nameKey);
  });

  return normalized;
};

export const toggleTodoExecutionTag = (current: TodoExecutionTag[] | undefined, nextTag: TodoExecutionTag): TodoExecutionTag[] => {
  const normalized = normalizeTodoExecutionTags(current);
  if (normalized.some((tag) => tag.id === nextTag.id)) return normalized.filter((tag) => tag.id !== nextTag.id);
  const withoutSameGroup = nextTag.group === 'energy' ? normalized.filter((tag) => tag.group !== 'energy') : normalized;
  return normalizeTodoExecutionTags([...withoutSameGroup, nextTag]);
};

export const createCustomTodoExecutionTag = (rawName: string, id: string = 'custom:' + crypto.randomUUID()): TodoExecutionTag | null => {
  const name = normalizeTagName(rawName);
  if (!name) return null;
  return { id, name, group: 'custom', source: 'user' };
};
