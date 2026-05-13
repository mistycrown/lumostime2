/**
 * @file TodoQuickActionsModal.test.tsx
 * @input TodoQuickActionsModal props
 * @output Regression coverage for quick category move visibility in the shared todo quick-actions sheet
 * @pos Test
 * @description Ensures the shared quick-actions modal only exposes category move for standalone todos and still offers quick-todo project upgrades through the shared category-picker flow.
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
  onMoveCategory: vi.fn(),
  onUpgradeToProject: vi.fn(),
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
});
