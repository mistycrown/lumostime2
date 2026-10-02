/**
 * @file syncScheduler.test.ts
 * @input Fake timers and controllable transfer completions
 * @output Coverage for coalescing, bounded latency, retries and disposal
 * @pos Test (Cloud Sync)
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createSyncScheduler, SyncAttempt } from './syncScheduler';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => vi.useRealTimers());

test('all edit sources share one five-second debounce', async () => {
  const run = vi.fn(async () => 'success' as const);
  const queue = createSyncScheduler(run);
  queue.request('auto');
  await vi.advanceTimersByTimeAsync(4000);
  queue.request('auto');
  await vi.advanceTimersByTimeAsync(4999);
  expect(run).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(run).toHaveBeenCalledTimes(1);
  queue.dispose();
});

test('continuous editing is flushed within thirty seconds', async () => {
  const run = vi.fn(async () => 'success' as const);
  const queue = createSyncScheduler(run);
  for (let i = 0; i < 10; i++) {
    queue.request('auto');
    await vi.advanceTimersByTimeAsync(3000);
  }
  expect(run).toHaveBeenCalledTimes(1);
  queue.dispose();
});

test('edits during transfer schedule one follow-up without overlapping requests', async () => {
  let finish!: (outcome: SyncAttempt) => void;
  const run = vi.fn(() => new Promise<SyncAttempt>(resolve => { finish = resolve; }));
  const queue = createSyncScheduler(run);
  queue.request('startup', true);
  await vi.advanceTimersByTimeAsync(0);
  queue.request('auto');
  queue.request('auto');
  await vi.advanceTimersByTimeAsync(10000);
  expect(run).toHaveBeenCalledTimes(1);
  finish('success');
  await vi.advanceTimersByTimeAsync(0);
  expect(run).toHaveBeenCalledTimes(2);
  finish('success');
  queue.dispose();
});

test('failures back off and reconnect bypasses the pending delay', async () => {
  const run = vi.fn(async () => 'retry' as const);
  const queue = createSyncScheduler(run);
  queue.request('startup', true);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(5000);
  expect(run).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(9999);
  expect(run).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(run).toHaveBeenCalledTimes(3);
  queue.request('resume', true);
  await vi.advanceTimersByTimeAsync(0);
  expect(run).toHaveBeenCalledTimes(4);
  queue.dispose();
});

test('a foreground check inside cooldown is deferred rather than lost', async () => {
  const run = vi.fn(async () => 'success' as const);
  const queue = createSyncScheduler(run);
  queue.request('startup', true);
  await vi.advanceTimersByTimeAsync(1000);
  queue.request('resume');
  await vi.advanceTimersByTimeAsync(29000);
  expect(run).toHaveBeenCalledTimes(2);
  queue.dispose();
});

test('conflicts stop automatic retries and disposal cancels outstanding timers', async () => {
  const run = vi.fn(async () => 'blocked' as const);
  const queue = createSyncScheduler(run);
  queue.request('startup', true);
  await vi.advanceTimersByTimeAsync(600000);
  expect(run).toHaveBeenCalledTimes(1);
  queue.request('auto');
  queue.dispose();
  await vi.advanceTimersByTimeAsync(600000);
  expect(run).toHaveBeenCalledTimes(1);
});

test('background handoff flushes pending edits immediately', async () => {
  const run = vi.fn(async () => 'success' as const);
  const queue = createSyncScheduler(run);
  queue.request('auto');
  await vi.advanceTimersByTimeAsync(1000);
  queue.request('auto', true);
  await vi.advanceTimersByTimeAsync(0);
  expect(run).toHaveBeenCalledTimes(1);
  queue.dispose();
});

test('new edits cannot defeat retry backoff and retries are capped at five minutes', async () => {
  const run = vi.fn(async () => 'retry' as const);
  const queue = createSyncScheduler(run);
  queue.request('startup', true);
  await vi.advanceTimersByTimeAsync(0);
  for (const delay of [5000, 10000, 20000, 40000, 80000, 160000, 300000, 300000]) {
    const count = run.mock.calls.length;
    queue.request('auto');
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(run).toHaveBeenCalledTimes(count);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(count + 1);
  }
  queue.dispose();
});
