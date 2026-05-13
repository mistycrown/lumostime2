/**
 * @file todoKindUtils.test.ts
 * @input Sample todo-like objects with and without `kind`
 * @output Regression coverage for quick-vs-project todo normalization helpers
 * @pos Test (todo kind)
 * @description Verifies that old todos without a stored kind still resolve to project behavior, while explicit quick todos opt into the lightweight reminder path.
 * @updated 2026-05-13: Added first-pass coverage for quick reminder kind normalization.
 */

import { describe, expect, it } from 'vitest';
import { getTodoKind, isQuickTodo } from './todoKindUtils';

describe('todoKindUtils', () => {
  it('treats missing kind as project for backward compatibility', () => {
    expect(getTodoKind({})).toBe('project');
    expect(isQuickTodo({})).toBe(false);
  });

  it('detects explicit quick todos', () => {
    expect(getTodoKind({ kind: 'quick' })).toBe('quick');
    expect(isQuickTodo({ kind: 'quick' })).toBe(true);
  });

  it('keeps explicit project todos in the normal project path', () => {
    expect(getTodoKind({ kind: 'project' })).toBe('project');
    expect(isQuickTodo({ kind: 'project' })).toBe(false);
  });
});

