import { describe, expect, it } from 'vitest';
import type { Log } from '../types';
import {
  areLogsHardDuplicate,
  hasHardDuplicateLog,
  prependLogsWithDedupe
} from './logInsertionUtils';

const buildLog = (overrides: Partial<Log> = {}): Log => ({
  id: 'log-1',
  activityId: 'activity-1',
  categoryId: 'category-1',
  startTime: 1000,
  endTime: 2000,
  duration: 1000,
  note: 'same note',
  ...overrides
});

describe('logInsertionUtils', () => {
  it('treats same start/end/note as a hard duplicate even when ids differ', () => {
    expect(
      areLogsHardDuplicate(
        buildLog({ id: 'log-1' }),
        buildLog({ id: 'log-2' })
      )
    ).toBe(true);
  });

  it('normalizes blank notes when checking duplicates', () => {
    expect(
      areLogsHardDuplicate(
        buildLog({ note: '   ' }),
        buildLog({ id: 'log-2', note: '' })
      )
    ).toBe(true);
  });

  it('reports whether an incoming log already exists by hard fields', () => {
    expect(
      hasHardDuplicateLog(
        [buildLog({ id: 'existing' })],
        buildLog({ id: 'candidate' })
      )
    ).toBe(true);
  });

  it('skips duplicate inserts while keeping unique logs', () => {
    const result = prependLogsWithDedupe(
      [buildLog({ id: 'existing' })],
      [
        buildLog({ id: 'duplicate' }),
        buildLog({ id: 'unique', startTime: 3000, endTime: 4000 })
      ]
    );

    expect(result.insertedLogs.map((log) => log.id)).toEqual(['unique']);
    expect(result.skippedLogs.map((log) => log.id)).toEqual(['duplicate']);
    expect(result.logs.map((log) => log.id)).toEqual(['unique', 'existing']);
  });
});
