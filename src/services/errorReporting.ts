/**
 * @file errorReporting.ts
 * @input Optional Vite Sentry DSN and sanitized diagnostic contexts
 * @output Remote crash and startup diagnostic events when monitoring is configured
 * @pos Shared diagnostics service
 * @description Initializes Sentry only when a DSN is supplied, and exposes narrow helpers that exclude user content and credentials from error reports.
 * @updated 2026-08-11: Returns Sentry event IDs for user-visible critical failures and broadcasts local-data hydration failures to the bootstrap gate.
 */
import * as Sentry from '@sentry/react';

type DiagnosticContext = Record<string, unknown>;
type DiagnosticLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

export const CRITICAL_DATA_ERROR_EVENT = 'lumostime:critical-data-error';

export interface CriticalDataErrorDetail {
  message: string;
  sentryEventId: string | null;
}

let reportingEnabled = false;
let latestCriticalDataError: CriticalDataErrorDetail | null = null;

const getRelease = (): string => import.meta.env.VITE_APP_VERSION || 'lumostime@unknown';

export const initializeErrorReporting = (): boolean => {
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

export const flushErrorReports = (): void => {
  if (reportingEnabled) {
    void Sentry.flush(2_000);
  }
};
