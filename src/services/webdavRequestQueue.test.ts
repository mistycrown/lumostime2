/**
 * @file webdavRequestQueue.test.ts
 * @input Concurrent requests, fake clocks, and WebDAV response/error headers
 * @output Request spacing, cooldown, and recovery regression checks
 * @pos Test (Cloud Sync)
 * @updated 2026-10-11: Covers serialized transfers and bounded backoff with Retry-After.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WebDAVRequestQueue } from './webdavRequestQueue';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());

it('serializes transfers and spaces Nutstore requests even when callers submit concurrently', async () => {
  const queue = new WebDAVRequestQueue(() => 3100);
  const started: number[] = [];
  let active = 0;
  let maxActive = 0;
  const operation = async () => {
    started.push(Date.now());
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 100));
    active -= 1;
  };
  const transfers = Promise.all([queue.run(operation), queue.run(operation), queue.run(operation)]);
  await vi.runAllTimersAsync();
  await transfers;
  expect(started).toEqual([0, 3100, 6200]);
  expect(maxActive).toBe(1);
});

it.each([429, 503])('blocks queued and new network requests after HTTP %s then recovers', async status => {
  const queue = new WebDAVRequestQueue();
  const unavailable = vi.fn().mockRejectedValue({ status });
  const next = vi.fn().mockResolvedValue('ok');
  const first = queue.run(unavailable);
  const queued = queue.run(next);
  await expect(first).rejects.toMatchObject({ status, retryAfterMs: 60_000 });
  await expect(queued).rejects.toMatchObject({ status });
  await expect(queue.run(next)).rejects.toMatchObject({ status });
  expect(next).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(await queue.run(next)).toBe('ok');
});

it.each([
  { headers: { 'Retry-After': '120' } },
  { response: { headers: new Headers({ 'Retry-After': '120' }) } },
  { headers: { 'retry-after': 'Thu, 01 Jan 1970 00:02:00 GMT' } }
])('respects server Retry-After headers: %j', async headers => {
  const queue = new WebDAVRequestQueue();
  await expect(queue.run(async () => { throw { status: 503, ...headers }; }))
    .rejects.toMatchObject({ status: 503, retryAfterMs: 120_000 });
});

it('recognizes resolved native error responses and increases cooldown after repeated failures', async () => {
  const queue = new WebDAVRequestQueue();
  await expect(queue.run(async () => ({ status: 503 }))).rejects.toMatchObject({ retryAfterMs: 60_000 });
  await vi.advanceTimersByTimeAsync(60_000);
  await expect(queue.run(async () => ({ status: 503 }))).rejects.toMatchObject({ retryAfterMs: 120_000 });
});

it('preserves missing-file and permission errors without blocking unrelated requests', async () => {
  const queue = new WebDAVRequestQueue();
  for (const status of [404, 403]) {
    const error = { status };
    await expect(queue.run(async () => { throw error; })).rejects.toBe(error);
    expect(await queue.run(async () => 'ok')).toBe('ok');
  }
});
