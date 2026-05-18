/**
 * @file DesktopTodayWidgetView.test.ts
 * @input Compact desktop today-widget row fixtures
 * @output Regression coverage for one-level parent/subtask row rendering in the desktop today widget
 * @pos Test (desktop widget view)
 * @description Verifies visible parent tasks expand inline child rows while orphaned subtasks keep `@parent` context in the compact Electron today widget.
 * @updated 2026-05-18: Added first-pass coverage for inline subtask rows and standalone orphan-subtask labels in the desktop today widget.
 */
import { describe, expect, it } from 'vitest';
import type { DesktopWidgetTodoItem } from '../../services/desktopWidgetService';
import { buildDesktopTodayWidgetSectionRows } from './DesktopTodayWidgetView';

const buildItem = (
  overrides: Partial<DesktopWidgetTodoItem> & Pick<DesktopWidgetTodoItem, 'todoId' | 'title'>
): DesktopWidgetTodoItem => ({
  todoId: overrides.todoId,
  title: overrides.title,
  isCompleted: overrides.isCompleted ?? false,
  badgeLabel: overrides.badgeLabel ?? 'TODAY',
  icon: overrides.icon ?? null,
  color: overrides.color ?? null,
  activityLabel: overrides.activityLabel ?? null,
  parentTodoId: overrides.parentTodoId ?? null,
  parentTitle: overrides.parentTitle ?? null,
  scheduledDate: overrides.scheduledDate ?? null,
  deadlineDate: overrides.deadlineDate ?? null
});

describe('buildDesktopTodayWidgetSectionRows', () => {
  it('renders direct subtasks beneath a visible parent row', () => {
    const rows = buildDesktopTodayWidgetSectionRows([
      buildItem({ todoId: 'parent', title: 'Parent' }),
      buildItem({ todoId: 'child', title: 'Child', parentTodoId: 'parent', parentTitle: 'Parent' }),
      buildItem({ todoId: 'sibling', title: 'Sibling' })
    ]);

    expect(rows.map((row) => ({
      todoId: row.item.todoId,
      depth: row.depth,
      displayTitle: row.displayTitle
    }))).toEqual([
      { todoId: 'parent', depth: 0, displayTitle: 'Parent' },
      { todoId: 'child', depth: 1, displayTitle: 'Child' },
      { todoId: 'sibling', depth: 0, displayTitle: 'Sibling' }
    ]);
  });

  it('keeps orphaned subtasks visible with parent context in the title', () => {
    const rows = buildDesktopTodayWidgetSectionRows([
      buildItem({ todoId: 'child', title: 'Child', parentTodoId: 'parent', parentTitle: 'Parent' })
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      depth: 0,
      displayTitle: 'Child @Parent'
    });
  });
});
