/**
 * @file sessionPersistence.ts
 * @input localStorage persisted active session payloads
 * @output Sanitized active sessions for SessionContext hydration and persistence helpers
 * @pos Utility
 * @description Keeps timer session persistence small and defensive so running timers survive background restarts without restoring malformed session data.
 * @updated 2026-04-16: Allowed widgetType metadata so restored widget-backed sessions keep their originating widget family.
 */
import { USER_DATA_KEYS, storage } from '../constants/storageKeys';
import { ActiveSession } from '../types';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const isOptionalNumber = (value: unknown): value is number | undefined =>
  value === undefined || typeof value === 'number';

const isOptionalStringArray = (value: unknown): value is string[] | undefined =>
  value === undefined || (Array.isArray(value) && value.every((item) => typeof item === 'string'));

const isOptionalSource = (value: unknown): value is ActiveSession['source'] =>
  value === undefined || value === 'app' || value === 'widget';

const isOptionalWidgetType = (value: unknown): value is ActiveSession['widgetType'] =>
  value === undefined || value === 'timer' || value === 'daily';

const isActiveSession = (value: unknown): value is ActiveSession => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    isNonEmptyString(session.id) &&
    isNonEmptyString(session.activityId) &&
    isNonEmptyString(session.categoryId) &&
    isNonEmptyString(session.activityName) &&
    isNonEmptyString(session.activityIcon) &&
    typeof session.startTime === 'number' &&
    Number.isFinite(session.startTime) &&
    isOptionalString(session.activityUiIcon) &&
    isOptionalString(session.linkedTodoId) &&
    isOptionalStringArray(session.scopeIds) &&
    isOptionalString(session.title) &&
    isOptionalString(session.note) &&
    isOptionalNumber(session.progressIncrement) &&
    isOptionalNumber(session.focusScore) &&
    isOptionalNumber(session.moodScore) &&
    isOptionalStringArray(session.reactions) &&
    isOptionalSource(session.source) &&
    isOptionalWidgetType(session.widgetType) &&
    isOptionalNumber(session.slotIndex) &&
    isOptionalString(session.templateId) &&
    isOptionalNumber(session.appWidgetId)
  );
};

const normalizeActiveSessions = (value: unknown): ActiveSession[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const dedupedSessions = new Map<string, ActiveSession>();

  value.forEach((session) => {
    if (isActiveSession(session)) {
      dedupedSessions.set(session.id, session);
    }
  });

  return Array.from(dedupedSessions.values()).sort((left, right) => left.startTime - right.startTime);
};

export const loadPersistedActiveSessions = (): ActiveSession[] =>
  normalizeActiveSessions(storage.getJSON<unknown[]>(USER_DATA_KEYS.ACTIVE_SESSIONS, []));

export const savePersistedActiveSessions = (sessions: ActiveSession[]): boolean =>
  storage.setJSON(USER_DATA_KEYS.ACTIVE_SESSIONS, normalizeActiveSessions(sessions));

export const clearPersistedActiveSessions = (): boolean =>
  storage.remove(USER_DATA_KEYS.ACTIVE_SESSIONS);
