/**
 * @file useTodoManager.test.ts
 * @input Duplicated todo source data and duplicate options
 * @output Regression coverage for duplicate todo normalization and cleanup defaults
 * @pos Test
 * @description Verifies copied todos reset transient fields like cover images while preserving the existing duplicate cleanup toggles.
 * @updated 2026-06-06: Added regression coverage so duplicated todos no longer inherit the original cover image.
 */

import { describe, expect, test } from 'vitest';
import { TodoItem } from '../types';
import { buildDuplicatedTodo } from '../utils/todoDuplicateUtils';

describe('buildDuplicatedTodo', () => {
  test('clears the duplicated cover image by default', () => {
    const sourceTodo: TodoItem = {
      id: 'todo-1',
      categoryId: 'cat-1',
      title: 'Read book',
      isCompleted: true,
      completedAt: '2026-06-05T12:00:00.000Z',
      completedUnits: 3,
      coverImage: 'cover-image.webp',
      pin: true,
      scheduledDate: '2026-06-08',
      deadlineDate: '2026-06-09',
      maybeDates: ['2026-06-10'],
      linkedActivityId: 'activity-1',
      linkedCategoryId: 'category-1',
      defaultScopeIds: ['scope-1']
    };

    const duplicatedTodo = buildDuplicatedTodo(sourceTodo, {
      duplicateId: 'todo-2',
      title: 'Read book 副本',
      clearDates: false
    });

    expect(duplicatedTodo).toMatchObject({
      id: 'todo-2',
      title: 'Read book 副本',
      isCompleted: false,
      completedAt: undefined,
      completedUnits: 0,
      coverImage: undefined,
      pin: false,
      scheduledDate: '2026-06-08',
      deadlineDate: '2026-06-09',
      maybeDates: ['2026-06-10'],
      linkedActivityId: 'activity-1',
      linkedCategoryId: 'category-1',
      defaultScopeIds: ['scope-1']
    });
  });
});
