/**
 * @file SceneView.test.ts
 * @input SceneView timeline-matching helpers
 * @output Regression coverage for current-slot timeline back-side forcing
 * @pos Test
 * @description Verifies scene timer/todo cards only auto-flip when a matching log overlaps the current slot window, including overnight slots.
 */

import { describe, expect, it } from 'vitest';
import { doesSceneCardMatchCurrentSlotTimeline, getCurrentSceneSlotWindow } from '../utils/sceneTimelineMatchUtils';
import type { Log, SceneCardData, TimeSlot } from '../types';

const buildTimerCard = (): SceneCardData => ({
  id: 'timer-card',
  type: 'timer',
  title: '深度工作',
  action: {
    type: 'startTimer',
    activityId: 'activity-1',
    categoryId: 'category-1',
  },
});

const buildTodoCard = (): SceneCardData => ({
  id: 'todo-card',
  type: 'todo',
  title: '写论文',
  action: {
    type: 'startTodo',
    todoId: 'todo-1',
  },
});

const buildLog = (overrides: Partial<Log> = {}): Log => ({
  id: 'log-1',
  activityId: 'activity-1',
  categoryId: 'category-1',
  startTime: new Date('2026-05-10T09:15:00+08:00').getTime(),
  endTime: new Date('2026-05-10T09:45:00+08:00').getTime(),
  duration: 1800,
  ...overrides,
});

describe('SceneView current-slot timeline matching', () => {
  it('matches a timer card when a log overlaps the active daytime slot', () => {
    const slot: Pick<TimeSlot, 'startTime' | 'endTime'> = {
      startTime: '09:00',
      endTime: '12:00',
    };
    const slotWindow = getCurrentSceneSlotWindow(slot, new Date('2026-05-10T10:00:00+08:00'));

    expect(doesSceneCardMatchCurrentSlotTimeline(buildTimerCard(), [buildLog()], slotWindow)).toBe(true);
  });

  it('matches overnight todo logs against the current overnight slot window', () => {
    const slot: Pick<TimeSlot, 'startTime' | 'endTime'> = {
      startTime: '22:00',
      endTime: '06:00',
    };
    const slotWindow = getCurrentSceneSlotWindow(slot, new Date('2026-05-11T01:00:00+08:00'));
    const overnightLog = buildLog({
      activityId: 'other-activity',
      categoryId: 'other-category',
      linkedTodoId: 'todo-1',
      startTime: new Date('2026-05-10T23:30:00+08:00').getTime(),
      endTime: new Date('2026-05-11T00:30:00+08:00').getTime(),
      duration: 3600,
    });

    expect(doesSceneCardMatchCurrentSlotTimeline(buildTodoCard(), [overnightLog], slotWindow)).toBe(true);
  });

  it('ignores matching logs when the selected slot is not the current slot', () => {
    const slot: Pick<TimeSlot, 'startTime' | 'endTime'> = {
      startTime: '09:00',
      endTime: '12:00',
    };
    const slotWindow = getCurrentSceneSlotWindow(slot, new Date('2026-05-10T14:00:00+08:00'));

    expect(doesSceneCardMatchCurrentSlotTimeline(buildTimerCard(), [buildLog()], slotWindow)).toBe(false);
  });
});
