/**
 * @file desktopMonthWidgetSidebarUtils.test.ts
 * @input Representative todo/category fixtures for the desktop month-widget planning sidebar
 * @output Regression coverage for grouped sidebar sections, reschedulable arrange rows, subtask hierarchy, and orphan child labeling
 * @pos Test (desktop month widget sidebar)
 * @description Verifies the desktop month widget planning sidebar keeps rows grouped by todo category, nests visible subtasks under the parent when possible, and surfaces already dated unfinished todos after undated ones with compact trailing date text across arrange/maybe/due tabs.
 * @updated 2026-05-17: Extended coverage so arrange/maybe/due all keep unfinished todos visible, sort undated rows first, and expose compact trailing date metadata.
 * @updated 2026-05-17: Added first-pass coverage for the desktop month widget sidebar grouping and hierarchy model.
 */
import { describe, expect, it } from 'vitest';
import type { TodoCategory, TodoItem } from '../types';
import { buildDesktopMonthSidebarSections } from './desktopMonthWidgetSidebarUtils';

const todoCategories: TodoCategory[] = [
  { id: 'work', name: 'Work', icon: 'W' },
  { id: 'life', name: 'Life', icon: 'L' }
];

const buildTodo = (overrides: Partial<TodoItem> & Pick<TodoItem, 'id' | 'title'>): TodoItem => ({
  id: overrides.id,
  categoryId: overrides.categoryId || 'work',
  title: overrides.title,
  isCompleted: overrides.isCompleted ?? false,
  ...overrides
});

