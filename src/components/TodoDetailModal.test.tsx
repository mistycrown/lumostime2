/**
 * @file TodoDetailModal.test.tsx
 * @input TodoDetailModal component props
 * @output Regression coverage for parent-task detail rendering from subtask navigation
 * @pos Test
 * @description Ensures parent todo detail pages render safely so subtask inheritance links can open their parent without crashing.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { TodoDetailModal } from './TodoDetailModal';

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn()
  })
}));

vi.mock('./ScopeAssociation', () => ({
  ScopeAssociation: () => null
}));

vi.mock('./TagAssociation', () => ({
  TagAssociation: () => null
}));

vi.mock('./DetailTimelineCard', () => ({
  DetailTimelineCard: () => <div data-testid="detail-timeline-card" />
}));

vi.mock('./TimelineImage', () => ({
  TimelineImage: () => null
}));

vi.mock('./TodoDatePickerModal', () => ({
  TodoDatePickerModal: () => null
}));

vi.mock('./IconRenderer', () => ({
  IconRenderer: () => <span data-testid="icon-renderer" />
}));

vi.mock('../services/imageService', () => ({
  imageService: {
    uploadImage: vi.fn(),
    deleteImage: vi.fn()
  }
}));

const todoCategories = [
  {
    id: 'cat-1',
    name: '毕业论文',
    icon: 'book',
    uiIcon: 'book'
  }
] as any;

const activityCategories = [
  {
    id: 'activity-category-1',
    name: '学习',
    activities: [
      {
        id: 'activity-1',
        name: '上课开会',
        icon: 'clock',
        uiIcon: 'clock'
      }
    ]
  }
] as any;

describe('TodoDetailModal parent navigation regression', () => {
  test('renders a parent todo detail page without crashing when recurrence is absent', () => {
    const parentTodo = {
      id: 'parent-1',
      categoryId: 'cat-1',
      title: '测试添加',
      isCompleted: false,
      linkedCategoryId: 'activity-category-1',
      linkedActivityId: 'activity-1'
    } as any;

    const html = renderToStaticMarkup(
      <TodoDetailModal
        initialTodo={parentTodo}
        currentCategory={todoCategories[0]}
        displayMode="page"
        onClose={() => {}}
        onSave={() => {}}
        onOpenTodo={() => {}}
        logs={[]}
        todoCategories={todoCategories}
        categories={activityCategories}
        scopes={[]}
        todos={[parentTodo]}
      />
    );

    expect(html).toContain('测试添加');
    expect(html).toContain('detail-timeline-card');
  });
});
