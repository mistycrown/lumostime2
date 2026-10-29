/**
 * @file todoExecutionLibrary.ts
 * @input Persisted label library and legacy task labels
 * @output Normalized reusable labels, folders and association transformations
 * @pos Utility (Todo execution context)
 * @updated 2026-10-29: Keeps label identity and semantic groups stable across organization changes.
 */
import type { TodoExecutionTag, TodoItem } from '../types';
import { normalizeTodoExecutionTags, TODO_EXECUTION_TAG_GROUP_LABELS, TODO_EXECUTION_TAG_PRESETS } from './todoExecutionTags';

export interface TodoExecutionCategory {
  id: string;
  name: string;
}

export interface TodoExecutionLibrary {
  version: 1;
  categories: TodoExecutionCategory[];
  tags: TodoExecutionTag[];
  deletedTagIds: string[];
}

export const DEFAULT_EXECUTION_LIBRARY: TodoExecutionLibrary = {
  version: 1,
  categories: Object.entries(TODO_EXECUTION_TAG_GROUP_LABELS).map(([id, name]) => ({ id, name })),
  tags: TODO_EXECUTION_TAG_PRESETS.map((tag) => ({ ...tag })),
  deletedTagIds: []
};

export const getExecutionCategoryId = (tag: TodoExecutionTag): string => tag.categoryId || tag.group;

export const normalizeExecutionLibrary = (value: unknown): TodoExecutionLibrary => {
  if (!value || typeof value !== 'object' || !Array.isArray((value as TodoExecutionLibrary).tags)
    || !Array.isArray((value as TodoExecutionLibrary).categories)) return DEFAULT_EXECUTION_LIBRARY;
  const candidate = value as TodoExecutionLibrary;
  const categories: TodoExecutionCategory[] = [];
  candidate.categories.forEach((category) => {
    if (typeof category?.id !== 'string' || typeof category?.name !== 'string') return;
    const id = category.id.trim();
    const name = category.name.trim().slice(0, 60);
    if (id && name && !categories.some((item) => item.id === id)) categories.push({ id, name });
  });
  if (!categories.some((category) => category.id === 'custom')) {
    categories.push({ id: 'custom', name: TODO_EXECUTION_TAG_GROUP_LABELS.custom });
  }
  const deletedTagIds = Array.isArray(candidate.deletedTagIds)
    ? Array.from(new Set(candidate.deletedTagIds.filter((id): id is string => typeof id === 'string' && Boolean(id)))) : [];
  const tags: TodoExecutionTag[] = [];
  // Normalize individually: a library can contain all energy options, unlike one task.
  candidate.tags.forEach((raw) => {
    const tag = normalizeTodoExecutionTags([raw])[0];
    if (!tag || tags.some((item) => item.id === tag.id) || deletedTagIds.includes(tag.id)) return;
    tags.push(categories.some((category) => category.id === getExecutionCategoryId(tag))
      ? tag : { ...tag, categoryId: 'custom' });
  });
  return { version: 1, categories, tags, deletedTagIds };
};

export const discoverExecutionTags = (library: TodoExecutionLibrary, todos: Pick<TodoItem, 'executionTags'>[]): TodoExecutionLibrary => {
  const tags = [...library.tags];
  todos.forEach((todo) => normalizeTodoExecutionTags(todo.executionTags).forEach((tag) => {
    if (!tags.some((item) => item.id === tag.id) && !library.deletedTagIds.includes(tag.id)) {
      tags.push(library.categories.some((category) => category.id === getExecutionCategoryId(tag))
        ? tag : { ...tag, categoryId: 'custom' });
    }
  }));
  return tags.length === library.tags.length ? library : { ...library, tags };
};

export const resolveExecutionTags = (value: unknown, library: TodoExecutionLibrary): TodoExecutionTag[] => (
  normalizeTodoExecutionTags(normalizeTodoExecutionTags(value)
    .filter((tag) => !library.deletedTagIds.includes(tag.id))
    .map((tag) => library.tags.find((item) => item.id === tag.id) || tag))
);

export const updateExecutionTagAssociations = (todos: TodoItem[], library: TodoExecutionLibrary): TodoItem[] => (
  todos.map((todo) => {
    const tags = resolveExecutionTags(todo.executionTags, library);
    return JSON.stringify(tags) === JSON.stringify(normalizeTodoExecutionTags(todo.executionTags))
      ? todo : { ...todo, executionTags: tags.length ? tags : undefined };
  })
);

export const deleteExecutionTag = (library: TodoExecutionLibrary, id: string): TodoExecutionLibrary => ({
  ...library,
  tags: library.tags.filter((tag) => tag.id !== id),
  deletedTagIds: Array.from(new Set([...library.deletedTagIds, id]))
});

export const deleteExecutionCategory = (library: TodoExecutionLibrary, id: string, targetId = 'custom'): TodoExecutionLibrary => {
  if (id === 'custom' || id === targetId || !library.categories.some((category) => category.id === targetId)) return library;
  return {
    ...library,
    categories: library.categories.filter((category) => category.id !== id),
    tags: library.tags.map((tag) => getExecutionCategoryId(tag) === id ? { ...tag, categoryId: targetId } : tag)
  };
};
