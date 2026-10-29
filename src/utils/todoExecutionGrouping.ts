/**
 * @file todoExecutionGrouping.ts
 * @updated 2026-10-29: Resolves current library labels and respects custom category organization.
 * @input Todo items with optional execution tags
 * @output Stable tag groups for the execution view
 * @pos Utility (Todo execution context)
 * @description Groups tasks by execution labels without changing the task data model.
 */

import type { TodoExecutionTag, TodoItem } from '../types';
import { normalizeTodoExecutionTags, TODO_EXECUTION_TAG_PRESETS } from './todoExecutionTags';
import { getExecutionCategoryId, resolveExecutionTags, type TodoExecutionLibrary } from './todoExecutionLibrary';

export interface TodoExecutionGroup {
  id: string;
  tag: TodoExecutionTag | null;
  label: string;
  todos: TodoItem[];
}

const GROUP_ORDER: Record<TodoExecutionTag['group'], number> = {
  energy: 0,
  scene: 1,
  time: 2,
  custom: 3
};

const PRESET_ORDER = new Map(TODO_EXECUTION_TAG_PRESETS.map((tag, index) => [tag.id, index]));

const compareTags = (left: TodoExecutionTag, right: TodoExecutionTag): number => {
  const groupDifference = GROUP_ORDER[left.group] - GROUP_ORDER[right.group];
  if (groupDifference !== 0) return groupDifference;

  const leftPresetOrder = PRESET_ORDER.get(left.id);
  const rightPresetOrder = PRESET_ORDER.get(right.id);
  if (leftPresetOrder !== undefined || rightPresetOrder !== undefined) {
    return (leftPresetOrder ?? Number.MAX_SAFE_INTEGER) - (rightPresetOrder ?? Number.MAX_SAFE_INTEGER);
  }

  return left.name.localeCompare(right.name, 'zh-CN') || left.id.localeCompare(right.id);
};

/**
 * Groups each task into every matching label. A task with multiple labels is
 * intentionally repeated, while a task without labels remains discoverable in
 * the final fallback group.
 */
export const groupTodosByExecutionTags = (
  todos: TodoItem[],
  options: { includeUntagged?: boolean; library?: TodoExecutionLibrary } = {}
): TodoExecutionGroup[] => {
  const includeUntagged = options.includeUntagged !== false;
  const grouped = new Map<string, { tag: TodoExecutionTag | null; todos: TodoItem[] }>();

  todos.forEach((todo) => {
    const tags = options.library ? resolveExecutionTags(todo.executionTags, options.library) : normalizeTodoExecutionTags(todo.executionTags);
    if (tags.length === 0) {
      if (!includeUntagged) return;
      const untagged = grouped.get('__untagged__') || { tag: null, todos: [] };
      untagged.todos.push(todo);
      grouped.set('__untagged__', untagged);
      return;
    }

    const seenTagIds = new Set<string>();
    tags.forEach((tag) => {
      if (seenTagIds.has(tag.id)) return;
      seenTagIds.add(tag.id);
      const existing = grouped.get(tag.id) || { tag, todos: [] };
      existing.todos.push(todo);
      grouped.set(tag.id, existing);
    });
  });

  return Array.from(grouped.entries())
    .sort(([, left], [, right]) => {
      if (!left.tag && !right.tag) return 0;
      if (!left.tag) return 1;
      if (!right.tag) return -1;
      if (options.library) {
        const categories = options.library.categories;
        const difference = categories.findIndex((category) => category.id === getExecutionCategoryId(left.tag))
          - categories.findIndex((category) => category.id === getExecutionCategoryId(right.tag));
        if (difference) return difference;
      }
      return compareTags(left.tag, right.tag);
    })
    .map(([id, group]) => ({
      id,
      tag: group.tag,
      label: group.tag?.name || '\u672a\u8bbe\u7f6e\u6267\u884c\u6807\u7b7e',
      todos: group.todos
    }));
};

