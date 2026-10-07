/**
 * @file dailyBackupScheduler.test.ts
 * @input Fake local clocks, persistent storage and foreground/upload outcomes
 * @output Daily timing, background deferral, restart recovery and retry coverage
 * @pos Test (Cloud Backup)
 * @updated 2026-10-07: Verifies foreground-only daily backup scheduling.
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createDailyBackupScheduler, getNextDailyBackupAt, normalizeDailyBackupTime } from './dailyBackupScheduler';
import type { SyncAttempt } from './syncScheduler';

const localTime = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
let values: Map<string, string>;
let foreground: boolean;
let queues: ReturnType<typeof createDailyBackupScheduler>[];
const read = (key = 'destination-a') => JSON.parse(values.get(key)!);
const start = (run = vi.fn(async () => 'success' as SyncAttempt), time = '22:00', storageKey = 'destination-a') => {
  const queue = createDailyBackupScheduler({
    time, storageKey,
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } },
    isForeground: () => foreground, run
  });
  queues.push(queue);
  return { queue, run };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(localTime(7, 21, 59));
  values = new Map();
  queues = [];
  foreground = true;
});
afterEach(() => { queues.forEach(queue => queue.dispose()); vi.useRealTimers(); });

test('backs up at the selected minute once and schedules the next local day', async () => {
  const { queue, run } = start();
  await vi.advanceTimersByTimeAsync(59_999);
  expect(run).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(run).toHaveBeenCalledTimes(1);
  expect(read()).toEqual({ time: '22:00', nextDueAt: localTime(8, 22), pendingSince: null });
  queue.check();
  queue.check();
  await vi.advanceTimersByTimeAsync(0);
  expect(run).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
  expect(run).toHaveBeenCalledTimes(2);
});

test('persists a missed background deadline and catches up on foreground', async () => {
  foreground = false;
  const { queue, run } = start();
  await vi.advanceTimersByTimeAsync(120_000);
  expect(run).not.toHaveBeenCalled();
  expect(read().pendingSince).toBe(localTime(7, 22));
  foreground = true;
  queue.check();
  await vi.advanceTimersByTimeAsync(0);
  expect(run).toHaveBeenCalledTimes(1);
  expect(read().pendingSince).toBeNull();
});

test('reconstructs closed-app deadlines and merges several missed days into one backup', async () => {
  const first = start();
  first.queue.dispose();
  vi.setSystemTime(localTime(10, 9));
  const resumed = start();
  await vi.advanceTimersByTimeAsync(0);
  expect(first.run).not.toHaveBeenCalled();
  expect(resumed.run).toHaveBeenCalledTimes(1);
  expect(read().nextDueAt).toBe(localTime(10, 22));
});

test('failed backups survive restart before today\'s backup time', async () => {
  const first = start(vi.fn(async () => 'retry'));
  await vi.advanceTimersByTimeAsync(60_000);
  expect(read().pendingSince).toBe(localTime(7, 22));
  first.queue.dispose();
  vi.setSystemTime(localTime(8, 8));
  const resumed = start();
  await vi.advanceTimersByTimeAsync(0);
  expect(resumed.run).toHaveBeenCalledTimes(1);
  expect(read().pendingSince).toBeNull();
});

test('serializes duplicate lifecycle triggers and persists pending work before upload completes', async () => {
  let finish!: (value: SyncAttempt) => void;
  const run = vi.fn(() => new Promise<SyncAttempt>(resolve => { finish = resolve; }));
  const { queue } = start(run);
  await vi.advanceTimersByTimeAsync(60_000);
  queue.check();
  queue.check();
  expect(run).toHaveBeenCalledTimes(1);
  expect(read().pendingSince).toBe(localTime(7, 22));
  finish('success');
  await vi.advanceTimersByTimeAsync(0);
  expect(read().pendingSince).toBeNull();
});

test('retries with backoff and pauses every network attempt while backgrounded', async () => {
  const { queue, run } = start(vi.fn(async () => 'retry'));
  await vi.advanceTimersByTimeAsync(60_000);
  await vi.advanceTimersByTimeAsync(4999);
  expect(run).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(run).toHaveBeenCalledTimes(2);
  foreground = false;
  queue.check();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(run).toHaveBeenCalledTimes(2);
  foreground = true;
  queue.check();
  await vi.advanceTimersByTimeAsync(0);
  expect(run).toHaveBeenCalledTimes(3);
});

test('blocked or thrown uploads remain pending, and disposal stops retries', async () => {
  const run = vi.fn(async () => 'blocked' as SyncAttempt);
  const { queue } = start(run);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(read().pendingSince).not.toBeNull();
  run.mockRejectedValueOnce(new Error('offline'));
  await vi.advanceTimersByTimeAsync(5000);
  expect(read().pendingSince).not.toBeNull();
  queue.dispose();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(run).toHaveBeenCalledTimes(2);
});

test('time changes reschedule future work and preserve already missed backups', async () => {
  const first = start();
  first.queue.dispose();
  const changed = start(undefined, '23:00');
  expect(read().nextDueAt).toBe(localTime(7, 23));
  foreground = false;
  await vi.advanceTimersByTimeAsync(61 * 60_000);
  changed.queue.dispose();
  start(undefined, '08:00');
  expect(read().pendingSince).toBe(localTime(7, 23));
});

test('destinations are independent and invalid persisted state starts fresh', async () => {
  const first = start();
  first.queue.dispose();
  vi.setSystemTime(localTime(8, 9));
  const other = start(undefined, '22:00', 'destination-b');
  await vi.advanceTimersByTimeAsync(0);
  expect(other.run).not.toHaveBeenCalled();
  values.set('broken', '{invalid');
  start(undefined, '22:00', 'broken');
  expect(read('broken').nextDueAt).toBe(localTime(8, 22));
});

test('invalid times fall back and midnight uses local calendar dates', () => {
  expect(normalizeDailyBackupTime('25:99')).toBe('22:00');
  expect(normalizeDailyBackupTime(null)).toBe('22:00');
  expect(normalizeDailyBackupTime('00:00')).toBe('00:00');
  expect(getNextDailyBackupAt('00:00', localTime(7, 23, 59))).toBe(localTime(8, 0));
  expect(getNextDailyBackupAt('22:00', localTime(7, 22))).toBe(localTime(8, 22));
});
