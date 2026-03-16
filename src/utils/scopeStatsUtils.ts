/**
 * @file scopeStatsUtils.ts
 * @input Logs with scopeIds and duration fields
 * @output Shared helpers for scope duration aggregation
 * @description Centralizes scope duration rules so all views count full duration for every linked scope.
 */

import { Log } from '../types';

type ScopeLogLike = Pick<Log, 'duration' | 'startTime' | 'endTime' | 'scopeIds'>;

export interface ScopeDurationSummary {
  totalAttributedDuration: number;
  scopeDurations: Map<string, number>;
}

export function getLogDurationSeconds(log: Pick<Log, 'duration' | 'startTime' | 'endTime'>): number {
  if (typeof log.duration === 'number' && Number.isFinite(log.duration)) {
    return Math.max(0, log.duration);
  }

  return Math.max(0, (log.endTime - log.startTime) / 1000);
}

export function getNormalizedScopeIds(scopeIds?: string[]): string[] {
  if (!scopeIds || scopeIds.length === 0) {
    return [];
  }

  return Array.from(new Set(scopeIds.filter((scopeId): scopeId is string => Boolean(scopeId))));
}

export function summarizeScopeDurations(logs: ScopeLogLike[]): ScopeDurationSummary {
  const scopeDurations = new Map<string, number>();
  let totalAttributedDuration = 0;

  logs.forEach((log) => {
    const scopeIds = getNormalizedScopeIds(log.scopeIds);
    if (scopeIds.length === 0) {
      return;
    }

    const duration = getLogDurationSeconds(log);
    scopeIds.forEach((scopeId) => {
      scopeDurations.set(scopeId, (scopeDurations.get(scopeId) || 0) + duration);
      totalAttributedDuration += duration;
    });
  });

  return {
    totalAttributedDuration,
    scopeDurations
  };
}
