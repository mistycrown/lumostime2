import { describe, expect, it } from 'vitest';
import type { Log } from '../types';
import {
  getAdjacentActualLogs,
  mergeLogCollectionEntriesIntoTarget,
  mergeLogsIntoTarget,
  replaceLogCollectionEntriesWithSplit,
  replaceLogsWithMerge,
  replaceLogWithSplit,
  splitLogAtTime
} from './logSplitUtils';

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

describe('mergeLogsIntoTarget', () => {
  it('finds only actual chronological neighbors', () => {
    const currentLog = buildLog({ id: 'current', startTime: 10_000, endTime: 12_000 });
    const neighbors = getAdjacentActualLogs([
      buildLog({ id: 'planned', startTime: 0, endTime: 1_000, isPlanned: true }),
      buildLog({ id: 'previous', startTime: 2_000, endTime: 3_000 }),
      currentLog,
      buildLog({ id: 'next', startTime: 15_000, endTime: 16_000 })
    ], currentLog.id);

    expect(neighbors.previousLog?.id).toBe('previous');
    expect(neighbors.nextLog?.id).toBe('next');
    expect(getAdjacentActualLogs([currentLog], currentLog.id)).toEqual({ previousLog: null, nextLog: null });
  });

  it('keeps the target properties, includes the gap, and aggregates progress', () => {
    const sourceLog = buildLog({ id: 'current', startTime: 5_000, endTime: 10_000, progressIncrement: 2, note: 'current note' });
    const targetLog = buildLog({ id: 'previous', startTime: 0, endTime: 3_000, progressIncrement: 4, note: 'target note' });
    const result = mergeLogsIntoTarget(sourceLog, targetLog)!;

    expect(result.gapDuration).toBe(2_000);
    expect(result.mergedLog).toMatchObject({
      id: 'previous',
      startTime: 0,
      endTime: 10_000,
      duration: 10,
      progressIncrement: 6,
      note: 'target note'
    });
  });

  it('uses the full target range when merging into a later record', () => {
    const sourceLog = buildLog({ id: 'current', startTime: 5_000, endTime: 10_000, progressIncrement: undefined });
    const targetLog = buildLog({ id: 'next', startTime: 12_000, endTime: 18_000, progressIncrement: 3 });
    const result = mergeLogsIntoTarget(sourceLog, targetLog)!;

    expect(result.gapDuration).toBe(2_000);
    expect(result.mergedLog).toMatchObject({ startTime: 5_000, endTime: 18_000, duration: 13, progressIncrement: 3 });
  });

  it('replaces the target and removes the source record', () => {
    const sourceLog = buildLog({ id: 'source', startTime: 5_000, endTime: 10_000 });
    const targetLog = buildLog({ id: 'target', startTime: 0, endTime: 3_000 });
    const result = mergeLogsIntoTarget(sourceLog, targetLog)!;

    expect(replaceLogsWithMerge([targetLog, sourceLog, buildLog({ id: 'other' })], result).map((log) => log.id)).toEqual(['target', 'other']);
  });

  it('moves source collections to the target without duplicate memberships', () => {
    const entries = mergeLogCollectionEntriesIntoTarget([
      { id: 'target-a', collectionId: 'collection-a', itemType: 'log', itemId: 'target', addedAt: 1 },
      { id: 'source-a', collectionId: 'collection-a', itemType: 'log', itemId: 'source', addedAt: 2 },
      { id: 'source-b', collectionId: 'collection-b', itemType: 'log', itemId: 'source', addedAt: 3 },
      { id: 'todo-entry', collectionId: 'collection-b', itemType: 'todo', itemId: 'todo-1', addedAt: 4 }
    ], 'source', 'target');

    expect(entries).toEqual([
      { id: 'target-a', collectionId: 'collection-a', itemType: 'log', itemId: 'target', addedAt: 1 },
      { id: 'source-b', collectionId: 'collection-b', itemType: 'log', itemId: 'target', addedAt: 3 },
      { id: 'todo-entry', collectionId: 'collection-b', itemType: 'todo', itemId: 'todo-1', addedAt: 4 }
    ]);
  });
});
