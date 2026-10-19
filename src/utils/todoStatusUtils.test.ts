/**
 * @file todoStatusUtils.test.ts
 * @input Legacy, completed, abandoned and recurring task fixtures
 * @output Regression coverage for terminal-state exclusivity and downstream task behavior
 * @pos Test
 * @updated 2026-10-18: Verifies dated abandonment, restore, persistence shape, schedules and reminders.
 */
import { describe, expect, test } from 'vitest';
import type { TodoItem } from '../types';
import { getTodoStatus, isTodoClosed, normalizeTodoStatus, setTodoStatus } from './todoStatusUtils';
import { applyTodoCompletionActions, getTodoForOccurrence, setTodoCompletion } from './todoOccurrenceUtils';
import { isTodoEligibleForCompletionMode } from './todoCompletionModeUtils';
import { buildDuplicatedTodo, normalizeTodoScheduleFields } from './todoDuplicateUtils';
import { formatTodoCompactScheduleSummary, orderTodoItemsByCompletionGroups } from './todoListDisplayUtils';
import { buildTodoDateEntries, getTodoAssociationTodayTodos, getTodoScheduleMatches } from './todoScheduleUtils';
import { getRecurringPlanOccurrenceDateKeys, isTodoRecurringPlanEnabled } from './todoRecurringPlanUtils';
import { buildTodoReminderSnapshot } from './todoReminderUtils';
import { filterTodoAssociationPickerTodos } from './todoAssociationUtils';
import { getCompletedDirectChildCount, isIncompleteSubtaskHiddenByCompletedParent } from './todoHierarchyUtils';

const now = new Date('2026-10-18T12:00:00+08:00');
const todo: TodoItem = { id: 'task', categoryId: 'books', title: 'Read', isCompleted: false,
  scheduledDate: '2026-10-18', deadlineDate: '2026-10-18', pin: true,
  reminders: { scheduledDate: { daysBefore: 0, time: '09:00' } } };

