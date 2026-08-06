import { describe, expect, test } from 'vitest';
import { Activity, Category, Scope } from '../types';
import { getActiveActivities, getActiveScopes, isActivityArchived, isScopeArchived } from './archiveUtils';

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

  test('filters archived activities without mutating the category', () => {
    const category = { id: 'cat', name: 'Category', icon: '*', activities: [activity('active'), activity('archived', true)], themeColor: '#000' } as Category;
    expect(getActiveActivities(category).map(item => item.id)).toEqual(['active']);
    expect(category.activities).toHaveLength(2);
  });

  test('filters archived scopes', () => {
    const active = { id: 's1', name: 'Active', icon: '*', isArchived: false, order: 0, themeColor: '#000' } as Scope;
    const archived = { id: 's2', name: 'Archived', icon: '*', isArchived: true, order: 1, themeColor: '#000' } as Scope;
    expect(isScopeArchived(archived)).toBe(true);
    expect(getActiveScopes([active, archived])).toEqual([active]);
  });
});
