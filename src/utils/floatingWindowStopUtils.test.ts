import { describe, expect, it } from 'vitest';
import type { ActiveSession } from '../types';
import {
  buildFloatingStopActions,
  normalizeFloatingStopSessionId,
  parseFloatingStopDetail
} from './floatingWindowStopUtils';

const buildSession = (overrides: Partial<ActiveSession> = {}): ActiveSession => ({
  id: 'session-1',
  activityId: 'activity-1',
  categoryId: 'category-1',
  activityName: 'Write',
  activityIcon: '✍️',
  startTime: 1000,
  source: 'app',
  ...overrides
});

describe('floatingWindowStopUtils', () => {
  it('normalizes blank session ids to null', () => {
    expect(normalizeFloatingStopSessionId('  ')).toBeNull();
    expect(normalizeFloatingStopSessionId(' session-1 ')).toBe('session-1');
  });

  it('parses stringified floating stop detail payloads', () => {
    const event = new CustomEvent('stopFocusFromFloating', {
      detail: JSON.stringify({ sessionId: 'session-1' })
    });

    expect(parseFloatingStopDetail(event)).toEqual({ sessionId: 'session-1' });
  });

  it('returns an empty detail object for invalid payloads', () => {
    const event = new CustomEvent('stopFocusFromFloating', {
      detail: '{bad json}'
    });

    expect(parseFloatingStopDetail(event)).toEqual({});
  });

  it('stops only the matching app session when a session id is provided', () => {
    const actions = buildFloatingStopActions(
      [
        buildSession({ id: 'session-1', source: 'app' }),
        buildSession({ id: 'session-2', source: 'app' })
      ],
      { sessionId: 'session-2' }
    );

    expect(actions).toEqual([{ mode: 'stop', sessionId: 'session-2' }]);
  });

  it('cancels matching widget sessions to avoid duplicate logs', () => {
    const actions = buildFloatingStopActions(
      [buildSession({ id: 'widget-session', source: 'widget' })],
      { sessionId: 'widget-session' }
    );

    expect(actions).toEqual([{ mode: 'cancel', sessionId: 'widget-session' }]);
  });

  it('falls back to stopping every active session when no session id is present', () => {
    const actions = buildFloatingStopActions(
      [
        buildSession({ id: 'session-1', source: 'app' }),
        buildSession({ id: 'session-2', source: 'widget' })
      ],
      {}
    );

    expect(actions).toEqual([
      { mode: 'stop', sessionId: 'session-1' },
      { mode: 'stop', sessionId: 'session-2' }
    ]);
  });
});
