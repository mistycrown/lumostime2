/**
 * @file widgetService.timerImages.test.ts
 * @input Native timer completion and matching local session attachments
 * @output Widget photo preservation and session isolation regressions
 * @pos Test (Widget Timer)
 * @updated 2026-11-01: Verifies widget completion retains only the matching timer's draft photos.
 */
import { describe, expect, it } from 'vitest';
import { buildLogFromWidgetPendingAction } from './widgetService';
import type { ActiveSession } from '../types';
import type { WidgetBridgePendingAction } from '../plugins/WidgetBridgePlugin';

const action: WidgetBridgePendingAction = {
  id: 'timer', widgetType: 'timer', activityId: 'work', categoryId: 'category',
  icon: 'W', label: 'Work', color: '#555', startedAt: 100, endedAt: 1100, createdAt: 1100
};
const session: ActiveSession = {
  id: 'timer', activityId: 'work', categoryId: 'category', activityName: 'Work', activityIcon: 'W',
  startTime: 100, images: ['gallery.png', 'camera.jpg']
};

describe('widget timer photos', () => {
  it('retains saved attachments when stopped from the native widget', () => {
    expect(buildLogFromWidgetPendingAction(action, session)).toMatchObject({
      id: 'timer', duration: 1, images: ['gallery.png', 'camera.jpg']
    });
  });
  it('does not copy attachments from a different timer', () => {
    expect(buildLogFromWidgetPendingAction(action, { ...session, id: 'other' }).images).toBeUndefined();
    expect(buildLogFromWidgetPendingAction(action).images).toBeUndefined();
  });
});
