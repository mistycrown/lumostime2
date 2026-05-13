/**
 * @file TodoDetailModal.test.tsx
 * @input TodoDetailModal component props
 * @output Regression coverage for parent-task detail rendering from subtask navigation
 * @pos Test
 * @description Ensures parent todo detail pages render safely so subtask inheritance links can open their parent without crashing.
 * @updated 2026-05-13: Added persisted-todo resolution coverage so draft-created detail pages stop auto-saving in a loop after the first save.
 * @updated 2026-05-12: Added regression coverage so subtask detail pages show inherited linked activity and scope data from the live parent todo even when the child record itself is stale.
 * @updated 2026-04-22: Added regression coverage for parent timeline subtask badges and direct child-task log aggregation.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { resolvePersistedTodoForDetail, TodoDetailModal } from './TodoDetailModal';

let detailTimelineCardProps: any = null;

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
  DetailTimelineCard: (props: any) => {
    detailTimelineCardProps = props;
    return <div data-testid="detail-timeline-card" />;
  }
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
  test('prefers the live saved todo for draft-created detail sessions', () => {
    const savedTodo = {
      id: 'draft-1',
      categoryId: 'cat-1',
      title: 'Saved draft task',
      isCompleted: false
    } as any;

    expect(resolvePersistedTodoForDetail('draft-1', [savedTodo], null)).toEqual(savedTodo);
  });

  test('falls back to the initial todo when no live saved record exists yet', () => {
    const initialTodo = {
      id: 'todo-1',
      categoryId: 'cat-1',
      title: 'Initial task',
      isCompleted: false
    } as any;

    expect(resolvePersistedTodoForDetail('todo-1', [], initialTodo)).toEqual(initialTodo);
  });

  test('shows inherited parent link metadata for subtask drafts even when the child record is stale', () => {
    detailTimelineCardProps = null;

    const parentTodo = {
      id: 'parent-1',
      categoryId: 'cat-1',
      title: 'Parent task',
      isCompleted: false,
      linkedActivityId: 'activity-1',
      defaultScopeIds: ['scope-1']
    } as any;

    const html = renderToStaticMarkup(
      <TodoDetailModal
        initialDraft={{
          categoryId: 'cat-1',
          parentTodoId: 'parent-1',
          title: 'Draft child'
        }}
        currentCategory={todoCategories[0]}
        displayMode="page"
        onClose={() => {}}
        onSave={() => {}}
        onOpenTodo={() => {}}
        logs={[]}
        todoCategories={todoCategories}
        categories={[
          {
            id: 'activity-category-1',
            name: 'Study',
            activities: [
              {
                id: 'activity-1',
                name: 'Deep Work',
                icon: 'clock',
                uiIcon: 'clock'
              }
            ]
          }
        ] as any}
        scopes={[
          {
            id: 'scope-1',
            name: 'Major Input',
            icon: 'target',
            isArchived: false,
            order: 0,
            themeColor: '#000000'
          }
        ] as any}
        todos={[parentTodo]}
      />
    );

    expect(html).toContain('Study / Deep Work');
    expect(html).toContain('Major Input');
  });

  test('aggregates direct child logs into the parent timeline tab', () => {
    detailTimelineCardProps = null;

    const parentTodo = {
      id: 'parent-1',
      categoryId: 'cat-1',
      title: 'Parent task',
      isCompleted: false,
      linkedCategoryId: 'activity-category-1',
      linkedActivityId: 'activity-1'
    } as any;

    const childTodo = {
      id: 'child-1',
      categoryId: 'cat-1',
      parentTodoId: 'parent-1',
      title: 'Child task',
      isCompleted: false
    } as any;

    const unrelatedTodo = {
      id: 'other-1',
      categoryId: 'cat-1',
      title: 'Other task',
      isCompleted: false
    } as any;

    const logs = [
      {
        id: 'log-parent',
        categoryId: 'activity-category-1',
        activityId: 'activity-1',
        startTime: 10,
        endTime: 20,
        duration: 10,
        linkedTodoId: 'parent-1'
      },
      {
        id: 'log-child',
        categoryId: 'activity-category-1',
        activityId: 'activity-1',
        startTime: 30,
        endTime: 50,
        duration: 20,
        linkedTodoId: 'child-1'
      },
      {
        id: 'log-other',
        categoryId: 'activity-category-1',
        activityId: 'activity-1',
        startTime: 60,
        endTime: 90,
        duration: 30,
        linkedTodoId: 'other-1'
      }
    ] as any;

    renderToStaticMarkup(
      <TodoDetailModal
        initialTodo={parentTodo}
        currentCategory={todoCategories[0]}
        displayMode="page"
        onClose={() => {}}
        onSave={() => {}}
        onOpenTodo={() => {}}
        logs={logs}
        todoCategories={todoCategories}
        categories={activityCategories}
        scopes={[]}
        todos={[parentTodo, childTodo, unrelatedTodo]}
      />
    );

    expect(detailTimelineCardProps).not.toBeNull();
    expect(detailTimelineCardProps.filteredLogs.map((log: any) => log.id)).toEqual(['log-parent', 'log-child']);
    expect(detailTimelineCardProps.todos.map((todo: any) => todo.id)).toEqual(['parent-1', 'child-1']);

    const parentMetadataHtml = renderToStaticMarkup(detailTimelineCardProps.renderLogMetadata(logs[0]));
    const childMetadataHtml = renderToStaticMarkup(detailTimelineCardProps.renderLogMetadata(logs[1]));

    expect(parentMetadataHtml).not.toContain('@Parent task');
    expect(parentMetadataHtml).not.toContain('@Child task');
    expect(childMetadataHtml).toContain('@Child task');
  });

  test('renders a parent todo detail page without crashing when recurrence is absent', () => {
    detailTimelineCardProps = null;

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
