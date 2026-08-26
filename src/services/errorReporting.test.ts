import { beforeAll, describe, expect, it, vi } from 'vitest';

const sentryScope = {
  setLevel: vi.fn(),
  setContext: vi.fn()
};

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  withScope: vi.fn((callback: (scope: typeof sentryScope) => unknown) => callback(sentryScope)),
  captureMessage: vi.fn(() => 'event-123'),
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve())
}));

import {
  getRecentConsoleEntries,
  initializeErrorReporting,
  reportRecentConsoleErrors
} from './errorReporting';

describe('errorReporting recent console diagnostics', () => {
  beforeAll(() => {
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

  it('does not report while Sentry is disabled, then sends a bounded report when enabled', () => {
    expect(reportRecentConsoleErrors()).toEqual({ status: 'disabled' });
    vi.stubEnv('VITE_SENTRY_DSN', 'dsn');
    initializeErrorReporting();
    expect(reportRecentConsoleErrors()).toEqual({ status: 'sent', eventId: 'event-123' });
    expect(sentryScope.setContext).toHaveBeenCalledWith('recent_console_errors', expect.objectContaining({
      count: expect.any(Number),
      entries: expect.any(String)
    }));
  });
});
