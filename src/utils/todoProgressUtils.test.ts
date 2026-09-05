/**
 * @file todoProgressUtils.test.ts
 * @input Manual-progress todo state and optional existing log contribution
 * @output Regression coverage for displayed progress baselines while editing logs
 * @pos Test (todo progress utilities)
 * @description Verifies that a record editor excludes its own saved increment from the progress it displays.
 * @updated 2026-09-05: Added initial regression coverage for edit-safe manual-progress displays.
 */

import { describe, expect, it } from 'vitest';
import { getTodoProgressDisplayCompletedUnits } from './todoProgressUtils';

describe('getTodoProgressDisplayCompletedUnits', () => {
  it('excludes the current record increment while editing its linked todo', () => {
    expect(getTodoProgressDisplayCompletedUnits(7, 'todo-1', {
      linkedTodoId: 'todo-1',
      progressIncrement: 7
    })).toBe(0);
  });

  it('keeps the current total for a new record or a different linked todo', () => {
    expect(getTodoProgressDisplayCompletedUnits(7, 'todo-1')).toBe(7);
    expect(getTodoProgressDisplayCompletedUnits(7, 'todo-2', {
      linkedTodoId: 'todo-1',
      progressIncrement: 7
    })).toBe(7);
  });

  it('never shows a negative completed amount for legacy inconsistent data', () => {
    expect(getTodoProgressDisplayCompletedUnits(3, 'todo-1', {
      linkedTodoId: 'todo-1',
      progressIncrement: 7
    })).toBe(0);
  });
});
