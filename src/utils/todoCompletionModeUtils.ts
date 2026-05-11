/**
 * @file todoCompletionModeUtils.ts
 * @input Linked todo state, one-shot completion toggle state, and submit callbacks
 * @output Shared helpers for gating and sequencing optional todo completion after log/session submission
 * @pos Utility
 * @description Centralizes the temporary "complete mode" rules used by focus-log flows so submit actions always save first and only then attempt a linked todo completion follow-up.
 * @updated 2026-05-11: Added one-shot completion-mode gating plus shared submit sequencing helpers for Add Log and active focus completion flows.
 */
import type { TodoItem } from '../types';

type TodoCompletionCandidate = Pick<TodoItem, 'id' | 'isCompleted'> | undefined;

interface RunWithOptionalTodoCompletionParams {
  runPrimaryAction: () => void;
  linkedTodoId?: string;
  completeLinkedTodo?: (todoId: string) => boolean;
}

interface RunWithOptionalTodoCompletionResult {
  attemptedTodoCompletion: boolean;
  todoCompletionSucceeded: boolean;
}

export const isTodoEligibleForCompletionMode = (todo: TodoCompletionCandidate): boolean => (
  Boolean(todo && !todo.isCompleted)
);

export const getCompletionModeTodoId = (
  isEnabled: boolean,
  todo: TodoCompletionCandidate
): string | undefined => (
  isEnabled && isTodoEligibleForCompletionMode(todo) ? todo.id : undefined
);

export const runPrimaryActionWithOptionalTodoCompletion = ({
  runPrimaryAction,
  linkedTodoId,
  completeLinkedTodo
}: RunWithOptionalTodoCompletionParams): RunWithOptionalTodoCompletionResult => {
  runPrimaryAction();

  if (!linkedTodoId || !completeLinkedTodo) {
    return {
      attemptedTodoCompletion: false,
      todoCompletionSucceeded: true
    };
  }

  try {
    return {
      attemptedTodoCompletion: true,
      todoCompletionSucceeded: completeLinkedTodo(linkedTodoId)
    };
  } catch {
    return {
      attemptedTodoCompletion: true,
      todoCompletionSucceeded: false
    };
  }
};
