/**
 * @file TodoQuickActionsModal.test.tsx
 * @updated 2026-10-29: Places execution labels beside Pin for both pinned and unpinned tasks.
 * @updated 2026-10-18: Verifies abandon/restore entries, dated status and suppressed actions for closed tasks.
 * @updated 2026-10-18: Verifies dated reminder visibility, independent active state and color-only card actions.
 * @updated 2026-10-16: Supports dated recurring completion without ending the task series.
 * @updated 2026-10-11: Supplies the shared single-date selection callback.
 * @input TodoQuickActionsModal props
 * @output Regression coverage for quick category move visibility and Maybe-date summary rendering in the shared todo quick-actions sheet
 * @pos Test
 * @updated 2026-10-04: Covers main-task association next to duplicate and hierarchy-based visibility.
 * @description Ensures the shared quick-actions modal only exposes category move for standalone todos, still offers quick-todo project upgrades through the shared category-picker flow, and summarizes Maybe dates as compact title metadata.
 * @updated 2026-08-27: Added coverage that long quick-actions titles use a two-line visual clamp without changing title-edit behavior.
 * @updated 2026-10-07: Added coverage for displaying and truncating the todo note below the quick-actions title.
 * @updated 2026-06-14: Added coverage for the quick-actions duplicate entry so the modal can reuse the row swipe duplicate flow.
 * @updated 2026-05-14: Added coverage for the split `Maybe` shortcut row and `+7` date labels in the quick actions sheet, alongside Maybe summary rendering under the title.
 * @updated 2026-05-14: Added coverage for single and multi-date Maybe summaries under the quick-actions title, including full multi-date expansion instead of count folding.
 * @updated 2026-05-13: Added coverage for the quick `升级为项目` entry now that it reuses category selection instead of a silent default bucket fallback.
 * @updated 2026-05-13: Added coverage for the new `移动分类` quick action and its centered category picker.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { TodoQuickActionsModal } from './TodoQuickActionsModal';

vi.mock('./IconRenderer', () => ({
  IconRenderer: () => <span data-testid="icon-renderer" />
}));

const todoCategories = [
  {
    id: 'cat-a',
    name: '资本论',
    icon: 'book'
  },
  {
    id: 'cat-b',
    name: '播客',
    icon: 'mic'
  }
] as any;

const baseProps = {
  isOpen: true,
  todoCategories,
  onMoveDate: vi.fn(),
  onSelectDate: vi.fn(),
  onClearDate: vi.fn(),
  onOpenDetail: vi.fn(),
  onComplete: vi.fn(),
  onUndoComplete: vi.fn(),
  onToggleAbandon: vi.fn(),
  onTogglePin: vi.fn(),
  onDuplicate: vi.fn(),
  onEditMaybeDates: vi.fn(),
  onSkipNextRecurrence: vi.fn(),
  onSkipToMaybeDate: vi.fn(),
  onMoveCategory: vi.fn(),
  onUpgradeToProject: vi.fn(),
  onUpdateNote: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
  onForceClose: vi.fn(),
  openedAt: 0,
  showUpgradeToProject: false
};

describe('TodoQuickActionsModal category move', () => {
  test('renders execution tag editing and selection count in the Pin row', () => {
    for (const pin of [true, false]) {
      const html = renderToStaticMarkup(<TodoQuickActionsModal {...baseProps} onSaveTodo={vi.fn()}
        todo={{ id: 'labels', categoryId: 'cat-a', title: 'Read', isCompleted: false, pin,
          executionTags: [{ id: 'energy:low', name: '低精力', group: 'energy', source: 'preset' }] }} />);
      expect(html).toMatch(/grid grid-cols-2 gap-2"><button[^>]*>[\s\S]*?<span>(?:取消 Pin|Pin)<\/span><\/button><div><button[^>]*aria-label="执行标签"/);
      expect(html).toContain('aria-haspopup="dialog" aria-expanded="false"');
      expect(html).toContain('>1</span>');
    }
  });
  test('shows abandonment with its date and a restore action, without completion or reminder actions', () => {
    const todo = { id: 'abandoned', categoryId: 'cat-a', title: 'Read', isCompleted: false,
      abandonedAt: '2026-10-18T04:00:00Z', scheduledDate: '2026-10-20' };
    const html = renderToStaticMarkup(<TodoQuickActionsModal {...baseProps} todo={todo} onUpdateReminder={vi.fn()} />);
    expect(html).toContain('aria-label="放弃日期');
    expect(html).toContain('lucide-ban');
    expect(html).not.toContain('已放弃');
    expect(html).toContain('10/18');
    expect(html).toContain('恢复待办');
    expect(html).toMatch(/grid grid-cols-2 gap-2"><button[^>]*>[\s\S]*?恢复待办[\s\S]*?<\/button><button[^>]*>[\s\S]*?删除任务[\s\S]*?<\/button><\/div>/);
    expect(html).not.toContain('title="标记完成"');
    expect(html).not.toContain('设置安排提醒');
    expect(renderToStaticMarkup(<TodoQuickActionsModal {...baseProps} todo={{ ...todo, abandonedAt: undefined }} />))
      .toContain('放弃任务');
  });
  test('shows separate icon-only reminder actions only for selected dates and colors configured ones', () => {
    const todo = { id: 'reminder', categoryId: 'cat-a', title: '写作', isCompleted: false };
    const render = (patch = {}) => renderToStaticMarkup(<TodoQuickActionsModal {...baseProps}
      todo={{ ...todo, ...patch }} onUpdateReminder={vi.fn()} />);
    expect(render()).not.toContain('设置安排提醒');
    const arranged = render({ scheduledDate: '2026-10-22' });
    expect(arranged).toContain('设置安排提醒');
    expect(arranged).not.toContain('设置截止提醒');
    expect(arranged).toContain('data-active="false" data-icon-only="true"');
    const configured = render({ scheduledDate: '2026-10-22', deadlineDate: '2026-10-24',
      reminders: { scheduledDate: { daysBefore: 0, time: '09:15' } } });
    expect(configured).toContain('aria-label="编辑安排提醒" data-active="true" data-icon-only="true"');
    expect(configured).toContain('aria-label="设置截止提醒" data-active="false" data-icon-only="true"');
    expect(configured).toContain('style="color:var(--accent-color)"');
    expect(configured).not.toContain('background-color:var(--accent-color)');
    expect(render({ scheduledDate: '2026-10-22', isCompleted: true })).not.toContain('设置安排提醒');
  });
  test('offers single completion with an explicit occurrence date', () => {
    const todo = {
      id: 'repeat', title: 'Read', categoryId: 'cat-a', isCompleted: false,
      recurrenceRule: { frequency: 'daily', startDate: '2026-10-01' }
    } as any;
    const html = renderToStaticMarkup(<TodoQuickActionsModal {...baseProps} todo={todo} occurrenceDateKey="2026-10-16" />);
    expect(html).toContain('完成本次');
    expect(html).toContain('10/16');
    expect(html).not.toContain('撤销本次完成');
  });

  test('offers occurrence undo while keeping the series open', () => {
    const todo = {
      id: 'repeat', title: 'Read', categoryId: 'cat-a', isCompleted: false,
      recurrenceRule: { frequency: 'daily', startDate: '2026-10-01' },
      occurrenceCompletions: { '2026-10-16': { completedAt: '2026-10-17T05:30:00Z' } }
    } as any;
    const html = renderToStaticMarkup(<TodoQuickActionsModal {...baseProps} todo={todo} occurrenceDateKey="2026-10-16" />);
    expect(html).toContain('撤销本次完成');
    expect(html).not.toContain('title="完成本次"');
    expect(html).not.toContain('恢复循环');
  });
  test('renders main-task association beside duplicate for eligible tasks', () => {
    const todo = { id: 'leaf', title: 'Leaf', categoryId: 'cat-a', isCompleted: false } as any;
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal {...baseProps} todo={todo} todos={[todo]} onLinkParent={vi.fn()} />
    );
    expect(html).toMatch(/创建副本[\s\S]*关联到主任务/);
  });

  test('hides main-task association when the source already has children', () => {
    const todo = { id: 'parent', title: 'Parent', categoryId: 'cat-a', isCompleted: false } as any;
    const child = { ...todo, id: 'child', parentTodoId: todo.id };
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal {...baseProps} todo={todo} todos={[todo, child]} onLinkParent={vi.fn()} />
    );
    expect(html).toContain('创建副本');
    expect(html).not.toContain('关联到主任务');
  });

  test('clamps the displayed todo title to two lines', () => {
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal
        {...baseProps}
        todo={{
          id: 'todo-title-clamp',
          categoryId: 'cat-a',
          title: 'A deliberately long todo title that needs more than two lines in the quick actions sheet',
          isCompleted: false
        } as any}
      />
    );

    expect(html).toContain('line-clamp-2');
  });

  test('renders the todo note below the title with single-line truncation', () => {
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal
        {...baseProps}
        todo={{
          id: 'todo-note',
          categoryId: 'cat-a',
          title: 'Task title',
          note: 'A deliberately long note that should stay on one line in the quick actions header',
          isCompleted: false
        } as any}
      />
    );

    expect(html).toMatch(/Task title[\s\S]*truncate[\s\S]*A deliberately long note/);
  });

  test('renders the move-category action for standalone todos', () => {
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal
        {...baseProps}
        todo={{
          id: 'todo-1',
          categoryId: 'cat-a',
          title: 'Read chapter',
          isCompleted: false
        } as any}
      />
    );

    expect(html).toContain('移动分类');
    expect(html).toContain('修改备注');
  });

  test('hides the move-category action for subtasks', () => {
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal
        {...baseProps}
        todo={{
          id: 'todo-2',
          categoryId: 'cat-a',
          parentTodoId: 'parent-1',
          title: 'Child task',
          isCompleted: false
        } as any}
      />
    );

    expect(html).not.toContain('移动分类');
  });

  test('renders the upgrade-to-project action for quick todos', () => {
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal
        {...baseProps}
        showUpgradeToProject
        todo={{
          id: 'todo-3',
          categoryId: '__virtual_quick__',
          kind: 'quick',
          title: 'Quick reminder',
          isCompleted: false
        } as any}
      />
    );

    expect(html).toContain('升级为项目');
  });

  test('shows a single Maybe date directly in the title summary', () => {
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal
        {...baseProps}
        todo={{
          id: 'todo-4',
          categoryId: 'cat-a',
          title: 'Single maybe',
          isCompleted: false,
          maybeDates: ['2099-05-20']
        } as any}
      />
    );

    expect(html).toContain('Maybe');
    expect(html).toContain('5/20');
    expect(html).not.toContain('+1');
  });

  test('shows all Maybe dates in order when multiple dates exist', () => {
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal
        {...baseProps}
        todo={{
          id: 'todo-5',
          categoryId: 'cat-a',
          title: 'Multiple maybe',
          isCompleted: false,
          maybeDates: ['2099-05-22', '2099-05-20', '2099-05-21']
        } as any}
      />
    );

    expect(html).toContain('Maybe');
    expect(html).toContain('5/20, 5/21, 5/22');
    expect(html).not.toContain('+2');
  });

  test('renders inline Maybe shortcuts and renames next-week quick labels to +7', () => {
    const html = renderToStaticMarkup(
      <TodoQuickActionsModal
        {...baseProps}
        todo={{
          id: 'todo-6',
          categoryId: 'cat-a',
          title: 'Shortcut row',
          isCompleted: false
        } as any}
      />
    );

    expect(html).toContain('Maybe');
    expect(html).toContain('今');
    expect(html).toContain('明');
    expect(html.match(/\+7/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
