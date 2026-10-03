/**
 * @file feishuSyncLock.ts
 * @input Calendar mutation or queue persistence callbacks.
 * @output Serialized operations within a renderer and, with Web Locks, across app windows.
 * @pos Feishu synchronization coordination; credential refresh remains in the execution core.
 */
const queues = new Map<string, Promise<unknown>>();

export function withFeishuLock<T>(name: 'calendar' | 'queue', operation: () => Promise<T>): Promise<T> {
  const key = `lumostime-feishu-${name}`;
  const run = () => typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request(key, operation)
    : operation();
  const result = (queues.get(key) || Promise.resolve()).then(run, run);
  const settled = result.then(() => undefined, () => undefined);
  queues.set(key, settled);
  void settled.then(() => { if (queues.get(key) === settled) queues.delete(key); });
  return result;
}
