/**
 * @file sessionImageOperations.ts
 * @input Session identity and in-flight photo save lifetimes
 * @output Shared busy subscriptions and completion barrier for timer submission
 * @pos Utility (Timer Attachments)
 * @updated 2026-11-01: Keeps photo saves alive across detail-view remounts and external stop actions.
 */
const pending = new Map<string, Set<Promise<void>>>();
const listeners = new Set<() => void>();

export const subscribeSessionImageOperations = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const hasPendingSessionImages = (sessionId: string): boolean => Boolean(pending.get(sessionId)?.size);

export const beginSessionImageOperation = (sessionId: string): (() => void) => {
  let resolve!: () => void;
  const operation = new Promise<void>((done) => { resolve = done; });
  const operations = pending.get(sessionId) || new Set<Promise<void>>();
  operations.add(operation);
  pending.set(sessionId, operations);
  listeners.forEach((listener) => listener());
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    operations.delete(operation);
    if (!operations.size) pending.delete(sessionId);
    resolve();
    listeners.forEach((listener) => listener());
  };
};

export const waitForSessionImages = async (sessionId: string): Promise<void> => {
  while (hasPendingSessionImages(sessionId)) {
    await Promise.all(pending.get(sessionId));
  }
};
