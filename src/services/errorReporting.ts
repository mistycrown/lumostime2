/**
 * @file errorReporting.ts
 * @updated 2026-10-25: Shares delivery-checked receipts, console context and retry handling across automatic and manual reports.
 * @input Optional Vite Sentry DSN and sanitized diagnostic contexts
 * @output Remote crash and startup diagnostic events when monitoring is configured
 * @pos Shared diagnostics service
 * @description Initializes Sentry only when a DSN is supplied, and exposes narrow helpers that exclude user content and credentials from error reports.
 * @updated 2026-08-26: Captures a bounded, sanitized buffer of recent renderer errors and warnings for explicit user-triggered Sentry reporting.
 */
import * as Sentry from '@sentry/react';
import { getDiagnosticIdentity } from './diagnosticIdentityService';
import { RedemptionService } from './redemptionService';

type DiagnosticContext = Record<string, unknown>;
type DiagnosticLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

export type RecentConsoleReportResult =
  | { status: 'sent'; eventId: string; userId: string }
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
type ReportDelivery = 'pending' | 'sent' | 'failed';
interface ErrorReportRecord {
  userId: string;
  status: ReportDelivery;
  retry: () => string;
  listeners: Set<() => void>;
}
const errorReports = new Map<string, ErrorReportRecord>();
const exceptionReferences = new WeakMap<object, string>();
const MAX_ERROR_REPORTS = 100;
const REPORT_TAG = 'lumos_report';
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

  const client = Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: getRelease(),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // A displayed receipt must survive SDK deduplication. Sentry still groups
    // repeated occurrences into the same issue; automatic events keep Dedupe.
    integrations: (defaults) => defaults.map((integration) => {
      if (integration.name !== 'Dedupe' || !integration.processEvent) return integration;
      const processEvent = integration.processEvent;
      return {
        ...integration,
        processEvent(event, hint, currentClient) {
          return event.tags?.[REPORT_TAG] === 'true'
            ? event
            : processEvent.call(integration, event, hint, currentClient);
        }
      };
    }),
    beforeSend(event) {
      const identity = getDiagnosticIdentity();
      const userId = event.tags?.[REPORT_TAG] === 'true' && typeof event.user?.id === 'string'
        ? event.user.id
        : identity.id;
      event.user = { id: userId, username: userId };
      event.tags = { ...event.tags, user_id: userId, user_type: event.tags?.[REPORT_TAG] === 'true' ? event.tags.user_type : identity.type };
      delete event.request;
      return event;
    }
  });
  client?.on('afterSendEvent', (event, response) => {
    const record = event.event_id ? errorReports.get(event.event_id) : undefined;
    if (!record) return;
    const statusCode = response?.statusCode;
    record.status = statusCode !== undefined && statusCode >= 200 && statusCode < 300 ? 'sent' : 'failed';
    record.listeners.forEach((listener) => listener());
  });

  reportingEnabled = true;
  // Restore the cached ID for older installations that only saved a redemption code.
  void new RedemptionService().isVerified().catch(() => {});
  return true;
};

const captureReport = (
  capture: () => string,
  context: DiagnosticContext,
  level?: DiagnosticLevel
): string => {
  const identity = getDiagnosticIdentity();
  const eventId = Sentry.withScope((scope) => {
    scope.setUser({ id: identity.id });
    scope.setTag(REPORT_TAG, 'true');
    scope.setTag('user_id', identity.id);
    scope.setTag('user_type', identity.type);
    if (level) scope.setLevel(level);
    scope.setContext('diagnostic', context);
    scope.setContext('recent_console_errors', {
      count: recentConsoleEntries.length,
      entries: JSON.stringify(recentConsoleEntries).slice(0, MAX_REPORT_LENGTH)
    });
    return capture();
  });
  errorReports.set(eventId, {
    userId: identity.id,
    status: 'pending',
    retry: () => captureReport(capture, context, level),
    listeners: new Set()
  });
  if (errorReports.size > MAX_ERROR_REPORTS) {
    const oldestId = errorReports.keys().next().value!;
    const oldest = errorReports.get(oldestId)!;
    oldest.status = 'failed';
    oldest.listeners.forEach((listener) => listener());
    errorReports.delete(oldestId);
  }
  return eventId;
};

// Report a snapshot so an Error previously captured by a global handler (or a
// failed attempt) cannot produce a fresh ID that the SDK silently discards.
const snapshotException = (error: unknown): unknown => {
  if (!(error instanceof Error)) return error && typeof error === 'object' ? { ...error } : error;
  const snapshot = Object.assign(new Error(error.message), error, { name: error.name, stack: error.stack });
  if ('cause' in error) Object.defineProperty(snapshot, 'cause', { value: error.cause, configurable: true });
  return snapshot;
};

export const reportDiagnostic = (
  message: string,
  context: DiagnosticContext = {},
  level: DiagnosticLevel = 'error'
): string | null => {
  if (!reportingEnabled) {
    return null;
  }

  return captureReport(() => Sentry.captureMessage(message), context, level);
};

export const reportException = (error: unknown, context: DiagnosticContext = {}): string | null => {
  if (!reportingEnabled) {
    return null;
  }

  if (error && typeof error === 'object') {
    const previousId = exceptionReferences.get(error);
    if (previousId && errorReports.get(previousId)?.status !== 'failed' && errorReports.has(previousId)) return previousId;
  }
  const eventId = captureReport(() => Sentry.captureException(snapshotException(error)), context);
  if (error && typeof error === 'object') exceptionReferences.set(error, eventId);
  return eventId;
};

export const getErrorReportUserId = (eventId: string): string => (
  errorReports.get(eventId)?.userId ?? getDiagnosticIdentity().id
);

export const waitForErrorReport = async (eventId: string): Promise<RecentConsoleReportResult> => {
  if (!reportingEnabled) return { status: 'disabled' };
  const record = errorReports.get(eventId);
  if (!record) return { status: 'failed' };
  const result = (): RecentConsoleReportResult => record.status === 'sent'
    ? { status: 'sent', eventId, userId: record.userId }
    : { status: 'failed' };
  if (record.status !== 'pending') return result();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      record.listeners.delete(finish);
      resolve(result());
    };
    const fail = () => {
      if (record.status === 'pending') record.status = 'failed';
      finish();
    };
    const timer = setTimeout(fail, 5_000);
    record.listeners.add(finish);
    // Queue drainage alone does not prove delivery: filters and HTTP failures
    // can still flush successfully. Only afterSendEvent with a 2xx confirms it.
    void Sentry.flush(5_000).then((flushed) => { if (!flushed) fail(); }, fail);
  });
};

export const retryErrorReport = async (eventId: string): Promise<RecentConsoleReportResult> => {
  if (!reportingEnabled) return { status: 'disabled' };
  const record = errorReports.get(eventId);
  if (!record) return reportRecentConsoleErrors();
  try {
    await new RedemptionService().isVerified();
    return await waitForErrorReport(record.retry());
  } catch {
    return { status: 'failed' };
  }
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

export const reportRecentConsoleErrors = async (): Promise<RecentConsoleReportResult> => {
  if (!reportingEnabled) return { status: 'disabled' };
  if (recentConsoleEntries.length === 0) return { status: 'empty' };
  try {
    await new RedemptionService().isVerified();
    const eventId = captureReport(() => Sentry.captureMessage('User submitted recent console errors'), {}, 'error');
    return await waitForErrorReport(eventId);
  } catch {
    return { status: 'failed' };
  }
};

export const flushErrorReports = (): void => {
  if (reportingEnabled) {
    void Sentry.flush(2_000);
  }
};
