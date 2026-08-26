/**
 * @file logSplitUtils.ts
 * @input A persisted log, a split timestamp, and optional id generator
 * @output Two equivalent time-segment logs or null for an invalid split
 * @description Splits a record while preserving all fields and allocating manual todo progress proportionally.
 * @updated 2026-08-26: Added focus-record time split construction with progress conservation.
 */
import type { DataCollectionEntry, Log } from '../types';

export interface SplitLogResult {
  firstLog: Log;
  secondLog: Log;
}

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
