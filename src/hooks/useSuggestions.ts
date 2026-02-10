/**
 * @file useSuggestions.ts
 * @description Custom hook for activity and scope suggestions
 */

import { useMemo } from 'react';
import { Category, TodoItem, Scope, AutoLinkRule } from '../types';

interface Suggestion {
  activity?: {
    id: string;
    categoryId: string;
    name: string;
    icon: string;
    reason: string;
    matchedKeyword?: string;
  };
  scopes: {
    id: string;
    name: string;
    icon: string;
    reason: string;
  }[];
}

export const useSuggestions = (
  linkedTodoId: string | undefined,
  note: string,
  selectedActivityId: string,
  scopeIds: string[] | undefined,
  categories: Category[],
  todos: TodoItem[],
  scopes: Scope[],
  autoLinkRules: AutoLinkRule[]
): Suggestion => {
  return useMemo(() => {
    const suggestions: Suggestion = { scopes: [] };

    // 1. Activity Suggestions
    const linkedTodo = todos.find(t => t.id === linkedTodoId);

    // 从关联待办获取活动建议
    if (linkedTodo?.linkedActivityId && linkedTodo.linkedCategoryId) {
      if (linkedTodo.linkedActivityId !== selectedActivityId) {
        const cat = categories.find(c => c.id === linkedTodo.linkedCategoryId);
        const act = cat?.activities.find(a => a.id === linkedTodo.linkedActivityId);
        if (cat && act) {
          suggestions.activity = {
            id: act.id,
            categoryId: cat.id,
            name: act.name,
            icon: act.icon,
            reason: '关联待办'
          };
        }
      }
    }

    // 从笔记关键词获取活动建议
    if (!suggestions.activity && note) {
      for (const cat of categories) {
        for (const act of cat.activities) {
          if (act.id === selectedActivityId) continue;

          for (const kw of (act.keywords || [])) {
            if (note.includes(kw)) {
              suggestions.activity = {
                id: act.id,
                categoryId: cat.id,
                name: act.name,
                icon: act.icon,
                reason: '关键词匹配',
                matchedKeyword: kw
              };
              break;
            }
          }
          if (suggestions.activity) break;
        }
        if (suggestions.activity) break;
      }
    }

    // 2. Scope Suggestions
    const candidateScopes = new Map<string, { id: string; name: string; icon: string; reason: string }>();

    // 从关联待办获取领域建议
    if (linkedTodo?.defaultScopeIds) {
      for (const sId of linkedTodo.defaultScopeIds) {
        if (scopeIds?.includes(sId)) continue;

        const s = scopes.find(scope => scope.id === sId);
        if (s) {
          candidateScopes.set(sId, { id: s.id, name: s.name, icon: s.icon, reason: '关联待办' });
        }
      }
    }

    // 从自动链接规则获取领域建议
    const activeRules = autoLinkRules.filter(r => r.activityId === selectedActivityId);
    for (const rule of activeRules) {
      if (scopeIds?.includes(rule.scopeId)) continue;

      const s = scopes.find(scope => scope.id === rule.scopeId);
      if (s && !candidateScopes.has(rule.scopeId)) {
        candidateScopes.set(rule.scopeId, { id: s.id, name: s.name, icon: s.icon, reason: '自动规则' });
      }
    }

    // 从关键词匹配获取领域建议
    if (note) {
      for (const scope of scopes) {
        if (scopeIds?.includes(scope.id)) continue;
        if (candidateScopes.has(scope.id)) continue;

        for (const kw of (scope.keywords || [])) {
          if (note.includes(kw)) {
            candidateScopes.set(scope.id, {
              id: scope.id,
              name: scope.name,
              icon: scope.icon,
              reason: '关键词匹配'
            });
            break;
          }
        }
      }
    }

    suggestions.scopes = Array.from(candidateScopes.values());

    return suggestions;
  }, [linkedTodoId, note, selectedActivityId, scopeIds, categories, todos, scopes, autoLinkRules]);
};
