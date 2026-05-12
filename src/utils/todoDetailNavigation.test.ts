/**
 * @file todoDetailNavigation.test.ts
 * @input Pure todo-detail history helper inputs
 * @output Regression coverage for nested todo-detail back-stack behavior
 * @pos Test
 * @description Ensures nested todo-detail navigation can push the current task before drilling in and pop back to the immediate previous detail page in order.
 * @updated 2026-05-12: Added coverage for same-task no-op pushes and ordered nested pops.
 */
import { describe, expect, test } from 'vitest';
import { popTodoDetailHistory, pushTodoDetailHistory } from './todoDetailNavigation';

const parentTodo = {
  id: 'parent',
  categoryId: 'work',
  title: 'Parent',
  isCompleted: false
};

const childTodo = {
  id: 'child',
  categoryId: 'work',
  title: 'Child',
  isCompleted: false
};

const siblingTodo = {
  id: 'sibling',
  categoryId: 'work',
  title: 'Sibling',
  isCompleted: false
};

describe('todoDetailNavigation', () => {
  test('pushes the current detail before opening a different todo detail', () => {
    expect(pushTodoDetailHistory([], parentTodo as any, childTodo as any)).toEqual([parentTodo]);
  });

  test('does not duplicate history when reopening the same todo detail', () => {
    expect(pushTodoDetailHistory([parentTodo as any], childTodo as any, childTodo as any)).toEqual([parentTodo]);
  });

  test('pops nested detail history in last-in-first-out order', () => {
    const history = [parentTodo as any, childTodo as any, siblingTodo as any];
    const firstPop = popTodoDetailHistory(history);
    const secondPop = popTodoDetailHistory(firstPop.nextHistory);

    expect(firstPop.previousTodo).toEqual(siblingTodo);
    expect(firstPop.nextHistory).toEqual([parentTodo, childTodo]);
    expect(secondPop.previousTodo).toEqual(childTodo);
    expect(secondPop.nextHistory).toEqual([parentTodo]);
  });

  test('returns an empty result when there is no previous detail to restore', () => {
    expect(popTodoDetailHistory([])).toEqual({
      previousTodo: null,
      nextHistory: []
    });
  });
});
