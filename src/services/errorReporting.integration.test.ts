/**
 * @file errorReporting.integration.test.ts
 * @input Real Sentry SDK with isolated transport responses and local diagnostic identity
 * @output Regression coverage for repeated imports, delivery failures and manual report receipts
 * @pos Test
 * @updated 2026-10-25: Verifies receipt IDs survive SDK processing without sending real telemetry.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { DIAGNOSTICS_KEYS } from '../constants/storageKeys';

const transport = vi.hoisted(() => ({ statusCode: 200, offline: false, events: [] as Sentry.ErrorEvent[] }));

vi.mock('@sentry/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sentry/react')>();
  return {
    ...actual,
    init: (options: Parameters<typeof actual.init>[0]) => actual.init({
      ...options,
      sendClientReports: false,
      transport: () => ({
        send: async (envelope) => {
          if (transport.offline) throw new Error('offline');
          for (const [header, event] of envelope[1]) {
            if (header.type === 'event') transport.events.push(event as Sentry.ErrorEvent);
          }
          return { statusCode: transport.statusCode };
        },
        flush: async () => true
      })
    })
  };
});

vi.mock('./redemptionService', () => ({ RedemptionService: class { async isVerified() { return false; } } }));

import { initializeErrorReporting, reportException, reportRecentConsoleErrors, retryErrorReport, waitForErrorReport } from './errorReporting';

const backupError = () => {
  const error = new SyntaxError('Unterminated string in JSON at position 70357 (line 2158 column 36)');
  error.stack = `${error.name}: ${error.message}\n    at JSON.parse (<anonymous>)\n    at reader.onload (https://localhost/assets/app.js:11251:42662)`;
  return error;
};

describe('real Sentry error report delivery', () => {
  beforeAll(() => {
    const values = new Map<string, string>([[DIAGNOSTICS_KEYS.USER_ID, '1234567890123456']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    });
    vi.stubGlobal('window', { addEventListener: () => {} });
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.invalid/1');
  });

  beforeEach(() => {
    transport.events.length = 0;
    transport.statusCode = 200;
    transport.offline = false;
    initializeErrorReporting();
  });

  afterEach(async () => { await Sentry.close(1000); });

  it('delivers both repeated import IDs with user identity and console context', async () => {
    const firstId = reportException(backupError(), { operation: 'import_json_backup' })!;
    await expect(waitForErrorReport(firstId)).resolves.toMatchObject({ status: 'sent', eventId: firstId });
    const secondId = reportException(backupError(), { operation: 'import_json_backup' })!;
    await expect(waitForErrorReport(secondId)).resolves.toEqual({ status: 'sent', eventId: secondId, userId: '1234567890123456' });
    expect(secondId).not.toBe(firstId);
    expect(transport.events.map((event) => event.event_id)).toEqual([firstId, secondId]);
    expect(transport.events[1].user).toEqual({ id: '1234567890123456', username: '1234567890123456' });
    expect(transport.events[1].contexts?.recent_console_errors).toHaveProperty('entries');
  });

  it('reuses one delivered receipt when the same exception reaches two catch handlers', async () => {
    const error = backupError();
    const firstId = reportException(error)!;
    expect(reportException(error)).toBe(firstId);
    await waitForErrorReport(firstId);
    expect(reportException(error)).toBe(firstId);
    expect(transport.events).toHaveLength(1);
  });

  it('can report an exception already captured by an automatic handler', async () => {
    const error = backupError();
    Sentry.captureException(error);
    await Sentry.flush(1000);
    const reference = reportException(error)!;
    await expect(waitForErrorReport(reference)).resolves.toMatchObject({ status: 'sent', eventId: reference });
    expect(transport.events).toHaveLength(2);
  });

  it('retains SDK deduplication for automatic events without a receipt', async () => {
    Sentry.captureException(backupError());
    await Sentry.flush(1000);
    Sentry.captureException(backupError());
    await Sentry.flush(1000);
    expect(transport.events).toHaveLength(1);
  });

  it('does not report success on HTTP 429 even when flush succeeds', async () => {
    transport.statusCode = 429;
    const id = reportException(backupError())!;
    await expect(waitForErrorReport(id)).resolves.toEqual({ status: 'failed' });
    await expect(Sentry.flush(1000)).resolves.toBe(true);
  });

  it('retries a network failure with a fresh delivered reference', async () => {
    transport.offline = true;
    const id = reportException(backupError())!;
    await expect(waitForErrorReport(id)).resolves.toEqual({ status: 'failed' });
    transport.offline = false;
    const result = await retryErrorReport(id);
    expect(result.status).toBe('sent');
    if (result.status !== 'sent') throw new Error('Missing receipt');
    expect(result.eventId).not.toBe(id);
    expect(result.eventId).toBe(transport.events[0].event_id);
    expect(result.userId).toBe(transport.events[0].user?.id);
  });

  it('delivers repeated manual reports instead of deduplicating their fixed message', async () => {
    console.warn('Import diagnostics available');
    expect((await reportRecentConsoleErrors()).status).toBe('sent');
    expect((await reportRecentConsoleErrors()).status).toBe('sent');
    expect(transport.events).toHaveLength(2);
    expect(transport.events[0].event_id).not.toBe(transport.events[1].event_id);
  });
});
