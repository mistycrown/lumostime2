import { describe, expect, it } from 'vitest';
import type { Log } from '../types';
import { replaceLogCollectionEntriesWithSplit, replaceLogWithSplit, splitLogAtTime } from './logSplitUtils';

const buildLog = (overrides: Partial<Log> = {}): Log => ({
  id: 'source-log',
  activityId: 'activity-1',
  categoryId: 'category-1',
  startTime: 0,
  endTime: 10_000,
  duration: 10,
  note: 'Deep work',
  linkedTodoId: 'todo-1',
  progressIncrement: 7,
  scopeIds: ['scope-1'],
  images: ['image-1'],
  comments: [{ id: 'comment-1', content: 'note', createdAt: 1 }],
  reactions: ['👍'],
  ...overrides
});

describe('splitLogAtTime', () => {
  it('creates two equivalent records at the selected time and conserves progress', () => {
    const ids = ['first-log', 'second-log'];
    const result = splitLogAtTime(buildLog(), 4_000, () => ids.shift()!);

    expect(result).toEqual({
      firstLog: expect.objectContaining({
        id: 'first-log',
        startTime: 0,
        endTime: 4_000,
        duration: 4,
        progressIncrement: 3
      }),
      secondLog: expect.objectContaining({
        id: 'second-log',
        startTime: 4_000,
        endTime: 10_000,
        duration: 6,
        progressIncrement: 4
      })
    });
    expect(result!.firstLog.progressIncrement! + result!.secondLog.progressIncrement!).toBe(7);
    expect(result!.firstLog.images).toEqual(['image-1']);
    expect(result!.secondLog.comments).toEqual([{ id: 'comment-1', content: 'note', createdAt: 1 }]);
  });

  it('preserves undefined progress increments', () => {
    const result = splitLogAtTime(buildLog({ progressIncrement: undefined }), 5_000, () => 'split-log');

    expect(result!.firstLog.progressIncrement).toBeUndefined();
    expect(result!.secondLog.progressIncrement).toBeUndefined();
  });

  it('rejects split points at or outside the record boundaries', () => {
    const log = buildLog();

    expect(splitLogAtTime(log, 0)).toBeNull();
    expect(splitLogAtTime(log, 10_000)).toBeNull();
    expect(splitLogAtTime(log, 12_000)).toBeNull();
  });

  it('replaces the source record in its original list position', () => {
    const sourceLog = buildLog();
    const splitLogs = splitLogAtTime(sourceLog, 5_000, (() => {
      const ids = ['first', 'second'];
      return () => ids.shift()!;
    })())!;

    const logs = replaceLogWithSplit([buildLog({ id: 'before' }), sourceLog, buildLog({ id: 'after' })], sourceLog.id, splitLogs);

    expect(logs.map((log) => log.id)).toEqual(['before', 'first', 'second', 'after']);
  });

  it('moves every source collection membership to both split records', () => {
    const sourceLog = buildLog();
    const splitLogs = splitLogAtTime(sourceLog, 5_000, (() => {
      const ids = ['first', 'second'];
      return () => ids.shift()!;
    })())!;
    const entryIds = ['first-a', 'second-a', 'first-b', 'second-b'];

    const entries = replaceLogCollectionEntriesWithSplit([
      { id: 'source-a', collectionId: 'collection-a', itemType: 'log', itemId: sourceLog.id, addedAt: 1 },
      { id: 'source-b', collectionId: 'collection-b', itemType: 'log', itemId: sourceLog.id, addedAt: 2 },
      { id: 'todo-entry', collectionId: 'collection-a', itemType: 'todo', itemId: 'todo-1', addedAt: 3 }
    ], sourceLog.id, splitLogs, () => entryIds.shift()!);

    expect(entries).toEqual([
      { id: 'todo-entry', collectionId: 'collection-a', itemType: 'todo', itemId: 'todo-1', addedAt: 3 },
      { id: 'first-a', collectionId: 'collection-a', itemType: 'log', itemId: 'first', addedAt: 1 },
      { id: 'second-a', collectionId: 'collection-a', itemType: 'log', itemId: 'second', addedAt: 1 },
      { id: 'first-b', collectionId: 'collection-b', itemType: 'log', itemId: 'first', addedAt: 2 },
      { id: 'second-b', collectionId: 'collection-b', itemType: 'log', itemId: 'second', addedAt: 2 }
    ]);
  });
});
