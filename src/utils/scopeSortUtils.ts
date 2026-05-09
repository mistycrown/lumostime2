/**
 * @file scopeSortUtils.ts
 * @input Scope arrays from views, modals, and selectors
 * @output Shared sorted scope lists for consistent selection order
 * @pos Utility
 * @description Centralizes scope selection ordering so batch management, scope pickers, and other selectors all follow the same saved scope order.
 * @updated 2026-05-09: Added shared scope sorting helpers to keep selection UIs aligned with scope-management order.
 */
import { Scope } from '../types';

const compareScopesForSelection = (left: Scope, right: Scope): number => {
  const archivedDiff = Number(left.isArchived) - Number(right.isArchived);
  if (archivedDiff !== 0) {
    return archivedDiff;
  }

  const orderDiff = left.order - right.order;
  if (orderDiff !== 0) {
    return orderDiff;
  }

  const nameDiff = left.name.localeCompare(right.name, 'zh-Hans-CN');
  if (nameDiff !== 0) {
    return nameDiff;
  }

  return left.id.localeCompare(right.id);
};

export const sortScopesForSelection = (scopes: Scope[]): Scope[] => {
  return [...scopes].sort(compareScopesForSelection);
};

export const sortActiveScopesByOrder = (scopes: Scope[]): Scope[] => {
  return sortScopesForSelection(scopes).filter((scope) => !scope.isArchived);
};
