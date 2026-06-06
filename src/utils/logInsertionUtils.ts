/**
 * @file logInsertionUtils.ts
 * @input Existing timeline logs plus candidate new logs
 * @output Shared deduplicated insertion helpers for new timeline records
 * @description Provides one insertion path for brand-new logs so callers can reject duplicates whose hard fields already exist, while still allowing normal edits by id elsewhere.
 * @updated 2026-06-06: Added hard-field duplicate detection for new logs based on start/end time plus note equality.
 */
import type { Log } from '../types';

const normalizeLogNote = (note?: string): string => (note ?? '').trim();

export const areLogsHardDuplicate = (left: Log, right: Log): boolean => (
  left.startTime === right.startTime
  && left.endTime === right.endTime
  && normalizeLogNote(left.note) === normalizeLogNote(right.note)
);

export const hasHardDuplicateLog = (
  existingLogs: Log[],
  candidateLog: Log
): boolean => existingLogs.some((existingLog) => areLogsHardDuplicate(existingLog, candidateLog));

export const prependLogsWithDedupe = (
  existingLogs: Log[],
  candidateLogs: Log[]
): { logs: Log[]; insertedLogs: Log[]; skippedLogs: Log[] } => {
  const nextLogs = [...existingLogs];
  const insertedLogs: Log[] = [];
  const skippedLogs: Log[] = [];

  candidateLogs.forEach((candidateLog) => {
    if (hasHardDuplicateLog(nextLogs, candidateLog)) {
      skippedLogs.push(candidateLog);
      return;
    }

    nextLogs.unshift(candidateLog);
    insertedLogs.push(candidateLog);
  });

  return {
    logs: nextLogs,
    insertedLogs,
    skippedLogs
  };
};
