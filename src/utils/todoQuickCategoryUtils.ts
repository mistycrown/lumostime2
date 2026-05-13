/**
 * @file todoQuickCategoryUtils.ts
 * @input Todo category arrays and optional todo records
 * @output Shared helpers for reserved todo category configuration
 * @pos Utility (todo quick category)
 * @description Centralizes the persisted config for the reserved `小事` and `未来` buckets so Todo views, detail editors, and quick schedule pickers can share one consistent system-category rule set.
 * @updated 2026-05-13: Added the reserved `未来` project bucket, plus shared helpers for project-vs-schedulable category filtering alongside the existing `小事` system category.
 */

import { TodoCategory, TodoItem } from '../types';
import { isQuickTodo } from './todoKindUtils';

export const QUICK_TODO_CATEGORY_ID = '__virtual_quick__';
export const QUICK_TODO_CATEGORY_NAME = '小事';
export const QUICK_TODO_CATEGORY_ICON = '🧾';
export const QUICK_TODO_CATEGORY_UI_ICON = 'ui:bill';
export const FUTURE_TODO_CATEGORY_ID = '__virtual_future__';
export const FUTURE_TODO_CATEGORY_NAME = '未来';
export const FUTURE_TODO_CATEGORY_ICON = '🔭';
export const FUTURE_TODO_CATEGORY_UI_ICON = 'ui:think';

interface ReservedTodoCategoryConfig {
  id: string;
  name: string;
  icon: string;
  uiIcon?: string;
}

const RESERVED_TODO_CATEGORY_CONFIGS: ReservedTodoCategoryConfig[] = [
  {
    id: FUTURE_TODO_CATEGORY_ID,
    name: FUTURE_TODO_CATEGORY_NAME,
    icon: FUTURE_TODO_CATEGORY_ICON,
    uiIcon: FUTURE_TODO_CATEGORY_UI_ICON
  },
  {
    id: QUICK_TODO_CATEGORY_ID,
    name: QUICK_TODO_CATEGORY_NAME,
    icon: QUICK_TODO_CATEGORY_ICON,
    uiIcon: QUICK_TODO_CATEGORY_UI_ICON
  }
];

export const isQuickTodoCategoryId = (categoryId?: string | null): boolean => categoryId === QUICK_TODO_CATEGORY_ID;
export const isFutureTodoCategoryId = (categoryId?: string | null): boolean => categoryId === FUTURE_TODO_CATEGORY_ID;
export const isReservedTodoCategoryId = (categoryId?: string | null): boolean => (
  isQuickTodoCategoryId(categoryId) || isFutureTodoCategoryId(categoryId)
);

const createReservedTodoCategory = (config: ReservedTodoCategoryConfig): TodoCategory => ({
  id: config.id,
  name: config.name,
  icon: config.icon,
  uiIcon: config.uiIcon
});

export const createQuickTodoCategory = (): TodoCategory => createReservedTodoCategory({
  id: QUICK_TODO_CATEGORY_ID,
  name: QUICK_TODO_CATEGORY_NAME,
  icon: QUICK_TODO_CATEGORY_ICON,
  uiIcon: QUICK_TODO_CATEGORY_UI_ICON
});

export const createFutureTodoCategory = (): TodoCategory => createReservedTodoCategory({
  id: FUTURE_TODO_CATEGORY_ID,
  name: FUTURE_TODO_CATEGORY_NAME,
  icon: FUTURE_TODO_CATEGORY_ICON,
  uiIcon: FUTURE_TODO_CATEGORY_UI_ICON
});

export const ensureQuickTodoCategory = (categories: TodoCategory[]): TodoCategory[] => {
  const reservedCategoryMap = new Map(
    categories
      .filter((category) => isReservedTodoCategoryId(category.id))
      .map((category) => [category.id, category])
  );
  const normalizedReservedCategories = RESERVED_TODO_CATEGORY_CONFIGS.map((config) => {
    const existingCategory = reservedCategoryMap.get(config.id);
    return {
      ...(existingCategory || createReservedTodoCategory(config)),
      name: config.name,
      icon: config.icon,
      uiIcon: config.uiIcon
    };
  });

  return [
    ...categories.filter((category) => !isReservedTodoCategoryId(category.id)),
    ...normalizedReservedCategories
  ];
};

export const getRealTodoCategories = (categories: TodoCategory[]): TodoCategory[] => (
  ensureQuickTodoCategory(categories).filter((category) => !isQuickTodoCategoryId(category.id))
);

export const getStandardTodoCategories = (categories: TodoCategory[]): TodoCategory[] => (
  ensureQuickTodoCategory(categories).filter((category) => !isReservedTodoCategoryId(category.id))
);

export const getSchedulableTodoCategories = (categories: TodoCategory[]): TodoCategory[] => (
  getStandardTodoCategories(categories)
);

export const getQuickTodoCategory = (categories: TodoCategory[]): TodoCategory => (
  ensureQuickTodoCategory(categories).find((category) => isQuickTodoCategoryId(category.id)) || createQuickTodoCategory()
);

export const getFutureTodoCategory = (categories: TodoCategory[]): TodoCategory => (
  ensureQuickTodoCategory(categories).find((category) => isFutureTodoCategoryId(category.id)) || createFutureTodoCategory()
);

export const normalizeQuickTodoCategoryId = (todo: TodoItem): TodoItem => (
  isQuickTodo(todo) ? { ...todo, categoryId: QUICK_TODO_CATEGORY_ID } : todo
);