describe('todo abandonment', () => {
  test('keeps old active and completed records compatible', () => {
    expect(normalizeTodoStatus(todo)).toBe(todo);
    expect(getTodoStatus(todo)).toBe('active');
    const completed = setTodoStatus(todo, 'completed', now);
    expect(getTodoStatus(completed)).toBe('completed');
    expect(normalizeTodoStatus(completed)).toBe(completed);
  });

  test('abandonment replaces completion and records its own date', () => {
    const abandoned = setTodoStatus(setTodoStatus(todo, 'completed', now), 'abandoned', now);
    expect(abandoned).toMatchObject({ isCompleted: false, completedAt: undefined, abandonedAt: now.toISOString() });
    expect(getTodoStatus(abandoned)).toBe('abandoned');
    expect(isTodoClosed(abandoned)).toBe(true);
    expect(setTodoStatus(abandoned, 'abandoned', new Date('2026-10-19'))).toEqual(abandoned);
    const reloaded = normalizeTodoScheduleFields(JSON.parse(JSON.stringify(abandoned)));
    expect(reloaded.abandonedAt).toBe(abandoned.abandonedAt);
    expect(reloaded.completedAt).toBeUndefined();
    expect(reloaded.isCompleted).toBe(false);
  });

  test('completion replaces abandonment and restore clears both dates', () => {
    const abandoned = setTodoStatus(todo, 'abandoned', now);
    expect(setTodoCompletion(abandoned, true, undefined, now)).toMatchObject({
      isCompleted: true, completedAt: now.toISOString(), abandonedAt: undefined
    });
    expect(setTodoStatus(abandoned, 'active')).toMatchObject({
      isCompleted: false, completedAt: undefined, abandonedAt: undefined
    });
  });

  test('repairs contradictory or invalid imported states', () => {
    expect(normalizeTodoStatus({ ...todo, isCompleted: true, completedAt: now.toISOString(), abandonedAt: now.toISOString() }))
      .toMatchObject({ isCompleted: false, completedAt: undefined, abandonedAt: now.toISOString() });
    expect(normalizeTodoStatus({ ...todo, abandonedAt: 'invalid' }).abandonedAt).toBeUndefined();
    expect(normalizeTodoStatus({ ...todo, completedAt: now.toISOString() }).completedAt).toBeUndefined();
  });

  test('does not copy abandonment into new tasks', () => {
    const duplicate = buildDuplicatedTodo(setTodoStatus(todo, 'abandoned', now));
    expect(getTodoStatus(duplicate)).toBe('active');
    expect(duplicate.abandonedAt).toBeUndefined();
  });

  test('stops active schedules, association suggestions and reminders', () => {
    const abandoned = setTodoStatus(todo, 'abandoned', now);
    expect(getTodoAssociationTodayTodos([abandoned], now, { includeCompleted: true })).toEqual([]);
    expect(getTodoScheduleMatches(abandoned, 'today', now)).toEqual([]);
    expect(buildTodoDateEntries([abandoned], [], '2026-10-18')).toEqual([]);
    expect(buildTodoReminderSnapshot([abandoned])).toEqual([]);
    expect(filterTodoAssociationPickerTodos([abandoned])).toEqual([]);
    expect(isTodoEligibleForCompletionMode(abandoned)).toBe(false);
    expect(filterTodoAssociationPickerTodos([abandoned], todo.id)).toEqual([abandoned]);
    const restored = setTodoStatus(abandoned, 'active');
    expect(buildTodoReminderSnapshot([restored])).toHaveLength(1);
    expect(getTodoAssociationTodayTodos([restored], now)).toHaveLength(1);
  });

  test('ignores delayed widget completion actions older than abandonment', () => {
    const abandoned = setTodoStatus(todo, 'abandoned', now);
    expect(applyTodoCompletionActions(abandoned, [{
      todoId: todo.id, isCompleted: true, createdAt: now.getTime() - 1000
    }])).toEqual(abandoned);
  });

  test('stops a recurring series but preserves its past occurrence history on restore', () => {
    const recurring: TodoItem = { ...todo, recurrenceRule: { frequency: 'daily', startDate: '2026-10-01' },
      recurringPlan: { enabled: true, startMinutes: 540, endMinutes: 600, horizonCount: 3 },
      occurrenceCompletions: { '2026-10-17': { completedAt: now.toISOString() } } };
    const abandoned = setTodoStatus(recurring, 'abandoned', now);
    expect(isTodoRecurringPlanEnabled(abandoned)).toBe(false);
    expect(getRecurringPlanOccurrenceDateKeys(abandoned, now)).toEqual([]);
    expect(getTodoForOccurrence(abandoned, '2026-10-17').isCompleted).toBe(false);
    const restored = setTodoStatus(abandoned, 'active');
    expect(isTodoRecurringPlanEnabled(restored)).toBe(true);
    expect(getTodoForOccurrence(restored, '2026-10-17').isCompleted).toBe(true);
  });

  test('interleaves abandoned and completed tasks by end date and formats only the date', () => {
    const abandoned = setTodoStatus(todo, 'abandoned', now);
    const completed = { ...setTodoStatus(todo, 'completed', new Date('2026-10-17T12:00:00+08:00')), id: 'done' };
    expect(orderTodoItemsByCompletionGroups([abandoned, completed, { ...todo, id: 'active' }]).map((item) => item.id))
      .toEqual(['active', 'task', 'done']);
    expect(formatTodoCompactScheduleSummary(abandoned)).toBe('10.18');
  });

  test('hides active children of abandoned parents without awarding completed-child progress', () => {
    const parent = setTodoStatus(todo, 'abandoned', now);
    const child = { ...todo, id: 'child', parentTodoId: parent.id };
    expect(isIncompleteSubtaskHiddenByCompletedParent([parent, child], child)).toBe(true);
    const abandonedChild = setTodoStatus(child, 'abandoned', now);
    expect(getCompletedDirectChildCount([parent, abandonedChild], parent.id)).toBe(0);
  });
});
