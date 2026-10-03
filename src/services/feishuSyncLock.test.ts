/**
 * @file feishuSyncLock.test.ts
 * @input Concurrent calendar operations and failing persistence callbacks.
 * @output Regression coverage for shared serialization, queue independence and lock release.
 * @pos Feishu concurrency tests.
 */
import { expect, it } from 'vitest';
import { withFeishuLock } from './feishuSyncLock';

it('serializes automatic sessions with manual calendar mutations', async () => {
  const order: string[] = [];
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const automatic = withFeishuLock('calendar', async () => {
    order.push('automatic-start'); await barrier; order.push('automatic-finish');
  });
  const manual = withFeishuLock('calendar', async () => { order.push('manual'); });
  await withFeishuLock('queue', async () => { order.push('save-edit'); });
  expect(order).toEqual(['automatic-start', 'save-edit']);
  release(); await Promise.all([automatic, manual]);
  expect(order).toEqual(['automatic-start', 'save-edit', 'automatic-finish', 'manual']);
});

it('releases a rejected operation so later work can proceed', async () => {
  await expect(withFeishuLock('queue', async () => { throw new Error('disk full'); })).rejects.toThrow('disk full');
  await expect(withFeishuLock('queue', async () => 'saved')).resolves.toBe('saved');
});
