import { describe, expect, test } from 'vitest';
import { Activity, Category, Scope, TodoCategory } from '../types';
import { getActiveActivities, getActiveScopes, isActivityArchived, isCategoryArchived, isScopeArchived, isTodoCategoryArchived, setCategoryArchiveState } from './archiveUtils';

const activity = (id: string, isArchived?: boolean): Activity => ({
  id,
  name: id,
  icon: '*',
  color: 'bg-stone-100 text-stone-600',
  ...(isArchived === undefined ? {} : { isArchived })
});

describe('archiveUtils', () => {
  test('treats missing activity archive state as active', () => {
    expect(isActivityArchived(activity('legacy'))).toBe(false);
    expect(isActivityArchived(activity('archived', true))).toBe(true);
  });

  test('treats missing category archive state as active', () => {
    const category = { id: 'legacy', name: 'Legacy', icon: '*', activities: [], themeColor: '#000' } as Category;
    expect(isCategoryArchived(category)).toBe(false);
  });

  test('filters archived activities without mutating the category', () => {
    const category = { id: 'cat', name: 'Category', icon: '*', activities: [activity('active'), activity('archived', true)], themeColor: '#000' } as Category;
    expect(getActiveActivities(category).map(item => item.id)).toEqual(['active']);
    expect(category.activities).toHaveLength(2);
  });

  test('hides all activities when the category itself is archived', () => {
    const category = { id: 'cat', name: 'Category', icon: '*', isArchived: true, activities: [activity('active')], themeColor: '#000' } as Category;
    expect(getActiveActivities(category)).toEqual([]);
  });

  test('cascades category archive and restore state to every activity', () => {
    const category = { id: 'cat', name: 'Category', icon: '*', activities: [activity('one'), activity('two', true)], themeColor: '#000' } as Category;
    const archived = setCategoryArchiveState(category, true);
    expect(archived.isArchived).toBe(true);
    expect(archived.activities.every((item) => item.isArchived === true)).toBe(true);

    const restored = setCategoryArchiveState(archived, false);
    expect(restored.isArchived).toBe(false);
    expect(restored.activities.every((item) => item.isArchived === false)).toBe(true);
  });

  test('filters archived scopes', () => {
    const active = { id: 's1', name: 'Active', icon: '*', isArchived: false, order: 0, themeColor: '#000' } as Scope;
    const archived = { id: 's2', name: 'Archived', icon: '*', isArchived: true, order: 1, themeColor: '#000' } as Scope;
    expect(isScopeArchived(archived)).toBe(true);
    expect(getActiveScopes([active, archived])).toEqual([active]);
  });

  test('treats missing todo-category archive state as active', () => {
    expect(isTodoCategoryArchived({ id: 'legacy' } as TodoCategory)).toBe(false);
    expect(isTodoCategoryArchived({ id: 'archived', isArchived: true } as TodoCategory)).toBe(true);
  });

});
