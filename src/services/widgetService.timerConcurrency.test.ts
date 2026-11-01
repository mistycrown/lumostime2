/**
 * @file widgetService.timerConcurrency.test.ts
 * @input A native switch completing a locally edited app session
 * @output Metadata, midnight split and replay identity regressions
 * @pos Test (Timer)
 * @updated 2026-11-01: Covers lossless conversion when a native timer replaces an app timer.
 */
import { describe, expect, it } from 'vitest';
import { buildLogsFromWidgetPendingAction } from './widgetService';
import type { ActiveSession } from '../types';
import type { WidgetBridgePendingAction } from '../plugins/WidgetBridgePlugin';

const start = new Date(2026, 10, 1, 23, 50).getTime();
const end = new Date(2026, 10, 2, 0, 10).getTime();
const action: WidgetBridgePendingAction = {
  id: 'app-session', widgetType: 'timer', activityId: 'read', categoryId: 'study',
  icon: 'R', label: 'Read', color: '#555', startedAt: start, endedAt: end, createdAt: end,
  scopeIds: ['scope'], linkedTodoId: 'todo'
};
const session: ActiveSession = {
  id: action.id, activityId: 'read', categoryId: 'study', activityName: 'Read', activityIcon: 'R',
  startTime: start, title: 'Chapter 2', note: 'Keep this note', images: ['photo.jpg'],
  focusScore: 4, moodScore: 3, reactions: ['star'], attributeValues: [{ attributeId: 'pages', value: 20 }]
};

describe('native timer replacement logs', () => {
  it('keeps local edits and attachments on both sides of midnight', () => {
    const logs = buildLogsFromWidgetPendingAction(action, session);
    expect(logs).toHaveLength(2);
    expect(logs[0].endTime).toBe(new Date(2026, 10, 1, 23, 59, 59, 999).getTime());
    expect(logs[1].startTime).toBe(new Date(2026, 10, 2).getTime());
    for (const log of logs) {
      expect(log).toMatchObject({ title: 'Chapter 2', note: 'Keep this note', images: ['photo.jpg'],
        focusScore: 4, moodScore: 3, reactions: ['star'], attributeValues: [{ attributeId: 'pages', value: 20 }],
        linkedTodoId: 'todo', scopeIds: ['scope'] });
    }
    expect(buildLogsFromWidgetPendingAction(action, session).map((log) => log.id)).toEqual(logs.map((log) => log.id));
  });

  it('ignores another session’s edits and retains the pending action identity', () => {
    const logs = buildLogsFromWidgetPendingAction({ ...action, endedAt: start + 5000 }, { ...session, id: 'other' });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ id: action.id, duration: 5, note: '', title: 'Read' });
    expect(logs[0].images).toBeUndefined();
  });
});
