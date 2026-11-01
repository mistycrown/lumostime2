/**
 * @file sessionImageOperations.test.ts
 * @input Concurrent photo operations belonging to different sessions
 * @output Completion barrier and subscription regressions
 * @pos Test (Timer Attachments)
 * @updated 2026-11-01: Verifies queued submissions wait for every photo in the target session.
 */
import { describe, expect, it, vi } from 'vitest';
import { beginSessionImageOperation, hasPendingSessionImages, subscribeSessionImageOperations, waitForSessionImages } from './sessionImageOperations';

describe('timer image operations', () => {
  it('waits for all saves while isolating other timers and allowing idempotent cleanup', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionImageOperations(listener);
    const first = beginSessionImageOperation('one');
    const second = beginSessionImageOperation('one');
    const other = beginSessionImageOperation('two');
    const submitted = vi.fn();
    const waiting = waitForSessionImages('one').then(submitted);
    first();
    first();
    await Promise.resolve();
    expect(submitted).not.toHaveBeenCalled();
    expect(hasPendingSessionImages('one')).toBe(true);
    second();
    await waiting;
    expect(submitted).toHaveBeenCalledOnce();
    expect(hasPendingSessionImages('two')).toBe(true);
    other();
    expect(listener).toHaveBeenCalledTimes(6);
    unsubscribe();
  });
});
