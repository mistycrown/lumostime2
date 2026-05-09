/**
 * @file floatingWindowStopUtils.ts
 * @input Active sessions plus native floating-window stop payloads
 * @output Shared parsing and action-resolution helpers for floating-window stop reconciliation
 * @description Normalizes floating-window stop details from live events or pending native payloads and resolves which app sessions should stop or cancel.
 * @updated 2026-05-09: Added shared floating-window stop parsing and reconciliation helpers for resume-safe stop handling.
 */
import { ActiveSession } from '../types';

export type FloatingStopDetail = {
  sessionId?: string | null;
};

export type FloatingStopAction = {
  mode: 'stop' | 'cancel';
  sessionId: string;
};

export const normalizeFloatingStopSessionId = (
  sessionId?: string | null
): string | null => {
  if (typeof sessionId !== 'string') {
    return null;
  }

  const trimmed = sessionId.trim();
  return trimmed ? trimmed : null;
};

export const parseFloatingStopDetail = (event: Event): FloatingStopDetail => {
  const customEvent = event as CustomEvent<unknown>;
  const { detail } = customEvent;

  if (!detail) {
    return {};
  }

  if (typeof detail === 'string') {
    try {
      const parsed = JSON.parse(detail) as FloatingStopDetail;
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof detail === 'object') {
    return detail as FloatingStopDetail;
  }

  return {};
};

export const buildFloatingStopActions = (
  activeSessions: ActiveSession[],
  detail: FloatingStopDetail
): FloatingStopAction[] => {
  const normalizedSessionId = normalizeFloatingStopSessionId(detail.sessionId);
  const sessionsToStop = normalizedSessionId
    ? activeSessions.filter((session) => session.id === normalizedSessionId)
    : activeSessions;

  return sessionsToStop.map((session) => ({
    mode: session.source === 'widget' && normalizedSessionId ? 'cancel' : 'stop',
    sessionId: session.id
  }));
};
