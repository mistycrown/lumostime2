/**
 * @file referenceDeletion.test.ts
 * @input Reference deletion helpers with representative logs and active sessions
 * @output Regression coverage for migration and unlink decisions
 * @description Ensures deleting scopes or todos preserves history while changing only the intended associations.
 */
import { describe, expect, it } from 'vitest';
import type { ActiveSession, Log, TodoItem } from '../types';
import {
  applyScopeReferenceDecision,
  applyTodoReferenceDecision,
  getDeletedTodoIds,
  getScopeReferenceImpact,
  getTodoReferenceImpact
} from './referenceDeletion';

const log = (overrides: Partial<Log> = {}): Log => ({
  id: 'log-1', activityId: 'activity-1', categoryId: 'category-1', startTime: 1, endTime: 2, duration: 1, ...overrides
});

const session = (overrides: Partial<ActiveSession> = {}): ActiveSession => ({
  id: 'session-1', activityId: 'activity-1', categoryId: 'category-1', activityName: 'Activity', activityIcon: 'A', startTime: 1, ...overrides
});

describe('referenceDeletion', () => {
  it('migrates only the deleted scope and retains other scope associations', () => {
    const logs = [log({ scopeIds: ['scope-a', 'scope-b'] })];
    const sessions = [session({ scopeIds: ['scope-a'] })];

    expect(getScopeReferenceImpact(logs, sessions, 'scope-a')).toEqual({ logs: 1, activeSessions: 1 });
    expect(applyScopeReferenceDecision(logs, sessions, 'scope-a', { action: 'migrate', targetId: 'scope-c' })).toMatchObject({
      logs: [{ scopeIds: ['scope-c', 'scope-b'] }],
      activeSessions: [{ scopeIds: ['scope-c'] }]
    });
  });

  it('unlinks a deleted scope and removes duplicate scope ids', () => {
    const result = applyScopeReferenceDecision([log({ scopeIds: ['scope-a', 'scope-b'] })], [], 'scope-a', { action: 'unlink' });

    expect(result.logs[0].scopeIds).toEqual(['scope-b']);
  });

  it('migrates or unlinks all references to deleted todos without removing their logs', () => {
    const logs = [log({ id: 'linked', linkedTodoId: 'todo-a' }), log({ id: 'other', linkedTodoId: 'todo-b' })];
    const sessions = [session({ linkedTodoId: 'todo-a' })];

    expect(getTodoReferenceImpact(logs, sessions, ['todo-a'])).toEqual({ logs: 1, activeSessions: 1 });
    expect(applyTodoReferenceDecision(logs, sessions, ['todo-a'], { action: 'migrate', targetId: 'todo-c' })).toMatchObject({
      logs: [{ linkedTodoId: 'todo-c' }, { linkedTodoId: 'todo-b' }],
      activeSessions: [{ linkedTodoId: 'todo-c' }]
    });
    expect(applyTodoReferenceDecision(logs, sessions, ['todo-a'], { action: 'unlink' }).logs).toHaveLength(2);
    expect(applyTodoReferenceDecision(logs, sessions, ['todo-a'], { action: 'unlink' }).logs[0].linkedTodoId).toBeUndefined();
  });

  it('finds deleted todo ids, including child todos removed with a parent', () => {
    const initial = [{ id: 'parent' }, { id: 'child', parentTodoId: 'parent' }, { id: 'keep' }] as TodoItem[];
    const next = [{ id: 'keep' }] as TodoItem[];

    expect(getDeletedTodoIds(initial, next)).toEqual(['parent', 'child']);
  });
});
