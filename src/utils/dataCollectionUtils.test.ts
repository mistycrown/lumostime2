/**
 * @file dataCollectionUtils.test.ts
 * @input Shared collection utility helpers
 * @output Regression coverage for collection membership updates and mixed-item resolution
 * @pos Test (data collection helpers)
 * @description Verifies that collection membership updates stay deduplicated and that collection detail resolution ignores stale item references.
 * @updated 2026-05-21: Added regression coverage for collection timeline todo timestamp priority across linked logs, todo creation time, and membership fallback.
 * @updated 2026-05-14: Added regression coverage for batch appends into a single collection detail flow.
 * @updated 2026-05-12: Added first-pass coverage for data collection helper behavior.
 */
import { describe, expect, test, vi } from 'vitest';
import {
  appendDataCollectionEntries,
  buildDataCollectionCountMap,
  getCollectionTimelineTodoTimestamp,
  getDataCollectionIdsForItem,
  hasDataCollectionMembershipChanged,
  resolveDataCollectionItems,
  upsertDataCollectionEntriesForItem
} from './dataCollectionUtils';
import { DataCollection, DataCollectionEntry, Log, TodoItem } from '../types';

describe('dataCollectionUtils', () => {
  test('appendDataCollectionEntries adds only missing item memberships for one collection', () => {
    const entries: DataCollectionEntry[] = [
      {
        id: 'entry-log-1',
        collectionId: 'social',
        itemType: 'log',
        itemId: 'log-1',
        addedAt: 10
      },
      {
        id: 'entry-todo-1',
        collectionId: 'social',
        itemType: 'todo',
        itemId: 'todo-1',
        addedAt: 20
      }
    ];

    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('entry-log-2')
      .mockReturnValueOnce('entry-log-3');

    const nextEntries = appendDataCollectionEntries({
      entries,
      collectionId: 'social',
      itemType: 'log',
      itemIds: ['log-1', 'log-2', 'log-2', 'log-3'],
      addedAt: 88
    });

    expect(nextEntries).toHaveLength(4);
    expect(nextEntries.filter((entry) => entry.collectionId === 'social' && entry.itemType === 'log')).toEqual([
      {
        id: 'entry-log-1',
        collectionId: 'social',
        itemType: 'log',
        itemId: 'log-1',
        addedAt: 10
      },
      {
        id: 'entry-log-2',
        collectionId: 'social',
        itemType: 'log',
        itemId: 'log-2',
        addedAt: 88
      },
      {
        id: 'entry-log-3',
        collectionId: 'social',
        itemType: 'log',
        itemId: 'log-3',
        addedAt: 88
      }
    ]);
    expect(nextEntries.find((entry) => entry.id === 'entry-todo-1')).toBeTruthy();
  });

  test('upsertDataCollectionEntriesForItem preserves existing entries and removes deselected memberships', () => {
    const entries: DataCollectionEntry[] = [
      {
        id: 'entry-log-alpha',
        collectionId: 'alpha',
        itemType: 'log',
        itemId: 'log-1',
        addedAt: 10
      },
      {
        id: 'entry-log-beta',
        collectionId: 'beta',
        itemType: 'log',
        itemId: 'log-1',
        addedAt: 20
      },
      {
        id: 'entry-other',
        collectionId: 'alpha',
        itemType: 'todo',
        itemId: 'todo-1',
        addedAt: 30
      }
    ];

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('entry-log-gamma');

    const nextEntries = upsertDataCollectionEntriesForItem({
      entries,
      collectionIds: ['beta', 'gamma', 'gamma'],
      itemType: 'log',
      itemId: 'log-1',
      addedAt: 99
    });

    expect(getDataCollectionIdsForItem(nextEntries, 'log', 'log-1').sort()).toEqual(['beta', 'gamma']);
    expect(nextEntries.find((entry) => entry.id === 'entry-log-beta')?.addedAt).toBe(20);
    expect(nextEntries.find((entry) => entry.id === 'entry-log-gamma')).toEqual({
      id: 'entry-log-gamma',
      collectionId: 'gamma',
      itemType: 'log',
      itemId: 'log-1',
      addedAt: 99
    });
    expect(nextEntries.find((entry) => entry.id === 'entry-other')).toBeTruthy();
  });

  test('resolveDataCollectionItems sorts by addedAt descending and drops missing references', () => {
    const entries: DataCollectionEntry[] = [
      {
        id: 'entry-1',
        collectionId: 'social',
        itemType: 'log',
        itemId: 'log-1',
        addedAt: 100
      },
      {
        id: 'entry-2',
        collectionId: 'social',
        itemType: 'todo',
        itemId: 'todo-1',
        addedAt: 200
      },
      {
        id: 'entry-3',
        collectionId: 'social',
        itemType: 'log',
        itemId: 'missing-log',
        addedAt: 300
      }
    ];

    const logs: Log[] = [
      {
        id: 'log-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: 0,
        endTime: 60,
        duration: 60
      }
    ];
    const todos: TodoItem[] = [
      {
        id: 'todo-1',
        categoryId: 'todo-category',
        title: 'Follow up',
        isCompleted: false
      }
    ];

    const items = resolveDataCollectionItems('social', entries, logs, todos);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.entry.id)).toEqual(['entry-2', 'entry-1']);
  });

  test('buildDataCollectionCountMap counts only resolvable items', () => {
    const collections: DataCollection[] = [
      { id: 'social', name: 'Social', createdAt: 1, updatedAt: 1 },
      { id: 'writing', name: 'Writing', createdAt: 1, updatedAt: 1 }
    ];
    const entries: DataCollectionEntry[] = [
      { id: '1', collectionId: 'social', itemType: 'log', itemId: 'log-1', addedAt: 1 },
      { id: '2', collectionId: 'social', itemType: 'todo', itemId: 'todo-1', addedAt: 2 },
      { id: '3', collectionId: 'writing', itemType: 'log', itemId: 'missing-log', addedAt: 3 }
    ];
    const logs: Log[] = [
      {
        id: 'log-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        startTime: 0,
        endTime: 60,
        duration: 60
      }
    ];
    const todos: TodoItem[] = [
      {
        id: 'todo-1',
        categoryId: 'todo-category',
        title: 'Follow up',
        isCompleted: false
      }
    ];

    const countMap = buildDataCollectionCountMap(collections, entries, logs, todos);

    expect(countMap.get('social')).toEqual({
      total: 2,
      logCount: 1,
      todoCount: 1
    });
    expect(countMap.get('writing')).toEqual({
      total: 0,
      logCount: 0,
      todoCount: 0
    });
    expect(hasDataCollectionMembershipChanged(entries, ['social'], 'log', 'log-1')).toBe(false);
    expect(hasDataCollectionMembershipChanged(entries, ['writing'], 'log', 'log-1')).toBe(true);
  });

  test('getCollectionTimelineTodoTimestamp prefers latest linked log, then todo createdAt, then entry addedAt', () => {
    const logs: Log[] = [
      {
        id: 'log-1',
        activityId: 'activity-1',
        categoryId: 'category-1',
        linkedTodoId: 'todo-with-logs',
        startTime: 100,
        endTime: 160,
        duration: 60
      },
      {
        id: 'log-2',
        activityId: 'activity-1',
        categoryId: 'category-1',
        linkedTodoId: 'todo-with-logs',
        startTime: 240,
        endTime: 300,
        duration: 60
      }
    ];

    expect(getCollectionTimelineTodoTimestamp({
      id: 'todo-with-logs',
      categoryId: 'todo-category',
      title: 'Linked',
      isCompleted: false,
      createdAt: 20
    }, logs, 10)).toBe(240);

    expect(getCollectionTimelineTodoTimestamp({
      id: 'todo-with-created-at',
      categoryId: 'todo-category',
      title: 'Created fallback',
      isCompleted: false,
      createdAt: 500
    }, logs, 10)).toBe(500);

    expect(getCollectionTimelineTodoTimestamp({
      id: 'todo-without-dates',
      categoryId: 'todo-category',
      title: 'Entry fallback',
      isCompleted: false
    }, logs, 777)).toBe(777);
  });
});
