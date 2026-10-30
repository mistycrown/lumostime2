/**
 * @file compatibleS3RequestQueue.ts
 * @input Data Capsule operations and HTTP 429 Retry-After responses
 * @output Serialized transfers and persisted provider cooldown across reloads/windows
 * @updated 2026-10-30: Stops SDK/click retry bursts after provider throttling.
 */
const COOLDOWN_KEY = 'lumos_compatible_s3_data_capsule_cooldown';
type Cooldown = { until: number; failures: number };

export class CompatibleS3RequestQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private lastStartedAt = -Infinity;
  private cooldown: Cooldown = { until: 0, failures: 0 };

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>, private intervalMs = 1000) {}

  private readCooldown(): Cooldown {
    try {
      const stored = JSON.parse(this.storage.getItem(COOLDOWN_KEY) || 'null');
      if (Number.isFinite(stored?.until) && Number.isFinite(stored?.failures) && stored.until >= this.cooldown.until) {
        this.cooldown = { until: stored.until, failures: Math.max(0, Math.min(10, stored.failures)) };
      }
    } catch {
      // A local storage failure must not clear the in-memory server cooldown.
    }
    return this.cooldown;
  }

  private cooldownError(): Error {
    const retryAfterMs = Math.max(0, this.readCooldown().until - Date.now());
    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return Object.assign(new Error(`对象存储请求受限（HTTP 429），请 ${seconds} 秒后重试`), {
      name: 'ThrottlingError', status: 429, retryAfterMs,
      $metadata: { httpStatusCode: 429 }
    });
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.tail.then(async () => {
      if (this.readCooldown().until > Date.now()) throw this.cooldownError();
      const waitMs = this.lastStartedAt + this.intervalMs - Date.now();
      if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
      if (this.readCooldown().until > Date.now()) throw this.cooldownError();
      this.lastStartedAt = Date.now();
      try {
        const result = await operation();
        if (this.readCooldown().until <= Date.now()) {
          this.cooldown.failures = 0;
          try { this.storage.setItem(COOLDOWN_KEY, JSON.stringify(this.cooldown)); } catch { /* Keep the memory state. */ }
        }
        return result;
      } catch (error: any) {
        const status = Number(error?.$metadata?.httpStatusCode ?? error?.$response?.statusCode ?? error?.status);
        if (status !== 429) throw error;
        const headers = error?.$response?.headers ?? error?.headers;
        const headerName = Object.keys(headers || {}).find(key => key.toLowerCase() === 'retry-after');
        const value = typeof headers?.get === 'function' ? headers.get('retry-after') : headerName ? headers[headerName] : undefined;
        const seconds = value !== undefined && value !== null && String(value).trim() !== '' ? Number(value) : NaN;
        const retryAfter = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Math.max(0, Date.parse(value) - Date.now()) || 0;
        const backoff = Math.min(60_000 * 2 ** this.readCooldown().failures, 30 * 60_000);
        this.cooldown = { until: Date.now() + Math.max(backoff, retryAfter), failures: this.cooldown.failures + 1 };
        try { this.storage.setItem(COOLDOWN_KEY, JSON.stringify(this.cooldown)); } catch { /* Keep the memory cooldown. */ }
        const failure = this.cooldownError();
        if (error instanceof Error) {
          error.message = failure.message;
          Object.assign(error, { status: 429, retryAfterMs: (failure as any).retryAfterMs });
          throw error;
        }
        throw failure;
      }
    });
    this.tail = task.catch(() => {});
    return task;
  }
}
