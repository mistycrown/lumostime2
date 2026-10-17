/**
 * @file statsLogDetailsUtils.ts
 * @input Detail selection, period logs and category/todo/scope metadata
 * @output Matching chronological logs and dialog identity
 * @description Resolves chart drilldown independently for tags, todo categories, individual todos and scopes.
 * @updated 2026-10-17: Adds linked-todo and multi-scope selection without inheriting tag exclusions.
 * @updated 2026-10-17: Allows unsorted selection for period summaries so annual records are never sorted up front.
 */
import type { Category, Log, Scope, TodoCategory, TodoItem } from '../types';
import { isCountableLog } from './statLogUtils';

export type StatsLogSelection = (
  | { type?: 'tag'; categoryId: string; activityId?: string }
  | { type: 'todoCategory'; categoryId: string }
  | { type: 'todo'; todoId: string }
  | { type: 'scope'; scopeId: string }
) & { color?: string };

export interface StatsLogMetadata {
  categories: Category[];
  todos: TodoItem[];
  todoCategories: TodoCategory[];
  scopes: Scope[];
}

export const selectStatsDetailLogs = (
  logs: Log[], selection: StatsLogSelection, todos: TodoItem[], period: { start: Date; end: Date },
  options: { sort?: boolean } = {}
): Log[] => {
  const todoIds = selection.type === 'todoCategory'
    ? new Set(todos.filter(todo => todo.categoryId === selection.categoryId).map(todo => todo.id))
    : null;
  const start = period.start.getTime();
  const end = period.end.getTime();
  const selected = logs.filter(log => {
    if (!isCountableLog(log) || !(log.startTime >= start && log.endTime <= end)) return false;
    switch (selection.type) {
      case 'scope': return !!log.scopeIds?.includes(selection.scopeId);
      case 'todo': return log.linkedTodoId === selection.todoId;
      case 'todoCategory': return !!log.linkedTodoId && !!todoIds?.has(log.linkedTodoId);
      default: return log.categoryId === selection.categoryId && (!selection.activityId || log.activityId === selection.activityId);
    }
  });
  return options.sort === false ? selected
    : selected.sort((a, b) => a.startTime - b.startTime || a.id.localeCompare(b.id));
};

export const getStatsDetailIdentity = (selection: StatsLogSelection, metadata: StatsLogMetadata) => {
  let name = '记录明细';
  let icon = '◷';
  let uiIcon: string | undefined;
  let color = selection.color || '#a8a29e';
  let subtitle: string | undefined;
  if (selection.type === 'scope') {
    const scope = metadata.scopes.find(item => item.id === selection.scopeId);
    if (scope) ({ name, icon, uiIcon, themeColor: color } = scope);
  } else if (selection.type === 'todo' || selection.type === 'todoCategory') {
    const todo = selection.type === 'todo' ? metadata.todos.find(item => item.id === selection.todoId) : undefined;
    const categoryId = selection.type === 'todoCategory' ? selection.categoryId : todo?.categoryId;
    const category = metadata.todoCategories.find(item => item.id === categoryId);
    name = todo?.title || category?.name || name;
    icon = category?.icon || icon;
    uiIcon = category?.uiIcon;
    color = selection.color || category?.color || color;
    subtitle = todo ? category?.name : undefined;
  } else {
    const category = metadata.categories.find(item => item.id === selection.categoryId);
    const activity = category?.activities.find(item => item.id === selection.activityId);
    const entity = activity || category;
    if (entity) ({ name, icon, uiIcon } = entity);
    color = activity?.color || category?.themeColor || color;
    subtitle = activity ? category?.name : undefined;
  }
  return { name, icon, uiIcon, color, subtitle };
};
