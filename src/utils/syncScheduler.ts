/**
 * @file syncScheduler.ts
 * @input Edit/lifecycle requests and a current sync callback
 * @output One serialized, debounced sync queue with bounded retry delays
 * @pos Utility (Cloud Sync)
 * @description Coalesces all automatic triggers and keeps requests arriving during transfer.
 */

export type SyncTrigger = 'startup' | 'resume' | 'auto';
export type SyncAttempt = 'success' | 'retry' | 'blocked';

export const createSyncScheduler = (
  run: (trigger: SyncTrigger) => Promise<SyncAttempt>,
  options = { debounceMs: 5000, maxWaitMs: 30000, cooldownMs: 30000, retryMs: 5000, maxRetryMs: 300000 }
) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let disposed = false;
  let pending = false;
  let firstEditAt: number | undefined;
  let lastCheckAt = -Infinity;
  let retryDelay = options.retryMs;
  let notBefore = 0;
  let dueAt = Infinity;
  let trigger: SyncTrigger = 'auto';

  const arm = (at: number) => {
    if (timer) clearTimeout(timer);
    dueAt = Math.max(at, notBefore);
    if (!disposed && !running) timer = setTimeout(() => void drain(), Math.max(0, dueAt - Date.now()));
  };
  const drain = async () => {
    timer = undefined;
    if (disposed || running || !pending) return;
    running = true;
    pending = false;
    firstEditAt = undefined;
    dueAt = Infinity;
    lastCheckAt = Date.now();
    let outcome: SyncAttempt;
    try {
      outcome = await run(trigger);
    } catch {
      outcome = 'retry';
    }
    running = false;
    if (disposed) return;
    if (outcome === 'blocked') {
      pending = false;
      firstEditAt = undefined;
      return;
    }
    if (outcome === 'retry') {
      pending = true;
      notBefore = Date.now() + retryDelay;
      retryDelay = Math.min(retryDelay * 2, options.maxRetryMs);
      arm(notBefore);
    } else {
      notBefore = 0;
      retryDelay = options.retryMs;
      if (pending) arm(Number.isFinite(dueAt) ? dueAt : Date.now() + options.debounceMs);
    }
  };

  return {
    request(reason: SyncTrigger, urgent = false) {
      if (disposed) return;
      pending = true;
      const now = Date.now();
      if (urgent) notBefore = 0;
      if (reason === 'auto') {
        trigger = 'auto';
        firstEditAt ??= now;
        arm(urgent ? now : Math.min(now + options.debounceMs, firstEditAt + options.maxWaitMs));
      } else {
        trigger = reason;
        arm(Math.min(dueAt, urgent ? now : Math.max(now, lastCheckAt + options.cooldownMs)));
      }
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
    }
  };
};
