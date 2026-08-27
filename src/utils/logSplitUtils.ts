/**
 * @file logSplitUtils.ts
 * @input Persisted logs, split timestamps, and optional id generators
 * @output Split or merged logs plus collection membership migrations
 * @description Preserves record and collection invariants for focus-record time splitting and merging.
 * @updated 2026-08-27: Added target-property merge construction and collection membership transfer.
 * @updated 2026-08-26: Added focus-record time split construction with progress conservation.
 */
import type { DataCollectionEntry, Log } from '../types';

export interface SplitLogResult {
  firstLog: Log;
  secondLog: Log;
}

export interface MergeLogResult {
  sourceLog: Log;
  targetLog: Log;
  mergedLog: Log;
  gapDuration: number;
}

export interface AdjacentLogResult {
  previousLog: Log | null;
  nextLog: Log | null;
}

export const getAdjacentActualLogs = (logs: Log[], sourceLogId: string): AdjacentLogResult => {
  const actualLogs = logs
    .filter((log) => !log.isPlanned)
    .sort((left, right) => (
      left.startTime - right.startTime
      || left.endTime - right.endTime
      || left.id.localeCompare(right.id)
    ));
  const sourceIndex = actualLogs.findIndex((log) => log.id === sourceLogId);

  return {
    previousLog: sourceIndex > 0 ? actualLogs[sourceIndex - 1] : null,
    nextLog: sourceIndex >= 0 && sourceIndex < actualLogs.length - 1 ? actualLogs[sourceIndex + 1] : null
  };
};

export const splitLogAtTime = (
  sourceLog: Log,
  splitTime: number,
  createId: () => string = () => crypto.randomUUID()
): SplitLogResult | null => {
  if (!Number.isFinite(splitTime) || splitTime <= sourceLog.startTime || splitTime >= sourceLog.endTime) {
    return null;
  }

  const totalDuration = sourceLog.endTime - sourceLog.startTime;
  const firstDuration = splitTime - sourceLog.startTime;
  const secondDuration = sourceLog.endTime - splitTime;
  const hasProgressIncrement = typeof sourceLog.progressIncrement === 'number';
  const firstProgressIncrement = hasProgressIncrement
    ? Math.round(sourceLog.progressIncrement! * firstDuration / totalDuration)
    : undefined;
  const secondProgressIncrement = hasProgressIncrement
    ? sourceLog.progressIncrement! - firstProgressIncrement!
    : undefined;

  return {
    firstLog: {
      ...sourceLog,
      id: createId(),
      endTime: splitTime,
      duration: firstDuration / 1000,
      progressIncrement: firstProgressIncrement
    },
    secondLog: {
      ...sourceLog,
      id: createId(),
      startTime: splitTime,
      duration: secondDuration / 1000,
      progressIncrement: secondProgressIncrement
    }
  };
};

export const replaceLogWithSplit = (
  logs: Log[],
  sourceLogId: string,
  splitLogs: SplitLogResult
): Log[] => logs.flatMap((log) => (
  log.id === sourceLogId
    ? [splitLogs.firstLog, splitLogs.secondLog]
    : [log]
));

export const replaceLogCollectionEntriesWithSplit = (
  entries: DataCollectionEntry[],
  sourceLogId: string,
  splitLogs: SplitLogResult,
  createId: () => string = () => crypto.randomUUID()
): DataCollectionEntry[] => {
  const sourceEntries = entries.filter((entry) => entry.itemType === 'log' && entry.itemId === sourceLogId);
  if (sourceEntries.length === 0) {
    return entries;
  }

  const unrelatedEntries = entries.filter((entry) => !(entry.itemType === 'log' && entry.itemId === sourceLogId));
  const splitEntries = sourceEntries.flatMap((entry) => [
    { ...entry, id: createId(), itemId: splitLogs.firstLog.id },
    { ...entry, id: createId(), itemId: splitLogs.secondLog.id }
  ]);

  return [...unrelatedEntries, ...splitEntries];
};

export const mergeLogsIntoTarget = (
  sourceLog: Log,
  targetLog: Log
): MergeLogResult | null => {
  if (sourceLog.id === targetLog.id) {
    return null;
  }

  const startTime = Math.min(sourceLog.startTime, targetLog.startTime);
  const endTime = Math.max(sourceLog.endTime, targetLog.endTime);
  const sourceBeforeTarget = sourceLog.endTime <= targetLog.startTime;
  const targetBeforeSource = targetLog.endTime <= sourceLog.startTime;
  const gapDuration = sourceBeforeTarget
    ? targetLog.startTime - sourceLog.endTime
    : targetBeforeSource
      ? sourceLog.startTime - targetLog.endTime
      : 0;
  const hasProgressIncrement = typeof sourceLog.progressIncrement === 'number'
    || typeof targetLog.progressIncrement === 'number';

  return {
    sourceLog,
    targetLog,
    gapDuration,
    mergedLog: {
      ...targetLog,
      startTime,
      endTime,
      duration: (endTime - startTime) / 1000,
      progressIncrement: hasProgressIncrement
        ? (sourceLog.progressIncrement || 0) + (targetLog.progressIncrement || 0)
        : undefined
    }
  };
};

export const replaceLogsWithMerge = (
  logs: Log[],
  mergeResult: MergeLogResult
): Log[] => logs.flatMap((log) => {
  if (log.id === mergeResult.sourceLog.id) {
    return [];
  }

  return log.id === mergeResult.targetLog.id ? [mergeResult.mergedLog] : [log];
});

export const mergeLogCollectionEntriesIntoTarget = (
  entries: DataCollectionEntry[],
  sourceLogId: string,
  targetLogId: string
): DataCollectionEntry[] => {
  const targetCollectionIds = new Set(entries
    .filter((entry) => entry.itemType === 'log' && entry.itemId === targetLogId)
    .map((entry) => entry.collectionId));

  return entries.flatMap((entry) => {
    if (entry.itemType !== 'log' || entry.itemId !== sourceLogId) {
      return [entry];
    }

    if (targetCollectionIds.has(entry.collectionId)) {
      return [];
    }

    targetCollectionIds.add(entry.collectionId);
    return [{ ...entry, itemId: targetLogId }];
  });
};
