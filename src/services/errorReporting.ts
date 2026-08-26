/**
 * @file errorReporting.ts
 * @input Optional Vite Sentry DSN and sanitized diagnostic contexts
 * @output Remote crash and startup diagnostic events when monitoring is configured
 * @pos Shared diagnostics service
 * @description Initializes Sentry only when a DSN is supplied, and exposes narrow helpers that exclude user content and credentials from error reports.
 * @updated 2026-08-26: Captures a bounded, sanitized buffer of recent renderer errors and warnings for explicit user-triggered Sentry reporting.
 */
import * as Sentry from '@sentry/react';

type DiagnosticContext = Record<string, unknown>;
type DiagnosticLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

export type RecentConsoleReportResult =
  | { status: 'sent'; eventId: string }
  | { status: 'disabled' | 'empty' | 'failed' };

export interface RecentConsoleEntry {
  timestamp: string;
  source: 'console.error' | 'console.warn' | 'window.error' | 'unhandledrejection';
  message: string;
}

export const CRITICAL_DATA_ERROR_EVENT = 'lumostime:critical-data-error';

export interface CriticalDataErrorDetail {
  message: string;
  sentryEventId: string | null;
}

let reportingEnabled = false;
let latestCriticalDataError: CriticalDataErrorDetail | null = null;
const recentConsoleEntries: RecentConsoleEntry[] = [];
const MAX_RECENT_CONSOLE_ENTRIES = 30;
const MAX_ENTRY_LENGTH = 4_000;
const MAX_REPORT_LENGTH = 32_000;
let consoleHooksInstalled = false;

const SENSITIVE_KEY_PATTERN = /(password|passwd|token|secret|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key)/i;

const sanitizeString = (value: string): string => {
  let sanitized = value.replace(/https?:\/\/[^\s"']+/gi, (rawUrl) => {
    try {
      const parsed = new URL(rawUrl);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return rawUrl.replace(/[?#].*$/, '');
    }
  });
  return sanitized.replace(
    /(["']?(?:password|passwd|token|secret|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key)["']?\s*[:=]\s*)(["']?)[^\s,"'}]+\2/gi,
    '$1[REDACTED]'
  );
};

const serializeValue = (value: unknown, seen = new WeakSet<object>()): string => {
  if (value instanceof Error) return sanitizeString(value.stack || `${value.name}: ${value.message}`);
  if (typeof value === 'string') return sanitizeString(value);
  if (value === null || typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return `[${value.map((item) => serializeValue(item, seen)).join(', ')}]`;
  return `{ ${Object.entries(value).map(([key, item]) => (
    `${key}: ${SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : serializeValue(item, seen)}`
  )).join(', ')} }`;
};

const appendRecentConsoleEntry = (source: RecentConsoleEntry['source'], values: unknown[]): void => {
  const message = values.map((value) => serializeValue(value)).join(' ').slice(0, MAX_ENTRY_LENGTH);
  recentConsoleEntries.push({ timestamp: new Date().toISOString(), source, message });
  if (recentConsoleEntries.length > MAX_RECENT_CONSOLE_ENTRIES) {
    recentConsoleEntries.splice(0, recentConsoleEntries.length - MAX_RECENT_CONSOLE_ENTRIES);
  }
};

const installConsoleHooks = (): void => {
  if (consoleHooksInstalled || typeof window === 'undefined' || typeof console === 'undefined') return;
  consoleHooksInstalled = true;
  (['error', 'warn'] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      appendRecentConsoleEntry(`console.${level}`, args);
      original(...args);
    };
  });
  window.addEventListener('error', (event) => {
    appendRecentConsoleEntry('window.error', [event.error || event.message || 'Unknown window error']);
  });
  window.addEventListener('unhandledrejection', (event) => {
    appendRecentConsoleEntry('unhandledrejection', [event.reason]);
  });
};

const getRelease = (): string => import.meta.env.VITE_APP_VERSION || 'lumostime@unknown';

export const initializeErrorReporting = (): boolean => {
  installConsoleHooks();
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.info('[ErrorReporting] Sentry DSN is not configured; remote diagnostics are disabled.');
    return false;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: getRelease(),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.user;
      delete event.request;
      return event;
    }
  });

  reportingEnabled = true;
  return true;
};

export const reportDiagnostic = (
  message: string,
  context: DiagnosticContext = {},
  level: DiagnosticLevel = 'error'
): string | null => {
  if (!reportingEnabled) {
    return null;
  }

  return Sentry.withScope((scope) => {
    scope.setLevel(level);
    scope.setContext('diagnostic', context);
    return Sentry.captureMessage(message);
  });
};

export const reportException = (error: unknown, context: DiagnosticContext = {}): string | null => {
  if (!reportingEnabled) {
    return null;
  }

  return Sentry.withScope((scope) => {
    scope.setContext('diagnostic', context);
    return Sentry.captureException(error);
  });
};

export const withErrorReference = (message: string, sentryEventId: string | null): string => (
  sentryEventId ? `${message}\n错误编号：${sentryEventId}` : message
);

export const reportCriticalDataError = (
  error: unknown,
  message: string,
  context: DiagnosticContext = {}
): string | null => {
  const sentryEventId = reportException(error, {
    feature: 'local_data',
    operation: 'hydrate',
    ...context
  });

  latestCriticalDataError = { message, sentryEventId };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<CriticalDataErrorDetail>(CRITICAL_DATA_ERROR_EVENT, {
      detail: latestCriticalDataError
    }));
  }

  return sentryEventId;
};

export const getLatestCriticalDataError = (): CriticalDataErrorDetail | null => latestCriticalDataError;

export const getRecentConsoleEntries = (): RecentConsoleEntry[] => recentConsoleEntries.map((entry) => ({ ...entry }));

export const reportRecentConsoleErrors = (): RecentConsoleReportResult => {
  if (!reportingEnabled) return { status: 'disabled' };
  if (recentConsoleEntries.length === 0) return { status: 'empty' };
  try {
    const serializedEntries = JSON.stringify(recentConsoleEntries).slice(0, MAX_REPORT_LENGTH);
    const eventId = Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setContext('recent_console_errors', { count: recentConsoleEntries.length, entries: serializedEntries });
      return Sentry.captureMessage('User submitted recent console errors');
    });
    void Sentry.flush(2_000);
    return eventId ? { status: 'sent', eventId } : { status: 'failed' };
  } catch {
    return { status: 'failed' };
  }
};

export const flushErrorReports = (): void => {
  if (reportingEnabled) {
    void Sentry.flush(2_000);
  }
};
