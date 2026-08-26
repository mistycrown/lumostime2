/**
 * @file referenceDeletion.ts
 * @input Logs, active sessions, and deletion decisions for scopes or todos
 * @output Reference impact summaries and immutable cleanup helpers
 * @description Shared reference handling for deleting scopes and todos without deleting historical logs.
 */
import type { ActiveSession, Log, TodoItem } from '../types';

export type ReferenceDeleteAction = 'unlink' | 'migrate';

export interface ReferenceDeleteDecision {
  action: ReferenceDeleteAction;
  targetId?: string;
}

export interface ReferenceDeleteImpact {
  logs: number;
  activeSessions: number;
}

export const getScopeReferenceImpact = (logs: Log[], activeSessions: ActiveSession[], scopeId: string): ReferenceDeleteImpact => ({
  logs: logs.filter((log) => log.scopeIds?.includes(scopeId)).length,
  activeSessions: activeSessions.filter((session) => session.scopeIds?.includes(scopeId)).length
});

export const getTodoReferenceImpact = (logs: Log[], activeSessions: ActiveSession[], todoIds: string[]): ReferenceDeleteImpact => ({
  logs: logs.filter((log) => Boolean(log.linkedTodoId && todoIds.includes(log.linkedTodoId))).length,
  activeSessions: activeSessions.filter((session) => Boolean(session.linkedTodoId && todoIds.includes(session.linkedTodoId))).length
});

export const applyScopeReferenceDecision = (
  logs: Log[],
  activeSessions: ActiveSession[],
  scopeId: string,
  decision: ReferenceDeleteDecision
): { logs: Log[]; activeSessions: ActiveSession[] } => {
  const resolve = (value: string): string | undefined => {
    if (value !== scopeId) return value;
    if (decision.action === 'migrate' && decision.targetId) {
      return decision.targetId;
    }
    return undefined;
  };
  return {
    logs: logs.map((log) => log.scopeIds?.includes(scopeId)
      ? { ...log, scopeIds: Array.from(new Set((log.scopeIds || []).map((id) => resolve(id)).filter((id): id is string => Boolean(id)))) }
      : log),
    activeSessions: activeSessions.map((session) => session.scopeIds?.includes(scopeId)
      ? { ...session, scopeIds: Array.from(new Set((session.scopeIds || []).map((id) => resolve(id)).filter((id): id is string => Boolean(id)))) }
      : session)
  };
};

export const applyTodoReferenceDecision = (
  logs: Log[],
  activeSessions: ActiveSession[],
  todoIds: string[],
  decision: ReferenceDeleteDecision
): { logs: Log[]; activeSessions: ActiveSession[] } => {
  const replacement = decision.action === 'migrate' ? decision.targetId : undefined;
  return {
    logs: logs.map((log) => log.linkedTodoId && todoIds.includes(log.linkedTodoId)
      ? { ...log, linkedTodoId: replacement }
      : log),
    activeSessions: activeSessions.map((session) => session.linkedTodoId && todoIds.includes(session.linkedTodoId)
      ? { ...session, linkedTodoId: replacement }
      : session)
  };
};

export const getDeletedTodoIds = (initialTodos: TodoItem[], nextTodos: TodoItem[]): string[] => {
  const nextIds = new Set(nextTodos.map((todo) => todo.id));
  return initialTodos.filter((todo) => !nextIds.has(todo.id)).map((todo) => todo.id);
};
