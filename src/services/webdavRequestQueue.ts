/**
 * @file webdavRequestQueue.ts
 * @input WebDAV operations, response statuses, Retry-After headers, and request spacing
 * @output Serialized requests with shared cooldown after service unavailability
 * @pos Service (Cloud Sync)
 * @updated 2026-10-11: Prevents request bursts and repeated network attempts after HTTP 429/503.
 */

export function isWebDAVUnavailable(error: any): boolean {
  const status = Number(error?.status ?? error?.response?.status);
  return status === 429 || status === 503;
}

function getRetryAfterMs(error: any): number {
  const headers = error?.response?.headers ?? error?.headers;
  const value = typeof headers?.get === 'function'
    ? headers.get('retry-after')
    : headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (value === undefined || value === null || value === '') return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

export class WebDAVRequestQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private lastStartedAt = -Infinity;
  private blockedUntil = 0;
  private failureCount = 0;
  private blockedStatus = 503;

  constructor(private readonly getIntervalMs: () => number = () => 0) {}

  private cooldownError(): Error {
    const seconds = Math.max(1, Math.ceil((this.blockedUntil - Date.now()) / 1000));
    return Object.assign(new Error(`WebDAV 服务暂不可用或请求受限（HTTP ${this.blockedStatus}），请 ${seconds} 秒后重试。`), {
      status: this.blockedStatus,
      retryAfterMs: this.blockedUntil - Date.now()
    });
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.tail.then(async () => {
      if (Date.now() < this.blockedUntil) throw this.cooldownError();
      const waitMs = this.lastStartedAt + this.getIntervalMs() - Date.now();
      if (waitMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.lastStartedAt = Date.now();
      try {
        const result = await operation();
        // Native adapters can resolve with an HTTP error instead of rejecting.
        if (isWebDAVUnavailable(result)) throw result;
        this.failureCount = 0;
        return result;
      } catch (error) {
        if (isWebDAVUnavailable(error)) {
          this.blockedStatus = Number((error as any)?.status ?? (error as any)?.response?.status);
          const backoff = Math.min(60_000 * 2 ** this.failureCount, 30 * 60_000);
          this.failureCount += 1;
          this.blockedUntil = Date.now() + Math.max(backoff, getRetryAfterMs(error));
          throw this.cooldownError();
        }
        throw error;
      }
    });
    this.tail = task.catch(() => {});
    return task;
  }
}
