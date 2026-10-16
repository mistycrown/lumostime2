/**
 * @file referenceDeleteTargets.ts
 * @input Todo collection, excluded IDs and migration target search text
 * @output Selectable migration targets and parent-child search groups
 * @pos Utility (Reference deletion)
 * @updated 2026-10-16: Keeps parent context and child order in deletion migration pickers.
 */
import type { TodoItem } from '../types';
import { buildTodoTreeItems } from './todoHierarchyUtils';

export interface ReferenceDeleteTarget {
  id: string;
  name: string;
  icon?: string;
  parentId?: string;
  selectable?: boolean;
}

export interface ReferenceDeleteTargetGroup {
  target: ReferenceDeleteTarget;
  children: ReferenceDeleteTarget[];
}

export const getTodoReferenceDeleteTargets = (
  todos: TodoItem[],
  excludedIds: string[] = []
): ReferenceDeleteTarget[] => {
  const excluded = new Set(excludedIds);
  const available = (todo: TodoItem) => !todo.isCompleted && !excluded.has(todo.id);
  return buildTodoTreeItems(todos).flatMap(({ todo, children }) => {
    const candidates = children.filter(available);
    if (!available(todo) && candidates.length === 0) return [];
    return [
      { id: todo.id, name: todo.title, selectable: available(todo) },
      ...candidates.map((child) => ({ id: child.id, name: child.title, parentId: todo.id }))
    ];
  });
};

export const getReferenceDeleteTargetGroups = (
  targets: ReferenceDeleteTarget[],
  search: string
): ReferenceDeleteTargetGroup[] => {
  const ids = new Set(targets.map((target) => target.id));
  const children = new Map<string, ReferenceDeleteTarget[]>();
  const roots: ReferenceDeleteTarget[] = [];
  targets.forEach((target) => {
    if (target.parentId && target.parentId !== target.id && ids.has(target.parentId)) {
      children.set(target.parentId, [...(children.get(target.parentId) || []), target]);
    } else {
      roots.push(target);
    }
  });
  const query = search.trim().toLocaleLowerCase();
  return roots.flatMap((target) => {
    const allChildren = children.get(target.id) || [];
    const matchedChildren = !query || target.name.toLocaleLowerCase().includes(query)
      ? allChildren
      : allChildren.filter((child) => child.name.toLocaleLowerCase().includes(query));
    if (query && !target.name.toLocaleLowerCase().includes(query) && matchedChildren.length === 0) return [];
    return [{ target, children: matchedChildren }];
  });
};
