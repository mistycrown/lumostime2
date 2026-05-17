/**
 * @file desktopTodoQuickEditorUtils.test.ts
 * @input Representative todo fixtures for the desktop widget quick editor
 * @output Regression coverage for inline quick-editor schedule summaries and hierarchy-aware content models
 * @pos Test (desktop widget quick editor)
 * @description Verifies the shared desktop widget quick-editor utility chooses child lists, sibling lists, or note fallback correctly and builds compact schedule summary text from arrange/due/maybe fields.
 * @updated 2026-05-17: Added first-pass desktop widget quick-editor model coverage for root todos, child todos, and note-only rows.
 */

import { describe, expect, it } from 'vitest';
import type { TodoItem } from '../types';
import {
  buildDesktopTodoQuickEditorModel,
  buildDesktopTodoQuickEditorScheduleSummary
} from './desktopTodoQuickEditorUtils';

const buildTodo = (overrides: Partial<TodoItem> & Pick<TodoItem, 'id' | 'title'>): TodoItem => ({
  id: overrides.id,
  categoryId: overrides.categoryId || 'work',
  title: overrides.title,
  isCompleted: overrides.isCompleted ?? false,
  ...overrides
});

describe('buildDesktopTodoQuickEditorScheduleSummary', () => {
  it('combines arrange, due, and maybe information into one compact line', () => {
    const summary = buildDesktopTodoQuickEditorScheduleSummary(buildTodo({
      id: 'todo-1',
      title: 'Prepare workshop',
      scheduledDate: '2026-05-20',
      deadlineDate: '2026-05-22',
      maybeDates: ['2026-05-24', '2026-05-21']
    }));

    expect(summary).toBe('安排 5/20 · 截止 5/22 · Maybe 5/21, 5/24');
  });

  it('returns null when no planning fields exist', () => {
    expect(buildDesktopTodoQuickEditorScheduleSummary(buildTodo({
      id: 'todo-2',
      title: 'Untitled'
    }))).toBeNull();
  });
});

describe('buildDesktopTodoQuickEditorModel', () => {
  it('renders direct children for a root todo with subtasks', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'parent', title: 'Launch plan' }),
      buildTodo({ id: 'child-1', title: 'Draft scope', parentTodoId: 'parent', childOrder: 1 }),
      buildTodo({ id: 'child-2', title: 'Book review', parentTodoId: 'parent', childOrder: 2 })
    ];

    const model = buildDesktopTodoQuickEditorModel(todos, 'parent');

    expect(model?.mode).toBe('children');
    expect(model?.sectionTitle).toBe('子任务');
    expect(model?.items.map((item) => item.title)).toEqual(['Draft scope', 'Book review']);
  });

  it('falls back to note mode for a child todo while keeping clickable parent context', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'parent', title: 'Launch plan' }),
      buildTodo({ id: 'child-1', title: 'Draft scope', parentTodoId: 'parent', childOrder: 1 }),
      buildTodo({ id: 'child-2', title: 'Book review', parentTodoId: 'parent', childOrder: 2, note: 'Bring edits' })
    ];

    const model = buildDesktopTodoQuickEditorModel(todos, 'child-2');

    expect(model?.mode).toBe('note');
    expect(model?.parentTitle).toBe('Launch plan');
    expect(model?.parentTodoId).toBe('parent');
    expect(model?.sectionTitle).toBeNull();
    expect(model?.items).toEqual([]);
    expect(model?.note).toBe('Bring edits');
  });

  it('falls back to note mode for a standalone todo without child context', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'solo', title: 'Journal note', note: 'Write the retrospective.' })
    ];

    const model = buildDesktopTodoQuickEditorModel(todos, 'solo');

    expect(model?.mode).toBe('note');
    expect(model?.sectionTitle).toBeNull();
    expect(model?.items).toEqual([]);
    expect(model?.note).toBe('Write the retrospective.');
  });
});