describe('buildDesktopMonthSidebarSections', () => {
  it('groups rows by todo category and keeps visible subtasks nested under the parent row', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'parent-work', title: 'Write brief', categoryId: 'work' }),
      buildTodo({
        id: 'child-work-1',
        title: 'Draft outline',
        categoryId: 'work',
        parentTodoId: 'parent-work',
        childOrder: 1
      }),
      buildTodo({
        id: 'child-work-2',
        title: 'Collect examples',
        categoryId: 'work',
        parentTodoId: 'parent-work',
        childOrder: 2
      }),
      buildTodo({ id: 'life-root', title: 'Buy groceries', categoryId: 'life' })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'scheduled');

    expect(sections.map((section) => section.title)).toEqual(['Work', 'Life']);
    expect(sections[0]?.rows.map((row) => `${row.level}:${row.displayTitle}`)).toEqual([
      '0:Write brief',
      '1:Draft outline',
      '1:Collect examples'
    ]);
    expect(sections[1]?.rows.map((row) => `${row.level}:${row.displayTitle}`)).toEqual([
      '0:Buy groceries'
    ]);
  });

  it('keeps subtasks visible as standalone rows when their parent is filtered out of the active tab', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'parent-with-deadline',
        title: 'Trip planning',
        categoryId: 'work',
        recurrenceRule: {
          frequency: 'daily',
          startDate: '2026-05-01'
        }
      }),
      buildTodo({
        id: 'child-without-deadline',
        title: 'Confirm hotel',
        categoryId: 'work',
        parentTodoId: 'parent-with-deadline'
      })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'deadline');

    expect(sections).toHaveLength(1);
    expect(sections[0]?.rows.map((row) => `${row.level}:${row.displayTitle}`)).toEqual([
      '0:Confirm hotel @Trip planning'
    ]);
  });

  it('hides unfinished subtasks when their parent task is already completed', () => {
    const todos: TodoItem[] = [
      buildTodo({
        id: 'done-parent',
        title: 'Completed parent',
        categoryId: 'work',
        isCompleted: true
      }),
      buildTodo({
        id: 'hidden-child',
        title: 'Should stay hidden',
        categoryId: 'work',
        parentTodoId: 'done-parent'
      })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'maybe');

    expect(sections).toEqual([]);
  });

  it('keeps all unfinished arrange todos visible and sorts undated rows before dated rows inside each category', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'undated-root-a', title: 'Inbox zero', categoryId: 'work' }),
      buildTodo({ id: 'dated-root-a', title: 'Prepare slides', categoryId: 'work', scheduledDate: '2026-05-20' }),
      buildTodo({ id: 'undated-root-b', title: 'Write summary', categoryId: 'work' }),
      buildTodo({ id: 'dated-root-b', title: 'Book tickets', categoryId: 'work', scheduledDate: '2026-05-22' }),
      buildTodo({ id: 'life-undated', title: 'Laundry', categoryId: 'life' }),
      buildTodo({ id: 'life-dated', title: 'Doctor visit', categoryId: 'life', scheduledDate: '2026-05-21' })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'scheduled');

    expect(sections).toHaveLength(2);
    expect(sections[0]?.rows.map((row) => row.todo.id)).toEqual([
      'undated-root-a',
      'undated-root-b',
      'dated-root-a',
      'dated-root-b'
    ]);
    expect(sections[1]?.rows.map((row) => row.todo.id)).toEqual([
      'life-undated',
      'life-dated'
    ]);
  });

  it('exposes compact trailing arrange dates for already scheduled rows', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'undated-root', title: 'Plan outline', categoryId: 'work' }),
      buildTodo({ id: 'dated-root', title: 'Review budget', categoryId: 'work', scheduledDate: '2026-05-20' }),
      buildTodo({
        id: 'child-dated',
        title: 'Send draft',
        categoryId: 'work',
        parentTodoId: 'undated-root',
        childOrder: 1,
        scheduledDate: '2026-05-23'
      })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'scheduled');
    const workRows = sections[0]?.rows ?? [];

    expect(workRows.map((row) => ({
      id: row.todo.id,
      trailingDateText: row.trailingDateText
    }))).toEqual([
      { id: 'undated-root', trailingDateText: undefined },
      { id: 'child-dated', trailingDateText: '5/23' },
      { id: 'dated-root', trailingDateText: '5/20' }
    ]);
  });

  it('keeps all unfinished due todos visible and sorts undated rows before dated rows', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'undated-root-a', title: 'Prep inbox', categoryId: 'work' }),
      buildTodo({ id: 'dated-root-a', title: 'Tax form', categoryId: 'work', deadlineDate: '2026-05-19' }),
      buildTodo({ id: 'undated-root-b', title: 'Clean desk', categoryId: 'work' }),
      buildTodo({ id: 'dated-root-b', title: 'Submit report', categoryId: 'work', deadlineDate: '2026-05-22' })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'deadline');

    expect(sections).toHaveLength(1);
    expect(sections[0]?.rows.map((row) => ({
      id: row.todo.id,
      trailingDateText: row.trailingDateText
    }))).toEqual([
      { id: 'undated-root-a', trailingDateText: undefined },
      { id: 'undated-root-b', trailingDateText: undefined },
      { id: 'dated-root-a', trailingDateText: '5/19' },
      { id: 'dated-root-b', trailingDateText: '5/22' }
    ]);
  });

  it('sorts maybe rows with empty maybe dates first and uses the earliest maybe date as trailing text', () => {
    const todos: TodoItem[] = [
      buildTodo({ id: 'no-maybe-a', title: 'Read notes', categoryId: 'work' }),
      buildTodo({ id: 'with-maybe-a', title: 'Sketch ideas', categoryId: 'work', maybeDates: ['2026-05-24', '2026-05-20'] }),
      buildTodo({ id: 'no-maybe-b', title: 'Archive files', categoryId: 'work' }),
      buildTodo({ id: 'with-maybe-b', title: 'Call coach', categoryId: 'work', maybeDates: ['2026-05-21'] })
    ];

    const sections = buildDesktopMonthSidebarSections(todos, todoCategories, 'maybe');

    expect(sections).toHaveLength(1);
    expect(sections[0]?.rows.map((row) => ({
      id: row.todo.id,
      trailingDateText: row.trailingDateText
    }))).toEqual([
      { id: 'no-maybe-a', trailingDateText: undefined },
      { id: 'no-maybe-b', trailingDateText: undefined },
      { id: 'with-maybe-a', trailingDateText: '5/20' },
      { id: 'with-maybe-b', trailingDateText: '5/21' }
    ]);
  });
});
