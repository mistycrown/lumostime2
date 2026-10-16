/**
 * @file todoOccurrenceUtils.test.ts
 * @input Recurring tasks and dated completion commands
 * @output Regression coverage for occurrence completion, undo and normalization
 * @pos Test
 * @updated 2026-10-16: Covers dated completion without ending the series.
 */
import { describe, expect, test } from 'vitest';
import type { TodoItem } from '../types';
import { applyTodoCompletionActions, getTodoForOccurrence, normalizeOccurrenceCompletions, setTodoCompletion, toggleTodoCompletion } from './todoOccurrenceUtils';
import { buildTodoDateEntries, getTodoScheduleMatches, isTodoInAssociationTodayCategory } from './todoScheduleUtils';
import { buildDuplicatedTodo } from './todoDuplicateUtils';
import { getRecurringPlanOccurrenceDateKeys } from './todoRecurringPlanUtils';

const todo: TodoItem = {
  id: 'repeat', categoryId: 'cat', title: 'Read', isCompleted: false,
  recurrenceRule: { frequency: 'daily', startDate: '2026-10-01', skipDates: ['2026-10-18'] }
};
const now = new Date('2026-10-17T13:30:00+08:00');

describe('recurring occurrence completion', () => {
  test('native replay preserves dates across midnight and applies the latest action per date', () => {
    const result = applyTodoCompletionActions(todo, [
      { todoId: todo.id, isCompleted: false, createdAt: now.getTime() + 3, occurrenceDateKey: '2026-10-16' },
      { todoId: todo.id, isCompleted: true, createdAt: now.getTime(), occurrenceDateKey: '2026-10-16' },
      { todoId: todo.id, isCompleted: true, createdAt: now.getTime() + 1, occurrenceDateKey: '2026-10-17' }
    ]);
    expect(result.isCompleted).toBe(false);
    expect(Object.keys(result.occurrenceCompletions || {})).toEqual(['2026-10-17']);
    expect(applyTodoCompletionActions(todo, [{ todoId: todo.id, isCompleted: true, createdAt: now.getTime() }])).toBe(todo);
  });

  test('calendar history stays on the scheduled date after rule edits and duplication clears it', () => {
    const completed = setTodoCompletion(todo, true, '2026-10-16', now);
    const edited = { ...completed, recurrenceRule: { ...todo.recurrenceRule!, startDate: '2026-10-20' } };
    expect(buildTodoDateEntries([edited], [], '2026-10-16')[0].primaryKind).toBe('completed');
    expect(buildTodoDateEntries([edited], [], '2026-10-17')).toHaveLength(0);
    expect(getTodoScheduleMatches(edited, 'today', new Date('2026-10-16T09:00:00'))).toContainEqual({ dateKey: '2026-10-16', kind: 'completed' });
    expect(buildDuplicatedTodo(edited, { title: 'copy', clearDates: false }).occurrenceCompletions).toBeUndefined();
  });

  test('auto Plan skips completed dates and continues replenishing later occurrences', () => {
    const completed = setTodoCompletion(todo, true, '2026-10-17', now);
    expect(getRecurringPlanOccurrenceDateKeys({
      ...completed,
      recurringPlan: { enabled: true, startMinutes: 540, endMinutes: 600, horizonCount: 2 }
    }, now)).toEqual(['2026-10-19', '2026-10-20']);
  });

  test('ending the series stops future schedule entries and preserves past completion', () => {
    const completed = setTodoCompletion(todo, true, '2026-10-16', now);
    const ended = { ...completed, isCompleted: true, completedAt: now.toISOString() };
    expect(buildTodoDateEntries([ended], [], '2026-10-19')).toHaveLength(0);
    expect(buildTodoDateEntries([ended], [], '2026-10-16')[0].primaryKind).toBe('completed');
    expect(isTodoInAssociationTodayCategory({ ...ended, pin: true }, new Date('2026-10-19T09:00:00'))).toBe(false);
  });
  test('backfills the selected date without completing the series or touching progress', () => {
    const result = setTodoCompletion({ ...todo, completedUnits: 3 }, true, '2026-10-16', now);
    expect(result.isCompleted).toBe(false);
    expect(result.completedAt).toBeUndefined();
    expect(result.completedUnits).toBe(3);
    expect(result.occurrenceCompletions?.['2026-10-16'].completedAt).toBe(now.toISOString());
    expect(getTodoForOccurrence(result, '2026-10-16').isCompleted).toBe(true);
    expect(getTodoForOccurrence(result, '2026-10-17').isCompleted).toBe(false);
  });

  test('is idempotent and undo preserves other dates', () => {
    const first = setTodoCompletion(todo, true, '2026-10-16', now);
    expect(setTodoCompletion(first, true, '2026-10-16', new Date())).toBe(first);
    const second = setTodoCompletion(first, true, '2026-10-17', now);
    const undone = toggleTodoCompletion(second, '2026-10-16', now);
    expect(undone.occurrenceCompletions?.['2026-10-16']).toBeUndefined();
    expect(undone.occurrenceCompletions?.['2026-10-17']).toBeDefined();
  });

  test('rejects invalid, skipped and non-occurrence dates', () => {
    for (const date of ['2026-02-30', '2026-10-18', '2026-09-30']) {
      expect(setTodoCompletion(todo, true, date, now)).toBe(todo);
    }
  });

  test('can undo historical completions after a rule edit', () => {
    const completed = setTodoCompletion(todo, true, '2026-10-16', now);
    const edited = { ...completed, recurrenceRule: { ...todo.recurrenceRule!, startDate: '2026-10-20' } };
    expect(toggleTodoCompletion(edited, '2026-10-16', now).occurrenceCompletions).toBeUndefined();
  });

  test('does not complete ended series and ordinary tasks retain their original behavior', () => {
    const ended = { ...todo, isCompleted: true };
    expect(setTodoCompletion(ended, true, '2026-10-16', now)).toBe(ended);
    expect(toggleTodoCompletion(ended, undefined, now).isCompleted).toBe(false);
    expect(setTodoCompletion({ ...todo, recurrenceRule: undefined }, true, undefined, now))
      .toMatchObject({ isCompleted: true, completedAt: now.toISOString() });
  });

  test('normalizes malformed persisted maps without discarding valid historical dates', () => {
    expect(normalizeOccurrenceCompletions({
      '2026-10-16': { completedAt: now.toISOString() },
      '2026-02-30': { completedAt: now.toISOString() },
      '2026-10-17': { completedAt: 'bad' },
      '2026-10-18': null
    })).toEqual({ '2026-10-16': { completedAt: now.toISOString() } });
    expect(normalizeOccurrenceCompletions([])).toBeUndefined();
  });
});
