/**
 * @file cloudJsonCache.test.ts
 * @input Conditional response adapters, failures and in-flight connection changes
 * @output Regression coverage for transfer reduction without stale-cache fallbacks
 * @pos Test (Cloud Sync)
 * @updated 2026-10-22: Verifies server-confirmed reuse and unconditional verification.
 */
import { describe, expect, test, vi } from 'vitest';
import { CloudJsonCache, getCloudResponseHeader } from './cloudJsonCache';

const response = (text = 'base', etag: unknown = '"v1"') => ({ text: JSON.stringify({ logs: [{ text }] }), etag });
const conditional = { conditional: true };

describe('conditional JSON reads', () => {
  test.each(['resolved', 'rejected'])('reuses an exact snapshot only after a %s 304', async mode => {
    const cache = new CloudJsonCache();
    const fetch = vi.fn().mockResolvedValueOnce(response());
    if (mode === 'resolved') fetch.mockResolvedValueOnce({ status: 304, text: '' });
    else fetch.mockRejectedValueOnce({ $metadata: { httpStatusCode: 304 } });
    const first = await cache.read('main', conditional, fetch);
    first.logs[0].text = 'mutated by restore';
    expect(await cache.read('main', conditional, fetch)).toEqual(JSON.parse(response().text));
    expect(fetch.mock.calls).toEqual([[undefined], ['"v1"']]);
  });

  test('accepts changed content with identical timestamps/sizes and remembers its new validator', async () => {
    const cache = new CloudJsonCache();
    const fetch = vi.fn().mockResolvedValueOnce(response('aaa')).mockResolvedValueOnce(response('bbb', '"v2"'))
      .mockResolvedValueOnce({ status: 304, text: '' });
    await cache.read('main', conditional, fetch);
    expect((await cache.read('main', conditional, fetch)).logs[0].text).toBe('bbb');
    expect((await cache.read('main', conditional, fetch)).logs[0].text).toBe('bbb');
    expect(fetch.mock.calls).toEqual([[undefined], ['"v1"'], ['"v2"']]);
  });

  test('verification always fetches the full response even with a populated cache', async () => {
    const cache = new CloudJsonCache();
    const fetch = vi.fn().mockResolvedValue(response());
    await cache.read('main', conditional, fetch);
    await cache.read('main', {}, fetch);
    expect(fetch.mock.calls).toEqual([[undefined], [undefined]]);
  });

  test.each([undefined, '', 'W/"weak"'])('does not use missing or weak ETags: %s', async etag => {
    const cache = new CloudJsonCache();
    const fetch = vi.fn().mockResolvedValue({ ...response(), etag });
    await cache.read('main', conditional, fetch);
    await cache.read('main', conditional, fetch);
    expect(fetch.mock.calls).toEqual([[undefined], [undefined]]);
  });

  test.each([400, 405, 412, 501, 'cors'])('falls back to a plain read when conditions are unsupported: %s', async status => {
    const cache = new CloudJsonCache();
    const fetch = vi.fn().mockResolvedValueOnce(response())
      .mockRejectedValueOnce(status === 'cors' ? new TypeError('Failed to fetch') : { status })
      .mockResolvedValue(response('fresh', '"v2"'));
    await cache.read('main', conditional, fetch);
    expect((await cache.read('main', conditional, fetch)).logs[0].text).toBe('fresh');
    await cache.read('main', conditional, fetch);
    expect(fetch.mock.calls).toEqual([[undefined], ['"v1"'], [undefined], [undefined]]);
  });

  test.each([401, 403, 404, 429, 500, 503, 'timeout'])('propagates failures without serving stale content: %s', async status => {
    const cache = new CloudJsonCache();
    const failure = status === 'timeout' ? new Error('timeout') : { status };
    const fetch = vi.fn().mockResolvedValueOnce(response()).mockRejectedValueOnce(failure);
    await cache.read('main', conditional, fetch);
    await expect(cache.read('main', conditional, fetch)).rejects.toBe(failure);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('does not replace failed fallback reads with the previous snapshot', async () => {
    const cache = new CloudJsonCache();
    const failure = { status: 503 };
    const fetch = vi.fn().mockResolvedValueOnce(response()).mockRejectedValueOnce({ status: 400 }).mockRejectedValueOnce(failure);
    await cache.read('main', conditional, fetch);
    await expect(cache.read('main', conditional, fetch)).rejects.toBe(failure);
  });

  test('isolates keys and clears snapshots on invalidation', async () => {
    const cache = new CloudJsonCache();
    const fetch = vi.fn().mockResolvedValue(response());
    await cache.read('account-a', conditional, fetch);
    await cache.read('account-b', conditional, fetch);
    cache.clear();
    await cache.read('account-b', conditional, fetch);
    expect(fetch.mock.calls).toEqual([[undefined], [undefined], [undefined]]);
  });

  test('cannot repopulate a cleared cache from an in-flight old response', async () => {
    const cache = new CloudJsonCache();
    let complete!: (value: ReturnType<typeof response>) => void;
    const pending = cache.read('main', conditional, () => new Promise(resolve => { complete = resolve; }));
    cache.clear();
    complete(response());
    await pending;
    const fetch = vi.fn().mockResolvedValue(response('new'));
    await cache.read('main', conditional, fetch);
    expect(fetch).toHaveBeenCalledWith(undefined);
  });

  test('rejects malformed JSON and 304 without a matching conditional request', async () => {
    const cache = new CloudJsonCache();
    await expect(cache.read('main', conditional, async () => ({ text: '<html>error</html>', etag: '"v1"' }))).rejects.toThrow();
    await expect(cache.read('main', conditional, async () => ({ text: '', status: 304 }))).rejects.toThrow('without a matching');
    const fetch = vi.fn().mockResolvedValueOnce(response()).mockRejectedValueOnce({ status: 405 })
      .mockResolvedValueOnce({ status: 304, text: '' });
    await cache.read('main', conditional, fetch);
    await expect(cache.read('main', conditional, fetch)).rejects.toThrow('without a matching');
  });

  test('reads response headers case-insensitively', () => {
    expect(getCloudResponseHeader({ ETag: '"v1"' }, 'etag')).toBe('"v1"');
    expect(getCloudResponseHeader(new Headers({ ETag: '"v2"' }), 'etag')).toBe('"v2"');
    expect(getCloudResponseHeader({}, 'etag')).toBeUndefined();
  });
});
