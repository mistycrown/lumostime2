/**
 * @file errorReporting.test.ts
 * @input Sentry transport, console entries and local sponsorship state
 * @output Diagnostics sanitization, delivery and searchable identity regression coverage
 * @pos Test
 * @updated 2026-10-05: Checks delivery failures and strips personal data while preserving pseudonymous IDs.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { DIAGNOSTICS_KEYS, SPONSORSHIP_KEYS } from '../constants/storageKeys';

const sentryScope = {
  setLevel: vi.fn(),
  setContext: vi.fn()
};

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  withScope: vi.fn((callback: (scope: typeof sentryScope) => unknown) => callback(sentryScope)),
  captureMessage: vi.fn(() => 'event-123'),
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true))
}));

import {
  getRecentConsoleEntries,
  initializeErrorReporting,
  reportRecentConsoleErrors
} from './errorReporting';

describe('errorReporting recent console diagnostics', () => {
  const storedValues = new Map<string, string>([[DIAGNOSTICS_KEYS.USER_ID, '1234567890123456']]);
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key)
    });
    const listeners = new Map<string, EventListener[]>();
    const fakeWindow = {
      addEventListener: (type: string, listener: EventListener) => {
        listeners.set(type, [...(listeners.get(type) || []), listener]);
      },
      dispatchEvent: (event: Event) => {
        (listeners.get(event.type) || []).forEach((listener) => listener(event));
        return true;
      }
    };
    Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });
    console.error = vi.fn();
    console.warn = vi.fn();
    vi.stubEnv('VITE_SENTRY_DSN', '');
    initializeErrorReporting();
  });

  it('captures warnings, errors, rejections, and sanitizes sensitive values', () => {
    console.error('failure', {
      token: 'secret-token',
      nested: { password: 'secret-password' },
      url: 'https://example.test/path?access_token=secret'
    });
    console.warn('warning');
    const errorEvent = new Event('error');
    Object.defineProperty(errorEvent, 'error', { value: new Error('uncaught') });
    window.dispatchEvent(errorEvent);
    const rejectionEvent = new Event('unhandledrejection');
    Object.defineProperty(rejectionEvent, 'reason', { value: new Error('rejected') });
    window.dispatchEvent(rejectionEvent);

    const entries = getRecentConsoleEntries();
    expect(entries.some((entry) => entry.source === 'console.error')).toBe(true);
    expect(entries.some((entry) => entry.source === 'unhandledrejection')).toBe(true);
    const errorEntry = entries.find((entry) => entry.source === 'console.error');
    expect(errorEntry?.message).toContain('token: [REDACTED]');
    expect(errorEntry?.message).not.toContain('secret-token');
    expect(errorEntry?.message).toContain('https://example.test/path');
    expect(errorEntry?.message).not.toContain('access_token=secret');
  });

  it('does not report while Sentry is disabled, then sends a bounded report when enabled', async () => {
    await expect(reportRecentConsoleErrors()).resolves.toEqual({ status: 'disabled' });
    vi.stubEnv('VITE_SENTRY_DSN', 'dsn');
    initializeErrorReporting();
    await expect(reportRecentConsoleErrors()).resolves.toEqual({ status: 'sent', eventId: 'event-123', userId: '1234567890123456' });
    expect(sentryScope.setContext).toHaveBeenCalledWith('recent_console_errors', expect.objectContaining({
      count: expect.any(Number),
      entries: expect.any(String)
    }));
  });

  it('attaches searchable IDs to automatic events and excludes other user and request data', async () => {
    const beforeSend = vi.mocked(Sentry.init).mock.calls.at(-1)![0]!.beforeSend!;
    storedValues.set(SPONSORSHIP_KEYS.SUPPORTER_ID, '1');
    const event = await beforeSend({
      type: undefined,
      user: { id: 'old-id', email: 'private@example.test', ip_address: '127.0.0.1', username: 'private' },
      request: { url: 'https://private.test' },
      tags: { feature: 'startup' }
    }, {});
    expect(event?.user).toEqual({ id: 'lumos001' });
    expect(event?.tags).toEqual({ feature: 'startup', user_id: 'lumos001', user_type: 'supporter' });
    expect(event?.request).toBeUndefined();
    await expect(reportRecentConsoleErrors()).resolves.toMatchObject({ userId: 'lumos001' });
    storedValues.delete(SPONSORSHIP_KEYS.SUPPORTER_ID);
    const anonymousEvent = await beforeSend({ type: undefined }, {});
    expect(anonymousEvent?.user).toEqual({ id: '1234567890123456' });
    expect(anonymousEvent?.tags?.user_type).toBe('anonymous');
  });

  it('waits for the transport to finish before returning the feedback receipt', async () => {
    let finish!: (result: boolean) => void;
    vi.mocked(Sentry.flush).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const done = vi.fn();
    const report = reportRecentConsoleErrors().then(done);
    await vi.waitFor(() => expect(Sentry.flush).toHaveBeenLastCalledWith(5_000));
    expect(done).not.toHaveBeenCalled();
    finish(true);
    await report;
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
  });

  it('returns failure on timeout or a rejected transport', async () => {
    vi.mocked(Sentry.flush).mockResolvedValueOnce(false);
    await expect(reportRecentConsoleErrors()).resolves.toEqual({ status: 'failed' });
    vi.mocked(Sentry.flush).mockRejectedValueOnce(new Error('offline'));
    await expect(reportRecentConsoleErrors()).resolves.toEqual({ status: 'failed' });
  });

  it('restores legacy supporter numbers before sending a feedback report', async () => {
    storedValues.set(SPONSORSHIP_KEYS.REDEMPTION_CODE, 'LUMOS-000D3920');
    await expect(reportRecentConsoleErrors()).resolves.toMatchObject({ userId: 'lumos010' });
    storedValues.delete(SPONSORSHIP_KEYS.REDEMPTION_CODE);
    storedValues.delete(SPONSORSHIP_KEYS.SUPPORTER_ID);
  });
});
