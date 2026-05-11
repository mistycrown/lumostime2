/**
 * @file todoCompletionModeUtils.test.ts
 * @input Completion-mode gating helpers and shared submit sequencer
 * @output Regression coverage for one-shot linked-todo completion behavior
 * @pos Test
 * @description Verifies that completion mode only targets unfinished linked todos and that primary log/session submission always runs before the optional todo completion step.
 * @updated 2026-05-11: Added coverage for completion-mode eligibility, target resolution, ordered execution, and follow-up failure handling.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  getCompletionModeTodoId,
  isTodoEligibleForCompletionMode,
  runPrimaryActionWithOptionalTodoCompletion
} from './todoCompletionModeUtils';

describe('todoCompletionModeUtils', () => {
  it('only enables completion mode for unfinished linked todos', () => {
    expect(isTodoEligibleForCompletionMode(undefined)).toBe(false);
    expect(isTodoEligibleForCompletionMode({ id: 'done', isCompleted: true })).toBe(false);
    expect(isTodoEligibleForCompletionMode({ id: 'open', isCompleted: false })).toBe(true);
  });

  it('resolves a completion target only when mode is enabled for an unfinished todo', () => {
    const openTodo = { id: 'todo-open', isCompleted: false };
    const doneTodo = { id: 'todo-done', isCompleted: true };

    expect(getCompletionModeTodoId(false, openTodo)).toBeUndefined();
    expect(getCompletionModeTodoId(true, doneTodo)).toBeUndefined();
    expect(getCompletionModeTodoId(true, openTodo)).toBe('todo-open');
  });

  it('runs the primary action before the optional todo completion callback', () => {
    const order: string[] = [];

    const result = runPrimaryActionWithOptionalTodoCompletion({
      runPrimaryAction: () => {
        order.push('primary');
      },
      linkedTodoId: 'todo-1',
      completeLinkedTodo: (todoId) => {
        order.push(`complete:${todoId}`);
        return true;
      }
    });

    expect(order).toEqual(['primary', 'complete:todo-1']);
    expect(result).toEqual({
      attemptedTodoCompletion: true,
      todoCompletionSucceeded: true
    });
  });

  it('treats follow-up completion errors as a failed secondary action without skipping the primary save', () => {
    const primaryAction = vi.fn();

    const result = runPrimaryActionWithOptionalTodoCompletion({
      runPrimaryAction: primaryAction,
      linkedTodoId: 'todo-1',
      completeLinkedTodo: () => {
        throw new Error('failed');
      }
    });

    expect(primaryAction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      attemptedTodoCompletion: true,
      todoCompletionSucceeded: false
    });
  });

  it('skips the follow-up action cleanly when no todo target is available', () => {
    const primaryAction = vi.fn();
    const completeLinkedTodo = vi.fn();

    const result = runPrimaryActionWithOptionalTodoCompletion({
      runPrimaryAction: primaryAction,
      completeLinkedTodo
    });

    expect(primaryAction).toHaveBeenCalledTimes(1);
    expect(completeLinkedTodo).not.toHaveBeenCalled();
    expect(result).toEqual({
      attemptedTodoCompletion: false,
      todoCompletionSucceeded: true
    });
  });
});
