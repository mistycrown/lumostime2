/**
 * @file widgetScopeUtils.ts
 * @input Auto-link preference, activity-to-scope rules, and current scopes
 * @output Native timer scope rules and merged scope selections
 * @pos Utility
 * @updated 2026-10-14: Shares widget timer scope resolution between configuration and native sync.
 */
import type { AutoLinkRule, Scope } from '../types';
import { isScopeArchived } from './archiveUtils';

export const getWidgetTimerScopeRules = (
  autoApply: boolean,
  rules: AutoLinkRule[],
  scopes: Scope[]
): Record<string, string[]> => {
  const result: Record<string, string[]> = Object.create(null);
  if (!autoApply) return result;

  const activeScopeIds = new Set(scopes.filter((scope) => !isScopeArchived(scope)).map((scope) => scope.id));
  for (const rule of rules) {
    if (!rule.activityId || !activeScopeIds.has(rule.scopeId)) continue;
    const ids = result[rule.activityId] ?? (result[rule.activityId] = []);
    if (!ids.includes(rule.scopeId)) ids.push(rule.scopeId);
  }
  return result;
};

export const mergeWidgetTimerScopeIds = (
  scopeIds: string[] | null | undefined,
  activityId: string | null | undefined,
  rules: Record<string, string[]>
): string[] | null => {
  const merged = [...new Set([...(scopeIds || []), ...(activityId ? rules[activityId] || [] : [])])];
  return merged.length > 0 ? merged : null;
};
