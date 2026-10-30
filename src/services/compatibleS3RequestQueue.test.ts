/**
 * @file compatibleS3RequestQueue.test.ts
 * @input Concurrent transfers, persisted cooldown and server Retry-After
 * @output Burst prevention, reload/window cooldown and bounded backoff regression coverage
 * @updated 2026-10-30: Tests actual HTTP 429 handling without contacting storage accounts.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CompatibleS3RequestQueue } from './compatibleS3RequestQueue';

let storage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const state = new Map<string, string>();
  storage = { getItem: key => state.get(key) ?? null, setItem: (key, value) => { state.set(key, value); } };
});
afterEach(() => vi.useRealTimers());

it('serializes and spaces data/image operations', async () => {
  const queue = new CompatibleS3RequestQueue(storage);
  const starts: number[] = [];
  const operation = async () => { starts.push(Date.now()); return 'ok'; };
  const result = Promise.all([queue.run(operation), queue.run(operation), queue.run(operation)]);
  await vi.runAllTimersAsync();
  await result;
  expect(starts).toEqual([0, 1000, 2000]);
});

it('blocks queued/manual requests and new instances after 429, then recovers', async () => {
  const queue = new CompatibleS3RequestQueue(storage);
  const next = vi.fn().mockResolvedValue('ok');
  const first = queue.run(async () => { throw { $metadata: { httpStatusCode: 429 } }; });
  const queued = queue.run(next);
  await expect(first).rejects.toMatchObject({ status: 429, retryAfterMs: 60_000 });
  await expect(queued).rejects.toMatchObject({ status: 429 });
  await expect(new CompatibleS3RequestQueue(storage).run(next)).rejects.toMatchObject({ status: 429 });
  expect(next).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(await queue.run(next)).toBe('ok');
});

it.each([
  { 'Retry-After': '120' },
  { 'retry-after': 'Thu, 01 Jan 1970 00:02:00 GMT' },
  new Headers({ 'retry-after': '120' })
])('honors server retry deadlines %j', async headers => {
  const queue = new CompatibleS3RequestQueue(storage);
  await expect(queue.run(async () => { throw { $response: { statusCode: 429, headers } }; }))
    .rejects.toMatchObject({ retryAfterMs: 120_000 });
});

it('increases cooldown for repeated throttling and preserves unrelated errors', async () => {
  const queue = new CompatibleS3RequestQueue(storage);
  const fail = async () => { throw Object.assign(new Error('UnknownError'), { $metadata: { httpStatusCode: 429 } }); };
  await expect(queue.run(fail)).rejects.toMatchObject({ retryAfterMs: 60_000 });
  await vi.advanceTimersByTimeAsync(60_000);
  await expect(queue.run(fail)).rejects.toMatchObject({ retryAfterMs: 120_000 });
  await vi.advanceTimersByTimeAsync(120_000);
  const denied = { $metadata: { httpStatusCode: 403 } };
  await expect(queue.run(async () => { throw denied; })).rejects.toBe(denied);
  const next = queue.run(async () => 'ok');
  await vi.advanceTimersByTimeAsync(1000);
  expect(await next).toBe('ok');
});
