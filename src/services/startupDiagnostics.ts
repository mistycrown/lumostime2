/**
 * @file startupDiagnostics.ts
 * @input Startup readiness stages and localStorage availability
 * @output Persisted startup state plus optional sanitized timeout reports
 * @pos Shared diagnostics service
 * @description Detects startup attempts that do not reach the ready state, reports the blocked stage when configured, and never stores application content or credentials.
 * @updated 2026-08-11: Added startup watchdog, next-launch reporting, and the Sentry event ID for the timeout recovery screen.
 */
import { flushErrorReports, reportDiagnostic } from './errorReporting';

const STARTUP_DIAGNOSTIC_KEY = 'lumostime_startup_diagnostic';
const STARTUP_TIMEOUT_MS = 20_000;
const MAX_PREVIOUS_STARTUP_AGE_MS = 24 * 60 * 60 * 1_000;

export const STARTUP_TIMEOUT_EVENT = 'lumostime:startup-timeout';

export type StartupTimeoutDetail = {
  sentryEventId: string | null;
};

type StartupDiagnosticRecord = {
  id: string;
  startedAt: number;
  completedAt?: number;
  timedOutAt?: number;
  sentryEventId?: string;
  lastStage: string;
  readiness?: Record<string, boolean>;
};

let activeRecord: StartupDiagnosticRecord | null = null;
let startupTimeoutId: number | null = null;

const readRecord = (): StartupDiagnosticRecord | null => {
  try {
    const raw = localStorage.getItem(STARTUP_DIAGNOSTIC_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StartupDiagnosticRecord;
  } catch (error) {
    console.warn('[StartupDiagnostics] Failed to read startup diagnostic state', error);
    return null;
  }
};

const persistRecord = (record: StartupDiagnosticRecord): void => {
  try {
    localStorage.setItem(STARTUP_DIAGNOSTIC_KEY, JSON.stringify(record));
  } catch (error) {
    console.warn('[StartupDiagnostics] Failed to persist startup diagnostic state', error);
  }
};

const buildContext = (record: StartupDiagnosticRecord): Record<string, unknown> => ({
  startupId: record.id,
  lastStage: record.lastStage,
  elapsedMs: Date.now() - record.startedAt,
  readiness: record.readiness || {},
  appVersion: import.meta.env.VITE_APP_VERSION || 'unknown'
});

export const startStartupDiagnostics = (): void => {
  const now = Date.now();
  const previousRecord = readRecord();

  if (
    previousRecord &&
    !previousRecord.completedAt &&
    now - previousRecord.startedAt <= MAX_PREVIOUS_STARTUP_AGE_MS
  ) {
    reportDiagnostic('startup_abandoned_before_ready', buildContext(previousRecord), 'warning');
  }

  activeRecord = {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    startedAt: now,
    lastStage: 'renderer_boot'
  };
  persistRecord(activeRecord);

  startupTimeoutId = window.setTimeout(() => {
    if (!activeRecord?.completedAt) {
      activeRecord.timedOutAt = Date.now();
      const sentryEventId = reportDiagnostic('startup_timeout', buildContext(activeRecord));
      activeRecord.sentryEventId = sentryEventId || undefined;
      persistRecord(activeRecord);
      flushErrorReports();
      window.dispatchEvent(new CustomEvent<StartupTimeoutDetail>(STARTUP_TIMEOUT_EVENT, {
        detail: { sentryEventId }
      }));
    }
  }, STARTUP_TIMEOUT_MS);
};

export const markStartupStage = (
  stage: string,
  readiness?: Record<string, boolean>
): void => {
  if (!activeRecord || activeRecord.completedAt) {
    return;
  }

  activeRecord.lastStage = stage;
  activeRecord.readiness = readiness;
  persistRecord(activeRecord);
};

export const completeStartupDiagnostics = (): void => {
  if (!activeRecord || activeRecord.completedAt) {
    return;
  }

  activeRecord.lastStage = 'app_ready';
  activeRecord.completedAt = Date.now();
  persistRecord(activeRecord);

  if (startupTimeoutId !== null) {
    window.clearTimeout(startupTimeoutId);
    startupTimeoutId = null;
  }
};
