/**
 * @file TodoQuickActionsModal.test.tsx
 * @input TodoQuickActionsModal props
 * @output Regression coverage for quick category move visibility and Maybe-date summary rendering in the shared todo quick-actions sheet
 * @pos Test
 * @description Ensures the shared quick-actions modal only exposes category move for standalone todos, still offers quick-todo project upgrades through the shared category-picker flow, and summarizes Maybe dates as compact title metadata.
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
  onClearDate: vi.fn(),
  onOpenDetail: vi.fn(),
  onComplete: vi.fn(),
  onUndoComplete: vi.fn(),
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
